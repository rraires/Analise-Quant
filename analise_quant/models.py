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

