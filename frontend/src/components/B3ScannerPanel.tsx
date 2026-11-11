import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Radar, ArrowUpRight, Filter } from 'lucide-react';

export interface ScannerB3Item {
  ticker: string;
  name: string;
  asset_class: string;
  sector: string;
  current_price: number;
  signal_score: number;
  buy_signal: string;
  trend_status: string;
  bias_ma5: number;
  rsi_12: number;
  volume_ratio_5d: number;
  dy_pct?: number | null;
  p_vp?: number | null;
  p_l?: number | null;
  top_catalyst: string;
}

interface B3ScannerPanelProps {
  onSelectSymbol: (symbol: string) => void;
}

const DEFAULT_SCANNER_ITEMS: ScannerB3Item[] = [
  {
    ticker: 'WEGE3',
    name: 'WEG S.A.',
    asset_class: 'ACAO',
    sector: 'Bens Industriais',
    current_price: 53.40,
    signal_score: 84,
    buy_signal: 'COMPRA FORTE',
    trend_status: 'Forte Alta (Bull)',
    bias_ma5: 1.15,
    rsi_12: 61.4,
    volume_ratio_5d: 1.38,
    dy_pct: 1.85,
    p_vp: 9.80,
    p_l: 32.4,
    top_catalyst: 'Alinhamento de Forte Alta: MA5 > MA10 > MA20 com preço próximo à MA5',
  },
  {
    ticker: 'PETR4',
    name: 'Petrobras PN',
    asset_class: 'ACAO',
    sector: 'Petróleo e Gás',
    current_price: 38.20,
    signal_score: 81,
    buy_signal: 'COMPRA FORTE',
    trend_status: 'Tendência de Alta',
    bias_ma5: 0.85,
    rsi_12: 58.2,
    volume_ratio_5d: 0.74,
    dy_pct: 14.20,
    p_vp: 1.18,
    p_l: 4.6,
    top_catalyst: 'Pullback com volume reduzido na MA5 + ROE 26.4% e DY 14.2%',
  },
  {
    ticker: 'HGLG11',
    name: 'CSHG Logística FII',
    asset_class: 'FII',
    sector: 'FII Logística',
    current_price: 158.90,
    signal_score: 78,
    buy_signal: 'COMPRA FORTE',
    trend_status: 'Tendência de Alta',
    bias_ma5: 0.42,
    rsi_12: 54.8,
    volume_ratio_5d: 1.12,
    dy_pct: 9.15,
    p_vp: 0.98,
    p_l: null,
    top_catalyst: 'FII com DY 9.2% isento, P/VP descontado (0.98x) e suporte na MA5',
  },
  {
    ticker: 'ITUB4',
    name: 'Itaú Unibanco PN',
    asset_class: 'ACAO',
    sector: 'Bancos',
    current_price: 34.90,
    signal_score: 75,
    buy_signal: 'COMPRA',
    trend_status: 'Tendência de Alta',
    bias_ma5: 1.60,
    rsi_12: 59.0,
    volume_ratio_5d: 1.08,
    dy_pct: 7.40,
    p_vp: 1.72,
    p_l: 8.4,
    top_catalyst: 'Tendência de Alta MA5 > MA10 > MA20 com ROE 21.8%',
  },
  {
    ticker: 'MXRF11',
    name: 'Maxi Renda FII',
    asset_class: 'FII',
    sector: 'FII Papel / CRI',
    current_price: 10.14,
    signal_score: 74,
    buy_signal: 'COMPRA',
    trend_status: 'Tendência de Alta',
    bias_ma5: 0.30,
    rsi_12: 53.2,
    volume_ratio_5d: 0.95,
    dy_pct: 11.80,
    p_vp: 1.01,
    p_l: null,
    top_catalyst: 'Oscilação controlada próxima ao suporte com DY 11.8% a.a.',
  },
  {
    ticker: 'BBAS3',
    name: 'Banco do Brasil ON',
    asset_class: 'ACAO',
    sector: 'Bancos',
    current_price: 28.55,
    signal_score: 72,
    buy_signal: 'COMPRA',
    trend_status: 'Alta Moderada (Recuperação)',
    bias_ma5: -0.45,
    rsi_12: 52.1,
    volume_ratio_5d: 0.72,
    dy_pct: 9.85,
    p_vp: 0.91,
    p_l: 4.5,
    top_catalyst: 'Desconto patrimonial (P/VP 0.91x, P/L 4.5x) em pullback de baixo volume',
  },
  {
    ticker: 'XPML11',
    name: 'XP Malls FII',
    asset_class: 'FII',
    sector: 'FII Shoppings',
    current_price: 112.60,
    signal_score: 70,
    buy_signal: 'COMPRA',
    trend_status: 'Tendência de Alta',
    bias_ma5: 0.90,
    rsi_12: 55.4,
    volume_ratio_5d: 1.05,
    dy_pct: 9.60,
    p_vp: 0.97,
    p_l: null,
    top_catalyst: 'Shoppings com P/VP abaixo de 1.00x e tendência técnica positiva',
  },
  {
    ticker: 'VALE3',
    name: 'Vale ON',
    asset_class: 'ACAO',
    sector: 'Mineração',
    current_price: 61.10,
    signal_score: 64,
    buy_signal: 'COMPRA',
    trend_status: 'Alta Moderada (Recuperação)',
    bias_ma5: 1.10,
    rsi_12: 49.5,
    volume_ratio_5d: 1.18,
    dy_pct: 9.50,
    p_vp: 1.35,
    p_l: 6.1,
    top_catalyst: 'Recuperação de curto prazo na base do caixote de 20 dias',
  },
];

