import React from 'react';
import { Calendar } from 'lucide-react';

export interface MonthlyPerformance {
  year: number;
  returns: { [key: number]: number | null };
  ytd: number | null;
}

interface MonthlyReturnsTableProps {
  data: MonthlyPerformance[];
  ticker: string;
}

const MonthlyReturnsTable: React.FC<MonthlyReturnsTableProps> = ({ data, ticker }) => {
  const months = [
    'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
  ];

  const getColor = (value: number | null) => {
    if (value === null) return 'transparent';
    // Intensidade baseada no valor (max 20% para saturação máxima visual)
    const intensity = Math.min(Math.abs(value) * 5, 1); 
    
    if (value > 0) return `rgba(34, 197, 94, ${0.1 + intensity * 0.2})`; // Green
    if (value < 0) return `rgba(239, 68, 68, ${0.1 + intensity * 0.2})`; // Red
    return 'transparent';
  };
  
  const getTextColor = (value: number | null) => {
      if (value === null) return 'var(--text-muted)';
      if (value > 0) return '#4ade80'; // Green-400 (mais brilhante para dark mode)
      if (value < 0) return '#f87171'; // Red-400
      return 'inherit';
  }

  const formatPercent = (value: number | null) => {
    if (value === null || value === undefined) return '-';
    return (value * 100).toFixed(2) + '%';
  };

  if (!data || data.length === 0) return null;

  // Calculate monthly averages
  const monthlyAverages = Array.from({ length: 12 }, (_, i) => {
    const monthIndex = i + 1;
    const values = data
      .map(row => row.returns[monthIndex])
      .filter((val): val is number => val !== null && val !== undefined);
    
    if (values.length === 0) return null;
    const sum = values.reduce((acc, val) => acc + val, 0);
    return sum / values.length;
  });

  // Calculate YTD average
  const ytdValues = data
    .map(row => row.ytd)
    .filter((val): val is number => val !== null && val !== undefined);
  const ytdAverage = ytdValues.length > 0 
    ? ytdValues.reduce((acc, val) => acc + val, 0) / ytdValues.length 
    : null;

  return (
    <div className="glass-card" style={{ marginTop: '2rem', overflow: 'hidden' }}>
      <div style={{ 
        padding: '2rem', 
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem'
      }}>
        <Calendar className="text-accent" size={28} />
        <div>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Retornos Mensais: {ticker}</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>Performance histórica (%) mês a mês</p>
        </div>
      </div>
      
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.03)' }}>
              <th style={{ padding: '1.25rem', textAlign: 'left', fontSize: '1rem' }}>Ano</th>
              {months.map((m) => (
                <th key={m} style={{ padding: '1rem', textAlign: 'center', fontSize: '1rem' }}>{m}</th>
              ))}
              <th style={{ padding: '1.25rem', textAlign: 'right', fontSize: '1rem' }}>YTD</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.year} style={{ borderBottom: '1px solid var(--border-light)' }}>
                <td style={{ padding: '1.25rem', fontWeight: 600, fontSize: '1.1rem' }}>{row.year}</td>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
                  const val = row.returns[month];
                  return (
                    <td 
                      key={month} 
                      style={{ 
                          padding: '1.25rem 0.5rem',
                          textAlign: 'center',
                          backgroundColor: getColor(val),
                          color: getTextColor(val),
                          fontWeight: val !== null ? 500 : 400,
                          fontSize: '1.1rem'
                      }}
                    >
                      {formatPercent(val)}
                    </td>
                  );
                })}
                <td style={{ padding: '1.25rem', textAlign: 'right', fontWeight: 700, fontSize: '1.1rem' }}>
                    <span style={{ color: getTextColor(row.ytd) }}>
                        {formatPercent(row.ytd)}
                    </span>
                </td>
              </tr>
            ))}
            {/* Average Row */}
            <tr style={{ borderTop: '2px solid var(--border)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
              <td style={{ padding: '1.25rem', fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-primary)' }}>Média</td>
              {monthlyAverages.map((avg, i) => (
                <td 
                  key={`avg-${i}`} 
                  style={{ 
                      padding: '1.25rem 0.5rem',
                      textAlign: 'center',
                      backgroundColor: getColor(avg),
                      color: getTextColor(avg),
                      fontWeight: 700,
                      fontSize: '1.1rem'
                  }}
                >
                  {formatPercent(avg)}
                </td>
              ))}
              <td style={{ padding: '1.25rem', textAlign: 'right', fontWeight: 800, fontSize: '1.1rem' }}>
                  <span style={{ color: getTextColor(ytdAverage) }}>
                      {formatPercent(ytdAverage)}
                  </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MonthlyReturnsTable;
