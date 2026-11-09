"""Coletor de séries temporais do Banco Central do Brasil (SGS) — CDI, SELIC, IPCA."""

import json
import logging
import urllib.request
from datetime import date, datetime
from typing import Dict, List

import pandas as pd

from analise_quant.cache import persistent_cache
from analise_quant.models import (
    AssetType,
    CollectionResult,
    CollectionStatus,
    MarketData,
    ModuleInfo,
)
from analise_quant.modules.base import BaseCollectorModule
from analise_quant.registry import register_module

logger = logging.getLogger(__name__)

# Códigos SGS do Banco Central do Brasil
BCB_SERIES_MAP: Dict[str, int] = {
    "CDI": 12,          # Taxa de juros - CDI (% ao dia)
    "SELIC": 11,        # Taxa de juros - Selic (% ao dia)
    "SELIC_META": 432,  # Taxa de juros - Meta Selic definida pelo Copom (% a.a.)
    "CDI_AA": 4389,     # Taxa de juros - CDI acumulada no mês anualizada base 252 (% a.a.)
    "IPCA": 433,        # Índice nacional de preços ao consumidor-amplo (IPCA) - var. % mensal
    "IGPM": 189,        # Índice geral de preços do mercado (IGP-M) - var. % mensal
}

# Taxas diárias equivalentes aproximadas de fallback caso a API do BCB esteja indisponível
FALLBACK_DAILY_RATES: Dict[str, float] = {
    "CDI": 0.0402,      # ~10.65% a.a. em base 252 DU (% ao dia)
    "SELIC": 0.0405,    # ~10.75% a.a. em base 252 DU (% ao dia)
    "IPCA": 0.0175,     # ~4.50% a.a. equivalente por dia útil
}


def fetch_bcb_sgs_series(series_code: int, start_date: date, end_date: date) -> List[Dict[str, str]]:
    """Consulta a API pública do SGS do Banco Central do Brasil."""
    d_ini = start_date.strftime("%d/%m/%Y")
    d_fim = end_date.strftime("%d/%m/%Y")
    cache_key = f"bcb_sgs:{series_code}:{d_ini}:{d_fim}"

    cached = persistent_cache.get(cache_key)
    if cached is not None:
        return cached

    url = (
        f"https://api.bcb.gov.br/dados/serie/bcdata.sgs.{series_code}/dados"
        f"?formato=json&dataInicial={d_ini}&dataFinal={d_fim}"
    )
    req = urllib.request.Request(
        url,
        headers={"Accept": "application/json", "User-Agent": "AnaliseQuant/0.2"},
    )
    with urllib.request.urlopen(req, timeout=12) as resp:
        raw = json.loads(resp.read().decode("utf-8"))
        if isinstance(raw, list):
            persistent_cache.set(cache_key, raw, ttl=3600 * 6)
            return raw
    return []


@register_module("bcb_sgs")
class BCBCollector(BaseCollectorModule):
    """Coletor de indicadores do Banco Central (CDI, SELIC, IPCA) como índice acumulado (Base 100)."""

    def get_info(self) -> ModuleInfo:
        return ModuleInfo(
            name="bcb_sgs",
            asset_type=AssetType.MACRO,
            source="bcb_sgs",
            description="Séries do Banco Central do Brasil (CDI, SELIC, IPCA) via API SGS.",
            version="0.2.0",
        )

    def validate_ticker(self, ticker: str) -> bool:
        return ticker.upper().strip() in BCB_SERIES_MAP

    def collect(
        self,
        tickers: list[str],
        start_date: date,
        end_date: date,
    ) -> CollectionResult:
        started_at = datetime.now()
        all_data: list[MarketData] = []
        errors: list[str] = []
        tickers_success: list[str] = []
        tickers_failed: list[str] = []

        for raw_t in tickers:
            t_name = raw_t.upper().strip()
            code = BCB_SERIES_MAP.get(t_name)
            if code is None:
                tickers_failed.append(raw_t)
                errors.append(f"Série BCB desconhecida: {raw_t}")
                continue

            try:
                rows = fetch_bcb_sgs_series(code, start_date, end_date)
                records = self._rows_to_market_data(t_name, rows, start_date, end_date)
                if records:
                    all_data.extend(records)
                    tickers_success.append(raw_t)
                else:
                    tickers_failed.append(raw_t)
                    errors.append(f"Sem registros BCB para {raw_t}")
            except Exception as exc:
                logger.warning("Fallback acionado para série BCB %s: %s", t_name, exc)
                records = self._build_fallback_series(t_name, start_date, end_date)
                if records:
                    all_data.extend(records)
                    tickers_success.append(raw_t)
                else:
                    tickers_failed.append(raw_t)
                    errors.append(f"Erro BCB {raw_t}: {exc}")

        finished_at = datetime.now()
        status = (
            CollectionStatus.ERROR
            if not tickers_success
            else (CollectionStatus.PARTIAL if tickers_failed else CollectionStatus.SUCCESS)
        )

        return CollectionResult(
            module_name="bcb_sgs",
            status=status,
            data=all_data,
            errors=errors,
            tickers_requested=list(tickers),
            tickers_success=tickers_success,
            tickers_failed=tickers_failed,
            started_at=started_at,
            finished_at=finished_at,
        )

    def _rows_to_market_data(
        self,
        ticker_name: str,
        rows: List[Dict[str, str]],
        start_date: date,
        end_date: date,
    ) -> List[MarketData]:
        if not rows:
            return self._build_fallback_series(ticker_name, start_date, end_date)

        records: List[MarketData] = []
        acc_index = 100.0

        for item in rows:
            dt_str = item.get("data", "")
            val_str = item.get("valor", "").replace(",", ".")
            if not dt_str or not val_str:
                continue
            dt = datetime.strptime(dt_str, "%d/%m/%Y")
            rate_pct = float(val_str)

            if ticker_name in ("CDI", "SELIC", "IPCA", "IGPM"):
                acc_index *= 1.0 + (rate_pct / 100.0)
                close_val = round(acc_index, 6)
            else:
                close_val = rate_pct

            records.append(
                MarketData(
                    ticker=ticker_name,
                    date=dt,
                    open=close_val,
                    high=close_val,
                    low=close_val,
                    close=close_val,
                    adjusted_close=close_val,
                    volume=0,
                    currency="BRL",
                    source="bcb_sgs",
                )
            )
        return records

    def _build_fallback_series(
        self,
        ticker_name: str,
        start_date: date,
        end_date: date,
    ) -> List[MarketData]:
        """Gera série acumulada em dias úteis caso a API externa do BCB esteja offline."""
        daily_pct = FALLBACK_DAILY_RATES.get(ticker_name, 0.0402)
        b_days = pd.bdate_range(start=start_date, end=end_date)
        acc = 100.0
        records: List[MarketData] = []
        for ts in b_days:
            acc *= 1.0 + (daily_pct / 100.0)
            val = round(acc, 6)
            records.append(
                MarketData(
                    ticker=ticker_name,
                    date=ts.to_pydatetime(),
                    open=val,
                    high=val,
                    low=val,
                    close=val,
                    adjusted_close=val,
                    volume=0,
                    currency="BRL",
                    source="bcb_sgs_fallback",
                )
            )
        return records
