"""Cache persistente em SQLite com fallback automático para ambientes Serverless (Vercel)."""

import json
import logging
import os
import sqlite3
import time
from pathlib import Path
from typing import Any, Optional

from analise_quant.config import settings

logger = logging.getLogger(__name__)


def _resolve_db_path(custom_path: Optional[str] = None) -> Path:
    """Resolve o caminho do banco SQLite com fallback seguro para /tmp no Vercel."""
    if custom_path:
        return Path(custom_path)

    if os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"):
        return Path("/tmp/analise_quant_cache.db")

    out_dir = Path(settings.output_dir)
    try:
        out_dir.mkdir(parents=True, exist_ok=True)
        test_file = out_dir / ".write_test"
        test_file.touch()
        test_file.unlink()
        return out_dir / "cache.db"
    except OSError:
        return Path("/tmp/analise_quant_cache.db")


class PersistentCache:
    """Cache chave-valor com TTL apoiado em SQLite."""

    def __init__(self, db_path: Optional[str] = None, default_ttl: int = 3600) -> None:
        self.db_path = _resolve_db_path(db_path)
        self.default_ttl = default_ttl
        self._init_db()

    def _init_db(self) -> None:
        try:
            with sqlite3.connect(self.db_path, timeout=5.0) as conn:
                conn.execute(
                    """
                    CREATE TABLE IF NOT EXISTS kv_cache (
                        cache_key TEXT PRIMARY KEY,
                        payload TEXT NOT NULL,
                        expires_at REAL NOT NULL,
                        created_at REAL NOT NULL
                    )
                    """
                )
                conn.execute(
                    "CREATE INDEX IF NOT EXISTS idx_kv_cache_expires ON kv_cache(expires_at)"
                )
        except Exception:
            logger.warning("Não foi possível inicializar SQLite em %s", self.db_path)

    def get(self, key: str) -> Optional[Any]:
        """Recupera um item válido do cache ou None se expirado/inexistente."""
        now = time.time()
        try:
            with sqlite3.connect(self.db_path, timeout=5.0) as conn:
                row = conn.execute(
                    "SELECT payload, expires_at FROM kv_cache WHERE cache_key = ?",
                    (key,),
                ).fetchone()
                if not row:
                    return None
                payload_str, expires_at = row
                if now >= expires_at:
                    conn.execute("DELETE FROM kv_cache WHERE cache_key = ?", (key,))
                    return None
                return json.loads(payload_str)
        except Exception:
            logger.debug("Falha ao ler chave %s do SQLite cache", key)
            return None

    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """Armazena um valor serializável em JSON no SQLite com TTL."""
        ttl_seconds = self.default_ttl if ttl is None else ttl
        if ttl_seconds <= 0:
            return
        now = time.time()
        expires_at = now + ttl_seconds
        try:
            payload_str = json.dumps(value, default=str)
            with sqlite3.connect(self.db_path, timeout=5.0) as conn:
                conn.execute(
                    """
                    INSERT INTO kv_cache (cache_key, payload, expires_at, created_at)
                    VALUES (?, ?, ?, ?)
                    ON CONFLICT(cache_key) DO UPDATE SET
                        payload = excluded.payload,
                        expires_at = excluded.expires_at,
                        created_at = excluded.created_at
                    """,
                    (key, payload_str, expires_at, now),
                )
        except Exception:
            logger.debug("Falha ao gravar chave %s no SQLite cache", key)

    def clear(self) -> None:
        """Remove todos os registros do cache SQLite."""
        try:
            with sqlite3.connect(self.db_path, timeout=5.0) as conn:
                conn.execute("DELETE FROM kv_cache")
        except Exception:
            logger.debug("Falha ao limpar SQLite cache")


persistent_cache = PersistentCache(default_ttl=settings.cache_ttl_seconds)
