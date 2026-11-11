import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Crosshair,
  ShieldAlert,
  TrendingUp,
  Activity,
  BarChart3,
  Gauge,
} from 'lucide-react';

export interface StrategyEvaluation {
  id: string;
  name: string;
  category: string;
  status: string;
  score_impact: number;
  summary: string;
}

export interface TechnicalDecisionReport {
  ticker: string;
  current_price: number;
  signal_score: number;
  buy_signal: string;
  trend_status: string;
  ma_alignment: string;
  trend_strength: number;
  ma5: number;
  ma10: number;
  ma20: number;
  ma60: number;
  bias_ma5: number;
  bias_ma10: number;
  bias_ma20: number;
  volume_status: string;
  volume_ratio_5d: number;
  volume_trend: string;
  macd_dif: number;
  macd_dea: number;
  macd_bar: number;
  macd_status: string;
  macd_signal: string;
  rsi_6: number;
  rsi_12: number;
  rsi_24: number;
  rsi_status: string;
  rsi_signal: string;
  ideal_entry_price: number;
  stop_loss_price: number;
  resistance_20d: number;
  support_20d: number;
  support_ma5: boolean;
  support_ma10: boolean;
  signal_reasons: string[];
  risk_factors: string[];
  strategies: StrategyEvaluation[];
}

interface TechnicalDecisionPanelProps {
  decision: TechnicalDecisionReport | null;
}

const getSignalStyle = (signal: string) => {
  if (signal === 'COMPRA FORTE') {
    return { bg: 'rgba(16, 185, 129, 0.18)', border: '#10b981', text: '#10b981' };
  }
  if (signal === 'COMPRA') {
    return { bg: 'rgba(20, 184, 166, 0.16)', border: '#14b8a6', text: '#14b8a6' };
  }
  if (signal === 'AGUARDAR PULLBACK') {
    return { bg: 'rgba(245, 158, 11, 0.18)', border: '#f59e0b', text: '#f59e0b' };
  }
  if (signal === 'VENDA / CAUTELA') {
    return { bg: 'rgba(239, 68, 68, 0.18)', border: '#ef4444', text: '#ef4444' };
  }
  return { bg: 'rgba(56, 189, 248, 0.15)', border: '#38bdf8', text: '#38bdf8' };
};

const getStrategyBadgeStyle = (status: string) => {
  if (status === 'APROVADO') {
    return { bg: 'rgba(16, 185, 129, 0.16)', color: '#10b981', border: 'rgba(16, 185, 129, 0.4)' };
  }
  if (status === 'ALERTA') {
    return { bg: 'rgba(245, 158, 11, 0.16)', color: '#f59e0b', border: 'rgba(245, 158, 11, 0.4)' };
  }
  if (status === 'REPROVADO') {
    return { bg: 'rgba(239, 68, 68, 0.16)', color: '#ef4444', border: 'rgba(239, 68, 68, 0.4)' };
  }
  return { bg: 'rgba(148, 163, 184, 0.12)', color: '#94a3b8', border: 'rgba(148, 163, 184, 0.25)' };
};

