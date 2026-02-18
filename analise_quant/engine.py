"""Motor principal de coleta de dados de mercado."""

import logging
from datetime import date

import pandas as pd

from analise_quant.config import settings
from analise_quant.models import CollectionResult, MarketData, MonthlyPerformance
from analise_quant.registry import ModuleRegistry

logger = logging.getLogger(__name__)


class CollectionEngine:
    """Orquestrador central de coleta de dados de mercado.

    Inicializa o registry, descobre módulos automaticamente,
    e expõe métodos para executar coletas por módulo ou em massa.
    """

    def __init__(self) -> None:
        self.registry = ModuleRegistry()
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

    def collect(
        self,
        module_name: str,
        tickers: list[str] | None = None,
        start_date: date | None = None,
        end_date: date | None = None,
    ) -> CollectionResult:
        """Executa coleta via um módulo específico.

        Args:
            module_name: Nome do módulo registrado (ex: "acoes_yfinance").
            tickers: Lista de tickers. Se None, usa a lista padrão do config.
            start_date: Data inicial. Se None, o módulo decide o default.
            end_date: Data final. Se None, usa hoje.

        Returns:
            CollectionResult com dados coletados.
        """
        if tickers is None:
            tickers = settings.default_tickers

        if end_date is None:
            end_date = date.today()

        if start_date is None:
            from datetime import timedelta

            start_date = end_date - timedelta(days=30)

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
        # TODO: Implementar coleta paralela
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

        # Converte para DataFrame
        records = [
            {"date": d.date, "close": d.adjusted_close or d.close} for d in data
        ]
        df = pd.DataFrame(records)
        df["date"] = pd.to_datetime(df["date"])
        df.set_index("date", inplace=True)
        df.sort_index(inplace=True)

        # Resample mensal (último preço do mês) - Usando 'ME' (Month End) para pandas >= 2.2
        # Se falhar com ME, tenta M (compatibilidade)
        try:
            monthly_closes = df["close"].resample("ME").last()
        except ValueError:
            monthly_closes = df["close"].resample("M").last()

        # Calcula retornos mensais percentuais
        monthly_returns = monthly_closes.pct_change()

        # Agrupa por ano
        performance_by_year: dict[int, dict[int, float]] = {}

        for date_idx, ret in monthly_returns.items():
            if pd.isna(ret):
                continue

            year = date_idx.year
            month = date_idx.month

            if year not in performance_by_year:
                performance_by_year[year] = {}

            performance_by_year[year][month] = float(ret)

        # Constrói lista de resultados
        results = []
        # Ordena anos decrescente (mais recente primeiro)
        sorted_years = sorted(performance_by_year.keys(), reverse=True)

        for year in sorted_years:
            year_data = performance_by_year[year]
            
            # Calcula YTD (Year To Date)
            # YTD = (1+r1)*(1+r2)*... - 1
            monthly_rets_list = list(year_data.values())
            
            if monthly_rets_list:
                ytd_mult = 1.0
                for r in monthly_rets_list:
                    ytd_mult *= (1 + r)
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

        for module_name in self.registry.list_modules():
            try:
                results[module_name] = self.collect(
                    module_name, tickers, start_date, end_date
                )
            except Exception:
                logger.exception("Falha na coleta do módulo '%s'", module_name)

        return results

    def list_modules(self) -> list[str]:
        """Lista nomes de todos os módulos disponíveis."""
        return self.registry.list_modules()

    def get_module_info(self, module_name: str):
        """Retorna metadados de um módulo."""
        return self.registry.get_module(module_name).get_info()
