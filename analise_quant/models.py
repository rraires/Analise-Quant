"""Modelos de dados padronizados da plataforma Analise Quant."""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Union


class AssetType(str, Enum):
    """Tipos de ativos suportados."""

    ACOES = "acoes"
    FIIS = "fiis"
    ETFS = "etfs"
    BDRS = "bdrs"
    OPCOES = "opcoes"
    CRIPTO = "cripto"
    MACRO = "macro"
    TESOURO = "tesouro"
    FUNDOS = "fundos"
    INDICES = "indices"


class CollectionStatus(str, Enum):
    """Status de uma operação de coleta."""

    SUCCESS = "success"
    PARTIAL = "partial"
    ERROR = "error"


class MarketData(BaseModel):
    """Dados de cotação de mercado padronizados."""

    ticker: str = Field(description="Código do ativo (ex: PETR4)")
    date: datetime = Field(description="Data/hora do registro")
    open: float = Field(description="Preço de abertura")
    high: float = Field(description="Preço máximo")
    low: float = Field(description="Preço mínimo")
    close: float = Field(description="Preço de fechamento")
    volume: int = Field(description="Volume negociado")
    adjusted_close: Optional[float] = Field(
        default=None, description="Preço de fechamento ajustado"
    )
    currency: str = Field(default="BRL", description="Moeda")
    source: str = Field(description="Fonte dos dados (ex: yfinance)")


class ModuleInfo(BaseModel):
    """Metadados de um módulo de coleta."""

    name: str = Field(description="Nome único do módulo (ex: acoes_yfinance)")
    asset_type: AssetType = Field(description="Tipo de ativo que o módulo coleta")
    source: str = Field(description="Biblioteca/API fonte dos dados")
    description: str = Field(description="Descrição do módulo")
    version: str = Field(default="0.1.0", description="Versão do módulo")


class CollectionResult(BaseModel):
    """Resultado de uma operação de coleta."""

    module_name: str = Field(description="Nome do módulo que executou a coleta")
    status: CollectionStatus = Field(description="Status da coleta")
    data: List[MarketData] = Field(default_factory=list, description="Dados coletados")
    errors: List[str] = Field(
        default_factory=list, description="Erros encontrados durante a coleta"
    )
    tickers_requested: List[str] = Field(
        default_factory=list, description="Tickers solicitados"
    )
    tickers_success: List[str] = Field(
        default_factory=list, description="Tickers coletados com sucesso"
    )
    tickers_failed: List[str] = Field(
        default_factory=list, description="Tickers que falharam"
    )
    started_at: datetime = Field(description="Início da coleta")
    finished_at: datetime = Field(description="Fim da coleta")

    @property
    def duration_seconds(self) -> float:
        return (self.finished_at - self.started_at).total_seconds()

    @property
    def total_records(self) -> int:
        return len(self.data)


class MonthlyPerformance(BaseModel):
    """Performance mensal de um ativo por ano."""

    year: int = Field(description="Ano de referência")
    returns: Dict[int, Optional[float]] = Field(
        default_factory=dict, description="Retornos mensais (1=Jan, 12=Dez)"
    )
    ytd: Optional[float] = Field(
        default=None, description="Retorno acumulado no ano (Year to Date)"
    )


class FundamentalIndicators(BaseModel):
    """Indicadores fundamentalistas de Ações e FIIs."""

    ticker: str = Field(description="Código do ativo")
    asset_type: str = Field(default="acoes", description="acoes ou fiis")
    company_name: Optional[str] = Field(default=None, description="Nome da empresa/fundo")
    sector: Optional[str] = Field(default=None, description="Setor ou segmento")
    price: Optional[float] = Field(default=None, description="Cotação atual")
    pl: Optional[float] = Field(default=None, description="Preço / Lucro (P/L)")
    pvp: Optional[float] = Field(default=None, description="Preço / Valor Patrimonial (P/VP)")
    dy: Optional[float] = Field(default=None, description="Dividend Yield 12M (decimal, ex: 0.085)")
    roe: Optional[float] = Field(default=None, description="Return on Equity (ROE)")
    roic: Optional[float] = Field(default=None, description="Return on Invested Capital (ROIC)")
    ev_ebitda: Optional[float] = Field(default=None, description="EV / EBITDA")
    net_margin: Optional[float] = Field(default=None, description="Margem Líquida")
    debt_to_equity: Optional[float] = Field(default=None, description="Dívida / Patrimônio")
    market_cap: Optional[float] = Field(default=None, description="Valor de mercado (R$)")
    daily_liquidity: Optional[float] = Field(default=None, description="Liquidez média diária")
    source: str = Field(default="yfinance+fundamentus", description="Fonte dos indicadores")


