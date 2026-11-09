"""Motor de cálculo de métricas quantitativas de risco/retorno e comparação multi-ativos."""

from typing import Dict, List, Optional
import numpy as np
import pandas as pd

from analise_quant.models import (
    ComparisonPoint,
    ComparisonResponse,
    ComparisonSeries,
    MarketData,
    RiskMetrics,
)


def _to_price_series(data: List[MarketData]) -> pd.Series:
    if not data:
        return pd.Series(dtype=float)
    records = [
        {
            "date": pd.to_datetime(d.date).normalize(),
            "price": float(d.adjusted_close if d.adjusted_close is not None else d.close),
        }
        for d in data
    ]
    df = pd.DataFrame(records).drop_duplicates(subset=["date"]).set_index("date").sort_index()
    return df["price"]


def compute_risk_metrics(
    ticker: str,
    period_days: int,
    asset_data: List[MarketData],
    cdi_data: Optional[List[MarketData]] = None,
    ibov_data: Optional[List[MarketData]] = None,
) -> RiskMetrics:
    """Calcula Retorno Total, CAGR, Volatilidade (252 DU), Sharpe Ratio, Max Drawdown e Beta vs IBOV."""
    s_asset = _to_price_series(asset_data)
    if len(s_asset) < 2:
        return RiskMetrics(
            ticker=ticker,
            period_days=period_days,
            total_return=0.0,
            cagr=0.0,
            volatility=0.0,
            sharpe_ratio=0.0,
            max_drawdown=0.0,
        )

    daily_ret = s_asset.pct_change().dropna()
    n_obs = max(len(daily_ret), 1)

    total_return = float((s_asset.iloc[-1] / s_asset.iloc[0]) - 1.0)
    cagr = float(((1.0 + total_return) ** (252.0 / n_obs)) - 1.0)
    vol_annual = float(daily_ret.std(ddof=1) * np.sqrt(252.0)) if len(daily_ret) > 1 else 0.0

    # Max Drawdown
    cum_curve = (1.0 + daily_ret).cumprod()
    running_max = cum_curve.cummax()
    drawdowns = (cum_curve / running_max) - 1.0
    max_dd = float(drawdowns.min()) if not drawdowns.empty else 0.0

    # CDI no período
    cdi_return = 0.0
    if cdi_data:
        s_cdi = _to_price_series(cdi_data)
        if len(s_cdi) >= 2:
            cdi_return = float((s_cdi.iloc[-1] / s_cdi.iloc[0]) - 1.0)
    else:
        cdi_return = float(((1.0 + 0.1065) ** (n_obs / 252.0)) - 1.0)

    rf_annual = float(((1.0 + cdi_return) ** (252.0 / n_obs)) - 1.0)
    sharpe = float((cagr - rf_annual) / vol_annual) if vol_annual > 1e-6 else 0.0

    pct_cdi = float(total_return / cdi_return) if abs(cdi_return) > 1e-6 else None

    # IBOV e Beta
    ibov_return: Optional[float] = None
    beta_ibov: Optional[float] = None
    if ibov_data:
        s_ibov = _to_price_series(ibov_data)
        if len(s_ibov) >= 2:
            ibov_return = float((s_ibov.iloc[-1] / s_ibov.iloc[0]) - 1.0)
            ibov_ret = s_ibov.pct_change().dropna()
            aligned = pd.concat([daily_ret.rename("asset"), ibov_ret.rename("ibov")], axis=1).dropna()
            if len(aligned) > 5:
                var_ibov = float(aligned["ibov"].var(ddof=1))
                if var_ibov > 1e-10:
                    cov = float(aligned["asset"].cov(aligned["ibov"]))
                    beta_ibov = round(cov / var_ibov, 3)

    return RiskMetrics(
        ticker=ticker.upper(),
        period_days=period_days,
        total_return=round(total_return, 4),
        cagr=round(cagr, 4),
        volatility=round(vol_annual, 4),
        sharpe_ratio=round(sharpe, 2),
        max_drawdown=round(max_dd, 4),
        beta_ibov=beta_ibov,
        cdi_return=round(cdi_return, 4),
        pct_cdi=round(pct_cdi, 3) if pct_cdi is not None else None,
        ibov_return=round(ibov_return, 4) if ibov_return is not None else None,
    )


def build_comparison_response(
    period_days: int,
    series_map: Dict[str, List[MarketData]],
    benchmarks: Optional[set[str]] = None,
) -> ComparisonResponse:
    """Normaliza múltiplas séries de ativos/benchmarks em retorno acumulado (%) e calcula correlações."""
    benchmark_names = benchmarks or {"CDI", "SELIC", "IPCA", "IBOV"}
    comparison_list: List[ComparisonSeries] = []
    returns_df_dict: Dict[str, pd.Series] = {}

    # Determina retorno anualizado do CDI para Sharpe
    rf_annual = 0.1065
    if "CDI" in series_map:
        s_cdi = _to_price_series(series_map["CDI"])
        if len(s_cdi) >= 2:
            cdi_tot = float((s_cdi.iloc[-1] / s_cdi.iloc[0]) - 1.0)
            rf_annual = float(((1.0 + cdi_tot) ** (252.0 / max(len(s_cdi) - 1, 1))) - 1.0)

    for name, mdata in series_map.items():
        s_price = _to_price_series(mdata)
        if len(s_price) < 2:
            continue

        base_price = float(s_price.iloc[0])
        cum_pct_series = ((s_price / base_price) - 1.0) * 100.0
        daily_ret = s_price.pct_change().dropna()
        returns_df_dict[name] = daily_ret

        n_obs = max(len(daily_ret), 1)
        tot_ret = float((s_price.iloc[-1] / base_price) - 1.0)
        cagr = float(((1.0 + tot_ret) ** (252.0 / n_obs)) - 1.0)
        vol = float(daily_ret.std(ddof=1) * np.sqrt(252.0)) if len(daily_ret) > 1 else 0.0

        cum_curve = (1.0 + daily_ret).cumprod()
        dd = (cum_curve / cum_curve.cummax()) - 1.0
        max_dd = float(dd.min()) if not dd.empty else 0.0
        sharpe = float((cagr - rf_annual) / vol) if vol > 1e-4 else None

        points = [
            ComparisonPoint(
                date=idx.strftime("%Y-%m-%d"),
                cumulative_return=round(float(val), 2),
            )
            for idx, val in cum_pct_series.items()
        ]

        comparison_list.append(
            ComparisonSeries(
                name=name,
                category="benchmark" if name in benchmark_names else "asset",
                total_return_pct=round(tot_ret * 100.0, 2),
                volatility_pct=round(vol * 100.0, 2),
                sharpe=round(sharpe, 2) if sharpe is not None else None,
                max_drawdown_pct=round(max_dd * 100.0, 2),
                points=points,
            )
        )

    correlations: Dict[str, Dict[str, float]] = {}
    if len(returns_df_dict) >= 2:
        ret_df = pd.DataFrame(returns_df_dict).dropna(how="all")
        corr_matrix = ret_df.corr().fillna(0.0)
        for row_name in corr_matrix.index:
            correlations[str(row_name)] = {
                str(col_name): round(float(corr_matrix.loc[row_name, col_name]), 2)
                for col_name in corr_matrix.columns
            }

    return ComparisonResponse(
        period_days=period_days,
        series=comparison_list,
        correlations=correlations,
    )
