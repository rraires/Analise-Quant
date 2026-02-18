"""Testes do CollectionEngine."""

import pytest

from analise_quant.engine import CollectionEngine
from analise_quant.exceptions import ModuleNotFoundError as AQModuleNotFoundError


@pytest.fixture
def engine():
    return CollectionEngine()


class TestCollectionEngine:
    def test_engine_initializes_with_modules(self, engine):
        modules = engine.list_modules()
        assert len(modules) > 0
        assert "acoes_yfinance" in modules

    def test_get_module_info(self, engine):
        info = engine.get_module_info("acoes_yfinance")
        assert info.name == "acoes_yfinance"
        assert info.source == "yfinance"
        assert info.asset_type.value == "acoes"

    def test_collect_invalid_module_raises(self, engine):
        with pytest.raises(AQModuleNotFoundError):
            engine.collect("modulo_fantasma", ["PETR4"])

    def test_collect_single_ticker(self, engine):
        result = engine.collect("acoes_yfinance", tickers=["PETR4"], start_date=None, end_date=None)

        assert result.module_name == "acoes_yfinance"
        assert result.total_records > 0
        assert "PETR4" in result.tickers_success

    def test_collect_multiple_tickers(self, engine):
        result = engine.collect(
            "acoes_yfinance",
            tickers=["PETR4", "VALE3"],
        )

        assert result.total_records > 0
        assert len(result.tickers_success) >= 1
