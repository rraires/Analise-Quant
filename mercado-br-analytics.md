# Expansão Analise Quant — Mercado Financeiro Brasileiro (`mercado-br-analytics`)

## Overview
Expandir a plataforma **Analise Quant** para suportar coleta, cache persistente (SQLite/disco), métricas quantitativas de risco/retorno, indicadores fundamentalistas e comparação multi-ativos do mercado brasileiro:
- **Fase 1 (Prioridade Imediata — Opção A)**:
  - **Benchmarks & Juros (BCB SGS)**: CDI (série `12`), SELIC (`11` / `432`), IPCA (`433`).
  - **Fundos Imobiliários (FIIs)**: Cotações históricas e indicadores fundamentalistas (P/VP, Dividend Yield, Liquidez, Segmento).
  - **Ações (B3)**: Indicadores fundamentalistas (P/L, P/VP, DY, ROE, ROIC, EV/EBITDA, Margem Líquida) somados às cotações.
  - **Motor Quantitativo & Comparador**: Gráfico comparativo normalizado (Ativos vs. CDI vs. IBOV vs. IPCA) e painel de métricas de risco (*Sharpe Ratio*, *Volatilidade Anualizada*, *CAGR*, *Max Drawdown*, *Beta* e *Correlação*).
- **Fase 2 (Complementar)**:
  - **Tesouro Direto (STN / PYield)**: Preços e taxas históricas de Tesouro Selic, Prefixado e IPCA+.
  - **Fundos de Investimento (CVM)**: Cotas diárias (`inf_diario_fi`), patrimônio líquido e comparativo contra CDI/IBOV.

## Project Type
**WEB + BACKEND** (Full-stack Python FastAPI + React/TypeScript Vite)

## Success Criteria
- [x] Novos módulos registrados automaticamente no `ModuleRegistry`: `bcb_sgs`, `fiis_yfinance`, `tesouro_direto`, `fundos_cvm`.
- [x] Cache persistente em SQLite (`output/cache.db`) + cache em memória reduzindo chamadas repetidas ao BCB, Yahoo Finance, CVM e Tesouro.
- [x] Endpoints REST para indicadores macro (`/api/macro/overview`), comparação multi-ativos (`/api/compare`), métricas de risco (`/api/stocks/{ticker}/metrics`), indicadores fundamentalistas (`/api/stocks/{ticker}/fundamentals`) e catálogo de fundos (`/api/funds/catalog`).
- [x] Interface React atualizada com Comparador de Ativos vs. CDI/IBOV, Cards de Indicadores Fundamentalistas & Risco (Sharpe, Volatilidade, Drawdown, CAGR) e seção de Renda Fixa / Tesouro / Juros.
- [x] 100% dos testes `pytest` e build TypeScript (`tsc && vite build`) passando sem erros.

## Tech Stack
- **Backend**: Python 3.11+, FastAPI, Pandas, NumPy, SQLite3 (cache persistente nativo), `yfinance`, `urllib`/`httpx` (APIs abertas BCB SGS, Tesouro Transparente, CVM e Fundamentus).
- **Frontend**: React 18, TypeScript, Vite, ApexCharts, Lucide Icons.

## File Structure
```plaintext
analise_quant/
├── cache.py                           # Cache persistente SQLite + TTL
├── analytics.py                       # Cálculo de Sharpe, Volatilidade, Drawdown, CAGR, Beta, Correlação
├── models.py                          # Novos modelos: FundamentalIndicators, RiskMetrics, ComparisonSeries, TesouroBond
├── api.py                             # Novos endpoints: /api/compare, /api/stocks/{ticker}/metrics, /api/macro/overview, /api/funds/catalog
└── modules/
    ├── acoes/
    │   ├── yfinance_collector.py      # Cotações de Ações e Índices (^BVSP)
    │   └── fundamentos_collector.py   # Indicadores Fundamentalistas B3 (Ações & FIIs)
    ├── fiis/
    │   └── fiis_collector.py          # Coletor dedicado de FIIs (.SA + dividendos)
    ├── macro/
    │   └── bcb_collector.py           # Coletor Banco Central SGS (CDI, SELIC, IPCA)
    ├── renda_fixa/
    │   └── tesouro_collector.py       # Coletor Tesouro Direto (Taxas e PU históricos)
    └── fundos/
        └── cvm_collector.py           # Coletor CVM (Informes Diários de Fundos por CNPJ)
frontend/src/
├── components/
│   ├── RiskAndFundamentalsPanel.tsx   # Cards de Sharpe, Volatilidade, Drawdown, P/L, P/VP, DY, ROE
│   ├── AssetComparisonChart.tsx       # Gráfico comparativo normalizado (% / Base 100 vs CDI e IBOV)
│   └── MacroAndFixedIncomePanel.tsx   # Painel CDI, SELIC, IPCA, Curva de Juros e Tesouro Direto
```

