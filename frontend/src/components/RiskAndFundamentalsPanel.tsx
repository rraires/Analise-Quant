import React from 'react';
import { ShieldAlert, Award, Layers } from 'lucide-react';

export interface FundamentalIndicators {
  ticker: string;
  asset_type: string;
  company_name?: string | null;
  sector?: string | null;
  price?: number | null;
  pl?: number | null;
  pvp?: number | null;
  dy?: number | null;
  roe?: number | null;
  roic?: number | null;
  ev_ebitda?: number | null;
  net_margin?: number | null;
  debt_to_equity?: number | null;
  market_cap?: number | null;
  daily_liquidity?: number | null;
}

export interface RiskMetrics {
  ticker: string;
  period_days: number;
  total_return: number;
  cagr: number;
  volatility: number;
  sharpe_ratio: number;
  max_drawdown: number;
  beta_ibov?: number | null;
  cdi_return: number;
  pct_cdi?: number | null;
  ibov_return?: number | null;
}

interface RiskAndFundamentalsPanelProps {
  fundamentals: FundamentalIndicators | null;
  riskMetrics: RiskMetrics | null;
}

const fmtPct = (v: number | null | undefined) => {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  return `${(v * 100).toFixed(2)}%`;
};

const fmtNum = (v: number | null | undefined) => {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  return v.toFixed(2);
};

const RiskAndFundamentalsPanel: React.FC<RiskAndFundamentalsPanelProps> = ({
  fundamentals,
  riskMetrics,
}) => {
  if (!fundamentals && !riskMetrics) return null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
      {/* Card 1: Métricas Quantitativas de Risco & Benchmark */}
      {riskMetrics && (
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <ShieldAlert size={22} style={{ color: '#10b981' }} />
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 600 }}>Risco & Performance vs. CDI/IBOV</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Janela de {riskMetrics.period_days} dias corridos (Base 252 DU)
                </p>
              </div>
            </div>
            {riskMetrics.pct_cdi !== null && riskMetrics.pct_cdi !== undefined && (
              <span style={{
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 700,
                backgroundColor: riskMetrics.pct_cdi >= 1 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                color: riskMetrics.pct_cdi >= 1 ? '#10b981' : '#f59e0b',
                border: '1px solid rgba(255,255,255,0.08)'
              }}>
                {(riskMetrics.pct_cdi * 100).toFixed(0)}% do CDI
              </span>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.85rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Retorno Período</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, color: riskMetrics.total_return >= 0 ? '#10b981' : '#ef4444' }}>
                {fmtPct(riskMetrics.total_return)}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>CDI: {fmtPct(riskMetrics.cdi_return)}</div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.85rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>CAGR (a.a.)</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, color: riskMetrics.cagr >= 0 ? '#38bdf8' : '#ef4444' }}>
                {fmtPct(riskMetrics.cagr)}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                IBOV: {riskMetrics.ibov_return !== null && riskMetrics.ibov_return !== undefined ? fmtPct(riskMetrics.ibov_return) : '—'}
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.85rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Índice Sharpe</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, color: riskMetrics.sharpe_ratio >= 0.5 ? '#10b981' : riskMetrics.sharpe_ratio >= 0 ? '#f59e0b' : '#ef4444' }}>
                {fmtNum(riskMetrics.sharpe_ratio)}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Excesso vs CDI</div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.85rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Volatilidade (a.a.)</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f59e0b' }}>
                {fmtPct(riskMetrics.volatility)}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Desvio Padrão 252d</div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.85rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Max Drawdown</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ef4444' }}>
                {fmtPct(riskMetrics.max_drawdown)}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Queda máx. do topo</div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.85rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Beta vs. IBOV</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#e2e8f0' }}>
                {fmtNum(riskMetrics.beta_ibov)}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Sensibilidade B3</div>
            </div>
          </div>
        </div>
      )}

      {/* Card 2: Indicadores Fundamentalistas B3 */}
      {fundamentals && (
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Award size={22} style={{ color: '#38bdf8' }} />
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 600 }}>
                  Fundamentos: {fundamentals.company_name || fundamentals.ticker}
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Layers size={13} />
                  {fundamentals.sector || (fundamentals.asset_type === 'fiis' ? 'Fundo Imobiliário' : 'Ação B3')}
                </p>
              </div>
            </div>
            <span style={{
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              backgroundColor: 'rgba(56, 189, 248, 0.15)',
              color: '#38bdf8'
            }}>
              {fundamentals.asset_type === 'fiis' ? 'FII B3' : 'AÇÃO B3'}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.85rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Dividend Yield (12M)</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#10b981' }}>
                {fmtPct(fundamentals.dy)}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Proventos / Preço</div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.85rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>P / VP</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#38bdf8' }}>
                {fmtNum(fundamentals.pvp)}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Preço / Valor Patrim.</div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.85rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>P / L</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#e2e8f0' }}>
                {fmtNum(fundamentals.pl)}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Preço / Lucro</div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.85rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ROE</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#10b981' }}>
                {fmtPct(fundamentals.roe)}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Retorno s/ PL</div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.85rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>EV / EBITDA</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f59e0b' }}>
                {fmtNum(fundamentals.ev_ebitda)}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Múltiplo Operacional</div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.85rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Margem Líquida</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#e2e8f0' }}>
                {fmtPct(fundamentals.net_margin)}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Lucro / Receita</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RiskAndFundamentalsPanel;
