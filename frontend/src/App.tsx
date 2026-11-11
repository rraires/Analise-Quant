import { useState, useEffect } from 'react'
import axios from 'axios'
import {
  Search,
  TrendingUp,
  AlertCircle,
  Activity,
  LayoutGrid,
  Building2,
  Briefcase,
  Landmark,
  Percent,
  GitCompare,
  Radar,
} from 'lucide-react'
import InteractiveLineChart from './components/InteractiveLineChart'
import SeasonalityChart from './components/SeasonalityChart'
import ErrorBoundary from './components/ErrorBoundary'
import MonthlyReturnsTable, { MonthlyPerformance } from './components/MonthlyReturnsTable'
import RiskAndFundamentalsPanel, { FundamentalIndicators, RiskMetrics } from './components/RiskAndFundamentalsPanel'
import TechnicalDecisionPanel, { TechnicalDecisionReport } from './components/TechnicalDecisionPanel'
import B3ScannerPanel from './components/B3ScannerPanel'
import AssetComparisonChart from './components/AssetComparisonChart'
import MacroAndFixedIncomePanel, { MacroSectionFilter } from './components/MacroAndFixedIncomePanel'

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

type NavMenuId = 'todos' | 'scanner' | 'acoes' | 'fiis' | 'fundos' | 'tesouro' | 'juros' | 'comparador'

const NAV_MENU_ITEMS: {
  id: NavMenuId
  label: string
  subtitle: string
  defaultSymbol?: string
  anchorId?: string
  icon: typeof LayoutGrid
}[] = [
  {
    id: 'todos',
    label: 'Painel Completo',
    subtitle: 'Todas as análises na mesma tela',
    icon: LayoutGrid,
  },
  {
    id: 'scanner',
    label: 'Scanner & Sinais B3',
    subtitle: 'Score 0–100, 6 Estratégias e Ranking',
    anchorId: 'secao-scanner-b3',
    icon: Radar,
  },
  {
    id: 'acoes',
    label: 'Ações (B3)',
    subtitle: 'Cotações, P/L, P/VP, DY, ROE e Risco',
    defaultSymbol: 'PETR4',
    anchorId: 'secao-ativo-principal',
    icon: TrendingUp,
  },
  {
    id: 'fiis',
    label: 'Fundos Imobiliários',
    subtitle: 'FIIs B3, Dividend Yield e P/VP',
    defaultSymbol: 'HGLG11',
    anchorId: 'secao-ativo-principal',
    icon: Building2,
  },
  {
    id: 'comparador',
    label: 'Comparador vs. CDI/IBOV',
    subtitle: 'Rentabilidade % e Sharpe Multi-Ativos',
    anchorId: 'secao-comparador',
    icon: GitCompare,
  },
  {
    id: 'tesouro',
    label: 'Tesouro Direto',
    subtitle: 'Selic, Prefixado e IPCA+ (Taxas e PU)',
    defaultSymbol: 'TESOURO_IPCA',
    anchorId: 'secao-tesouro-direto',
    icon: Landmark,
  },
  {
    id: 'fundos',
    label: 'Fundos de Investimento',
    subtitle: 'Cotas Diárias CVM (FIA / FIM / RF)',
    defaultSymbol: 'VERDE_FIM',
    anchorId: 'secao-fundos-cvm',
    icon: Briefcase,
  },
  {
    id: 'juros',
    label: 'CDI, SELIC & Juros',
    subtitle: 'Séries BCB SGS e Curva Pré-DI ANBIMA',
    defaultSymbol: 'CDI',
    anchorId: 'secao-cdi-juros',
    icon: Percent,
  },
]

