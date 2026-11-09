import React, { useEffect, useState } from 'react';
import axios from 'axios';
import ReactApexChart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import { Landmark, Percent, TrendingUp, Briefcase, ArrowUpRight } from 'lucide-react';

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

export type MacroSectionFilter = 'all' | 'juros' | 'tesouro' | 'fundos';

interface MacroAndFixedIncomePanelProps {
  onSelectSymbol: (symbol: string) => void;
  sectionFilter?: MacroSectionFilter;
}

const DEFAULT_MACRO_OVERVIEW: MacroOverview = {
  selic_meta_aa: 10.75,
  cdi_aa: 10.65,
  ipca_12m: 4.42,
  real_interest_aa: 6.06,
  yield_curve: [
    { vertex: '1M', du: 21, pre_aa: 10.65, real_aa: 5.95 },
    { vertex: '3M', du: 63, pre_aa: 10.75, real_aa: 6.02 },
    { vertex: '6M', du: 126, pre_aa: 10.95, real_aa: 6.10 },
    { vertex: '1Y', du: 252, pre_aa: 11.35, real_aa: 6.22 },
    { vertex: '2Y', du: 504, pre_aa: 11.75, real_aa: 6.30 },
    { vertex: '3Y', du: 756, pre_aa: 11.95, real_aa: 6.35 },
    { vertex: '5Y', du: 1260, pre_aa: 12.10, real_aa: 6.40 },
    { vertex: '10Y', du: 2520, pre_aa: 12.25, real_aa: 6.45 },
  ],
  tesouro_bonds: [
    { name: 'Tesouro Selic 2029', indexer: 'SELIC', maturity: '2029-03-01', rate_buy: 0.15, unit_price: 15842.35, min_investment: 158.42 },
    { name: 'Tesouro Prefixado 2028', indexer: 'PREFIXADO', maturity: '2028-01-01', rate_buy: 13.45, unit_price: 724.18, min_investment: 36.20 },
    { name: 'Tesouro Prefixado 2031', indexer: 'PREFIXADO', maturity: '2031-01-01', rate_buy: 13.68, unit_price: 492.60, min_investment: 34.48 },
    { name: 'Tesouro IPCA+ 2029', indexer: 'IPCA', maturity: '2029-05-15', rate_buy: 6.85, unit_price: 3295.40, min_investment: 32.95 },
    { name: 'Tesouro IPCA+ 2035', indexer: 'IPCA', maturity: '2035-05-15', rate_buy: 6.72, unit_price: 2310.15, min_investment: 46.20 },
    { name: 'Tesouro IPCA+ 2045', indexer: 'IPCA', maturity: '2045-05-15', rate_buy: 6.65, unit_price: 1245.80, min_investment: 37.37 },
  ],
  updated_at: 'Referência BCB / STN',
};

const DEFAULT_FUNDS: CVMFundItem[] = [
  { code: 'VERDE_FIM', cnpj: '02.223.041/0001-95', name: 'Verde FIC FIM (Multimercado)', category: 'Multimercado Macro', benchmark: 'CDI' },
  { code: 'SPX_NIMITZ', cnpj: '12.809.201/0001-13', name: 'SPX Nimitz Feeder FIC FIM', category: 'Multimercado Macro', benchmark: 'CDI' },
  { code: 'KAPITALO_KAPPA', cnpj: '12.105.992/0001-09', name: 'Kapitalo Kappa FIN FIC FIM', category: 'Multimercado', benchmark: 'CDI' },
  { code: 'ALASKA_BLACK', cnpj: '26.648.868/0001-96', name: 'Alaska Black FIC FIA II BDR Nível I', category: 'Ações Livre', benchmark: 'IBOV' },
  { code: 'DYNAMO_COUGAR', cnpj: '73.232.530/0001-39', name: 'Dynamo Cougar FIA', category: 'Ações Fundamentalista', benchmark: 'IBOV' },
  { code: 'TREND_DI', cnpj: '21.625.026/0001-03', name: 'Trend DI Simples FIRF', category: 'Renda Fixa Simples', benchmark: 'CDI' },
];

const TESOURO_CODE_MAP: Record<string, string> = {
  'Tesouro Selic 2029': 'TESOURO_SELIC',
  'Tesouro Prefixado 2028': 'TESOURO_PRE',
  'Tesouro Prefixado 2031': 'TESOURO_PRE',
  'Tesouro IPCA+ 2029': 'TESOURO_IPCA',
  'Tesouro IPCA+ 2035': 'TESOURO_IPCA_2035',
  'Tesouro IPCA+ 2045': 'TESOURO_IPCA_2045',
};

