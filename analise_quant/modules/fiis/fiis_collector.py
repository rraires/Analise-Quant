"""Módulo de coleta de Fundos Imobiliários (FIIs) da B3."""

from datetime import date
from analise_quant.models import AssetType, CollectionResult, ModuleInfo
from analise_quant.modules.acoes.yfinance_collector import YFinanceAcoesCollector
from analise_quant.registry import register_module


@register_module("fiis_yfinance")
class YFinanceFIIsCollector(YFinanceAcoesCollector):
    """Coletor de dados históricos de FIIs da B3 (ex: HGLG11, KNRI11, MXRF11, XPLG11)."""

    def get_info(self) -> ModuleInfo:
        return ModuleInfo(
            name="fiis_yfinance",
            asset_type=AssetType.FIIS,
            source="yfinance",
            description="Coleta cotações históricas de Fundos Imobiliários (FIIs) listados na B3.",
            version="0.2.0",
        )

    def collect(
        self,
        tickers: list[str],
        start_date: date,
        end_date: date,
    ) -> CollectionResult:
        res = super().collect(tickers, start_date, end_date)
        res.module_name = "fiis_yfinance"
        return res
