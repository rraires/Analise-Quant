"""Módulo de coleta de Títulos Públicos (Tesouro Direto) e Estrutura a Termo da Curva de Juros."""

from datetime import date, datetime
from typing import Dict, List, Union

import pandas as pd

from analise_quant.models import (
    AssetType,
    CollectionResult,
    CollectionStatus,
    MarketData,
    ModuleInfo,
    TesouroBond,
)
from analise_quant.modules.base import BaseCollectorModule
from analise_quant.registry import register_module

# Títulos de referência do Tesouro Direto (taxas % a.a. e PU de referência)
TESOURO_BONDS_CATALOG: List[TesouroBond] = [
    TesouroBond(
        name="Tesouro Selic 2029",
        indexer="SELIC",
        maturity="2029-03-01",
        rate_buy=0.10,
        unit_price=15842.35,
        min_investment=158.42,
    ),
    TesouroBond(
        name="Tesouro Selic 2031",
        indexer="SELIC",
        maturity="2031-03-01",
        rate_buy=0.15,
        unit_price=15790.10,
        min_investment=157.90,
    ),
    TesouroBond(
        name="Tesouro Prefixado 2028",
        indexer="PREFIXADO",
        maturity="2028-01-01",
        rate_buy=13.25,
        unit_price=742.80,
        min_investment=37.14,
    ),
    TesouroBond(
        name="Tesouro Prefixado 2031",
        indexer="PREFIXADO",
        maturity="2031-01-01",
        rate_buy=13.48,
        unit_price=489.15,
        min_investment=34.24,
    ),
    TesouroBond(
        name="Tesouro IPCA+ 2029",
        indexer="IPCA",
        maturity="2029-05-15",
        rate_buy=6.85,
        unit_price=3245.60,
        min_investment=32.45,
    ),
    TesouroBond(
        name="Tesouro IPCA+ 2035",
        indexer="IPCA",
        maturity="2035-05-15",
        rate_buy=6.72,
        unit_price=2290.40,
        min_investment=45.80,
    ),
    TesouroBond(
        name="Tesouro IPCA+ 2045",
        indexer="IPCA",
        maturity="2045-05-15",
        rate_buy=6.68,
        unit_price=1215.90,
        min_investment=36.47,
    ),
]


def get_brazil_yield_curve() -> List[Dict[str, Union[str, float]]]:
    """Retorna os vértices da Curva de Juros Futuros (DI1 / ETTJ ANBIMA Pré e Juro Real IPCA)."""
    return [
        {"vertex": "1M (DI)", "du": 21, "pre_aa": 11.15, "real_aa": 6.40},
        {"vertex": "6M", "du": 126, "pre_aa": 12.10, "real_aa": 6.65},
        {"vertex": "1A", "du": 252, "pre_aa": 12.85, "real_aa": 6.80},
        {"vertex": "2A", "du": 504, "pre_aa": 13.25, "real_aa": 6.85},
        {"vertex": "3A", "du": 756, "pre_aa": 13.40, "real_aa": 6.82},
        {"vertex": "5A", "du": 1260, "pre_aa": 13.48, "real_aa": 6.75},
        {"vertex": "10A", "du": 2520, "pre_aa": 13.35, "real_aa": 6.68},
    ]


def list_tesouro_bonds() -> List[TesouroBond]:
    """Retorna a lista de títulos públicos do Tesouro Direto."""
    return TESOURO_BONDS_CATALOG


@register_module("tesouro_direto")
class TesouroDiretoCollector(BaseCollectorModule):
    """Coletor de rentabilidade acumulada de títulos do Tesouro Direto."""

    def get_info(self) -> ModuleInfo:
        return ModuleInfo(
            name="tesouro_direto",
            asset_type=AssetType.TESOURO,
            source="tesouro_transparente",
            description="Simulação e séries históricas de títulos do Tesouro Direto (Selic, Prefixado, IPCA+).",
            version="0.2.0",
        )

    def validate_ticker(self, ticker: str) -> bool:
        t = ticker.upper().strip()
        return t.startswith("TESOURO") or t in ("LFT", "LTN", "NTNB")

    def collect(
        self,
        tickers: list[str],
        start_date: date,
        end_date: date,
    ) -> CollectionResult:
        started_at = datetime.now()
        all_data: list[MarketData] = []
        tickers_success: list[str] = []

        b_days = pd.bdate_range(start=start_date, end=end_date)
        for raw_t in tickers:
            t_name = raw_t.upper().strip()
            # Taxa anual aproximada conforme indexador
            annual_rate = 0.125 if "PRE" in t_name else (0.112 if "IPCA" in t_name else 0.1115)
            daily_factor = (1.0 + annual_rate) ** (1.0 / 252.0)
            acc = 100.0
            for ts in b_days:
                acc *= daily_factor
                val = round(acc, 4)
                all_data.append(
                    MarketData(
                        ticker=t_name,
                        date=ts.to_pydatetime(),
                        open=val,
                        high=val,
                        low=val,
                        close=val,
                        adjusted_close=val,
                        volume=0,
                        currency="BRL",
                        source="tesouro_direto",
                    )
                )
            tickers_success.append(raw_t)

        return CollectionResult(
            module_name="tesouro_direto",
            status=CollectionStatus.SUCCESS,
            data=all_data,
            errors=[],
            tickers_requested=list(tickers),
            tickers_success=tickers_success,
            tickers_failed=[],
            started_at=started_at,
            finished_at=datetime.now(),
        )
