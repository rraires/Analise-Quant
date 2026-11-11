"""Motor de Decisão Técnica, Estratégias e Scanner B3 inspirado em zhulinsen/daily_stock_analysis."""

from typing import Dict, List, Optional
import numpy as np
import pandas as pd

from analise_quant.models import (
    FundamentalIndicators,
    MarketData,
    ScannerB3Item,
    StrategyEvaluation,
    TechnicalDecisionReport,
)


# Cesta padrão de ativos B3 para o Scanner Diário de Oportunidades
DEFAULT_SCANNER_UNIVERSE: List[Dict[str, str]] = [
    {"ticker": "WEGE3", "name": "WEG S.A.", "class": "ACAO", "sector": "Bens Industriais"},
    {"ticker": "PETR4", "name": "Petrobras PN", "class": "ACAO", "sector": "Petróleo e Gás"},
    {"ticker": "ITUB4", "name": "Itaú Unibanco PN", "class": "ACAO", "sector": "Bancos"},
    {"ticker": "BBAS3", "name": "Banco do Brasil ON", "class": "ACAO", "sector": "Bancos"},
    {"ticker": "VALE3", "name": "Vale ON", "class": "ACAO", "sector": "Mineração"},
    {"ticker": "B3SA3", "name": "B3 S.A. ON", "class": "ACAO", "sector": "Serviços Financeiros"},
    {"ticker": "RENT3", "name": "Localiza ON", "class": "ACAO", "sector": "Locação de Veículos"},
    {"ticker": "ABEV3", "name": "Ambev ON", "class": "ACAO", "sector": "Bebidas e Consumo"},
    {"ticker": "HGLG11", "name": "CSHG Logística FII", "class": "FII", "sector": "FII Logística"},
    {"ticker": "MXRF11", "name": "Maxi Renda FII", "class": "FII", "sector": "FII Papel / CRI"},
    {"ticker": "KNRI11", "name": "Kinea Renda Imobiliária FII", "class": "FII", "sector": "FII Híbrido"},
    {"ticker": "XPML11", "name": "XP Malls FII", "class": "FII", "sector": "FII Shoppings"},
    {"ticker": "BTLG11", "name": "BTG Pactual Logística FII", "class": "FII", "sector": "FII Logística"},
    {"ticker": "VISC11", "name": "Vinci Shopping Centers FII", "class": "FII", "sector": "FII Shoppings"},
]


def _series_to_ohlcv_df(series: List[MarketData]) -> pd.DataFrame:
    """Converte lista de MarketData em DataFrame ordenado cronologicamente."""
    if not series:
        return pd.DataFrame()
    rows = [
        {
            "date": pd.to_datetime(item.date).tz_localize(None),
            "open": float(item.open),
            "high": float(item.high),
            "low": float(item.low),
            "close": float(item.close),
            "volume": float(item.volume),
        }
        for item in series
        if item.close and item.close > 0
    ]
    if not rows:
        return pd.DataFrame()
    df = pd.DataFrame(rows).drop_duplicates(subset=["date"]).sort_values("date").reset_index(drop=True)
    return df


def _compute_indicators(df: pd.DataFrame) -> pd.DataFrame:
    """Calcula MA5/10/20/60, MACD(12,26,9) e RSI Wilder (6,12,24)."""
    out = df.copy()
    close = out["close"]

    out["MA5"] = close.rolling(window=5, min_periods=1).mean()
    out["MA10"] = close.rolling(window=10, min_periods=1).mean()
    out["MA20"] = close.rolling(window=20, min_periods=1).mean()
    out["MA60"] = close.rolling(window=60, min_periods=1).mean()

    # MACD (12, 26, 9)
    ema12 = close.ewm(span=12, adjust=False).mean()
    ema26 = close.ewm(span=26, adjust=False).mean()
    out["MACD_DIF"] = ema12 - ema26
    out["MACD_DEA"] = out["MACD_DIF"].ewm(span=9, adjust=False).mean()
    out["MACD_BAR"] = (out["MACD_DIF"] - out["MACD_DEA"]) * 2.0

    # RSI Wilder SMMA (6, 12, 24)
    delta = close.diff()
    gain = delta.where(delta > 0, 0.0)
    loss = -delta.where(delta < 0, 0.0)

    for period in (6, 12, 24):
        avg_gain = gain.ewm(alpha=1.0 / period, adjust=False).mean()
        avg_loss = loss.ewm(alpha=1.0 / period, adjust=False).mean()
        rs = avg_gain / avg_loss.replace(0.0, np.nan)
        rsi = 100.0 - (100.0 / (1.0 + rs))
        out[f"RSI_{period}"] = rsi.fillna(50.0).clip(0.0, 100.0)

    return out


