"""Testes dos novos módulos do mercado financeiro brasileiro, cache persistente e motor quantitativo."""

from datetime import date, datetime, timedelta
import pytest

from analise_quant.analytics import build_comparison_response, compute_risk_metrics
from analise_quant.cache import PersistentCache, _resolve_db_path
from analise_quant.engine import CollectionEngine
from analise_quant.models import CollectionStatus, MarketData
from analise_quant.modules.acoes.fundamentos_collector import get_fundamental_indicators
from analise_quant.modules.fundos.cvm_collector import list_reference_funds
from analise_quant.modules.renda_fixa.tesouro_collector import (
    get_brazil_yield_curve,
    list_tesouro_bonds,
)


class TestPersistentCache:
    def test_set_get_and_ttl(self, tmp_path):
        db_file = str(tmp_path / "test_cache.db")
        cache = PersistentCache(db_path=db_file, default_ttl=60)
        cache.set("k1", {"valor": 123})
        assert cache.get("k1") == {"valor": 123}

        # Expirado
        cache.set("k2", {"valor": 456}, ttl=-1)
        assert cache.get("k2") is None

        cache.clear()
        assert cache.get("k1") is None

    def test_vercel_fallback_path(self, monkeypatch):
        monkeypatch.setenv("VERCEL", "1")
        path = _resolve_db_path()
        assert str(path) == "/tmp/analise_quant_cache.db"


class TestBrazilianMarketModules:
    def test_all_new_modules_registered(self):
        engine = CollectionEngine()
        modules = engine.list_modules()
        assert "acoes_yfinance" in modules
        assert "bcb_sgs" in modules
        assert "fiis_yfinance" in modules
        assert "tesouro_direto" in modules
        assert "fundos_cvm" in modules

    def test_symbol_routing(self):
        engine = CollectionEngine()
        assert engine.resolve_module_for_symbol("CDI") == "bcb_sgs"
        assert engine.resolve_module_for_symbol("SELIC") == "bcb_sgs"
        assert engine.resolve_module_for_symbol("IPCA") == "bcb_sgs"
        assert engine.resolve_module_for_symbol("HGLG11") == "fiis_yfinance"
        assert engine.resolve_module_for_symbol("TAEE11") == "acoes_yfinance"
        assert engine.resolve_module_for_symbol("TESOURO_IPCA") == "tesouro_direto"
        assert engine.resolve_module_for_symbol("VERDE_FIM") == "fundos_cvm"
        assert engine.resolve_module_for_symbol("PETR4") == "acoes_yfinance"

    def test_bcb_collector_with_mocked_sgs(self, monkeypatch):
        monkeypatch.setattr(
            "analise_quant.modules.macro.bcb_collector.fetch_bcb_sgs_series",
            lambda code, d1, d2: [
                {"data": "02/01/2026", "valor": "0.04"},
                {"data": "03/01/2026", "valor": "0.04"},
                {"data": "06/01/2026", "valor": "0.04"},
            ],
        )
        engine = CollectionEngine(cache_ttl=0)
        res = engine.collect("bcb_sgs", ["CDI"], date(2026, 1, 1), date(2026, 1, 10))
        assert res.status == CollectionStatus.SUCCESS
        assert res.total_records == 3
        assert res.data[-1].close > 100.0

    def test_tesouro_and_cvm_collectors(self):
        engine = CollectionEngine(cache_ttl=0)
        start = date.today() - timedelta(days=20)
        end = date.today()

        t_res = engine.collect("tesouro_direto", ["TESOURO_IPCA"], start, end)
        assert t_res.status == CollectionStatus.SUCCESS
        assert t_res.total_records > 0

        f_res = engine.collect("fundos_cvm", ["VERDE_FIM"], start, end)
        assert f_res.status == CollectionStatus.SUCCESS
        assert f_res.total_records > 0

        assert len(get_brazil_yield_curve()) >= 5
        assert len(list_tesouro_bonds()) >= 5
        assert len(list_reference_funds()) >= 4

    def test_fundamentals_indicators_stocks_and_fiis(self, monkeypatch):
        class DummyTicker:
            info = {}

        monkeypatch.setattr(
            "analise_quant.modules.acoes.fundamentos_collector.yf.Ticker",
            lambda *args, **kwargs: DummyTicker(),
        )
        petr = get_fundamental_indicators("PETR4")
        assert petr.ticker == "PETR4"
        assert petr.asset_type == "acoes"
        assert petr.pl is not None

        hglg = get_fundamental_indicators("HGLG11")
        assert hglg.ticker == "HGLG11"
        assert hglg.asset_type == "fiis"
        assert hglg.pvp is not None