const CATEGORY_QUICK_ASSETS: Record<NavMenuId, { label: string; code: string; tag: string }[]> = {
  todos: [
    { label: 'PETR4', code: 'PETR4', tag: 'Ação' },
    { label: 'VALE3', code: 'VALE3', tag: 'Ação' },
    { label: 'WEGE3', code: 'WEGE3', tag: 'Ação' },
    { label: 'HGLG11', code: 'HGLG11', tag: 'FII' },
    { label: 'MXRF11', code: 'MXRF11', tag: 'FII' },
    { label: 'VERDE_FIM', code: 'VERDE_FIM', tag: 'Fundo CVM' },
    { label: 'TESOURO_IPCA', code: 'TESOURO_IPCA', tag: 'Tesouro' },
    { label: 'CDI', code: 'CDI', tag: 'Bacen' },
    { label: 'IBOV', code: 'IBOV', tag: 'Índice' },
  ],
  scanner: [
    { label: 'WEGE3 (Score Alto)', code: 'WEGE3', tag: 'Ação B3' },
    { label: 'PETR4 (Dividendos)', code: 'PETR4', tag: 'Ação B3' },
    { label: 'HGLG11 (FII Logística)', code: 'HGLG11', tag: 'FII B3' },
    { label: 'ITUB4 (Bancos)', code: 'ITUB4', tag: 'Ação B3' },
    { label: 'MXRF11 (FII Papel)', code: 'MXRF11', tag: 'FII B3' },
    { label: 'BBAS3 (Desconto P/VP)', code: 'BBAS3', tag: 'Ação B3' },
  ],
  acoes: [
    { label: 'PETR4 (Petrobras)', code: 'PETR4', tag: 'Petróleo' },
    { label: 'VALE3 (Vale)', code: 'VALE3', tag: 'Mineração' },
    { label: 'ITUB4 (Itaú)', code: 'ITUB4', tag: 'Bancos' },
    { label: 'BBAS3 (Banco do Brasil)', code: 'BBAS3', tag: 'Bancos' },
    { label: 'WEGE3 (WEG)', code: 'WEGE3', tag: 'Indústria' },
    { label: 'RENT3 (Localiza)', code: 'RENT3', tag: 'Locação' },
    { label: 'B3SA3 (B3)', code: 'B3SA3', tag: 'Financeiro' },
    { label: 'ABEV3 (Ambev)', code: 'ABEV3', tag: 'Consumo' },
  ],
  fiis: [
    { label: 'HGLG11 (CSHG Logística)', code: 'HGLG11', tag: 'Logística' },
    { label: 'KNRI11 (Kinea Renda)', code: 'KNRI11', tag: 'Híbrido' },
    { label: 'MXRF11 (Maxi Renda)', code: 'MXRF11', tag: 'Papel / CRI' },
    { label: 'XPML11 (XP Malls)', code: 'XPML11', tag: 'Shoppings' },
    { label: 'VISC11 (Vinci Shoppings)', code: 'VISC11', tag: 'Shoppings' },
    { label: 'BTLG11 (BTG Logística)', code: 'BTLG11', tag: 'Logística' },
    { label: 'KNCR11 (Kinea Rendimentos)', code: 'KNCR11', tag: 'Papel CDI' },
    { label: 'HGRU11 (CSHG Renda Urbana)', code: 'HGRU11', tag: 'Renda Urbana' },
  ],
  comparador: [
    { label: 'PETR4', code: 'PETR4', tag: 'Ação' },
    { label: 'HGLG11', code: 'HGLG11', tag: 'FII' },
    { label: 'VERDE_FIM', code: 'VERDE_FIM', tag: 'Fundo' },
    { label: 'TESOURO_IPCA', code: 'TESOURO_IPCA', tag: 'Tesouro' },
    { label: 'CDI', code: 'CDI', tag: 'Benchmark' },
    { label: 'IBOV', code: 'IBOV', tag: 'Benchmark' },
  ],
  tesouro: [
    { label: 'Tesouro Selic 2029', code: 'TESOURO_SELIC', tag: 'Pós-fixado' },
    { label: 'Tesouro IPCA+ 2029', code: 'TESOURO_IPCA', tag: 'Inflação' },
    { label: 'Tesouro IPCA+ 2035', code: 'TESOURO_IPCA_2035', tag: 'Inflação' },
    { label: 'Tesouro IPCA+ 2045', code: 'TESOURO_IPCA_2045', tag: 'Inflação' },
    { label: 'Tesouro Prefixado 2028', code: 'TESOURO_PRE', tag: 'Prefixado' },
  ],
  fundos: [
    { label: 'Verde FIC FIM', code: 'VERDE_FIM', tag: 'Multimercado' },
    { label: 'SPX Nimitz FIM', code: 'SPX_NIMITZ', tag: 'Multimercado' },
    { label: 'Kapitalo Kappa FIM', code: 'KAPITALO_KAPPA', tag: 'Multimercado' },
    { label: 'Alaska Black FIA', code: 'ALASKA_BLACK', tag: 'Ações' },
    { label: 'Dynamo Cougar FIA', code: 'DYNAMO_COUGAR', tag: 'Ações' },
    { label: 'Trend DI Simples RF', code: 'TREND_DI', tag: 'Renda Fixa' },
  ],
  juros: [
    { label: 'CDI Acumulado (SGS 12)', code: 'CDI', tag: 'Bacen' },
    { label: 'SELIC Acumulada (SGS 11)', code: 'SELIC', tag: 'Bacen' },
    { label: 'IPCA Acumulado (SGS 433)', code: 'IPCA', tag: 'Inflação' },
    { label: 'IGP-M Acumulado (SGS 189)', code: 'IGPM', tag: 'Inflação' },
  ],
}