const badgeColor = (sig: string) => {
  if (sig === 'COMPRA FORTE') return { bg: 'rgba(16, 185, 129, 0.18)', color: '#10b981', border: 'rgba(16, 185, 129, 0.45)' };
  if (sig === 'COMPRA') return { bg: 'rgba(20, 184, 166, 0.16)', color: '#14b8a6', border: 'rgba(20, 184, 166, 0.4)' };
  if (sig === 'AGUARDAR PULLBACK') return { bg: 'rgba(245, 158, 11, 0.16)', color: '#f59e0b', border: 'rgba(245, 158, 11, 0.4)' };
  if (sig === 'VENDA / CAUTELA') return { bg: 'rgba(239, 68, 68, 0.16)', color: '#ef4444', border: 'rgba(239, 68, 68, 0.4)' };
  return { bg: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: 'rgba(56, 189, 248, 0.35)' };
};

const B3ScannerPanel: React.FC<B3ScannerPanelProps> = ({ onSelectSymbol }) => {
  const [items, setItems] = useState<ScannerB3Item[]>(DEFAULT_SCANNER_ITEMS);
  const [filterClass, setFilterClass] = useState<'ALL' | 'ACAO' | 'FII' | 'BUY'>('ALL');

  useEffect(() => {
    axios
      .get<ScannerB3Item[]>('/api/scanner/b3?asset_class=ALL')
      .then((res) => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          setItems(res.data);
        }
      })
      .catch(() => {});
  }, []);

  const filtered = items.filter((item) => {
    if (filterClass === 'ACAO') return item.asset_class === 'ACAO';
    if (filterClass === 'FII') return item.asset_class === 'FII';
    if (filterClass === 'BUY') return item.buy_signal === 'COMPRA FORTE' || item.buy_signal === 'COMPRA';
    return true;
  });

  return (
    <div id="secao-scanner-b3" className="glass-card" style={{ padding: '1.5rem', marginTop: '1.75rem' }}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          marginBottom: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
            <Radar size={21} style={{ color: '#10b981' }} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
              Scanner Diário de Oportunidades B3 — Ranking por Score Quantitativo (0–100)
            </h3>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            Varredura automática combinando Tendência (MA5/10/20), Bias, Volume 5D, MACD, IFR e Múltiplos B3
          </p>
        </div>

        {/* Filtros Rápidos */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
          <Filter size={15} style={{ color: 'var(--text-muted)' }} />
          {[
            { id: 'ALL', label: 'Todos (B3)' },
            { id: 'ACAO', label: 'Ações B3' },
            { id: 'FII', label: 'FIIs B3' },
            { id: 'BUY', label: 'Sinais de Compra' },
          ].map((btn) => {
            const active = filterClass === btn.id;
            return (
              <button
                key={btn.id}
                type="button"
                onClick={() => setFilterClass(btn.id as 'ALL' | 'ACAO' | 'FII' | 'BUY')}
                style={{
                  background: active ? '#38bdf8' : 'rgba(255,255,255,0.05)',
                  color: active ? '#0f172a' : '#cbd5e1',
                  border: active ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '6px',
                  padding: '5px 11px',
                  fontSize: '0.78rem',
                  fontWeight: active ? 700 : 500,
                  cursor: 'pointer',
                }}
              >
                {btn.label}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #334155', color: 'var(--text-muted)', textAlign: 'left' }}>
              <th style={{ padding: '0.6rem' }}>Ativo</th>
              <th style={{ padding: '0.6rem' }}>Score</th>
              <th style={{ padding: '0.6rem' }}>Sinal Técnico</th>
              <th style={{ padding: '0.6rem' }}>Regime / Médias</th>
              <th style={{ padding: '0.6rem', textAlign: 'right' }}>Preço</th>
              <th style={{ padding: '0.6rem', textAlign: 'right' }}>Bias MA5</th>
              <th style={{ padding: '0.6rem', textAlign: 'right' }}>IFR(12)</th>
              <th style={{ padding: '0.6rem', textAlign: 'right' }}>DY / P/VP</th>
              <th style={{ padding: '0.6rem' }}>Catalisador Principal</th>
              <th style={{ padding: '0.6rem', textAlign: 'right' }}>Ação</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => {
              const b = badgeColor(item.buy_signal);
              const scoreClr =
                item.signal_score >= 72 ? '#10b981' : item.signal_score >= 58 ? '#38bdf8' : '#f59e0b';
              return (
                <tr key={item.ticker} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '0.6rem' }}>
                    <div style={{ fontWeight: 700, color: '#38bdf8' }}>{item.ticker}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {item.name} • {item.asset_class}
                    </div>
                  </td>
                  <td style={{ padding: '0.6rem', fontWeight: 800, fontSize: '0.95rem', color: scoreClr }}>
                    {item.signal_score}/100
                  </td>
                  <td style={{ padding: '0.6rem' }}>
                    <span
                      style={{
                        background: b.bg,
                        color: b.color,
                        border: `1px solid ${b.border}`,
                        borderRadius: '999px',
                        padding: '2px 9px',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {item.buy_signal}
                    </span>
                  </td>
                  <td style={{ padding: '0.6rem', color: '#e2e8f0', fontSize: '0.78rem' }}>
                    {item.trend_status}
                  </td>
                  <td style={{ padding: '0.6rem', textAlign: 'right', fontWeight: 600 }}>
                    R$ {item.current_price.toFixed(2)}
                  </td>
                  <td
                    style={{
                      padding: '0.6rem',
                      textAlign: 'right',
                      color: item.bias_ma5 > 5 ? '#f59e0b' : '#10b981',
                      fontWeight: 600,
                    }}
                  >
                    {item.bias_ma5 > 0 ? '+' : ''}
                    {item.bias_ma5.toFixed(2)}%
                  </td>
                  <td style={{ padding: '0.6rem', textAlign: 'right' }}>{item.rsi_12.toFixed(1)}</td>
                  <td style={{ padding: '0.6rem', textAlign: 'right', fontSize: '0.76rem' }}>
                    {item.dy_pct ? `${item.dy_pct.toFixed(1)}%` : '-'} /{' '}
                    {item.p_vp ? `${item.p_vp.toFixed(2)}x` : '-'}
                  </td>
                  <td style={{ padding: '0.6rem', fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: '260px' }}>
                    {item.top_catalyst}
                  </td>
                  <td style={{ padding: '0.6rem', textAlign: 'right' }}>
                    <button
                      type="button"
                      onClick={() => onSelectSymbol(item.ticker)}
                      style={{
                        background: 'rgba(56, 189, 248, 0.14)',
                        color: '#38bdf8',
                        border: '1px solid rgba(56, 189, 248, 0.35)',
                        borderRadius: '6px',
                        padding: '4px 10px',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <span>Ver Diagnóstico</span>
                      <ArrowUpRight size={13} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default B3ScannerPanel;