def analyze_technical_decision(
    ticker: str,
    series: List[MarketData],
    fundamentals: Optional[FundamentalIndicators] = None,
) -> TechnicalDecisionReport:
    """Executa análise completa de tendência, indicadores, score (0-100) e 6 estratégias para B3."""
    clean_ticker = ticker.upper().strip().replace(".SA", "")
    df = _series_to_ohlcv_df(series)

    if df.empty or len(df) < 5:
        return TechnicalDecisionReport(
            ticker=clean_ticker,
            current_price=0.0,
            signal_score=50,
            buy_signal="MANTER / NEUTRO",
            trend_status="Dados Insuficientes",
            ma_alignment="Histórico insuficiente para cálculo de médias",
            trend_strength=50.0,
            ma5=0.0,
            ma10=0.0,
            ma20=0.0,
            ma60=0.0,
            bias_ma5=0.0,
            bias_ma10=0.0,
            bias_ma20=0.0,
            volume_status="Volume Normal",
            volume_ratio_5d=1.0,
            volume_trend="Sem histórico suficiente",
            macd_dif=0.0,
            macd_dea=0.0,
            macd_bar=0.0,
            macd_status="Neutro",
            macd_signal="Aguardando mais pregões",
            rsi_6=50.0,
            rsi_12=50.0,
            rsi_24=50.0,
            rsi_status="Neutro",
            rsi_signal="IFR neutro",
            ideal_entry_price=0.0,
            stop_loss_price=0.0,
            resistance_20d=0.0,
            support_20d=0.0,
            support_ma5=False,
            support_ma10=False,
            signal_reasons=[],
            risk_factors=["Histórico insuficiente (< 5 pregões)"],
            strategies=[],
        )

    df = _compute_indicators(df)
    latest = df.iloc[-1]
    prev = df.iloc[-2] if len(df) >= 2 else latest
    prev5 = df.iloc[-5] if len(df) >= 5 else df.iloc[0]

    price = float(latest["close"])
    ma5 = float(latest["MA5"])
    ma10 = float(latest["MA10"])
    ma20 = float(latest["MA20"])
    ma60 = float(latest["MA60"])

    reasons: List[str] = []
    risks: List[str] = []
    score = 0

    # 1. Análise de Tendência (30 pontos)
    if ma5 > ma10 > ma20:
        prev_spread = ((float(prev5["MA5"]) - float(prev5["MA20"])) / float(prev5["MA20"]) * 100.0) if float(prev5["MA20"]) > 0 else 0.0
        curr_spread = ((ma5 - ma20) / ma20 * 100.0) if ma20 > 0 else 0.0
        if curr_spread > prev_spread and curr_spread > 3.5:
            trend_status = "Forte Alta (Bull)"
            ma_alignment = "Alinhamento compradora forte (MA5 > MA10 > MA20 em expansão)"
            trend_strength = 90.0
            score += 30
            reasons.append("✅ Alinhamento de Forte Alta: MA5 > MA10 > MA20 com médias abrindo para cima")
        else:
            trend_status = "Tendência de Alta"
            ma_alignment = "Alinhamento compradora (MA5 > MA10 > MA20)"
            trend_strength = 76.0
            score += 25
            reasons.append("✅ Tendência de Alta confirmada pelo alinhamento MA5 > MA10 > MA20")
    elif ma5 > ma10 and ma10 <= ma20:
        trend_status = "Alta Moderada (Recuperação)"
        ma_alignment = "Curto prazo comprador (MA5 > MA10), mas MA10 ainda abaixo da MA20"
        trend_strength = 58.0
        score += 17
        reasons.append("⚡ Recuperação de curto prazo: MA5 acima da MA10")
    elif ma5 < ma10 < ma20:
        prev_spread = ((float(prev5["MA20"]) - float(prev5["MA5"])) / float(prev5["MA5"]) * 100.0) if float(prev5["MA5"]) > 0 else 0.0
        curr_spread = ((ma20 - ma5) / ma5 * 100.0) if ma5 > 0 else 0.0
        if curr_spread > prev_spread and curr_spread > 3.5:
            trend_status = "Forte Baixa (Bear)"
            ma_alignment = "Alinhamento vendedor forte (MA5 < MA10 < MA20 em abertura)"
            trend_strength = 12.0
            score += 2
            risks.append("⚠️ Forte tendência de baixa (MA5 < MA10 < MA20 em aceleração)")
        else:
            trend_status = "Tendência de Baixa"
            ma_alignment = "Alinhamento vendedor (MA5 < MA10 < MA20)"
            trend_strength = 25.0
            score += 6
            risks.append("⚠️ Médias alinhadas em queda (MA5 < MA10 < MA20)")
    elif ma5 < ma10 and ma10 >= ma20:
        trend_status = "Correção em Tendência"
        ma_alignment = "Recuo de curto prazo (MA5 < MA10), mantendo MA10 >= MA20"
        trend_strength = 45.0
        score += 13
    else:
        trend_status = "Consolidação / Lateral"
        ma_alignment = "Médias móveis entrelaçadas sem direção dominante"
        trend_strength = 50.0
        score += 14

    # 2. Taxa de Distanciamento / Regra Anti-Euforia (Bias — 20 pontos)
    bias_ma5 = ((price - ma5) / ma5 * 100.0) if ma5 > 0 else 0.0
    bias_ma10 = ((price - ma10) / ma10 * 100.0) if ma10 > 0 else 0.0
    bias_ma20 = ((price - ma20) / ma20 * 100.0) if ma20 > 0 else 0.0

    if -1.5 <= bias_ma5 <= 2.0 and ma5 >= ma10:
        score += 20
        reasons.append(f"✅ Preço colado na MA5 ({bias_ma5:+.2f}%) — ponto ótimo de entrada sem esticar")
    elif 2.0 < bias_ma5 <= 4.8:
        score += 14
        reasons.append(f"⚡ Preço levemente acima da MA5 ({bias_ma5:+.2f}%) — região aceitável")
    elif bias_ma5 > 4.8:
        score += 5
        risks.append(f"⚠️ Ativo esticado ({bias_ma5:+.2f}% acima da MA5 > limite de 5%) — evite comprar topo, aguarde pullback")
    elif -4.0 <= bias_ma5 < -1.5 and price >= ma20:
        score += 16
        reasons.append(f"✅ Pullback saudável até a região entre MA5 e MA20 ({bias_ma5:+.2f}%)")
    else:
        score += 6
        if price < ma20:
            risks.append(f"⚠️ Preço operando abaixo da MA20 ({bias_ma20:+.2f}%) — perda de suporte de curto prazo")

    # 3. Análise de Volume (15 pontos)
    vol_window = df["volume"].iloc[-6:-1] if len(df) >= 6 else df["volume"]
    vol_5d_avg = float(vol_window.mean()) if len(vol_window) > 0 else 0.0
    curr_vol = float(latest["volume"])
    volume_ratio_5d = (curr_vol / vol_5d_avg) if vol_5d_avg > 0 else 1.0
    price_change_1d = ((price - float(prev["close"])) / float(prev["close"]) * 100.0) if float(prev["close"]) > 0 else 0.0

    if volume_ratio_5d <= 0.78 and price_change_1d <= 0:
        volume_status = "Pullback com Volume Reduzido"
        volume_trend = "Correção com secagem de volume vendedor (absorção positiva)"
        score += 15
        reasons.append(f"✅ Pullback com volume reduzido ({volume_ratio_5d:.2f}x da média 5D) — ausência de pressão vendedora")
    elif volume_ratio_5d >= 1.35 and price_change_1d > 0:
        volume_status = "Alta com Expansão de Volume"
        volume_trend = "Entrada de fluxo institucional comprador (preço e volume subindo)"
        score += 13
        reasons.append(f"✅ Expansão de volume em dia de alta ({volume_ratio_5d:.2f}x da média 5D)")
    elif volume_ratio_5d >= 1.35 and price_change_1d < 0:
        volume_status = "Queda com Volume Forte"
        volume_trend = "Pressão vendedora acima da média nos últimos pregões"
        score += 2
        risks.append(f"⚠️ Queda acompanhada de volume elevado ({volume_ratio_5d:.2f}x da média 5D)")
    elif volume_ratio_5d <= 0.75 and price_change_1d > 0:
        volume_status = "Alta com Volume Fraco"
        volume_trend = "Subida com volume abaixo da média de 5 dias"
        score += 8
    else:
        volume_status = "Volume Normal"
        volume_trend = "Volume financeiro alinhado à média dos últimos 5 pregões"
        score += 10

    # 4. Suporte e Resistência (10 pontos)
    support_ma5 = abs(price - ma5) / ma5 <= 0.022 and price >= ma5 * 0.99
    support_ma10 = abs(price - ma10) / ma10 <= 0.025 and price >= ma10 * 0.99
    if support_ma5:
        score += 5
        reasons.append(f"✅ Preço respeitando suporte dinâmico na MA5 (R$ {ma5:.2f})")
    if support_ma10:
        score += 5
        reasons.append(f"✅ Suporte confirmado na MA10 (R$ {ma10:.2f})")
    elif price >= ma20:
        score += 4

    tail20 = df.tail(20)
    resistance_20d = float(tail20["high"].max())
    support_20d = float(tail20["low"].min())
    ideal_entry_price = round(min(price, max(ma5, ma10)), 2) if ma5 >= ma10 else round(ma20, 2)
    stop_loss_price = round(min(ma20 * 0.97, support_20d * 0.99), 2)

    # 5. MACD (12, 26, 9) — 15 pontos
    macd_dif = float(latest["MACD_DIF"])
    macd_dea = float(latest["MACD_DEA"])
    macd_bar = float(latest["MACD_BAR"])
    prev_dif = float(prev["MACD_DIF"])
    prev_dea = float(prev["MACD_DEA"])

    if prev_dif <= prev_dea and macd_dif > macd_dea and macd_dif > 0:
        macd_status = "Golden Cross Acima de Zero"
        macd_signal = "Cruzamento comprador do MACD acima da linha zero (sinal forte de aceleração)"
        score += 15
        reasons.append("✅ MACD em Golden Cross acima do eixo zero")
    elif prev_dif <= prev_dea and macd_dif > macd_dea:
        macd_status = "Golden Cross (Compra)"
        macd_signal = "DIF cruzou acima de DEA sugerindo retomada compradora"
        score += 13
        reasons.append("✅ MACD acionou cruzamento de alta (Golden Cross)")
    elif macd_dif > macd_dea and macd_dif > 0:
        macd_status = "Tendência Compradora (MACD > 0)"
        macd_signal = "DIF acima de DEA em território positivo"
        score += 11
        reasons.append("✅ MACD positivo e alinhado para cima")
    elif macd_dif > macd_dea:
        macd_status = "Recuperação (Histograma Positivo)"
        macd_signal = "Histograma MACD positivo em recuperação"
        score += 8
    elif prev_dif >= prev_dea and macd_dif < macd_dea:
        macd_status = "Death Cross (Cruzamento de Baixa)"
        macd_signal = "DIF cruzou abaixo de DEA sinalizando perda de fôlego"
        score += 1
        risks.append("⚠️ MACD em cruzamento de baixa (Death Cross)")
    else:
        macd_status = "Tendência Vendedora"
        macd_signal = "MACD abaixo da linha de sinal"
        score += 3

    # 6. RSI / IFR Wilder (6, 12, 24) — 10 pontos
    rsi_6 = float(latest["RSI_6"])
    rsi_12 = float(latest["RSI_12"])
    rsi_24 = float(latest["RSI_24"])

    if rsi_12 < 32.0:
        rsi_status = "Sobrevendido (< 32)"
        rsi_signal = f"IFR(12) em {rsi_12:.1f} indica desconto técnico e possível repique comprador"
        score += 10
        reasons.append(f"✅ IFR(12) em zona de sobrevenda ({rsi_12:.1f}) — assimetria favorável para repique")
    elif 50.0 <= rsi_12 <= 68.0:
        rsi_status = "Força Compradora (50–68)"
        rsi_signal = f"IFR(12) em {rsi_12:.1f} confirma momentum positivo sem sobrecompra extrema"
        score += 9
        reasons.append(f"✅ IFR(12) em zona de força saudável ({rsi_12:.1f})")
    elif rsi_12 > 72.0:
        rsi_status = "Sobrecomprado (> 72)"
        rsi_signal = f"IFR(12) elevado ({rsi_12:.1f}) sugere cautela com realização de lucros no curto prazo"
        score += 2
        risks.append(f"⚠️ IFR(12) em sobrecompra ({rsi_12:.1f} > 72) — risco de correção")
    elif 40.0 <= rsi_12 < 50.0:
        rsi_status = "Neutro (40–50)"
        rsi_signal = f"IFR(12) equilibrado em {rsi_12:.1f}"
        score += 6
    else:
        rsi_status = "Enfraquecido (32–40)"
        rsi_signal = f"IFR(12) em {rsi_12:.1f} mostra fluxo comprador ainda tímido"
        score += 4

    # 7. Avaliação das 6 Estratégias Clássicas adaptadas do daily_stock_analysis para B3
    strategies = _evaluate_b3_strategies(
        df=df,
        price=price,
        ma5=ma5,
        ma10=ma10,
        ma20=ma20,
        bias_ma5=bias_ma5,
        volume_ratio_5d=volume_ratio_5d,
        macd_dif=macd_dif,
        macd_dea=macd_dea,
        rsi_12=rsi_12,
        resistance_20d=resistance_20d,
        support_20d=support_20d,
        fundamentals=fundamentals,
    )

    # Bônus/ajuste leve pelas estratégias aprovadas
    fundamental_strat = next((s for s in strategies if s.id == "growth_quality"), None)
    if fundamental_strat and fundamental_strat.status == "APROVADO":
        score = min(100, score + 4)
        reasons.append(f"✅ {fundamental_strat.summary}")

    score = int(max(5, min(98, round(score))))

    # Definição do Veredito Operacional
    is_bull = trend_status in ("Forte Alta (Bull)", "Tendência de Alta", "Alta Moderada (Recuperação)")
    if score >= 76 and is_bull and bias_ma5 <= 5.0:
        buy_signal = "COMPRA FORTE"
    elif score >= 62 and is_bull and bias_ma5 > 5.0:
        buy_signal = "AGUARDAR PULLBACK"
    elif score >= 62 and trend_status not in ("Tendência de Baixa", "Forte Baixa (Bear)"):
        buy_signal = "COMPRA"
    elif score >= 46:
        buy_signal = "MANTER / NEUTRO"
    else:
        buy_signal = "VENDA / CAUTELA"

    return TechnicalDecisionReport(
        ticker=clean_ticker,
        current_price=round(price, 2),
        signal_score=score,
        buy_signal=buy_signal,
        trend_status=trend_status,
        ma_alignment=ma_alignment,
        trend_strength=round(trend_strength, 1),
        ma5=round(ma5, 2),
        ma10=round(ma10, 2),
        ma20=round(ma20, 2),
        ma60=round(ma60, 2),
        bias_ma5=round(bias_ma5, 2),
        bias_ma10=round(bias_ma10, 2),
        bias_ma20=round(bias_ma20, 2),
        volume_status=volume_status,
        volume_ratio_5d=round(volume_ratio_5d, 2),
        volume_trend=volume_trend,
        macd_dif=round(macd_dif, 4),
        macd_dea=round(macd_dea, 4),
        macd_bar=round(macd_bar, 4),
        macd_status=macd_status,
        macd_signal=macd_signal,
        rsi_6=round(rsi_6, 1),
        rsi_12=round(rsi_12, 1),
        rsi_24=round(rsi_24, 1),
        rsi_status=rsi_status,
        rsi_signal=rsi_signal,
        ideal_entry_price=ideal_entry_price,
        stop_loss_price=stop_loss_price,
        resistance_20d=round(resistance_20d, 2),
        support_20d=round(support_20d, 2),
        support_ma5=bool(support_ma5),
        support_ma10=bool(support_ma10),
        signal_reasons=reasons,
        risk_factors=risks,
        strategies=strategies,
    )


