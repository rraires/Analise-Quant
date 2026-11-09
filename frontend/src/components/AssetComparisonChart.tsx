import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ReactApexChart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import { GitCompare, Plus, X } from 'lucide-react';

interface ComparisonPoint {
  date: string;
  cumulative_return: number;
}

interface ComparisonSeries {
  name: string;
  category: string;
  total_return_pct: number;
  volatility_pct?: number | null;
  sharpe?: number | null;
  max_drawdown_pct?: number | null;
  points: ComparisonPoint[];
}

interface ComparisonResponse {
  period_days: number;
  series: ComparisonSeries[];
  correlations: Record<string, Record<string, number>>;
}

interface AssetComparisonChartProps {
  primaryTicker: string;
  period: string;
}

const QUICK_SUGGESTIONS = [
  { label: 'CDI', code: 'CDI' },
  { label: 'IBOV', code: 'IBOV' },
  { label: 'IPCA', code: 'IPCA' },
  { label: 'HGLG11 (FII)', code: 'HGLG11' },
  { label: 'MXRF11 (FII)', code: 'MXRF11' },
  { label: 'VALE3', code: 'VALE3' },
  { label: 'ITUB4', code: 'ITUB4' },
  { label: 'Verde FIM (Fundo)', code: 'VERDE_FIM' },
  { label: 'Alaska Black (FIA)', code: 'ALASKA_BLACK' },
  { label: 'Tesouro IPCA+', code: 'TESOURO_IPCA' },
];

const SERIES_COLORS = [
  '#38bdf8', // Sky
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ef4444', // Coral Red
  '#14b8a6', // Teal
  '#eab308', // Yellow
  '#f97316', // Orange
  '#84cc16', // Lime
];

