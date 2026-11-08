"""Configuração central da plataforma Analise Quant."""

from pydantic_settings import BaseSettings
from pydantic import Field
from typing import List


# Top 10 ações do IBOV por peso (referência)
DEFAULT_TICKERS_BOVESPA: List[str] = [
    "VALE3",
    "PETR4",
    "ITUB4",
    "BBDC4",
    "PETR3",
    "B3SA3",
    "ABEV3",
    "BBAS3",
    "WEGE3",
    "RENT3",
]


class Settings(BaseSettings):
    """Configurações globais da plataforma."""

    log_level: str = Field(default="INFO", description="Nível de logging")
    output_dir: str = Field(
        default="./output", description="Diretório de saída para exportações"
    )
    collection_timeout: int = Field(
        default=60, description="Timeout de coleta em segundos"
    )
    default_tickers: List[str] = Field(
        default=DEFAULT_TICKERS_BOVESPA,
        description="Lista padrão de tickers para coleta",
    )
    export_csv: bool = Field(default=True, description="Exportar dados em CSV")
    export_json: bool = Field(default=True, description="Exportar dados em JSON")
    cache_ttl_seconds: int = Field(
        default=300, description="Tempo de vida do cache em memória (segundos)"
    )

    model_config = {"env_prefix": "AQ_", "env_file": ".env"}


settings = Settings()

