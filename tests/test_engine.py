"""Testes do CollectionEngine."""

from datetime import date, datetime
import pandas as pd
import pytest

from analise_quant.engine import CollectionEngine
from analise_quant.exceptions import ModuleNotFoundError as AQModuleNotFoundError
from analise_quant.models import MarketData


def _make_mock_df(tickers: list[str]) -> pd.DataFrame:
    dates = pd.date_range("2026-01-05", periods=5, freq="D")
    columns = pd.MultiIndex.from_product(
        [["Open", "High", "Low", "Close", "Adj Close", "Volume"], tickers]
    )
    data = []
    for i in range(len(dates)):
        row = []
        for col in ["Open", "High", "Low", "Close", "Adj Close", "Volume"]:
            for _ in tickers:
                row.append(1000 if col == "Volume" else 30.0 + i)
        data.append(row)
    return pd.DataFrame(data, index=dates, columns=columns)


@pytest.fixture
def engine():
    eng = CollectionEngine()
    eng.clear_cache()
    return eng


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

    def test_collect_single_ticker(self, engine, monkeypatch):
        monkeypatch.setattr(
            "analise_quant.modules.acoes.yfinance_collector.yf.download",
            lambda *args, **kwargs: _make_mock_df(["PETR4.SA"]),
        )
        result = engine.collect(
            "acoes_yfinance", tickers=["PETR4"], start_date=None, end_date=None
        )

        assert result.module_name == "acoes_yfinance"
        assert result.total_records == 5
        assert "PETR4" in result.tickers_success

    def test_collect_multiple_tickers(self, engine, monkeypatch):
        monkeypatch.setattr(
            "analise_quant.modules.acoes.yfinance_collector.yf.download",
            lambda *args, **kwargs: _make_mock_df(["PETR4.SA", "VALE3.SA"]),
        )
        result = engine.collect(
            "acoes_yfinance",
            tickers=["PETR4", "VALE3"],
        )

        assert result.total_records == 10
        assert set(result.tickers_success) == {"PETR4", "VALE3"}

    def test_collect_all_executes_registered_modules(self, engine, monkeypatch):
        monkeypatch.setattr(
            "analise_quant.modules.acoes.yfinance_collector.yf.download",
            lambda *args, **kwargs: _make_mock_df(["PETR4.SA"]),
        )
        results = engine.collect_all(tickers=["PETR4"])

        assert "acoes_yfinance" in results
        assert results["acoes_yfinance"].total_records == 5

    def test_collect_uses_cache(self, engine, monkeypatch):
        call_count = 0

        def fake_download(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            return _make_mock_df(["PETR4.SA"])

        monkeypatch.setattr(
            "analise_quant.modules.acoes.yfinance_collector.yf.download",
            fake_download,
        )
        start = date(2026, 1, 1)
        end = date(2026, 1, 15)

        r1 = engine.collect("acoes_yfinance", ["PETR4"], start, end)
        r2 = engine.collect("acoes_yfinance", ["petr4"], start, end)

        assert call_count == 1
        assert r1 is r2

        engine.clear_cache()
        engine.collect("acoes_yfinance", ["PETR4"], start, end)
        assert call_count == 2

    def test_calculate_monthly_returns(self, engine):
        data = [
            MarketData(
                ticker="PETR4",
                date=datetime(2024, 12, 30),
                open=100.0,
                high=100.0,
                low=100.0,
                close=100.0,
                adjusted_close=100.0,
                volume=1000,
                source="yfinance",
            ),
            MarketData(
                ticker="PETR4",
                date=datetime(2025, 1, 31),
                open=110.0,
                high=110.0,
                low=110.0,
                close=110.0,
                adjusted_close=110.0,
                volume=1000,
                source="yfinance",
            ),
            MarketData(
                ticker="PETR4",
                date=datetime(2025, 2, 28),
                open=121.0,
                high=121.0,
                low=121.0,
                close=121.0,
                adjusted_close=121.0,
                volume=1000,
                source="yfinance",
            ),
        ]

        perf = engine.calculate_monthly_returns(data)
        assert len(perf) == 1
        assert perf[0].year == 2025
        assert pytest.approx(perf[0].returns[1], rel=1e-4) == 0.10
        assert pytest.approx(perf[0].returns[2], rel=1e-4) == 0.10
        assert pytest.approx(perf[0].ytd, rel=1e-4) == 0.21

