"""Exportador de dados coletados para CSV e JSON."""

import json
import logging
from pathlib import Path

import pandas as pd

from analise_quant.config import settings
from analise_quant.models import CollectionResult

logger = logging.getLogger(__name__)


def export_result(result: CollectionResult, output_dir: str | None = None) -> dict[str, str]:
    """Exporta CollectionResult para CSV e/ou JSON conforme configuração.

    Args:
        result: Resultado de coleta a ser exportado.
        output_dir: Diretório de saída. Se None, usa settings.output_dir.

    Returns:
        Dicionário com caminhos dos arquivos gerados {formato: caminho}.
    """
    if not result.data:
        logger.warning("Sem dados para exportar (módulo: %s).", result.module_name)
        return {}

    out_dir = Path(output_dir or settings.output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    timestamp = result.started_at.strftime("%Y%m%d_%H%M%S")
    base_name = f"{result.module_name}_{timestamp}"
    exported: dict[str, str] = {}

    records = [d.model_dump() for d in result.data]

    if settings.export_csv:
        csv_path = out_dir / f"{base_name}.csv"
        df = pd.DataFrame(records)
        df.to_csv(csv_path, index=False, encoding="utf-8-sig")
        exported["csv"] = str(csv_path)
        logger.info("CSV exportado: %s (%d registros)", csv_path, len(records))

    if settings.export_json:
        json_path = out_dir / f"{base_name}.json"
        serializable = []
        for r in records:
            row = dict(r)
            row["date"] = row["date"].isoformat() if hasattr(row["date"], "isoformat") else str(row["date"])
            serializable.append(row)
        json_path.write_text(
            json.dumps(serializable, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        exported["json"] = str(json_path)
        logger.info("JSON exportado: %s (%d registros)", json_path, len(records))

    return exported
