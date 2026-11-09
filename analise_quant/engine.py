"""Motor principal de coleta de dados de mercado."""

import logging
import time
from datetime import date, timedelta

import pandas as pd

from analise_quant.cache import persistent_cache
from analise_quant.config import settings
from analise_quant.models import CollectionResult, CollectionStatus, MarketData, MonthlyPerformance
from analise_quant.registry import ModuleRegistry

logger = logging.getLogger(__name__)


class CollectionEngine:
    """Orquestrador central de coleta de dados de mercado.

    Inicializa o registry, descobre módulos automaticamente,
    e expõe métodos para executar coletas por módulo ou em massa.
    """

    def __init__(self, cache_ttl: int | None = None) -> None:
        self.registry = ModuleRegistry()
        self._cache_ttl = settings.cache_ttl_seconds if cache_ttl is None else cache_ttl
        self._cache: dict[tuple[str, tuple[str, ...], date, date], tuple[float, CollectionResult]] = {}
        self._configure_logging()
        self.registry.discover_modules()
        logger.info(
            "Engine inicializado com %d módulo(s).", self.registry.registered_count
        )

    def _configure_logging(self) -> None:
        logging.basicConfig(
            level=getattr(logging, settings.log_level.upper(), logging.INFO),
            format="%(asctime)s | %(name)-30s | %(levelname)-7s | %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )

    def clear_cache(self) -> None:
        """Limpa o cache em memória e persistente de coletas."""
        self._cache.clear()
        persistent_cache.clear()

    def resolve_module_for_symbol(self, symbol: str) -> str:
        """Determina automaticamente o módulo de coleta ideal para o símbolo informado."""
        s = symbol.upper().strip()
        if s in ("CDI", "SELIC", "SELIC_META", "CDI_AA", "IPCA", "IGPM"):
            return "bcb_sgs"
        if s.startswith("TESOURO") or s in ("LFT", "LTN", "NTNB"):
            return "tesouro_direto"
        if s in ("VERDE_FIM", "ALASKA_BLACK", "DYNAMO_COUGAR", "SPX_NIMITZ", "KINEA_ATLAS") or "/" in s:
            return "fundos_cvm"
        if s.endswith("11") and s not in ("TAEE11", "SANB11", "KLBN11", "ALUP11", "SAPR11", "ENGI11", "BPAC11", "IGTI11"):
            return "fiis_yfinance" if "fiis_yfinance" in self.registry.list_modules() else "acoes_yfinance"
        return "acoes_yfinance"

    def collect(
        self,
        module_name: str,
        tickers: list[str] | None = None,
        start_date: date | None = None,
        end_date: date | None = None,
    ) -> CollectionResult:
        """Executa coleta via um módulo específico."""
        if tickers is None:
            tickers = settings.default_tickers

        if end_date is None:
            end_date = date.today()

        if start_date is None:
            start_date = end_date - timedelta(days=30)

        normalized_tickers = tuple(t.upper().strip() for t in tickers)
        cache_key = (module_name, normalized_tickers, start_date, end_date)
        sqlite_key = f"collect:{module_name}:{','.join(normalized_tickers)}:{start_date.isoformat()}:{end_date.isoformat()}"

        if self._cache_ttl > 0:
            if cache_key in self._cache:
                cached_at, cached_result = self._cache[cache_key]
                if (time.monotonic() - cached_at) < self._cache_ttl:
                    logger.debug("Retornando coleta em cache (RAM) para %s", cache_key)
                    return cached_result
            persisted = persistent_cache.get(sqlite_key)
            if persisted is not None:
                try:
                    restored = CollectionResult(**persisted)
                    self._cache[cache_key] = (time.monotonic(), restored)
                    return restored
                except Exception:
                    pass

        module = self.registry.get_module(module_name)
        info = module.get_info()

        logger.info(
            "Iniciando coleta: módulo='%s' | ativos=%s | período=%s a %s",
            info.name,
            tickers,
            start_date,
            end_date,
        )

        result = module.collect(tickers, start_date, end_date)

        if self._cache_ttl > 0 and result.status != CollectionStatus.ERROR:
            self._cache[cache_key] = (time.monotonic(), result)
            persistent_cache.set(sqlite_key, result.model_dump(mode="json"), ttl=self._cache_ttl)

        logger.info(
            "Coleta finalizada: status=%s | registros=%d | duração=%.2fs | "
            "sucesso=%s | falhas=%s",
            result.status.value,
            result.total_records,
            result.duration_seconds,
            result.tickers_success,
            result.tickers_failed,
        )

        return result

    def collect_all(
        self,
        tickers: list[str] | None = None,
        start_date: date | None = None,
        end_date: date | None = None,
    ) -> dict[str, CollectionResult]:
        """Executa coleta em todos os módulos registrados.

        Returns:
            Dicionário {nome_módulo: CollectionResult}.
        """
        results: dict[str, CollectionResult] = {}
        for module_name in self.registry.list_modules():
            try:
                results[module_name] = self.collect(
                    module_name, tickers, start_date, end_date
                )
            except Exception:
                logger.exception("Falha na coleta do módulo '%s'", module_name)

        return results

    def calculate_monthly_returns(
        self,
        data: list[MarketData],
    ) -> list[MonthlyPerformance]:
        """Calcula a performance mensal (jan-dez) por ano.

        Args:
            data: Lista de MarketData (deve conter pelo menos 13 meses para calcular 12 meses de retorno).

        Returns:
            Lista de MonthlyPerformance ordenada por ano decrescente.
        """
        if not data:
            return []

        records = [
            {"date": d.date, "close": d.adjusted_close or d.close} for d in data
        ]
        df = pd.DataFrame(records)
        df["date"] = pd.to_datetime(df["date"])
        df = df.set_index("date").sort_index()

        # Resample mensal (último preço do mês) - Usando 'ME' (Month End) para pandas >= 2.2
        try:
            monthly_closes = df["close"].resample("ME").last()
        except ValueError:
            monthly_closes = df["close"].resample("M").last()

        monthly_returns = monthly_closes.pct_change()

        performance_by_year: dict[int, dict[int, float]] = {}

        for date_idx, ret in monthly_returns.items():
            if pd.isna(ret):
                continue

            year = date_idx.year
            month = date_idx.month

            if year not in performance_by_year:
                performance_by_year[year] = {}

            performance_by_year[year][month] = float(ret)

        if not performance_by_year:
            return []

        sorted_years = sorted(performance_by_year.keys(), reverse=True)
        oldest_year = sorted_years[-1]
        newest_year = sorted_years[0]

        results = []
        for year in sorted_years:
            year_data = performance_by_year[year]

            # Se o ano mais antigo possui apenas meses finais de buffer (sem janeiro)
            # e existem anos posteriores completos, ignora o ano parcial de buffer.
            if (
                year == oldest_year
                and year != newest_year
                and 1 not in year_data
                and len(year_data) <= 2
            ):
                continue

            monthly_rets_list = list(year_data.values())

            if monthly_rets_list:
                ytd_mult = 1.0
                for r in monthly_rets_list:
                    ytd_mult *= 1 + r
                ytd = ytd_mult - 1.0
            else:
                ytd = None

            results.append(
                MonthlyPerformance(
                    year=year,
                    returns=year_data,
                    ytd=ytd,
                )
            )

        return results

    def list_modules(self) -> list[str]:
        """Lista nomes de todos os módulos disponíveis."""
        return self.registry.list_modules()

    def get_module_info(self, module_name: str):
        """Retorna metadados de um módulo."""
        return self.registry.get_module(module_name).get_info()

