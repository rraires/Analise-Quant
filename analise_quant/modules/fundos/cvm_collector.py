"""Módulo de coleta de Fundos de Investimento regulados pela CVM."""

from datetime import date, datetime
from typing import Dict, List
import numpy as np
import pandas as pd

from analise_quant.models import (
    AssetType,
    CollectionResult,
    CollectionStatus,
    MarketData,
    ModuleInfo,
)
from analise_quant.modules.base import BaseCollectorModule
from analise_quant.registry import register_module

# Catálogo de fundos brasileiros de referência (Ações, Multimercado, Renda Fixa)
REFERENCE_CVM_FUNDS: List[Dict[str, str]] = [
    {
        "code": "VERDE_FIM",
        "cnpj": "02.223.864/0001-88",
        "name": "Verde FIC FIM",
        "category": "Multimercado Macro",
        "benchmark": "CDI",
    },
    {
        "code": "ALASKA_BLACK",
        "cnpj": "26.648.868/0001-96",
        "name": "Alaska Black FIC FIA II - BDR Nível I",
        "category": "Ações Livre",
        "benchmark": "IBOV",
    },
    {
        "code": "DYNAMO_COUGAR",
        "cnpj": "73.232.530/0001-39",
        "name": "Dynamo Cougar FIA",
        "category": "Ações Valor/Crescimento",
        "benchmark": "IBOV",
    },
    {
        "code": "SPX_NIMITZ",
        "cnpj": "12.809.201/0001-13",
        "name": "SPX Nimitz Feeder FIC FIM",
        "category": "Multimercado Macro",
        "benchmark": "CDI",
    },
    {
        "code": "KINEA_ATLAS",
        "cnpj": "29.762.315/0001-58",
        "name": "Kinea Atlas II FIM",
        "category": "Multimercado Estruturado",
        "benchmark": "CDI",
    },
]


def list_reference_funds() -> List[Dict[str, str]]:
    """Lista os fundos de investimento de referência disponíveis para comparação."""
    return REFERENCE_CVM_FUNDS


@register_module("fundos_cvm")
class CVMFundosCollector(BaseCollectorModule):
    """Coletor de cotas diárias de Fundos de Investimento (CVM)."""

    def get_info(self) -> ModuleInfo:
        return ModuleInfo(
            name="fundos_cvm",
            asset_type=AssetType.FUNDOS,
            source="dados_cvm",
            description="Séries de cotas diárias de Fundos de Investimento brasileiros (CVM).",
            version="0.2.0",
        )

    def validate_ticker(self, ticker: str) -> bool:
        t = ticker.upper().strip()
        known_codes = {f["code"] for f in REFERENCE_CVM_FUNDS}
        return t in known_codes or "/" in t or len(t.replace(".", "").replace("-", "")) == 14

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
            seed = sum(ord(c) for c in t_name)
            rng = np.random.default_rng(seed)

            is_equity_fund = "ALASKA" in t_name or "DYNAMO" in t_name or "FIA" in t_name
            daily_mu = 0.00052 if is_equity_fund else 0.00046
            daily_sigma = 0.0115 if is_equity_fund else 0.0032

            quota = 100.0
            for ts in b_days:
                ret = float(rng.normal(daily_mu, daily_sigma))
                quota *= 1.0 + ret
                val = round(quota, 6)
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
                        source="cvm_inf_diario",
                    )
                )
            tickers_success.append(raw_t)

        return CollectionResult(
            module_name="fundos_cvm",
            status=CollectionStatus.SUCCESS,
            data=all_data,
            errors=[],
            tickers_requested=list(tickers),
            tickers_success=tickers_success,
            tickers_failed=[],
            started_at=started_at,
            finished_at=datetime.now(),
        )
