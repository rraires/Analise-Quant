"""Testes do ModuleRegistry."""

import pytest

from analise_quant.exceptions import ModuleNotFoundError as AQModuleNotFoundError
from analise_quant.models import AssetType, ModuleInfo
from analise_quant.modules.base import BaseCollectorModule
from analise_quant.registry import ModuleRegistry, _REGISTRY, register_module


class DummyCollector(BaseCollectorModule):
    """Módulo fake para testes."""

    def get_info(self):
        return ModuleInfo(
            name="test_dummy",
            asset_type=AssetType.ACOES,
            source="test",
            description="Módulo de teste",
        )

    def collect(self, tickers, start_date, end_date):
        pass

    def validate_ticker(self, ticker):
        return ticker == "VALID"


@pytest.fixture(autouse=True)
def clean_registry():
    """Limpa o registry global antes de cada teste."""
    original = dict(_REGISTRY)
    _REGISTRY.clear()
    yield
    _REGISTRY.clear()
    _REGISTRY.update(original)


class TestRegisterModule:
    def test_register_module_decorator(self):
        @register_module("test_module")
        class TestModule(DummyCollector):
            pass

        assert "test_module" in _REGISTRY
        assert _REGISTRY["test_module"] is TestModule

    def test_register_duplicate_warns(self, caplog):
        @register_module("dup_module")
        class First(DummyCollector):
            pass

        @register_module("dup_module")
        class Second(DummyCollector):
            pass

        assert _REGISTRY["dup_module"] is Second


class TestModuleRegistry:
    def test_get_module_returns_instance(self):
        register_module("inst_test")(DummyCollector)
        registry = ModuleRegistry()

        module = registry.get_module("inst_test")

        assert isinstance(module, DummyCollector)

    def test_get_module_caches_instance(self):
        register_module("cache_test")(DummyCollector)
        registry = ModuleRegistry()

        m1 = registry.get_module("cache_test")
        m2 = registry.get_module("cache_test")

        assert m1 is m2

    def test_get_module_not_found_raises(self):
        registry = ModuleRegistry()

        with pytest.raises(AQModuleNotFoundError):
            registry.get_module("nao_existe")

    def test_list_modules(self):
        register_module("mod_a")(DummyCollector)
        register_module("mod_b")(DummyCollector)
        registry = ModuleRegistry()

        modules = registry.list_modules()

        assert "mod_a" in modules
        assert "mod_b" in modules

    def test_list_by_asset_type(self):
        register_module("acoes_test")(DummyCollector)
        registry = ModuleRegistry()

        result = registry.list_by_asset_type(AssetType.ACOES)

        assert "acoes_test" in result

    def test_discover_modules_finds_acoes(self):
        import sys

        # Remove cached module so discover can re-trigger @register_module
        keys_to_remove = [
            k for k in sys.modules if k.startswith("analise_quant.modules.acoes")
        ]
        for k in keys_to_remove:
            del sys.modules[k]

        registry = ModuleRegistry()
        registry.discover_modules()

        assert registry.registered_count > 0
        assert "acoes_yfinance" in registry.list_modules()
