import { useState } from 'react'
import axios from 'axios'
import { Search, TrendingUp, AlertCircle, Calendar, DollarSign, Activity } from 'lucide-react'
import InteractiveLineChart from './components/InteractiveLineChart'
import SeasonalityChart from './components/SeasonalityChart'
import ErrorBoundary from './components/ErrorBoundary'
import MonthlyReturnsTable, { MonthlyPerformance } from './components/MonthlyReturnsTable'

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

function App() {
  const [ticker, setTicker] = useState('')
  const [data, setData] = useState<MarketData[]>([])
  const [monthlyData, setMonthlyData] = useState<MonthlyPerformance[]>([])
  const [loading, setLoading] = useState(false)
  const [chartLoading, setChartLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState('6m')

  const fetchData = async (symbol: string, timeRange: string, isChartUpdate: boolean = false) => {
    if (isChartUpdate) {
      setChartLoading(true)
    } else {
      setLoading(true)
      setData([])
      setMonthlyData([])
    }

    setError(null)

    console.log('Iniciando busca para:', symbol, 'Periodo:', timeRange, 'Update:', isChartUpdate)

    let days = 30
    switch (timeRange) {
      case '6m': days = 180; break;
      case '1y': days = 365; break;
      case '3y': days = 1095; break;
      case '5y': days = 1825; break;
      case '10y': days = 3650; break;
      default: days = 180;
    }

    try {
      const response = await axios.get<MarketData[]>(`/api/stocks/${symbol}?days=${days}`)

      if (!Array.isArray(response.data)) {
        throw new Error('Formato de dados inválido recebido da API')
      }

      const sortedData = [...response.data].sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return dateB - dateA;
      })

      setData(sortedData)

      // Carregar dados mensais apenas se for busca completa
      if (!isChartUpdate) {
        try {
          const returnsResponse = await axios.get<MonthlyPerformance[]>(`/api/stocks/${symbol}/returns`)
          setMonthlyData(returnsResponse.data)
        } catch (returnsErr) {
          console.error('Erro ao buscar retornos mensais:', returnsErr)
        }
      }

    } catch (err: any) {
      console.error('Erro na busca:', err)
      setError(err.response?.data?.detail || err.message || 'Erro ao carregar dados')
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

  const handlePeriodChange = (newPeriod: string) => {
    setPeriod(newPeriod)
    if (ticker) {
      fetchData(ticker, newPeriod, true)
    }
  }

  const formatCurrency = (value: number | undefined | null) => {
    if (value === undefined || value === null || isNaN(value)) return 'N/A';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
  }

  const formatDate = (dateStr: string | undefined | null) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('pt-BR')
  }

  return (
    <div className="container">
      <header className="header">
        <h1>Analise Quant</h1>
        <p>Motor de Inteligência e Coleta de Dados Bovespa</p>
      </header>

      <main>
        <form onSubmit={handleSearch} className="glass-card search-box">
          <div className="input-container">
            <Search size={20} className="icon" />
            <input
              type="text"
              placeholder="Digite o ticker (ex: PETR4, VALE3, ITUB4)..."
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
            {loading ? 'Coletando...' : 'Buscar Dados'}
          </button>
        </form>

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
              <p>Consultando API do Yahoo Finance e processando dados...</p>
            </div>
          ) : data.length > 0 ? (
            <>
              <ErrorBoundary>
                <InteractiveLineChart
                  data={data}
                  ticker={ticker}
                  period={period}
                  onPeriodChange={handlePeriodChange}
                  isLoading={chartLoading}
                />
              </ErrorBoundary>

              {monthlyData.length > 0 && (
                <>
                  <SeasonalityChart data={monthlyData} ticker={ticker} />
                  <MonthlyReturnsTable data={monthlyData} ticker={ticker} />
                </>
              )}
            </>
          ) : !error && (
            <div className="glass-card empty-state">
              <TrendingUp size={48} style={{ marginBottom: '1.5rem', opacity: 0.2 }} />
              <h3>Nenhum dado carregado</h3>
              <p>Busque por um ticker da Bovespa para iniciar a análise.</p>
            </div>
          )}
        </div>
      </main >

      <footer style={{ marginTop: '4rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
        <p>© 2026 Analise Quant — Desenvolvido por Roberto</p>
      </footer>
    </div >
  )
}

export default App
