import React, { useEffect, useState } from 'react';
import axios from 'axios';
import ReactApexChart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import { Landmark, Percent, TrendingUp, Briefcase } from 'lucide-react';

interface TesouroBond {
  name: string;
  indexer: string;
  maturity: string;
  rate_buy: number;
  unit_price: number;
  min_investment: number;
}

interface YieldVertex {
  vertex: string;
  du: number;
  pre_aa: number;
  real_aa: number;
}

interface MacroOverview {
  selic_meta_aa: number;
  cdi_aa: number;
  ipca_12m: number;
  real_interest_aa: number;
  yield_curve: YieldVertex[];
  tesouro_bonds: TesouroBond[];
  updated_at: string;
}

interface CVMFundItem {
  code: string;
  cnpj: string;
  name: string;
  category: string;
  benchmark: string;
}

interface MacroAndFixedIncomePanelProps {
  onSelectSymbol: (symbol: string) => void;
}

const MacroAndFixedIncomePanel: React.FC<MacroAndFixedIncomePanelProps> = ({ onSelectSymbol }) => {
  const [macro, setMacro] = useState<MacroOverview | null>(null);
  const [funds, setFunds] = useState<CVMFundItem[]>([]);

  useEffect(() => {
    axios.get<MacroOverview>('/api/macro/overview').then((r) => setMacro(r.data)).catch(() => {});
    axios.get<CVMFundItem[]>('/api/funds/catalog').then((r) => setFunds(r.data)).catch(() => {});
  }, []);

  if (!macro) return null;

  const curveSeries = [
    {
      name: 'Curva Pré (DI Futuro % a.a.)',
      data: macro.yield_curve.map((v) => v.pre_aa),
    },
    {
      name: 'Juro Real (NTN-B / IPCA+ % a.a.)',
      data: macro.yield_curve.map((v) => v.real_aa),
    },
  ];

  const curveOptions: ApexOptions = {
    chart: {
      type: 'line',
      height: 270,
      background: 'transparent',
      toolbar: { show: false },
      foreColor: '#94a3b8',
      fontFamily: 'Inter, sans-serif',
    },
    colors: ['#f59e0b', '#10b981'],
    stroke: { curve: 'smooth', width: 3 },
    markers: { size: 4 },
    xaxis: {
      categories: macro.yield_curve.map((v) => v.vertex),
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        formatter: (v) => `${v?.toFixed(2)}%`,
      },
    },
    grid: { borderColor: '#334155', strokeDashArray: 4 },
    theme: { mode: 'dark' },
    tooltip: {
      theme: 'dark',
      y: { formatter: (v) => `${v?.toFixed(2)}% a.a.` },
    },
    legend: { position: 'top', horizontalAlign: 'left' },
  };

  return (
    <div style={{ marginTop: '2rem' }}>
      {/* Indicadores Macro BCB (SELIC, CDI, IPCA, Juro Real) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '3px solid #38bdf8' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
            <span>SELIC Meta (BCB)</span>
            <Percent size={15} style={{ color: '#38bdf8' }} />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, marginTop: '0.25rem' }}>{macro.selic_meta_aa.toFixed(2)}% a.a.</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Série SGS 432</div>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '3px solid #10b981' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
            <span>CDI Anualizado (252 DU)</span>
            <TrendingUp size={15} style={{ color: '#10b981' }} />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, marginTop: '0.25rem', color: '#10b981' }}>{macro.cdi_aa.toFixed(2)}% a.a.</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Série SGS 12 / 4389</div>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '3px solid #f59e0b' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
            <span>IPCA Acumulado 12M</span>
            <Landmark size={15} style={{ color: '#f59e0b' }} />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, marginTop: '0.25rem', color: '#f59e0b' }}>{macro.ipca_12m.toFixed(2)}%</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Série SGS 433 (IBGE)</div>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '3px solid #14b8a6' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
            <span>Juro Real Ex-Post</span>
            <Percent size={15} style={{ color: '#14b8a6' }} />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, marginTop: '0.25rem', color: '#14b8a6' }}>{macro.real_interest_aa.toFixed(2)}% a.a.</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>CDI descontado IPCA</div>
        </div>
      </div>

      {/* Grid Curva de Juros + Tesouro Direto */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '1.5rem' }}>
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '0.25rem' }}>
            Curva de Juros Brasil (DI1 Futuro & ETTJ ANBIMA)
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Estrutura a termo das taxas prefixadas (DI) e juros reais (NTN-B / IPCA+)
          </p>
          <ReactApexChart options={curveOptions} series={curveSeries} type="line" height={270} />
        </div>

        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '0.25rem' }}>
            Tesouro Direto — Títulos Públicos de Referência
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Taxas e Preços Unitários (STN / Tesouro Transparente)
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155', color: 'var(--text-muted)', textAlign: 'left' }}>
                  <th style={{ padding: '0.5rem' }}>Título</th>
                  <th style={{ padding: '0.5rem' }}>Taxa</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right' }}>PU (R$)</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right' }}>Vencimento</th>
                </tr>
              </thead>
              <tbody>
                {macro.tesouro_bonds.map((bond) => (
                  <tr key={bond.name} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '0.55rem', fontWeight: 600 }}>{bond.name}</td>
                    <td style={{ padding: '0.55rem', color: '#10b981', fontWeight: 600 }}>
                      {bond.indexer === 'SELIC'
                        ? `SELIC + ${bond.rate_buy.toFixed(2)}%`
                        : bond.indexer === 'IPCA'
                        ? `IPCA + ${bond.rate_buy.toFixed(2)}%`
                        : `${bond.rate_buy.toFixed(2)}% a.a.`}
                    </td>
                    <td style={{ padding: '0.55rem', textAlign: 'right' }}>
                      R$ {bond.unit_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '0.55rem', textAlign: 'right', color: 'var(--text-muted)' }}>
                      {bond.maturity}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Catálogo de Fundos de Investimento (CVM) & Atalhos Rápidos */}
      {funds.length > 0 && (
        <div className="glass-card" style={{ padding: '1.5rem', marginTop: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
            <Briefcase size={20} style={{ color: '#38bdf8' }} />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600 }}>
              Fundos de Investimento CVM & Ativos Rápidos (Clique para Analisar)
            </h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
            {funds.map((f) => (
              <button
                key={f.code}
                type="button"
                onClick={() => onSelectSymbol(f.code)}
                style={{
                  textAlign: 'left',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '8px',
                  padding: '0.85rem',
                  cursor: 'pointer',
                  color: '#f8fafc',
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#38bdf8' }}>{f.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  CNPJ: {f.cnpj}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '4px', fontWeight: 600 }}>
                  {f.category} • Bench: {f.benchmark}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MacroAndFixedIncomePanel;
