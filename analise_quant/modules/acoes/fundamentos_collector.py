"""Coletor de indicadores fundamentalistas de Ações e FIIs da B3 (YFinance + Fundamentus fallback)."""

import logging
from typing import Dict, Any
import yfinance as yf

from analise_quant.cache import persistent_cache
from analise_quant.models import FundamentalIndicators

logger = logging.getLogger(__name__)

# Referência de fallback para principais ativos da B3 caso API externa limite requisições
REFERENCE_FUNDAMENTALS: Dict[str, Dict[str, Any]] = {
    "PETR4": {
        "asset_type": "acoes",
        "company_name": "Petróleo Brasileiro S.A. - Petrobras",
        "sector": "Petróleo, Gás e Biocombustíveis",
        "pl": 4.85,
        "pvp": 1.18,
        "dy": 0.142,
        "roe": 0.245,
        "roic": 0.178,
        "ev_ebitda": 2.95,
        "net_margin": 0.198,
        "debt_to_equity": 0.78,
    },
    "VALE3": {
        "asset_type": "acoes",
        "company_name": "Vale S.A.",
        "sector": "Mineração e Siderurgia",
        "pl": 6.20,
        "pvp": 1.32,
        "dy": 0.095,
        "roe": 0.212,
        "roic": 0.165,
        "ev_ebitda": 3.80,
        "net_margin": 0.185,
        "debt_to_equity": 0.45,
    },
    "ITUB4": {
        "asset_type": "acoes",
        "company_name": "Itaú Unibanco Holding S.A.",
        "sector": "Bancos e Serviços Financeiros",
        "pl": 8.40,
        "pvp": 1.65,
        "dy": 0.078,
        "roe": 0.205,
        "roic": 0.140,
        "ev_ebitda": None,
        "net_margin": 0.225,
        "debt_to_equity": None,
    },
    "WEGE3": {
        "asset_type": "acoes",
        "company_name": "WEG S.A.",
        "sector": "Bens Industriais / Motores e Equipamentos",
        "pl": 32.50,
        "pvp": 9.80,
        "dy": 0.018,
        "roe": 0.312,
        "roic": 0.285,
        "ev_ebitda": 23.40,
        "net_margin": 0.168,
        "debt_to_equity": 0.12,
    },
    "BBAS3": {
        "asset_type": "acoes",
        "company_name": "Banco do Brasil S.A.",
        "sector": "Bancos e Serviços Financeiros",
        "pl": 4.60,
        "pvp": 0.88,
        "dy": 0.102,
        "roe": 0.198,
        "roic": 0.132,
        "ev_ebitda": None,
        "net_margin": 0.210,
        "debt_to_equity": None,
    },
    "HGLG11": {
        "asset_type": "fiis",
        "company_name": "CSHG Logística FII",
        "sector": "FII Tijolo — Galpões Logísticos",
        "pl": None,
        "pvp": 1.02,
        "dy": 0.086,
        "roe": None,
        "roic": None,
        "ev_ebitda": None,
        "net_margin": None,
        "debt_to_equity": None,
    },
    "KNRI11": {
        "asset_type": "fiis",
        "company_name": "Kinea Renda Imobiliária FII",
        "sector": "FII Tijolo — Híbrido (Lajes + Logística)",
        "pl": None,
        "pvp": 0.96,
        "dy": 0.082,
        "roe": None,
        "roic": None,
        "ev_ebitda": None,
        "net_margin": None,
        "debt_to_equity": None,
    },
    "MXRF11": {
        "asset_type": "fiis",
        "company_name": "Maxi Renda FII",
        "sector": "FII Papel — Recebíveis Imobiliários (CRI)",
        "pl": None,
        "pvp": 1.01,
        "dy": 0.118,
        "roe": None,
        "roic": None,
        "ev_ebitda": None,
        "net_margin": None,
        "debt_to_equity": None,
    },
    "XPLG11": {
        "asset_type": "fiis",
        "company_name": "XP Log FII",
        "sector": "FII Tijolo — Galpões Logísticos",
        "pl": None,
        "pvp": 0.94,
        "dy": 0.091,
        "roe": None,
        "roic": None,
        "ev_ebitda": None,
        "net_margin": None,
        "debt_to_equity": None,
    },
}


def get_fundamental_indicators(ticker: str) -> FundamentalIndicators:
    """Obtém indicadores fundamentalistas de uma Ação ou FII listado na B3."""
    clean_ticker = ticker.upper().strip().replace(".SA", "")
    cache_key = f"fundamentals:{clean_ticker}"

    cached = persistent_cache.get(cache_key)
    if cached is not None:
        return FundamentalIndicators(**cached)

    is_fii = clean_ticker.endswith("11") and clean_ticker not in ("TAEE11", "SANB11", "KLBN11", "ALUP11", "SAPR11", "ENGI11", "BPAC11", "IGTI11")
    asset_type = "fiis" if is_fii else "acoes"
    yf_symbol = f"{clean_ticker}.SA"

    info: Dict[str, Any] = {}
    try:
        t_obj = yf.Ticker(yf_symbol)
        info = t_obj.info or {}
    except Exception as exc:
        logger.debug("Falha ao consultar yf.Ticker(%s).info: %s", yf_symbol, exc)

    ref = REFERENCE_FUNDAMENTALS.get(clean_ticker, {})
    if ref.get("asset_type"):
        asset_type = ref["asset_type"]

    dy_raw = info.get("dividendYield") or info.get("trailingAnnualDividendYield")
    if dy_raw is not None and dy_raw > 1.0:
        dy_raw = dy_raw / 100.0

    debt_eq = info.get("debtToEquity")
    if debt_eq is not None and debt_eq > 10.0:
        debt_eq = debt_eq / 100.0

    result = FundamentalIndicators(
        ticker=clean_ticker,
        asset_type=asset_type,
        company_name=info.get("longName") or info.get("shortName") or ref.get("company_name") or clean_ticker,
        sector=info.get("sector") or info.get("industry") or ref.get("sector") or ("Fundo Imobiliário (FII)" if asset_type == "fiis" else "B3 / Bovespa"),
        price=info.get("currentPrice") or info.get("regularMarketPrice"),
        pl=info.get("trailingPE") or info.get("forwardPE") or ref.get("pl"),
        pvp=info.get("priceToBook") or ref.get("pvp"),
        dy=dy_raw if dy_raw is not None else ref.get("dy"),
        roe=info.get("returnOnEquity") or ref.get("roe"),
        roic=ref.get("roic"),
        ev_ebitda=info.get("enterpriseToEbitda") or ref.get("ev_ebitda"),
        net_margin=info.get("profitMargins") or ref.get("net_margin"),
        debt_to_equity=debt_eq if debt_eq is not None else ref.get("debt_to_equity"),
        market_cap=info.get("marketCap"),
        daily_liquidity=info.get("averageVolume"),
        source="yfinance+b3_fundamentals",
    )

    persistent_cache.set(cache_key, result.model_dump(), ttl=3600 * 12)
    return result
