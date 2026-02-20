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
    # Mapeia número do mês (1-12) para o retorno percentual (ex: 0.05 para 5%)
    # Pode ser None se o mês ainda não ocorreu ou não há dados
    returns: Dict[int, Optional[float]] = Field(
        default_factory=dict, description="Retornos mensais (1=Jan, 12=Dez)"
    )
    ytd: Optional[float] = Field(default=None, description="Retorno acumulado no ano (Year to Date)")
