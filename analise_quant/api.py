"""API REST para a plataforma Analise Quant."""

from datetime import date, timedelta
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import pandas as pd
import yfinance as yf

from analise_quant.engine import CollectionEngine
from analise_quant.models import MarketData, CollectionStatus, MonthlyPerformance

app = FastAPI(title="Analise Quant API")

# Configurar CORS para permitir o frontend React
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Em produção, restringir ao domínio do frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inicializar o motor de coleta
engine = CollectionEngine()

def _format_b3_ticker(ticker: str) -> str:
    normalized = ticker.upper().strip()
    if normalized.endswith(".SA"):
        return normalized
    return f"{normalized}.SA"

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "version": "0.1.0"}

@app.get("/api/stocks/{ticker}", response_model=List[MarketData])
async def get_stock_data(ticker: str, days: int = 30):
    """
    Coleta dados de uma ação para os últimos X dias.
    """
    try:
        end_date = date.today()
        start_date = end_date - timedelta(days=days)
        
        # Usamos o módulo padrao de acoes_yfinance
        result = engine.collect(
            module_name="acoes_yfinance",
            tickers=[ticker],
            start_date=start_date,
            end_date=end_date
        )
        
        if result.status == CollectionStatus.ERROR:
            raise HTTPException(status_code=404, detail=f"Erro ao coletar dados para {ticker}: {result.errors}")
            
        return result.data
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/stocks/{ticker}/returns", response_model=List[MonthlyPerformance])
async def get_stock_returns(ticker: str, years: int = 10):
    """
    Calcula e retorna a performance mensal para os últimos X anos.
    """
    try:
        end_date = date.today()
        start_date = end_date - timedelta(days=years * 365 + 60)

        yf_ticker = _format_b3_ticker(ticker)
        df = yf.download(
            yf_ticker,
            start=start_date.isoformat(),
            end=end_date.isoformat(),
            interval="1mo",
            progress=False,
            auto_adjust=False,
        )

        if df.empty:
            raise HTTPException(status_code=404, detail=f"Sem dados para {ticker}")

        normalized_ticker = ticker.upper().replace(".SA", "")
        records: list[MarketData] = []

        for index, row in df.iterrows():
            close_value = row.get("Close")
            if pd.isna(close_value):
                continue

            records.append(
                MarketData(
                    ticker=normalized_ticker,
                    date=index.to_pydatetime(),
                    open=float(row["Open"]) if not pd.isna(row.get("Open")) else float(close_value),
                    high=float(row["High"]) if not pd.isna(row.get("High")) else float(close_value),
                    low=float(row["Low"]) if not pd.isna(row.get("Low")) else float(close_value),
                    close=float(close_value),
                    volume=int(row["Volume"]) if not pd.isna(row.get("Volume")) else 0,
                    adjusted_close=float(row["Adj Close"]) if "Adj Close" in df.columns and not pd.isna(row.get("Adj Close")) else None,
                    currency="BRL",
                    source="yfinance",
                )
            )

        monthly_perf = engine.calculate_monthly_returns(records)
        return monthly_perf
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