class TestQuantitativeAnalytics:
    def test_compute_risk_metrics_and_comparison(self):
        base_dt = datetime(2025, 1, 1)
        asset_series = [
            MarketData(
                ticker="PETR4",
                date=base_dt + timedelta(days=i),
                open=100.0 + i * 0.5,
                high=101.0 + i * 0.5,
                low=99.0 + i * 0.5,
                close=100.0 + i * 0.5,
                adjusted_close=100.0 + i * 0.5,
                volume=1000,
                source="test",
            )
            for i in range(30)
        ]
        cdi_series = [
            MarketData(
                ticker="CDI",
                date=base_dt + timedelta(days=i),
                open=100.0 + i * 0.1,
                high=100.0 + i * 0.1,
                low=100.0 + i * 0.1,
                close=100.0 + i * 0.1,
                adjusted_close=100.0 + i * 0.1,
                volume=0,
                source="test",
            )
            for i in range(30)
        ]

        metrics = compute_risk_metrics(
            ticker="PETR4",
            period_days=30,
            asset_data=asset_series,
            cdi_data=cdi_series,
            ibov_data=cdi_series,
        )
        assert metrics.total_return > 0
        assert metrics.cagr > 0
        assert metrics.pct_cdi is not None and metrics.pct_cdi > 1.0

        comp = build_comparison_response(
            period_days=30,
            series_map={"PETR4": asset_series, "CDI": cdi_series},
        )
        assert len(comp.series) == 2
        assert "PETR4" in comp.correlations
        assert comp.series[0].points[0].cumulative_return == 0.0

    def test_technical_decision_and_b3_scanner(self):
        import pandas as pd
        from analise_quant.technical_decision import (
            analyze_technical_decision,
            run_b3_opportunity_scanner,
        )

        days = pd.bdate_range(start="2025-01-02", periods=65)
        series = [
            MarketData(
                ticker="PETR4",
                date=ts.to_pydatetime(),
                open=34.0 + i * 0.08,
                high=34.3 + i * 0.08,
                low=33.8 + i * 0.08,
                close=34.1 + i * 0.08,
                adjusted_close=34.1 + i * 0.08,
                volume=10_000_000 if i < 64 else 6_800_000,
                currency="BRL",
                source="test",
            )
            for i, ts in enumerate(days)
        ]

        fund = get_fundamental_indicators("PETR4")
        decision = analyze_technical_decision("PETR4", series, fundamentals=fund)

        assert decision.ticker == "PETR4"
        assert 5 <= decision.signal_score <= 98
        assert decision.ma5 > decision.ma10 > decision.ma20
        assert len(decision.strategies) == 6
        assert any(s.id == "bull_trend" and s.status == "APROVADO" for s in decision.strategies)
        assert decision.ideal_entry_price > 0
        assert decision.stop_loss_price > 0

        scanner_items = run_b3_opportunity_scanner(
            series_provider=lambda _sym: [],
            fundamentals_provider=get_fundamental_indicators,
            asset_class_filter="ALL",
        )
        assert len(scanner_items) >= 10
        assert scanner_items[0].signal_score >= scanner_items[-1].signal_score

        fii_items = run_b3_opportunity_scanner(
            series_provider=lambda _sym: [],
            fundamentals_provider=get_fundamental_indicators,
            asset_class_filter="FII",
        )
        assert all(it.asset_class == "FII" for it in fii_items)