const MacroAndFixedIncomePanel: React.FC<MacroAndFixedIncomePanelProps> = ({
  onSelectSymbol,
  sectionFilter = 'all',
}) => {
  const [macro, setMacro] = useState<MacroOverview>(DEFAULT_MACRO_OVERVIEW);
  const [funds, setFunds] = useState<CVMFundItem[]>(DEFAULT_FUNDS);

  useEffect(() => {
    axios
      .get<MacroOverview>('/api/macro/overview')
      .then((r) => {
        if (r.data && Array.isArray(r.data.yield_curve)) {
          setMacro(r.data);
        }
      })
      .catch(() => {});

    axios
      .get<CVMFundItem[]>('/api/funds/catalog')
      .then((r) => {
        if (Array.isArray(r.data) && r.data.length > 0) {
          setFunds(r.data);
        }
      })
      .catch(() => {});
  }, []);

  const showJuros = sectionFilter === 'all' || sectionFilter === 'juros';
  const showTesouro = sectionFilter === 'all' || sectionFilter === 'tesouro';
  const showFundos = sectionFilter === 'all' || sectionFilter === 'fundos';

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
    <div style={{ marginTop: '2rem' }} id="painel-macro-renda-fixa">
      {/* Indicadores Macro BCB (SELIC, CDI, IPCA, Juro Real) */}
      {(showJuros || showTesouro) && (
        <div
          id="secao-cdi-juros"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: '1rem',
            marginBottom: '1.5rem',
          }}
        >
          <div
            className="glass-card"
            onClick={() => onSelectSymbol('SELIC')}
            style={{ padding: '1.25rem', borderLeft: '3px solid #38bdf8', cursor: 'pointer' }}
            title="Clique para carregar a série acumulada da SELIC"
          >
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
              <span>SELIC Meta (BCB)</span>
              <Percent size={15} style={{ color: '#38bdf8' }} />
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, marginTop: '0.25rem' }}>{macro.selic_meta_aa.toFixed(2)}% a.a.</div>
            <div style={{ fontSize: '0.75rem', color: '#38bdf8', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>Série SGS 432 • Ver gráfico</span>
              <ArrowUpRight size={13} />
            </div>
          </div>

          <div
            className="glass-card"
            onClick={() => onSelectSymbol('CDI')}
            style={{ padding: '1.25rem', borderLeft: '3px solid #10b981', cursor: 'pointer' }}
            title="Clique para carregar a série acumulada do CDI"
          >
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
              <span>CDI Anualizado (252 DU)</span>
              <TrendingUp size={15} style={{ color: '#10b981' }} />
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, marginTop: '0.25rem', color: '#10b981' }}>{macro.cdi_aa.toFixed(2)}% a.a.</div>
            <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>Série SGS 12 • Ver gráfico</span>
              <ArrowUpRight size={13} />
            </div>
          </div>

          <div
            className="glass-card"
            onClick={() => onSelectSymbol('IPCA')}
            style={{ padding: '1.25rem', borderLeft: '3px solid #f59e0b', cursor: 'pointer' }}
            title="Clique para carregar a série acumulada do IPCA"
          >
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
              <span>IPCA Acumulado 12M</span>
              <Landmark size={15} style={{ color: '#f59e0b' }} />
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, marginTop: '0.25rem', color: '#f59e0b' }}>{macro.ipca_12m.toFixed(2)}%</div>
            <div style={{ fontSize: '0.75rem', color: '#f59e0b', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>Série SGS 433 • Ver gráfico</span>
              <ArrowUpRight size={13} />
            </div>
          </div>

          <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '3px solid #14b8a6' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
              <span>Juro Real Ex-Post</span>
              <Percent size={15} style={{ color: '#14b8a6' }} />
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, marginTop: '0.25rem', color: '#14b8a6' }}>{macro.real_interest_aa.toFixed(2)}% a.a.</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>CDI descontado IPCA</div>
          </div>
        </div>
      )}

      {/* Grid Curva de Juros + Tesouro Direto */}
      {(showJuros || showTesouro) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '1.5rem' }}>
          {showJuros && (
            <div className="glass-card" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                Curva de Juros Brasil (DI1 Futuro & ETTJ ANBIMA)
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                Estrutura a termo das taxas prefixadas (DI) e juros reais (NTN-B / IPCA+)
              </p>
              <ReactApexChart options={curveOptions} series={curveSeries} type="line" height={270} />
            </div>
          )}

          {showTesouro && (
            <div id="secao-tesouro-direto" className="glass-card" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                Tesouro Direto — Títulos Públicos (Clique para Simular / Analisar)
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                Taxas e Preços Unitários de Referência (STN / Tesouro Transparente)
              </p>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #334155', color: 'var(--text-muted)', textAlign: 'left' }}>
                      <th style={{ padding: '0.5rem' }}>Título</th>
                      <th style={{ padding: '0.5rem' }}>Taxa</th>
                      <th style={{ padding: '0.5rem', textAlign: 'right' }}>PU (R$)</th>
                      <th style={{ padding: '0.5rem', textAlign: 'right' }}>Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {macro.tesouro_bonds.map((bond) => {
                      const code = TESOURO_CODE_MAP[bond.name] || 'TESOURO_IPCA';
                      return (
                        <tr key={bond.name} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '0.55rem', fontWeight: 600 }}>
                            <div>{bond.name}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Venc: {bond.maturity}</div>
                          </td>
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
                          <td style={{ padding: '0.55rem', textAlign: 'right' }}>
                            <button
                              type="button"
                              onClick={() => onSelectSymbol(code)}
                              style={{
                                background: 'rgba(56, 189, 248, 0.14)',
                                color: '#38bdf8',
                                border: '1px solid rgba(56, 189, 248, 0.35)',
                                borderRadius: '6px',
                                padding: '4px 10px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              Analisar
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Catálogo de Fundos de Investimento (CVM) */}
      {showFundos && funds.length > 0 && (
        <div id="secao-fundos-cvm" className="glass-card" style={{ padding: '1.5rem', marginTop: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
            <Briefcase size={20} style={{ color: '#38bdf8' }} />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600 }}>
              Fundos de Investimento (CVM) — Clique em um Fundo para Analisar Cotas e Risco
            </h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem' }}>
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
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#38bdf8', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{f.name}</span>
                  <ArrowUpRight size={15} />
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  CNPJ: {f.cnpj} • Código: {f.code}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '4px', fontWeight: 600 }}>
                  {f.category} • Benchmark: {f.benchmark}
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