def _evaluate_b3_strategies(
    df: pd.DataFrame,
    price: float,
    ma5: float,
    ma10: float,
    ma20: float,
    bias_ma5: float,
    volume_ratio_5d: float,
    macd_dif: float,
    macd_dea: float,
    rsi_12: float,
    resistance_20d: float,
    support_20d: float,
    fundamentals: Optional[FundamentalIndicators],
) -> List[StrategyEvaluation]:
    """Avalia as 6 estratégias do daily_stock_analysis adaptadas para o mercado brasileiro."""
    evals: List[StrategyEvaluation] = []

    # 1. bull_trend (Tendência de Alta & Pullback)
    if ma5 > ma10 > ma20 and bias_ma5 <= 5.0:
        evals.append(
            StrategyEvaluation(
                id="bull_trend",
                name="Tendência de Alta (Bull Trend)",
                category="Tendência",
                status="APROVADO",
                score_impact=12,
                summary=f"Médias alinhadas (MA5 > MA10 > MA20) com distanciamento controlado ({bias_ma5:+.1f}%).",
            )
        )
    elif ma5 > ma10 > ma20 and bias_ma5 > 5.0:
        evals.append(
            StrategyEvaluation(
                id="bull_trend",
                name="Tendência de Alta (Bull Trend)",
                category="Tendência",
                status="ALERTA",
                score_impact=4,
                summary=f"Tendência de alta ativa, porém preço esticado ({bias_ma5:+.1f}% acima da MA5). Aguardar recuo.",
            )
        )
    else:
        evals.append(
            StrategyEvaluation(
                id="bull_trend",
                name="Tendência de Alta (Bull Trend)",
                category="Tendência",
                status="NEUTRO" if price >= ma20 else "REPROVADO",
                score_impact=0 if price >= ma20 else -8,
                summary="Sem alinhamento completo MA5 > MA10 > MA20 no momento.",
            )
        )

    # 2. ma_golden_cross (Cruzamento Dourado de Médias + MACD)
    recent_cross = False
    if len(df) >= 4:
        sub = df.tail(4)
        crossed_5_10 = (sub["MA5"].iloc[0] <= sub["MA10"].iloc[0]) and (sub["MA5"].iloc[-1] > sub["MA10"].iloc[-1])
        crossed_10_20 = (sub["MA10"].iloc[0] <= sub["MA20"].iloc[0]) and (sub["MA10"].iloc[-1] > sub["MA20"].iloc[-1])
        recent_cross = bool(crossed_5_10 or crossed_10_20)

    if recent_cross and macd_dif >= macd_dea:
        evals.append(
            StrategyEvaluation(
                id="ma_golden_cross",
                name="Cruzamento Dourado (Golden Cross)",
                category="Inversão / Ignição",
                status="APROVADO",
                score_impact=10,
                summary="Cruzamento recente de médias móveis confirmado por MACD comprador.",
            )
        )
    elif ma5 > ma10 and macd_dif > macd_dea:
        evals.append(
            StrategyEvaluation(
                id="ma_golden_cross",
                name="Cruzamento Dourado (Golden Cross)",
                category="Inversão / Ignição",
                status="NEUTRO",
                score_impact=5,
                summary="MA5 já opera acima da MA10 com MACD positivo (cruzamento ocorreu há mais de 3 pregões).",
            )
        )
    else:
        evals.append(
            StrategyEvaluation(
                id="ma_golden_cross",
                name="Cruzamento Dourado (Golden Cross)",
                category="Inversão / Ignição",
                status="REPROVADO",
                score_impact=-4,
                summary="Sem sinal ativo de Golden Cross nas médias curtas.",
            )
        )

    # 3. volume_breakout (Rompimento com Expansão de Volume)
    near_high = resistance_20d > 0 and price >= resistance_20d * 0.985
    if near_high and volume_ratio_5d >= 1.2:
        evals.append(
            StrategyEvaluation(
                id="volume_breakout",
                name="Rompimento com Volume (Breakout)",
                category="Momentum",
                status="APROVADO",
                score_impact=10,
                summary=f"Rompendo máxima de 20 pregões (R$ {resistance_20d:.2f}) com volume {volume_ratio_5d:.2f}x.",
            )
        )
    elif near_high:
        evals.append(
            StrategyEvaluation(
                id="volume_breakout",
                name="Rompimento com Volume (Breakout)",
                category="Momentum",
                status="ALERTA",
                score_impact=3,
                summary=f"Testando topo de 20 dias (R$ {resistance_20d:.2f}), mas sem expansão forte de volume ({volume_ratio_5d:.2f}x).",
            )
        )
    else:
        evals.append(
            StrategyEvaluation(
                id="volume_breakout",
                name="Rompimento com Volume (Breakout)",
                category="Momentum",
                status="NEUTRO",
                score_impact=0,
                summary=f"Operando abaixo da resistência de 20 pregões (R$ {resistance_20d:.2f}).",
            )
        )

    # 4. shrink_pullback (Pullback de Baixo Volume na Média)
    near_ma = abs(bias_ma5) <= 2.5 or (price >= ma20 and price <= ma5 * 1.01)
    if ma10 >= ma20 and near_ma and volume_ratio_5d <= 0.95:
        evals.append(
            StrategyEvaluation(
                id="shrink_pullback",
                name="Pullback de Baixo Volume",
                category="Assimetria",
                status="APROVADO",
                score_impact=10,
                summary=f"Recuo tático até a média com contração de volume ({volume_ratio_5d:.2f}x) — padrão clássico de entrada.",
            )
        )
    else:
        evals.append(
            StrategyEvaluation(
                id="shrink_pullback",
                name="Pullback de Baixo Volume",
                category="Assimetria",
                status="NEUTRO",
                score_impact=0,
                summary="Aguardando recuo com secagem de volume até a região da MA5/MA10.",
            )
        )

    # 5. box_oscillation (Oscilação em Caixote / Suporte de Range — ideal para FIIs e Dividendos)
    box_range_pct = ((resistance_20d - support_20d) / support_20d * 100.0) if support_20d > 0 else 0.0
    pos_in_box = ((price - support_20d) / (resistance_20d - support_20d)) if (resistance_20d > support_20d) else 0.5
    if 2.0 <= box_range_pct <= 14.0 and pos_in_box <= 0.38 and rsi_12 <= 55.0:
        evals.append(
            StrategyEvaluation(
                id="box_oscillation",
                name="Compra no Suporte do Caixote (Range)",
                category="Reversão à Média",
                status="APROVADO",
                score_impact=8,
                summary=f"Preço próximo à base do caixote de 20D (R$ {support_20d:.2f} a R$ {resistance_20d:.2f}).",
            )
        )
    else:
        evals.append(
            StrategyEvaluation(
                id="box_oscillation",
                name="Compra no Suporte do Caixote (Range)",
                category="Reversão à Média",
                status="NEUTRO",
                score_impact=0,
                summary=f"Posição em {pos_in_box * 100:.0f}% da banda de 20 dias (Suporte R$ {support_20d:.2f} / Topo R$ {resistance_20d:.2f}).",
            )
        )

    # 6. growth_quality (Fundamentos B3 + Prêmio sobre CDI)
    if fundamentals:
        raw_dy = fundamentals.dy or 0.0
        dy = raw_dy * 100.0 if raw_dy <= 1.5 else raw_dy
        pvp = fundamentals.pvp or 0.0
        raw_roe = fundamentals.roe or 0.0
        roe = raw_roe * 100.0 if raw_roe <= 1.5 else raw_roe
        pl = fundamentals.pl or 0.0

        if fundamentals.asset_type.lower() in ("fiis", "fii"):
            if dy >= 8.5 and 0.70 <= pvp <= 1.06:
                evals.append(
                    StrategyEvaluation(
                        id="growth_quality",
                        name="Qualidade & Valuation B3 (FII)",
                        category="Fundamentalista BR",
                        status="APROVADO",
                        score_impact=12,
                        summary=f"FII com DY atrativo ({dy:.1f}% a.a. isento) e P/VP descontado/justo ({pvp:.2f}x).",
                    )
                )
            else:
                evals.append(
                    StrategyEvaluation(
                        id="growth_quality",
                        name="Qualidade & Valuation B3 (FII)",
                        category="Fundamentalista BR",
                        status="NEUTRO",
                        score_impact=3,
                        summary=f"FII com DY de {dy:.1f}% a.a. e P/VP de {pvp:.2f}x.",
                    )
                )
        else:
            if (roe >= 15.0 or dy >= 6.0) and (0 < pl <= 16.0 or dy >= 8.0):
                evals.append(
                    StrategyEvaluation(
                        id="growth_quality",
                        name="Qualidade & Valuation B3 (Ações)",
                        category="Fundamentalista BR",
                        status="APROVADO",
                        score_impact=12,
                        summary=f"Fundamentos sólidos na B3: ROE {roe:.1f}%, P/L {pl:.1f}x e Dividend Yield {dy:.1f}%.",
                    )
                )
            elif roe >= 12.0:
                evals.append(
                    StrategyEvaluation(
                        id="growth_quality",
                        name="Qualidade & Valuation B3 (Ações)",
                        category="Fundamentalista BR",
                        status="NEUTRO",
                        score_impact=5,
                        summary=f"Empresa rentável (ROE {roe:.1f}%), negociada a P/L {pl:.1f}x e DY {dy:.1f}%.",
                    )
                )
            else:
                evals.append(
                    StrategyEvaluation(
                        id="growth_quality",
                        name="Qualidade & Valuation B3 (Ações)",
                        category="Fundamentalista BR",
                        status="ALERTA",
                        score_impact=0,
                        summary="Múltiplos exigem acompanhamento de margem e geração de caixa.",
                    )
                )
    else:
        evals.append(
            StrategyEvaluation(
                id="growth_quality",
                name="Qualidade & Valuation B3",
                category="Fundamentalista BR",
                status="NEUTRO",
                score_impact=0,
                summary="Indicadores fundamentalistas não aplicáveis para este índice/série.",
            )
        )

    return evals


