"""API REST para a plataforma Analise Quant - Vercel Serverless."""

from datetime import date, timedelta
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import pandas as pd
import yfinance as yf

app = FastAPI(title="Analise Quant API")

# Configurar CORS para permitir o frontend React
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Em produção, restringir ao domínio do frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def _format_b3_ticker(ticker: str) -> str:
    normalized = ticker.upper().strip()
    if normalized.endswith(".SA"):
        return normalized
    return f"{normalized}.SA"

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "version": "0.1.0"}

@app.get("/api/stocks/{ticker}")
async def get_stock_data(ticker: str, days: int = 30):
    """
    Coleta dados de uma ação para os últimos X dias.
    """
    try:
        formatted_ticker = _format_b3_ticker(ticker)
        
        # Usar yfinance diretamente
        stock = yf.Ticker(formatted_ticker)
        
        # Obter dados históricos
        end_date = date.today()
        start_date = end_date - timedelta(days=days)
        
        hist = stock.history(start=start_date, end=end_date)
        
        if hist.empty:
            raise HTTPException(status_code=404, detail=f"Dados não encontrados para {ticker}")
        
        # Converter para lista de dicionários
        data = []
        for date_idx, row in hist.iterrows():
            data.append({
                "date": date_idx.date().isoformat(),
                "open": float(row["Open"]),
                "high": float(row["High"]),
                "low": float(row["Low"]),
                "close": float(row["Close"]),
                "volume": int(row["Volume"])
            })
        
        return data
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar dados: {str(e)}")

@app.get("/api/stocks/{ticker}/returns")
async def get_stock_returns(ticker: str, days: int = 365):
    """
    Coleta dados mensais de retorno de uma ação.
    """
    try:
        formatted_ticker = _format_b3_ticker(ticker)
        stock = yf.Ticker(formatted_ticker)
        
        # Obter dados mensais dos últimos anos
        end_date = date.today()
        start_date = end_date - timedelta(days=days)
        
        hist = stock.history(start=start_date, end=end_date, interval="1mo")
        
        if hist.empty:
            raise HTTPException(status_code=404, detail=f"Dados não encontrados para {ticker}")
        
        # Calcular retornos mensais
        data = []
        for date_idx, row in hist.iterrows():
            data.append({
                "date": date_idx.date().isoformat(),
                "return": float(row["Close"])
            })
        
        return data
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar dados de retorno: {str(e)}")

# Handler para Vercel
handler = app