const AssetComparisonChart: React.FC<AssetComparisonChartProps> = ({ primaryTicker, period }) => {
  const [selectedTickers, setSelectedTickers] = useState<string[]>([primaryTicker, 'CDI', 'IBOV']);
  const [customTicker, setCustomTicker] = useState('');
  const [comparisonData, setComparisonData] = useState<ComparisonResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setSelectedTickers((prev) => {
      const clean = prev.filter((t) => t !== primaryTicker);
      return [primaryTicker, ...clean.slice(0, 6)];
    });
  }, [primaryTicker]);

  const periodToDays = (p: string): number => {
    switch (p) {
      case '6m': return 180;
      case '1y': return 365;
      case '3y': return 1095;
      case '5y': return 1825;
      case '10y': return 3650;
      default: return 365;
    }
  };

  useEffect(() => {
    if (!selectedTickers.length) return;
    let active = true;
    const loadComparison = async () => {
      setLoading(true);
      try {
        const days = periodToDays(period);
        const query = selectedTickers.join(',');
        const res = await axios.get<ComparisonResponse>(`/api/compare?tickers=${encodeURIComponent(query)}&days=${days}`);
        if (active) {
          setComparisonData(res.data);
        }
      } catch (err) {
        console.error('Erro ao buscar comparativo:', err);
      } finally {
        if (active) setLoading(false);
      }
    };
    loadComparison();
    return () => { active = false; };
  }, [selectedTickers, period]);

  const addSymbol = (sym: string) => {
    const clean = sym.trim().toUpperCase();
    if (!clean || selectedTickers.includes(clean)) return;
    setSelectedTickers([...selectedTickers, clean]);
    setCustomTicker('');
  };

  const removeSymbol = (sym: string) => {
    if (sym === primaryTicker) return;
    setSelectedTickers(selectedTickers.filter((t) => t !== sym));
  };

  const apexSeries = (comparisonData?.series || []).map((s) => ({
    name: s.name,
    data: s.points.map((pt) => ({
      x: new Date(pt.date).getTime(),
      y: pt.cumulative_return,
    })),
  }));

  const options: ApexOptions = {
    chart: {
      type: 'line',
      height: 360,
      background: 'transparent',
      toolbar: { show: false },
      foreColor: '#94a3b8',
      fontFamily: 'Inter, sans-serif',
    },
    colors: SERIES_COLORS,
    stroke: {
      curve: 'smooth',
      width: 2.5,
    },
    xaxis: {
      type: 'datetime',
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        formatter: (val) => `${val?.toFixed(1)}%`,
      },
    },
    grid: {
      borderColor: '#334155',
      strokeDashArray: 4,
    },
    theme: { mode: 'dark' },
    tooltip: {
      theme: 'dark',
      shared: true,
      x: { format: 'dd MMM yyyy' },
      y: {
        formatter: (val) => `${val >= 0 ? '+' : ''}${val?.toFixed(2)}%`,
      },
    },
    legend: {
      position: 'top',
      horizontalAlign: 'left',
      labels: { colors: '#e2e8f0' },
    },
  };

  return (
    <div className="glass-card" style={{ padding: '1.5rem', marginTop: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
        <div>
          <h3 style={{ fontSize: '1.35rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <GitCompare size={22} style={{ color: '#10b981' }} />
            Comparador Multi-Ativos & Benchmarks (Ações, FIIs, Fundos CVM, Tesouro, CDI, IBOV)
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Rentabilidade acumulada normalizada (%) na mesma janela temporal
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            addSymbol(customTicker);
          }}
          style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}
        >
          <label htmlFor="compare-input" style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0, 0, 0, 0)' }}>
            Adicionar ativo para comparar
          </label>
          <input
            id="compare-input"
            type="text"
            placeholder="Adicionar (ex: HGLG11, WEGE3)..."
            value={customTicker}
            onChange={(e) => setCustomTicker(e.target.value.toUpperCase())}
            style={{
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid #334155',
              borderRadius: '8px',
              padding: '6px 12px',
              color: '#f8fafc',
              fontSize: '0.85rem',
            }}
          />
          <button
            type="submit"
            style={{
              background: '#10b981',
              color: '#0f172a',
              border: 'none',
              borderRadius: '8px',
              padding: '6px 12px',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
            }}
          >
            <Plus size={15} /> Incluir
          </button>
        </form>
      </div>

      {/* Chips de ativos ativos e sugestões rápidas */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.25rem', alignItems: 'center' }}>
        {selectedTickers.map((sym, idx) => (
          <span
            key={sym}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: 600,
              backgroundColor: 'rgba(255,255,255,0.08)',
              borderLeft: `3px solid ${SERIES_COLORS[idx % SERIES_COLORS.length]}`,
              color: '#f8fafc',
            }}
          >
            {sym}
            {sym !== primaryTicker && (
              <button
                type="button"
                onClick={() => removeSymbol(sym)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', padding: 0 }}
                title={`Remover ${sym}`}
              >
                <X size={14} />
              </button>
            )}
          </span>
        ))}

        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>Sugestões:</span>
        {QUICK_SUGGESTIONS.filter((s) => !selectedTickers.includes(s.code)).map((sug) => (
          <button
            key={sug.code}
            type="button"
            onClick={() => addSymbol(sug.code)}
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px dashed #475569',
              borderRadius: '6px',
              padding: '3px 8px',
              color: '#94a3b8',
              fontSize: '0.75rem',
              cursor: 'pointer',
            }}
          >
            + {sug.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Atualizando estudo comparativo...
        </div>
      ) : apexSeries.length > 0 ? (
        <>
          <ReactApexChart options={options} series={apexSeries} type="line" height={360} />

          {/* Tabela Resumo Comparativa */}
          <div style={{ overflowX: 'auto', marginTop: '1.25rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155', color: 'var(--text-muted)', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem' }}>Ativo / Benchmark</th>
                  <th style={{ padding: '0.75rem' }}>Categoria</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>Retorno Acumulado</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>Volatilidade (a.a.)</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>Sharpe</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>Max Drawdown</th>
                </tr>
              </thead>
              <tbody>
                {comparisonData?.series.map((s, idx) => (
                  <tr key={s.name} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: SERIES_COLORS[idx % SERIES_COLORS.length] }} />
                      {s.name}
                    </td>
                    <td style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>
                      {s.category === 'benchmark' ? 'Benchmark / Macro' : 'Ativo / Fundo'}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 700, color: s.total_return_pct >= 0 ? '#10b981' : '#ef4444' }}>
                      {s.total_return_pct >= 0 ? '+' : ''}{s.total_return_pct.toFixed(2)}%
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                      {s.volatility_pct !== null && s.volatility_pct !== undefined ? `${s.volatility_pct.toFixed(2)}%` : '—'}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600 }}>
                      {s.sharpe !== null && s.sharpe !== undefined ? s.sharpe.toFixed(2) : '—'}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', color: '#ef4444' }}>
                      {s.max_drawdown_pct !== null && s.max_drawdown_pct !== undefined ? `${s.max_drawdown_pct.toFixed(2)}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
};

export default AssetComparisonChart;