function App() {
  const [activeMenu, setActiveMenu] = useState<NavMenuId>('todos')
  const [ticker, setTicker] = useState('PETR4')
  const [activeTicker, setActiveTicker] = useState('PETR4')
  const [data, setData] = useState<MarketData[]>([])
  const [monthlyData, setMonthlyData] = useState<MonthlyPerformance[]>([])
  const [fundamentals, setFundamentals] = useState<FundamentalIndicators | null>(null)
  const [riskMetrics, setRiskMetrics] = useState<RiskMetrics | null>(null)
  const [decision, setDecision] = useState<TechnicalDecisionReport | null>(null)
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
      setDecision(null)
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

      axios.get<RiskMetrics>(`/api/stocks/${cleanSymbol}/metrics?days=${days}`)
        .then((res) => setRiskMetrics(res.data))
        .catch(() => {})

      axios.get<TechnicalDecisionReport>(`/api/stocks/${cleanSymbol}/decision?days=${days}`)
        .then((res) => setDecision(res.data))
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

  useEffect(() => {
    fetchData('PETR4', '1y', false)
  }, [])

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!ticker) return
    fetchData(ticker, period, false)
  }

  const handleQuickSelect = (sym: string) => {
    setTicker(sym)
    fetchData(sym, period, false)
    const el = document.getElementById('secao-ativo-principal')
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const handleMenuClick = (item: (typeof NAV_MENU_ITEMS)[number]) => {
    setActiveMenu(item.id)
    if (item.defaultSymbol && item.defaultSymbol !== activeTicker) {
      setTicker(item.defaultSymbol)
      fetchData(item.defaultSymbol, period, false)
    }
    if (item.anchorId) {
      setTimeout(() => {
        const el = document.getElementById(item.anchorId!)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }, 80)
    }
  }

  const handlePeriodChange = (newPeriod: string) => {
    setPeriod(newPeriod)
    if (activeTicker) {
      fetchData(activeTicker, newPeriod, true)
    }
  }

  const macroFilter: MacroSectionFilter =
    activeMenu === 'juros'
      ? 'juros'
      : activeMenu === 'tesouro'
      ? 'tesouro'
      : activeMenu === 'fundos'
      ? 'fundos'
      : 'all'

  const quickAssets = CATEGORY_QUICK_ASSETS[activeMenu] || CATEGORY_QUICK_ASSETS.todos

  return (
    <div className="container">
      <header className="header" style={{ marginBottom: '1.5rem' }}>
        <h1>Analise Quant</h1>
        <p>Plataforma Quantitativa do Mercado Brasileiro — Ações, FIIs, Fundos CVM, Tesouro Direto, CDI, Juros e Sinais Técnicos</p>
      </header>

      {/* MENU PRINCIPAL DE NAVEGAÇÃO POR MÓDULOS DO MERCADO BRASILEIRO */}
      <nav
        aria-label="Menu Principal de Análises Financeiras"
        className="glass-card"
        style={{
          padding: '0.85rem',
          marginBottom: '1.5rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '0.6rem',
        }}
      >
        {NAV_MENU_ITEMS.map((item) => {
          const IconComponent = item.icon
          const isActive = activeMenu === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleMenuClick(item)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: '0.25rem',
                padding: '0.75rem 0.9rem',
                borderRadius: '0.65rem',
                border: isActive
                  ? '1px solid #38bdf8'
                  : '1px solid rgba(255, 255, 255, 0.08)',
                background: isActive
                  ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.22), rgba(16, 185, 129, 0.14))'
                  : 'rgba(15, 23, 42, 0.55)',
                color: '#f8fafc',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 700, fontSize: '0.86rem', color: isActive ? '#38bdf8' : '#f8fafc' }}>
                <IconComponent size={16} />
                <span>{item.label}</span>
              </div>
              <span style={{ fontSize: '0.71rem', color: 'var(--text-muted)', lineHeight: 1.25 }}>
                {item.subtitle}
              </span>
            </button>
          )
        })}
      </nav>

      <main>
        {/* Caixa de Busca + Atalhos da Categoria Selecionada */}
        <form onSubmit={handleSearch} className="glass-card search-box" style={{ marginBottom: '1rem' }}>
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

        {/* Barra de Atalhos Contextuais da Categoria */}
        <div
          className="glass-card"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.5rem',
            padding: '0.85rem 1.1rem',
            marginBottom: '1.75rem',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: '0.8rem', color: '#38bdf8', fontWeight: 700, marginRight: '0.25rem' }}>
            Ativos Rápidos ({NAV_MENU_ITEMS.find((m) => m.id === activeMenu)?.label}):
          </span>
          {quickAssets.map((item) => (
            <button
              key={item.code}
              type="button"
              onClick={() => handleQuickSelect(item.code)}
              style={{
                background: activeTicker === item.code ? '#38bdf8' : 'rgba(255,255,255,0.05)',
                color: activeTicker === item.code ? '#0f172a' : '#e2e8f0',
                border: activeTicker === item.code ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.12)',
                borderRadius: '6px',
                padding: '5px 11px',
                fontSize: '0.8rem',
                fontWeight: activeTicker === item.code ? 700 : 500,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>{item.label}</span>
              <span
                style={{
                  fontSize: '0.68rem',
                  padding: '1px 5px',
                  borderRadius: '4px',
                  background: activeTicker === item.code ? 'rgba(15,23,42,0.2)' : 'rgba(56,189,248,0.12)',
                  color: activeTicker === item.code ? '#0f172a' : '#38bdf8',
                }}
              >
                {item.tag}
              </span>
            </button>
          ))}
        </div>

        {error && (
          <div className="error-message">
            <AlertCircle size={20} />
            <p>{error}</p>
          </div>
        )}

        <div className="results-area" id="secao-ativo-principal">
          {loading ? (
            <div className="loader">
              <div className="spinner"></div>
              <p>Consultando B3, Banco Central (SGS), Tesouro e CVM para {activeTicker}...</p>
            </div>
          ) : data.length > 0 ? (
            <>
              {/* Painel de Decisão Técnica (Score 0-100 + 6 Estratégias B3) */}
              <ErrorBoundary>
                <TechnicalDecisionPanel decision={decision} />
              </ErrorBoundary>

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
              <h3>Selecione um item no menu acima ou pesquise um ativo</h3>
              <p>Compare Ações, Fundos Imobiliários (FIIs), Fundos CVM, Tesouro Direto, CDI e IBOV na mesma tela.</p>
            </div>
          )}

          {/* Scanner Diário de Oportunidades B3 (Ações & FIIs ranqueados por Score 0-100) */}
          <ErrorBoundary>
            <B3ScannerPanel onSelectSymbol={handleQuickSelect} />
          </ErrorBoundary>

          {/* Comparador Multi-Ativos sempre visível na tela principal */}
          <div id="secao-comparador">
            <ErrorBoundary>
              <AssetComparisonChart
                primaryTicker={activeTicker || 'PETR4'}
                period={period}
              />
            </ErrorBoundary>
          </div>

          {/* Panorama Macro (SELIC, CDI, IPCA, Curva de Juros, Tesouro Direto e Fundos CVM) sempre visível */}
          <ErrorBoundary>
            <MacroAndFixedIncomePanel
              onSelectSymbol={handleQuickSelect}
              sectionFilter={macroFilter}
            />
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
