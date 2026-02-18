"""Testes do módulo YFinance de ações."""

from datetime import date, timedelta

import pytest

from analise_quant.models import AssetType, CollectionStatus
from analise_quant.modules.acoes.yfinance_collector import YFinanceAcoesCollector


@pytest.fixture
def collector():
    return YFinanceAcoesCollector()


class TestYFinanceAcoesCollector:
    def test_get_info(self, collector):
        info = collector.get_info()
        assert info.name == "acoes_yfinance"
        assert info.asset_type == AssetType.ACOES
        assert info.source == "yfinance"

    def test_format_ticker_adds_suffix(self, collector):
        assert collector._format_ticker("PETR4") == "PETR4.SA"
        assert collector._format_ticker("petr4") == "PETR4.SA"
        assert collector._format_ticker("PETR4.SA") == "PETR4.SA"

    def test_parse_ticker_removes_suffix(self, collector):
        assert collector._parse_ticker("PETR4.SA") == "PETR4"
        assert collector._parse_ticker("PETR4") == "PETR4"

    def test_collect_returns_data(self, collector):
        end_date = date.today()
        start_date = end_date - timedelta(days=30)

        result = collector.collect(["PETR4"], start_date, end_date)

        assert result.status in (CollectionStatus.SUCCESS, CollectionStatus.PARTIAL)
        assert result.total_records > 0
        assert result.data[0].ticker == "PETR4"
        assert result.data[0].source == "yfinance"
        assert result.data[0].currency == "BRL"

    def test_collect_invalid_ticker_reports_error(self, collector):
        end_date = date.today()
        start_date = end_date - timedelta(days=5)

        result = collector.collect(["XYZINVALIDO999"], start_date, end_date)

        assert result.status in (CollectionStatus.ERROR, CollectionStatus.PARTIAL)

    def test_collect_multiple_tickers(self, collector):
        end_date = date.today()
        start_date = end_date - timedelta(days=10)

        result = collector.collect(["PETR4", "VALE3"], start_date, end_date)

        assert result.total_records > 0
        tickers_in_data = {d.ticker for d in result.data}
        assert "PETR4" in tickers_in_data or "VALE3" in tickers_in_data
