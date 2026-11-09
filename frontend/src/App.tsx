import { useState } from 'react'
import axios from 'axios'
import { Search, TrendingUp, AlertCircle, Activity } from 'lucide-react'
import InteractiveLineChart from './components/InteractiveLineChart'
import SeasonalityChart from './components/SeasonalityChart'
import ErrorBoundary from './components/ErrorBoundary'
import MonthlyReturnsTable, { MonthlyPerformance } from './components/MonthlyReturnsTable'
import RiskAndFundamentalsPanel, { FundamentalIndicators, RiskMetrics } from './components/RiskAndFundamentalsPanel'
import AssetComparisonChart from './components/AssetComparisonChart'
import MacroAndFixedIncomePanel from './components/MacroAndFixedIncomePanel'

interface MarketData {
  ticker: string
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
  adjusted_close?: number
  currency: string
  source: string
}

const QUICK_ASSETS = [
  { label: 'PETR4 (Ação)', code: 'PETR4' },
  { label: 'VALE3 (Ação)', code: 'VALE3' },
  { label: 'WEGE3 (Ação)', code: 'WEGE3' },
  { label: 'HGLG11 (FII)', code: 'HGLG11' },
  { label: 'MXRF11 (FII)', code: 'MXRF11' },
  { label: 'KNRI11 (FII)', code: 'KNRI11' },
  { label: 'CDI (Bacen)', code: 'CDI' },
  { label: 'Tesouro IPCA+', code: 'TESOURO_IPCA' },
]

