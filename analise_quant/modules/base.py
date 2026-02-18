"""Classe base abstrata para módulos de coleta de dados de mercado."""

from abc import ABC, abstractmethod
from datetime import date

from analise_quant.models import CollectionResult, ModuleInfo


class BaseCollectorModule(ABC):
    """Contrato que todo módulo de coleta deve implementar.

    Cada módulo representa uma combinação de tipo de ativo + fonte de dados.
    Exemplo: ações via YFinance, FIIs via API da B3, etc.
    """

    @abstractmethod
    def get_info(self) -> ModuleInfo:
        """Retorna metadados do módulo (nome, tipo de ativo, fonte, etc.)."""

    @abstractmethod
    def collect(
        self,
        tickers: list[str],
        start_date: date,
        end_date: date,
    ) -> CollectionResult:
        """Coleta dados de mercado para os tickers no período especificado.

        Args:
            tickers: Lista de códigos de ativos (ex: ["PETR4", "VALE3"]).
            start_date: Data inicial da coleta.
            end_date: Data final da coleta.

        Returns:
            CollectionResult com dados coletados e status.
        """

    @abstractmethod
    def validate_ticker(self, ticker: str) -> bool:
        """Valida se o ticker é reconhecido pela fonte de dados.

        Args:
            ticker: Código do ativo (ex: "PETR4").

        Returns:
            True se o ticker é válido.
        """

    @property
    def name(self) -> str:
        """Nome do módulo derivado do get_info()."""
        return self.get_info().name
