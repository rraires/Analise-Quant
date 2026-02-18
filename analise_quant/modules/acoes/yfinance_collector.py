"""Módulo de coleta de ações da Bovespa via YFinance."""

import logging
from datetime import date, datetime

import pandas as pd
import yfinance as yf

from analise_quant.models import (
    AssetType,
    CollectionResult,
    CollectionStatus,
    MarketData,
    ModuleInfo,
)
from analise_quant.modules.base import BaseCollectorModule
from analise_quant.registry import register_module

logger = logging.getLogger(__name__)

# Sufixo para tickers da Bovespa no Yahoo Finance
BOVESPA_SUFFIX = ".SA"


@register_module("acoes_yfinance")
class YFinanceAcoesCollector(BaseCollectorModule):
    """Coletor de dados históricos de ações da Bovespa via YFinance."""

    def get_info(self) -> ModuleInfo:
        return ModuleInfo(
            name="acoes_yfinance",
            asset_type=AssetType.ACOES,
            source="yfinance",
            description="Coleta dados históricos de ações da Bovespa (B3) via Yahoo Finance.",
            version="0.1.0",
        )

    def _format_ticker(self, ticker: str) -> str:
        """Adiciona sufixo .SA se necessário."""
        ticker = ticker.upper().strip()
        if not ticker.endswith(BOVESPA_SUFFIX):
            return f"{ticker}{BOVESPA_SUFFIX}"
        return ticker

    def _parse_ticker(self, yf_ticker: str) -> str:
        """Remove sufixo .SA para exibição."""
        if yf_ticker.endswith(BOVESPA_SUFFIX):
            return yf_ticker[: -len(BOVESPA_SUFFIX)]
        return yf_ticker

    def validate_ticker(self, ticker: str) -> bool:
        """Valida se o ticker existe na Bovespa via YFinance."""
        yf_ticker = self._format_ticker(ticker)
        try:
            info = yf.Ticker(yf_ticker).info
            return info.get("regularMarketPrice") is not None
        except Exception:
            logger.debug("Ticker inválido: %s", ticker)
            return False

    def collect(
        self,
        tickers: list[str],
        start_date: date,
        end_date: date,
    ) -> CollectionResult:
        """Coleta dados OHLCV históricos para ações da Bovespa.

        Args:
            tickers: Lista de tickers sem sufixo (ex: ["PETR4", "VALE3"]).
            start_date: Data inicial.
            end_date: Data final.

        Returns:
            CollectionResult com MarketData para cada ticker/dia.
        """
        started_at = datetime.now()
        all_data: list[MarketData] = []
        errors: list[str] = []
        tickers_success: list[str] = []
        tickers_failed: list[str] = []

        yf_tickers = [self._format_ticker(t) for t in tickers]
        yf_tickers_str = " ".join(yf_tickers)

        logger.info(
            "Baixando dados YFinance: %s | %s → %s",
            yf_tickers_str,
            start_date,
            end_date,
        )

        try:
            df: pd.DataFrame = yf.download(
                yf_tickers_str,
                start=start_date.isoformat(),
                end=end_date.isoformat(),
                progress=False,
                auto_adjust=False,
            )

            if df.empty:
                errors.append("YFinance retornou DataFrame vazio.")
                tickers_failed = list(tickers)
            else:
                for yf_t, original_t in zip(yf_tickers, tickers):
                    try:
                        records = self._extract_ticker_data(
                            df, yf_t, original_t
                        )
                        all_data.extend(records)
                        if records:
                            tickers_success.append(original_t)
                        else:
                            tickers_failed.append(original_t)
                            errors.append(f"Sem dados para {original_t}")
                    except Exception as e:
                        tickers_failed.append(original_t)
                        errors.append(f"Erro processando {original_t}: {e}")
                        logger.exception("Erro processando ticker %s", original_t)

        except Exception as e:
            errors.append(f"Erro no download YFinance: {e}")
            tickers_failed = list(tickers)
            logger.exception("Falha no download YFinance")

        finished_at = datetime.now()

        if not tickers_success:
            status = CollectionStatus.ERROR
        elif tickers_failed:
            status = CollectionStatus.PARTIAL
        else:
            status = CollectionStatus.SUCCESS

        return CollectionResult(
            module_name="acoes_yfinance",
            status=status,
            data=all_data,
            errors=errors,
            tickers_requested=list(tickers),
            tickers_success=tickers_success,
            tickers_failed=tickers_failed,
            started_at=started_at,
            finished_at=finished_at,
        )

    def _extract_ticker_data(
        self,
        df: pd.DataFrame,
        yf_ticker: str,
        original_ticker: str,
    ) -> list[MarketData]:
        """Extrai MarketData de um DataFrame do YFinance para um ticker.

        Suporta yfinance >= 1.2.0 que sempre retorna MultiIndex columns.
        """
        records: list[MarketData] = []

        try:
            has_multiindex = isinstance(df.columns, pd.MultiIndex)

            if has_multiindex:
                ticker_data = pd.DataFrame(
                    {
                        "Open": df[("Open", yf_ticker)],
                        "High": df[("High", yf_ticker)],
                        "Low": df[("Low", yf_ticker)],
                        "Close": df[("Close", yf_ticker)],
                        "Volume": df[("Volume", yf_ticker)],
                    }
                )
                adj_close_key = ("Adj Close", yf_ticker)
                if adj_close_key in df.columns:
                    ticker_data["Adj Close"] = df[adj_close_key]
                else:
                    ticker_data["Adj Close"] = ticker_data["Close"]
            else:
                ticker_data = df[["Open", "High", "Low", "Close", "Volume"]].copy()
                if "Adj Close" in df.columns:
                    ticker_data["Adj Close"] = df["Adj Close"]
                else:
                    ticker_data["Adj Close"] = df["Close"]

            ticker_data = ticker_data.dropna(subset=["Close"])

            for idx, row in ticker_data.iterrows():
                ts = idx.to_pydatetime() if hasattr(idx, "to_pydatetime") else idx
                records.append(
                    MarketData(
                        ticker=original_ticker.upper(),
                        date=ts,
                        open=float(row["Open"]),
                        high=float(row["High"]),
                        low=float(row["Low"]),
                        close=float(row["Close"]),
                        volume=int(row["Volume"]),
                        adjusted_close=float(row["Adj Close"]),
                        currency="BRL",
                        source="yfinance",
                    )
                )
        except KeyError as e:
            logger.warning("Coluna não encontrada para %s: %s", original_ticker, e)

        return records