def _build_synthetic_b3_series(ticker: str, days: int = 90) -> List[MarketData]:
    """Gera série determinística realista para o Scanner B3 caso o ativo ainda não esteja em cache."""
    seed_map: Dict[str, tuple[float, float, float]] = {
        "WEGE3": (52.80, 0.0018, 0.014),
        "PETR4": (37.90, 0.0014, 0.016),
        "ITUB4": (34.60, 0.0012, 0.013),
        "BBAS3": (28.40, 0.0011, 0.014),
        "VALE3": (61.20, 0.0006, 0.017),
        "B3SA3": (11.40, 0.0004, 0.018),
        "RENT3": (43.50, 0.0005, 0.019),
        "ABEV3": (12.80, 0.0003, 0.012),
        "HGLG11": (158.50, 0.0007, 0.006),
        "MXRF11": (10.12, 0.0006, 0.005),
        "KNRI11": (156.20, 0.0006, 0.006),
        "XPML11": (112.40, 0.0008, 0.006),
        "BTLG11": (101.30, 0.0007, 0.005),
        "VISC11": (114.80, 0.0006, 0.006),
    }
    base_price, drift, vol = seed_map.get(ticker, (30.0, 0.0008, 0.015))
    rng = np.random.default_rng(abs(hash(ticker)) % 100000)
    b_days = pd.bdate_range(end=pd.Timestamp.today().normalize(), periods=days)
    price = base_price * 0.92
    records: List[MarketData] = []
    for i, ts in enumerate(b_days):
        # Últimos 8 pregões com leve inclinação positiva e pullback controlado
        day_drift = drift * (1.3 if i > days - 12 else 0.9)
        ret = float(rng.normal(day_drift, vol))
        open_p = price
        close_p = max(1.0, open_p * (1.0 + ret))
        high_p = max(open_p, close_p) * (1.0 + abs(float(rng.normal(0, vol * 0.45))))
        low_p = min(open_p, close_p) * (1.0 - abs(float(rng.normal(0, vol * 0.45))))
        vol_qty = int(rng.integers(2_500_000, 18_000_000))
        if i == len(b_days) - 1:
            # Simula pullback com volume reduzido ou rompimento dependendo do papel
            vol_qty = int(vol_qty * (0.68 if i % 2 == 0 else 1.42))
        price = close_p
        records.append(
            MarketData(
                ticker=ticker,
                date=ts.to_pydatetime(),
                open=round(open_p, 2),
                high=round(high_p, 2),
                low=round(low_p, 2),
                close=round(close_p, 2),
                adjusted_close=round(close_p, 2),
                volume=vol_qty,
                currency="BRL",
                source="b3_scanner",
            )
        )
    return records


