"""Exceções customizadas da plataforma Analise Quant."""


class AnaliseQuantError(Exception):
    """Exceção base da plataforma."""


class ModuleNotFoundError(AnaliseQuantError):
    """Módulo de coleta não encontrado no registry."""

    def __init__(self, module_name: str) -> None:
        self.module_name = module_name
        super().__init__(f"Módulo '{module_name}' não encontrado no registry.")


class CollectionError(AnaliseQuantError):
    """Erro durante a coleta de dados de mercado."""

    def __init__(self, module_name: str, detail: str) -> None:
        self.module_name = module_name
        self.detail = detail
        super().__init__(f"Erro na coleta [{module_name}]: {detail}")


class TickerValidationError(AnaliseQuantError):
    """Ticker inválido ou não reconhecido."""

    def __init__(self, ticker: str, reason: str = "") -> None:
        self.ticker = ticker
        self.reason = reason
        msg = f"Ticker inválido: '{ticker}'"
        if reason:
            msg += f" — {reason}"
        super().__init__(msg)