const TechnicalDecisionPanel: React.FC<TechnicalDecisionPanelProps> = ({ decision }) => {
  if (!decision) return null;

  const sigStyle = getSignalStyle(decision.buy_signal);
  const scoreColor =
    decision.signal_score >= 70
      ? '#10b981'
      : decision.signal_score >= 55
      ? '#38bdf8'
      : decision.signal_score >= 45
      ? '#f59e0b'
      : '#ef4444';

  return (
    <div id="secao-decisao-tecnica" className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
      {/* Cabeçalho + Score 0-100 + Veredito */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          paddingBottom: '1.1rem',
          marginBottom: '1.25rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Gauge size={22} style={{ color: '#38bdf8' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
              Painel de Decisão Técnica & Estratégias — {decision.ticker}
            </h3>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            {decision.ma_alignment} • Regime: <strong style={{ color: '#f8fafc' }}>{decision.trend_status}</strong>
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Score Quantitativo
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: scoreColor, lineHeight: 1.1 }}>
              {decision.signal_score}
              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 500 }}>/100</span>
            </div>
          </div>

          <div
            style={{
              background: sigStyle.bg,
              border: `1px solid ${sigStyle.border}`,
              color: sigStyle.text,
              padding: '0.55rem 1rem',
              borderRadius: '0.6rem',
              fontWeight: 800,
              fontSize: '0.92rem',
              letterSpacing: '0.03em',
            }}
          >
            {decision.buy_signal}
          </div>
        </div>
      </div>

      {/* Níveis Operacionais (Preço Atual, Entrada Ideal em Pullback, Suporte/Resistência 20D e Stop Técnico) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))',
          gap: '0.85rem',
          marginBottom: '1.25rem',
        }}
      >
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.55)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderLeft: '3px solid #38bdf8',
            borderRadius: '0.6rem',
            padding: '0.85rem 1rem',
          }}
        >
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Preço Atual (B3)</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '0.2rem' }}>
            R$ {decision.current_price.toFixed(2)}
          </div>
          <div style={{ fontSize: '0.72rem', color: decision.bias_ma5 > 5 ? '#f59e0b' : '#10b981', marginTop: '2px' }}>
            Distância MA5: {decision.bias_ma5 > 0 ? '+' : ''}
            {decision.bias_ma5.toFixed(2)}%
          </div>
        </div>

        <div
          style={{
            background: 'rgba(15, 23, 42, 0.55)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderLeft: '3px solid #10b981',
            borderRadius: '0.6rem',
            padding: '0.85rem 1rem',
          }}
        >
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Crosshair size={13} style={{ color: '#10b981' }} />
            <span>Entrada Ideal (Pullback)</span>
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#10b981', marginTop: '0.2rem' }}>
            R$ {decision.ideal_entry_price.toFixed(2)}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Região MA5 / MA10 sem esticar
          </div>
        </div>

        <div
          style={{
            background: 'rgba(15, 23, 42, 0.55)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderLeft: '3px solid #f59e0b',
            borderRadius: '0.6rem',
            padding: '0.85rem 1rem',
          }}
        >
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <TrendingUp size={13} style={{ color: '#f59e0b' }} />
            <span>Faixa 20 Pregões (S/R)</span>
          </div>
          <div style={{ fontSize: '1.05rem', fontWeight: 700, marginTop: '0.25rem' }}>
            R$ {decision.support_20d.toFixed(2)} — R$ {decision.resistance_20d.toFixed(2)}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Suporte 20D / Resistência 20D
          </div>
        </div>

        <div
          style={{
            background: 'rgba(15, 23, 42, 0.55)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderLeft: '3px solid #ef4444',
            borderRadius: '0.6rem',
            padding: '0.85rem 1rem',
          }}
        >
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ShieldAlert size={13} style={{ color: '#ef4444' }} />
            <span>Stop Loss Técnico</span>
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ef4444', marginTop: '0.2rem' }}>
            R$ {decision.stop_loss_price.toFixed(2)}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Perda da MA20 / Mínima estrutural
          </div>
        </div>
      </div>

      {/* Indicadores Técnicos Detalhados (Médias, Volume, MACD, IFR/RSI) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '0.85rem',
          marginBottom: '1.25rem',
        }}
      >
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '0.6rem', padding: '0.9rem', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#38bdf8', marginBottom: '0.4rem' }}>
            Médias Móveis & Bias (%)
          </div>
          <div style={{ fontSize: '0.8rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
            <span>MA5: <strong>R$ {decision.ma5.toFixed(2)}</strong> ({decision.bias_ma5 > 0 ? '+' : ''}{decision.bias_ma5.toFixed(1)}%)</span>
            <span>MA10: <strong>R$ {decision.ma10.toFixed(2)}</strong> ({decision.bias_ma10 > 0 ? '+' : ''}{decision.bias_ma10.toFixed(1)}%)</span>
            <span>MA20: <strong>R$ {decision.ma20.toFixed(2)}</strong> ({decision.bias_ma20 > 0 ? '+' : ''}{decision.bias_ma20.toFixed(1)}%)</span>
            <span>MA60: <strong>R$ {decision.ma60.toFixed(2)}</strong></span>
          </div>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '0.6rem', padding: '0.9rem', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#10b981', marginBottom: '0.4rem' }}>
            MACD (12, 26, 9) — {decision.macd_status}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#e2e8f0' }}>
            DIF: <strong>{decision.macd_dif.toFixed(3)}</strong> | DEA: <strong>{decision.macd_dea.toFixed(3)}</strong> | Hist: <strong>{decision.macd_bar.toFixed(3)}</strong>
          </div>
          <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            {decision.macd_signal}
          </div>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '0.6rem', padding: '0.9rem', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#f59e0b', marginBottom: '0.4rem' }}>
            IFR / RSI Wilder — {decision.rsi_status}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#e2e8f0' }}>
            RSI(6): <strong>{decision.rsi_6.toFixed(1)}</strong> | RSI(12): <strong>{decision.rsi_12.toFixed(1)}</strong> | RSI(24): <strong>{decision.rsi_24.toFixed(1)}</strong>
          </div>
          <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            {decision.rsi_signal}
          </div>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '0.6rem', padding: '0.9rem', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#14b8a6', marginBottom: '0.4rem' }}>
            Dinâmica de Volume — {decision.volume_status}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#e2e8f0' }}>
            Volume vs Média 5D: <strong>{decision.volume_ratio_5d.toFixed(2)}x</strong>
          </div>
          <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            {decision.volume_trend}
          </div>
        </div>
      </div>

      {/* Checklist de Compra (✅) & Fatores de Risco (⚠️) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1rem',
          marginBottom: '1.25rem',
        }}
      >
        <div
          style={{
            background: 'rgba(16, 185, 129, 0.06)',
            border: '1px solid rgba(16, 185, 129, 0.22)',
            borderRadius: '0.65rem',
            padding: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.9rem', color: '#10b981', marginBottom: '0.6rem' }}>
            <CheckCircle2 size={17} />
            <span>Gatilhos Favoráveis & Checklist Técnico</span>
          </div>
          {decision.signal_reasons.length > 0 ? (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.82rem' }}>
              {decision.signal_reasons.map((r, idx) => (
                <li key={idx} style={{ color: '#e2e8f0' }}>{r}</li>
              ))}
            </ul>
          ) : (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Aguardando confirmação de gatilhos compradores.</p>
          )}
        </div>

        <div
          style={{
            background: 'rgba(245, 158, 11, 0.06)',
            border: '1px solid rgba(245, 158, 11, 0.22)',
            borderRadius: '0.65rem',
            padding: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.9rem', color: '#f59e0b', marginBottom: '0.6rem' }}>
            <AlertTriangle size={17} />
            <span>Alertas de Risco & Disciplina Operacional</span>
          </div>
          {decision.risk_factors.length > 0 ? (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.82rem' }}>
              {decision.risk_factors.map((rk, idx) => (
                <li key={idx} style={{ color: '#fde68a' }}>{rk}</li>
              ))}
            </ul>
          ) : (
            <p style={{ fontSize: '0.82rem', color: '#10b981' }}>
              ✅ Nenhum alerta crítico de sobrecompra ou rompimento de suporte no momento.
            </p>
          )}
        </div>
      </div>

      {/* Matriz das 6 Estratégias Clássicas (Adaptadas para B3) */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <BarChart3 size={18} style={{ color: '#38bdf8' }} />
          <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>
            Diagnóstico nas 6 Estratégias Quantitativas (B3)
          </h4>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '0.75rem',
          }}
        >
          {decision.strategies.map((st) => {
            const bStyle = getStrategyBadgeStyle(st.status);
            return (
              <div
                key={st.id}
                style={{
                  background: 'rgba(15, 23, 42, 0.5)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '0.6rem',
                  padding: '0.85rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#f8fafc' }}>{st.name}</span>
                  <span
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '999px',
                      background: bStyle.bg,
                      color: bStyle.color,
                      border: `1px solid ${bStyle.border}`,
                    }}
                  >
                    {st.status}
                  </span>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#38bdf8', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Activity size={12} />
                  <span>{st.category}</span>
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.35 }}>
                  {st.summary}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TechnicalDecisionPanel;