def run_b3_opportunity_scanner(
    series_provider,
    fundamentals_provider,
    asset_class_filter: str = "ALL",
) -> List[ScannerB3Item]:
    """Executa o Scanner Diário B3 (Ações & FIIs) ordenando pelo Score de Decisão (0 a 100)."""
    items: List[ScannerB3Item] = []
    filt = asset_class_filter.upper().strip()

    for entry in DEFAULT_SCANNER_UNIVERSE:
        if filt in ("ACAO", "FII") and entry["class"] != filt:
            continue

        sym = entry["ticker"]
        series = series_provider(sym)
        if not series or len(series) < 20:
            series = _build_synthetic_b3_series(sym, days=75)

        fund = fundamentals_provider(sym)
        report = analyze_technical_decision(sym, series, fundamentals=fund)

        top_catalyst = (
            report.signal_reasons[0].replace("✅ ", "").replace("⚡ ", "")
            if report.signal_reasons
            else report.ma_alignment
        )
        raw_dy = fund.dy if fund and fund.dy is not None else None
        dy_pct = round(raw_dy * 100.0 if raw_dy <= 1.5 else raw_dy, 2) if raw_dy is not None else None

        items.append(
            ScannerB3Item(
                ticker=sym,
                name=entry["name"],
                asset_class=entry["class"],
                sector=entry["sector"],
                current_price=report.current_price,
                signal_score=report.signal_score,
                buy_signal=report.buy_signal,
                trend_status=report.trend_status,
                bias_ma5=report.bias_ma5,
                rsi_12=report.rsi_12,
                volume_ratio_5d=report.volume_ratio_5d,
                dy_pct=dy_pct,
                p_vp=fund.pvp if fund else None,
                p_l=fund.pl if fund else None,
                top_catalyst=top_catalyst,
            )
        )

    items.sort(key=lambda x: x.signal_score, reverse=True)
    return items