class RiskMetrics(BaseModel):
    """Métricas quantitativas de risco e retorno."""

    ticker: str = Field(description="Código do ativo")
    period_days: int = Field(description="Janela em dias corridos")
    total_return: float = Field(description="Retorno acumulado no período (decimal)")
    cagr: float = Field(description="Retorno anualizado (CAGR base 252 DU)")
    volatility: float = Field(description="Volatilidade anualizada (base 252 DU)")
    sharpe_ratio: float = Field(description="Índice de Sharpe (vs CDI do período)")
    max_drawdown: float = Field(description="Maximum Drawdown no período (negativo)")
    beta_ibov: Optional[float] = Field(default=None, description="Beta em relação ao IBOV")
    cdi_return: float = Field(default=0.0, description="Retorno acumulado do CDI no período")
    pct_cdi: Optional[float] = Field(default=None, description="Percentual equivalente do CDI (ex: 1.15 = 115% CDI)")
    ibov_return: Optional[float] = Field(default=None, description="Retorno acumulado do IBOV no período")


class ComparisonPoint(BaseModel):
    """Ponto de série temporal normalizada (retorno acumulado %)."""

    date: str = Field(description="Data ISO YYYY-MM-DD")
    cumulative_return: float = Field(description="Retorno acumulado em % (ex: 12.5 para +12.5%)")


class ComparisonSeries(BaseModel):
    """Série comparativa de um ativo ou benchmark."""

    name: str = Field(description="Nome do ativo ou benchmark (ex: PETR4, CDI, IBOV)")
    category: str = Field(description="asset | benchmark")
    total_return_pct: float = Field(description="Retorno acumulado final em %")
    volatility_pct: Optional[float] = Field(default=None, description="Volatilidade anualizada em %")
    sharpe: Optional[float] = Field(default=None, description="Índice de Sharpe")
    max_drawdown_pct: Optional[float] = Field(default=None, description="Max Drawdown em %")
    points: List[ComparisonPoint] = Field(default_factory=list, description="Pontos da curva")


class ComparisonResponse(BaseModel):
    """Resposta completa do comparador multi-ativos."""

    period_days: int
    series: List[ComparisonSeries] = Field(default_factory=list)
    correlations: Dict[str, Dict[str, float]] = Field(
        default_factory=dict, description="Matriz de correlação dos retornos diários"
    )


class TesouroBond(BaseModel):
    """Dados de um título público do Tesouro Direto."""

    name: str = Field(description="Nome do título (ex: Tesouro IPCA+ 2035)")
    indexer: str = Field(description="SELIC | IPCA | PREFIXADO")
    maturity: str = Field(description="Data de vencimento YYYY-MM-DD")
    rate_buy: float = Field(description="Taxa de rendimento anual (% a.a.)")
    unit_price: float = Field(description="Preço Unitário (R$)")
    min_investment: float = Field(default=30.0, description="Investimento mínimo (R$)")


class MacroOverview(BaseModel):
    """Resumo macroeconômico de Juros, Inflação e Tesouro Direto."""

    selic_meta_aa: float = Field(description="Taxa SELIC Meta (% a.a.)")
    cdi_aa: float = Field(description="Taxa CDI Anualizada (% a.a.)")
    ipca_12m: float = Field(description="IPCA acumulado 12 meses (%)")
    real_interest_aa: float = Field(description="Juro Real ex-post aproximado (% a.a.)")
    yield_curve: List[Dict[str, Union[str, float]]] = Field(
        default_factory=list, description="Estrutura a termo da curva de juros (vértices)"
    )
    tesouro_bonds: List[TesouroBond] = Field(
        default_factory=list, description="Títulos de referência do Tesouro Direto"
    )
    updated_at: str = Field(description="Data da atualização")


class StrategyEvaluation(BaseModel):
    """Resultado da avaliação de uma estratégia quantitativa/técnica para o ativo."""

    id: str = Field(description="Identificador da estratégia (ex: bull_trend)")
    name: str = Field(description="Nome em português da estratégia")
    category: str = Field(description="Categoria (Tendência, Rompimento, Pullback, Range, Qualidade)")
    status: str = Field(description="APROVADO | ALERTA | NEUTRO | REPROVADO")
    score_impact: int = Field(description="Impacto no score (-15 a +15)")
    summary: str = Field(description="Explicação objetiva do sinal para o ativo na B3")


