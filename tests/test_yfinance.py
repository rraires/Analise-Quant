import yfinance as yf
import pandas as pd

# Configurar exibição do pandas
pd.set_option('display.max_columns', None)
pd.set_option('display.width', 1000)

def analisar_ativo(ticker_symbol):
    print(f"\n=== Analisando {ticker_symbol} ===\n")
    ticker = yf.Ticker(ticker_symbol)
    
    # 1. Info Resumida
    info = ticker.info
    print(f"Setor: {info.get('sector')}")
    print(f"Preço Atual: {info.get('currentPrice')}")
    print(f"P/L (Trailing): {info.get('trailingPE')}")
    
    # 2. Últimos 5 dias de cotações
    print("\n--- Histórico Recente ---")
    print(ticker.history(period="5d")[['Close', 'Volume']])
    
    # 3. Balanço Patrimonial (Último Ano)
    print("\n--- Balanço Patrimonial (Resumo) ---")
    bs = ticker.balance_sheet
    if not bs.empty:
        print(bs.iloc[:5, :1]) # Primeiras 5 linhas, coluna mais recente
    
    # 4. Recomendações de Analistas
    print("\n--- Recomendações ---")
    recs = ticker.recommendations
    if recs is not None and not recs.empty:
        print(recs.tail())

if __name__ == "__main__":
    analisar_ativo("PETR4.SA")