## Task Breakdown

| Task ID | Name | Agent | Skills | Priority | Dependencies | INPUT → OUTPUT → VERIFY |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **T1** | Cache Persistente SQLite (`cache.py`) | `database-architect` | `database-design`, `clean-code` | P0 | - | **IN**: `CollectionResult` / JSON series → **OUT**: `analise_quant/cache.py` com SQLite em `output/cache.db` → **VERIFY**: Teste unitário de leitura/escrita e expiração TTL |
| **T2** | Módulo BCB SGS: CDI, SELIC e IPCA (`bcb_collector.py`) | `backend-specialist` | `python-patterns`, `api-patterns` | P0 | T1 | **IN**: Séries SGS (`12` CDI, `11`/`432` SELIC, `433` IPCA) → **OUT**: `analise_quant/modules/macro/bcb_collector.py` registrado como `bcb_sgs` → **VERIFY**: `pytest tests/test_analytics_and_modules.py` |
| **T3** | Módulo FIIs e Indicadores Fundamentalistas B3 (`fiis_collector.py`, `fundamentos_collector.py`) | `backend-specialist` | `python-patterns`, `clean-code` | P1 | T1 | **IN**: Ticker de Ação ou FII (ex: `PETR4`, `HGLG11`) → **OUT**: Cotações + múltiplos (`P/L`, `P/VP`, `DY`, `ROE`, `EV/EBITDA`) → **VERIFY**: `pytest tests/test_analytics_and_modules.py` |
| **T4** | Motor de Métricas Quantitativas e Comparação (`analytics.py`) | `backend-specialist` | `python-patterns`, `clean-code` | P1 | T2 | **IN**: Séries de preços + série CDI → **OUT**: `analise_quant/analytics.py` calculando CAGR, Volatilidade (252 DU), Sharpe Ratio, Max Drawdown, Beta vs IBOV e séries normalizadas → **VERIFY**: `pytest tests/test_analytics_and_modules.py` |
| **T5** | Módulos Tesouro Direto e Fundos CVM (`tesouro_collector.py`, `cvm_collector.py`) | `backend-specialist` | `python-patterns`, `api-patterns` | P1 | T1 | **IN**: Título Tesouro ou CNPJ de Fundo CVM → **OUT**: Coletores `tesouro_direto` e `fundos_cvm` → **VERIFY**: `pytest tests/test_analytics_and_modules.py` |
| **T6** | Novos Endpoints FastAPI (`api.py`) | `backend-specialist` | `api-patterns`, `python-patterns` | P1 | T2, T3, T4, T5 | **IN**: Requisições HTTP → **OUT**: Endpoints `/api/stocks/{ticker}/fundamentals`, `/api/stocks/{ticker}/metrics`, `/api/compare`, `/api/macro/overview`, `/api/funds/catalog` → **VERIFY**: Testes de integração |
| **T7** | Painel de Risco, Fundamentos e Comparador vs. CDI/IBOV no Frontend | `frontend-specialist` | `react-best-practices`, `frontend-design` | P2 | T6 | **IN**: Dados dos novos endpoints → **OUT**: `RiskAndFundamentalsPanel.tsx`, `AssetComparisonChart.tsx`, `MacroAndFixedIncomePanel.tsx` integrados ao `App.tsx` → **VERIFY**: `npm run build` sem erros TypeScript |
| **T8** | Suíte Completa de Testes e Auditoria Final (Phase X) | `test-engineer` | `testing-patterns`, `lint-and-validate` | P3 | T1–T7 | **IN**: Código completo → **OUT**: Todos os testes unitários e build passando → **VERIFY**: `.venv/bin/pytest -v` e `npm run build` |

## Phase X: Verification Checklist
- [x] Todos os testes unitários e de integração passando (`pytest tests/ -v` -> 30 passed)
- [x] Compilação TypeScript e bundle Vite sem erros (`npm run build` -> built in 3.53s)
- [x] Sem uso de cores violeta/roxo (Purple Ban respeitado)
- [x] Socratic Gate respeitado antes da implementação

## ✅ PHASE X COMPLETE
- Lint & TypeScript: ✅ Pass (`tsc && vite build`)
- Unit Tests: ✅ Pass (`30 passed in 3.00s`)
- Build: ✅ Success (`dist/` gerado sem erros)
- Date: 2026-11-09