function App() {
  const [ticker, setTicker] = useState('')
  const [activeTicker, setActiveTicker] = useState('')
  const [data, setData] = useState<MarketData[]>([])
  const [monthlyData, setMonthlyData] = useState<MonthlyPerformance[]>([])
  const [fundamentals, setFundamentals] = useState<FundamentalIndicators | null>(null)
  const [riskMetrics, setRiskMetrics] = useState<RiskMetrics | null>(null)
  const [loading, setLoading] = useState(false)
  const [chartLoading, setChartLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState('1y')

  const fetchData = async (symbol: string, timeRange: string, isChartUpdate: boolean = false) => {
    const cleanSymbol = symbol.trim().toUpperCase()
    if (!cleanSymbol) return

    if (isChartUpdate) {
      setChartLoading(true)
    } else {
      setLoading(true)
      setData([])
      setMonthlyData([])
      setFundamentals(null)
      setRiskMetrics(null)
    }

    setError(null)
    setActiveTicker(cleanSymbol)

    let days = 365
    switch (timeRange) {
      case '6m': days = 180; break;
      case '1y': days = 365; break;
      case '3y': days = 1095; break;
      case '5y': days = 1825; break;
      case '10y': days = 3650; break;
      default: days = 365;
    }

    try {
      const response = await axios.get<MarketData[]>(`/api/stocks/${cleanSymbol}?days=${days}`)

      if (!Array.isArray(response.data)) {
        throw new Error('Formato de dados inválido recebido da API')
      }

      const sortedData = [...response.data].sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return dateB - dateA;
      })

      setData(sortedData)

      // Busca métricas de risco para o período selecionado
      axios.get<RiskMetrics>(`/api/stocks/${cleanSymbol}/metrics?days=${days}`)
        .then((res) => setRiskMetrics(res.data))
        .catch(() => {})

      if (!isChartUpdate) {
        axios.get<MonthlyPerformance[]>(`/api/stocks/${cleanSymbol}/returns`)
          .then((res) => setMonthlyData(res.data))
          .catch(() => {})

        axios.get<FundamentalIndicators>(`/api/stocks/${cleanSymbol}/fundamentals`)
          .then((res) => setFundamentals(res.data))
          .catch(() => {})
      }

    } catch (err: unknown) {
      console.error('Erro na busca:', err)
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.detail || err.message || 'Erro ao carregar dados')
      } else if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Erro ao carregar dados')
      }
    } finally {
      if (isChartUpdate) {
        setChartLoading(false)
      } else {
        setLoading(false)
      }
    }
  }

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!ticker) return
    fetchData(ticker, period, false)
  }

  const handleQuickSelect = (sym: string) => {
    setTicker(sym)
    fetchData(sym, period, false)
  }

  const handlePeriodChange = (newPeriod: string) => {
    setPeriod(newPeriod)
    if (activeTicker) {
      fetchData(activeTicker, newPeriod, true)
    }
  }

  return (
    <div className="container">
      <header className="header">
        <h1>Analise Quant</h1>
        <p>Plataforma Quantitativa do Mercado Brasileiro — Ações, FIIs, Fundos CVM, Tesouro Direto, CDI e Juros</p>
      </header>

      <main>
        <form onSubmit={handleSearch} className="glass-card search-box">
          <div className="input-container">
            <label htmlFor="ticker-input" className="sr-only" style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0, 0, 0, 0)' }}>
              Código do Ativo (Ticker, FII, Fundo ou Índice)
            </label>
            <Search size={20} className="icon" />
            <input
              id="ticker-input"
              type="text"
              placeholder="Digite Ação (PETR4), FII (HGLG11), Fundo (VERDE_FIM), CDI ou TESOURO_IPCA..."
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
            />
          </div>
          <button type="submit" className="btn-search" disabled={loading || !ticker}>
            {loading ? (
              <div className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }}></div>
            ) : (
              <Activity size={18} />
            )}
            {loading ? 'Coletando...' : 'Analisar Ativo'}
          </button>
        </form>

        {/* Barra de Atalhos de Classes de Ativos */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Acesso Rápido:</span>
          {QUICK_ASSETS.map((item) => (
            <button
              key={item.code}
              type="button"
              onClick={() => handleQuickSelect(item.code)}
              style={{
                background: activeTicker === item.code ? '#38bdf8' : 'rgba(255,255,255,0.05)',
                color: activeTicker === item.code ? '#0f172a' : '#cbd5e1',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '6px',
                padding: '5px 10px',
                fontSize: '0.8rem',
                fontWeight: activeTicker === item.code ? 700 : 500,
                cursor: 'pointer',
              }}
            >
              {item.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="error-message">
            <AlertCircle size={20} />
            <p>{error}</p>
          </div>
        )}

        <div className="results-area">
          {loading ? (
            <div className="loader">
              <div className="spinner"></div>
              <p>Consultando B3, Banco Central (SGS), Tesouro e CVM...</p>
            </div>
          ) : data.length > 0 ? (
            <>
              <RiskAndFundamentalsPanel
                fundamentals={fundamentals}
                riskMetrics={riskMetrics}
              />

              <ErrorBoundary>
                <InteractiveLineChart
                  data={data}
                  ticker={activeTicker}
                  period={period}
                  onPeriodChange={handlePeriodChange}
                  isLoading={chartLoading}
                />
              </ErrorBoundary>

              <ErrorBoundary>
                <AssetComparisonChart
                  primaryTicker={activeTicker}
                  period={period}
                />
              </ErrorBoundary>

              {monthlyData.length > 0 && (
                <>
                  <SeasonalityChart data={monthlyData} ticker={activeTicker} />
                  <MonthlyReturnsTable data={monthlyData} ticker={activeTicker} />
                </>
              )}
            </>
          ) : !error && (
            <div className="glass-card empty-state">
              <TrendingUp size={48} style={{ marginBottom: '1.5rem', opacity: 0.2 }} />
              <h3>Selecione ou pesquise um ativo para iniciar</h3>
              <p>Compare Ações, Fundos Imobiliários (FIIs), Fundos CVM, Tesouro Direto, CDI e IBOV na mesma tela.</p>
            </div>
          )}

          {/* Panorama Macro (SELIC, CDI, IPCA, Curva de Juros, Tesouro Direto e Fundos CVM) sempre visível na mesma tela */}
          <ErrorBoundary>
            <MacroAndFixedIncomePanel onSelectSymbol={handleQuickSelect} />
          </ErrorBoundary>
        </div>
      </main>

      <footer style={{ marginTop: '4rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
        <p>© 2026 Analise Quant — Mercado Financeiro Brasileiro (B3 • BCB • CVM • Tesouro Direto)</p>
      </footer>
    </div>
  )
}

export default App
