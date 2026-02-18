"""Registry de módulos de coleta — descoberta e gerenciamento de plugins."""

import importlib
import logging
import pkgutil
from typing import Type

from analise_quant.exceptions import ModuleNotFoundError as AQModuleNotFoundError
from analise_quant.models import AssetType
from analise_quant.modules.base import BaseCollectorModule

logger = logging.getLogger(__name__)

# Dicionário global de módulos registrados
_REGISTRY: dict[str, Type[BaseCollectorModule]] = {}


def register_module(name: str):
    """Decorador para auto-registro de módulos de coleta.

    Uso:
        @register_module("acoes_yfinance")
        class YFinanceAcoesCollector(BaseCollectorModule):
            ...
    """

    def decorator(cls: Type[BaseCollectorModule]):
        if name in _REGISTRY:
            logger.warning(
                "Módulo '%s' já registrado (%s). Sobrescrevendo com %s.",
                name,
                _REGISTRY[name].__name__,
                cls.__name__,
            )
        _REGISTRY[name] = cls
        logger.debug("Módulo registrado: '%s' → %s", name, cls.__name__)
        return cls

    return decorator


class ModuleRegistry:
    """Gerencia a descoberta e acesso aos módulos de coleta."""

    def __init__(self) -> None:
        self._instances: dict[str, BaseCollectorModule] = {}

    def discover_modules(self) -> None:
        """Importa automaticamente todos os sub-pacotes em analise_quant.modules.

        Qualquer classe decorada com @register_module será registrada no _REGISTRY.
        """
        import analise_quant.modules as modules_pkg

        package_path = modules_pkg.__path__
        prefix = modules_pkg.__name__ + "."

        for _importer, modname, ispkg in pkgutil.walk_packages(
            package_path, prefix=prefix
        ):
            try:
                importlib.import_module(modname)
                logger.debug("Importado: %s", modname)
            except Exception:
                logger.exception("Erro ao importar módulo '%s'", modname)

        logger.info(
            "Descoberta concluída. %d módulo(s) registrado(s): %s",
            len(_REGISTRY),
            list(_REGISTRY.keys()),
        )

    def get_module(self, name: str) -> BaseCollectorModule:
        """Retorna uma instância do módulo pelo nome.

        Args:
            name: Nome do módulo (ex: "acoes_yfinance").

        Returns:
            Instância do módulo.

        Raises:
            AQModuleNotFoundError: Se o módulo não está registrado.
        """
        if name not in _REGISTRY:
            raise AQModuleNotFoundError(name)

        if name not in self._instances:
            self._instances[name] = _REGISTRY[name]()

        return self._instances[name]

    def list_modules(self) -> list[str]:
        """Retorna nomes de todos os módulos registrados."""
        return list(_REGISTRY.keys())

    def list_by_asset_type(self, asset_type: AssetType) -> list[str]:
        """Retorna módulos filtrados por tipo de ativo."""
        result = []
        for name, cls in _REGISTRY.items():
            instance = self.get_module(name)
            if instance.get_info().asset_type == asset_type:
                result.append(name)
        return result

    @property
    def registered_count(self) -> int:
        return len(_REGISTRY)
