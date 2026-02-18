"""API REST para a plataforma Analise Quant."""

from datetime import date, timedelta
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List

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
        import traceback
        print(f"Erro em get_stock_returns: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/stocks/{ticker}/returns", response_model=List[MonthlyPerformance])
async def get_stock_returns(ticker: str, years: int = 10):
    """
    Calcula e retorna a performance mensal para os últimos X anos.
    """
    try:
        # Pega um pouco mais de dados para garantir que temos o fechamento do mês anterior ao primeiro mês
        end_date = date.today()
        # Aproximação de dias + margem de segurança
        start_date = end_date - timedelta(days=years * 365 + 60)
        
        result = engine.collect(
            module_name="acoes_yfinance",
            tickers=[ticker],
            start_date=start_date,
            end_date=end_date
        )
        
        if result.status == CollectionStatus.ERROR:
            raise HTTPException(status_code=404, detail=f"Erro ao coletar dados: {result.errors}")
            
        monthly_perf = engine.calculate_monthly_returns(result.data)
        return monthly_perf
        
    except Exception as e:
        import traceback
        print(f"Erro em get_stock_returns: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
