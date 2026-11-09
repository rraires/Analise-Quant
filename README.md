# 📈 Analise Quant — Plataforma Quantitativa do Mercado Brasileiro

Plataforma modular de análise quantitativa de investimentos focada no mercado financeiro brasileiro: **Ações (B3)**, **Fundos Imobiliários (FIIs)**, **Fundos de Investimento (CVM)**, **Tesouro Direto**, **CDI**, **SELIC**, **IPCA** e **Curva de Juros (ANBIMA/DI1)**.

## Instalação

```bash
# Criar e ativar ambiente Conda
conda create -n analise_quant python=3.12 -y
conda activate analise_quant

# Instalar dependências
pip install -e ".[dev]"
```

## Executando a Plataforma (Web)

Para rodar a interface web completa com gráfico de candlestick e tabela, você precisará de dois terminais:

### 1. Servidor Backend (API)
Ative o ambiente e inicie a API FastAPI:
```bash
conda activate analise_quant
uvicorn analise_quant.api:app --reload --port 8000
```
A API estará disponível em `http://localhost:8000`.

### 2. Interface Frontend
Em outro terminal, instale as dependências e inicie o Vite:
```bash
cd frontend
npm install
npm run dev
```
O frontend estará acessível em `http://localhost:5173`.

---

## Estrutura do Projeto

```
.
├── analise_quant/      ← Backend Python (FastAPI)
│   ├── api.py          ← Endpoints da API
│   ├── engine.py       ← Orquestrador de coleta
│   └── modules/        ← Coletores (YFinance, etc)
├── frontend/           ← Interface React (TypeScript + Vite)
│   ├── src/
│   │   ├── components/ ← Gráficos (ApexCharts) e UI
│   │   └── App.tsx     ← Lógica principal da interface
└── output/             ← Dados exportados (CSV/JSON)
```

## Uso via CLI

Abaixo comandos para utilizar apenas o motor de coleta via terminal:

```bash
# Coleta padrão (IBOV top 10, últimos 30 dias)
python -m analise_quant

# Coleta específica
python -m analise_quant --module acoes_yfinance --tickers PETR4 VALE3 ITUB4 --days 60

# Listar módulos disponíveis
python -m analise_quant --list-modules
```

## Testes

```bash
# Backend
python -m pytest tests/ -v

# Frontend (Checagem de tipos)
cd frontend
npx tsc --noEmit
```

## Configuração via `.env`

Crie um arquivo `.env` na raiz para customizar o comportamento:

```env
AQ_LOG_LEVEL=DEBUG
AQ_OUTPUT_DIR=./output
AQ_COLLECTION_TIMEOUT=120
AQ_EXPORT_CSV=true
AQ_EXPORT_JSON=true
```