class TechnicalDecisionReport(BaseModel):
    """Painel de Decisão Técnica e Estratégias inspirado em zhulinsen/daily_stock_analysis adaptado para B3."""

    ticker: str = Field(description="Código do ativo na B3")
    current_price: float = Field(description="Preço de fechamento mais recente")
    signal_score: int = Field(description="Score quantitativo consolidado de 0 a 100")
    buy_signal: str = Field(
        description="COMPRA FORTE | COMPRA | AGUARDAR PULLBACK | MANTER / NEUTRO | VENDA / CAUTELA"
    )
    trend_status: str = Field(description="Estado da tendência (ex: Forte Alta, Alta, Consolidação, Baixa)")
    ma_alignment: str = Field(description="Descrição do alinhamento das médias móveis")
    trend_strength: float = Field(description="Força da tendência (0 a 100)")

    # Médias Móveis e Distanciamento (Bias)
    ma5: float = Field(description="Média Móvel Simples de 5 pregões")
    ma10: float = Field(description="Média Móvel Simples de 10 pregões")
    ma20: float = Field(description="Média Móvel Simples de 20 pregões")
    ma60: float = Field(description="Média Móvel Simples de 60 pregões")
    bias_ma5: float = Field(description="Distanciamento percentual para MA5 (%)")
    bias_ma10: float = Field(description="Distanciamento percentual para MA10 (%)")
    bias_ma20: float = Field(description="Distanciamento percentual para MA20 (%)")

    # Volume
    volume_status: str = Field(description="Classificação do comportamento de volume")
    volume_ratio_5d: float = Field(description="Razão entre volume atual e média de 5 pregões")
    volume_trend: str = Field(description="Explicação da dinâmica de volume e preço")

    # MACD (12, 26, 9)
    macd_dif: float = Field(description="Linha rápida DIF (EMA12 - EMA26)")
    macd_dea: float = Field(description="Linha de sinal DEA (EMA9 do DIF)")
    macd_bar: float = Field(description="Histograma MACD")
    macd_status: str = Field(description="Estado do MACD (Golden Cross, Bullish, Death Cross, etc.)")
    macd_signal: str = Field(description="Descrição detalhada do sinal MACD")

    # RSI / IFR Wilder (6, 12, 24)
    rsi_6: float = Field(description="IFR / RSI de 6 períodos (curto prazo)")
    rsi_12: float = Field(description="IFR / RSI de 12 períodos (médio prazo)")
    rsi_24: float = Field(description="IFR / RSI de 24 períodos (longo prazo)")
    rsi_status: str = Field(description="Estado do IFR (Sobrevendido, Força Compradora, Neutro, Sobrecomprado)")
    rsi_signal: str = Field(description="Descrição detalhada do sinal IFR")

    # Níveis Operacionais (Suporte, Resistência, Entrada e Stop)
    ideal_entry_price: float = Field(description="Preço ideal de entrada (região MA5/MA10 sem esticar)")
    stop_loss_price: float = Field(description="Stop loss técnico (abaixo da MA20 ou mínima recente)")
    resistance_20d: float = Field(description="Resistência (máxima dos últimos 20 pregões)")
    support_20d: float = Field(description="Suporte (mínima dos últimos 20 pregões)")
    support_ma5: bool = Field(description="Se o preço está testando suporte na MA5")
    support_ma10: bool = Field(description="Se o preço está testando suporte na MA10")

    # Checklists e Estratégias
    signal_reasons: List[str] = Field(default_factory=list, description="Pontos favoráveis (Checklist de Compra)")
    risk_factors: List[str] = Field(default_factory=list, description="Fatores de risco e alertas anti-euforia")
    strategies: List[StrategyEvaluation] = Field(
        default_factory=list, description="Avaliação das 6 estratégias adaptadas para B3"
    )


class ScannerB3Item(BaseModel):
    """Item do ranking diário de oportunidades B3 (Ações e FIIs)."""

    ticker: str
    name: str
    asset_class: str = Field(description="ACAO | FII")
    sector: str
    current_price: float
    signal_score: int
    buy_signal: str
    trend_status: str
    bias_ma5: float
    rsi_12: float
    volume_ratio_5d: float
    dy_pct: Optional[float] = None
    p_vp: Optional[float] = None
    p_l: Optional[float] = None
    top_catalyst: str = Field(description="Principal motivo técnico/fundamentalista do ativo hoje")


