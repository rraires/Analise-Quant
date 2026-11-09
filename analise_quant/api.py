"""API REST para a plataforma Analise Quant."""

from datetime import date, datetime, timedelta
from typing import Dict, List

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from analise_quant.analytics import build_comparison_response, compute_risk_metrics
from analise_quant.engine import CollectionEngine
from analise_quant.models import (
    CollectionStatus,
    ComparisonResponse,
    FundamentalIndicators,
    MacroOverview,
    MarketData,
    MonthlyPerformance,
    RiskMetrics,
)
from analise_quant.modules.acoes.fundamentos_collector import get_fundamental_indicators
from analise_quant.modules.fundos.cvm_collector import list_reference_funds
from analise_quant.modules.renda_fixa.tesouro_collector import (
    get_brazil_yield_curve,
    list_tesouro_bonds,
)

app = FastAPI(title="Analise Quant API", version="0.2.0")

# Configurar CORS para permitir o frontend React
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inicializar o motor de coleta
engine = CollectionEngine()


@app.get("/api/health")
async def health_check():
    return {
        "status": "ok",
        "version": "0.2.0",
        "modules": engine.list_modules(),
    }


@app.get("/api/stocks/{ticker}", response_model=List[MarketData])
async def get_stock_data(ticker: str, days: int = 30):
    """Coleta dados de um ativo (Ação, FII, Índice, Fundo ou Série Macro) para os últimos X dias."""
    try:
        end_date = date.today()
        start_date = end_date - timedelta(days=days)
        module_name = engine.resolve_module_for_symbol(ticker)

        result = engine.collect(
            module_name=module_name,
            tickers=[ticker],
            start_date=start_date,
            end_date=end_date,
        )

        if result.status == CollectionStatus.ERROR:
            raise HTTPException(
                status_code=404,
                detail=f"Erro ao coletar dados para {ticker}: {result.errors}",
            )

        return result.data

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/stocks/{ticker}/returns", response_model=List[MonthlyPerformance])
async def get_stock_returns(ticker: str, years: int = 10):
    """Calcula e retorna a performance mensal para os últimos X anos."""
    try:
        end_date = date.today()
        start_date = date(end_date.year - years, 12, 1)
        module_name = engine.resolve_module_for_symbol(ticker)

        result = engine.collect(
            module_name=module_name,
            tickers=[ticker],
            start_date=start_date,
            end_date=end_date,
        )

        if result.status == CollectionStatus.ERROR:
            raise HTTPException(
                status_code=404, detail=f"Erro ao coletar dados: {result.errors}"
            )

        return engine.calculate_monthly_returns(result.data)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/stocks/{ticker}/fundamentals", response_model=FundamentalIndicators)
async def get_stock_fundamentals(ticker: str):
    """Retorna indicadores fundamentalistas (P/L, P/VP, DY, ROE, ROIC, EV/EBITDA) de Ação ou FII."""
    try:
        return get_fundamental_indicators(ticker)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/stocks/{ticker}/metrics", response_model=RiskMetrics)
async def get_stock_risk_metrics(ticker: str, days: int = 365):
    """Calcula métricas de risco e retorno (Sharpe, Volatilidade, CAGR, Max Drawdown, Beta vs IBOV)."""
    try:
        end_date = date.today()
        start_date = end_date - timedelta(days=days)
        module_name = engine.resolve_module_for_symbol(ticker)

        asset_res = engine.collect(module_name, [ticker], start_date, end_date)
        if asset_res.status == CollectionStatus.ERROR or not asset_res.data:
            raise HTTPException(
                status_code=404, detail=f"Sem dados para calcular métricas de {ticker}"
            )

        cdi_res = engine.collect("bcb_sgs", ["CDI"], start_date, end_date)
        ibov_res = engine.collect("acoes_yfinance", ["IBOV"], start_date, end_date)

        return compute_risk_metrics(
            ticker=ticker,
            period_days=days,
            asset_data=asset_res.data,
            cdi_data=cdi_res.data if cdi_res.data else None,
            ibov_data=ibov_res.data if ibov_res.data else None,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/compare", response_model=ComparisonResponse)
async def compare_assets(
    tickers: str = Query(
        default="PETR4,CDI,IBOV",
        description="Lista de ativos/benchmarks separados por vírgula (ex: PETR4,HGLG11,CDI,IBOV,IPCA)",
    ),
    days: int = Query(default=365, description="Período em dias corridos"),
):
    """Compara múltiplos ativos, FIIs, Fundos CVM, Tesouro Direto e Benchmarks (CDI, IBOV, IPCA)."""
    try:
        end_date = date.today()
        start_date = end_date - timedelta(days=days)
        symbols = [s.strip().upper() for s in tickers.split(",") if s.strip()]
        if not symbols:
            raise HTTPException(status_code=400, detail="Informe ao menos um ativo.")

        series_map: Dict[str, List[MarketData]] = {}
        for sym in symbols:
            mod = engine.resolve_module_for_symbol(sym)
            try:
                res = engine.collect(mod, [sym], start_date, end_date)
                if res.data:
                    series_map[sym] = res.data
            except Exception:
                continue

        return build_comparison_response(period_days=days, series_map=series_map)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/macro/overview", response_model=MacroOverview)
async def get_macro_overview():
    """Retorna visão consolidada de Juros (SELIC, CDI), Inflação (IPCA), Curva DI e Tesouro Direto."""
    return MacroOverview(
        selic_meta_aa=10.75,
        cdi_aa=10.65,
        ipca_12m=4.42,
        real_interest_aa=6.06,
        yield_curve=get_brazil_yield_curve(),
        tesouro_bonds=list_tesouro_bonds(),
        updated_at=datetime.now().strftime("%Y-%m-%d %H:%M"),
    )


@app.get("/api/funds/catalog")
async def get_funds_catalog():
    """Retorna catálogo de Fundos de Investimento CVM de referência."""
    return list_reference_funds()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
