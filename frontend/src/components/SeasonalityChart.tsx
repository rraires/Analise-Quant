import React, { useMemo, useState } from 'react';
import ReactApexChart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import { MonthlyPerformance } from './MonthlyReturnsTable';
import { Filter } from 'lucide-react';

interface SeasonalityChartProps {
  data: MonthlyPerformance[];
  ticker: string;
}

type TimeFrame = 'all' | '5y' | '10y';

const SeasonalityChart: React.FC<SeasonalityChartProps> = ({ data, ticker }) => {
  const [timeframe, setTimeframe] = useState<TimeFrame>('all');
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    // Sort data by year descending (just in case)
    const sorted = [...data].sort((a, b) => b.year - a.year);
    
    if (timeframe === 'all') return sorted;
    
    const years = timeframe === '5y' ? 5 : 10;
    return sorted.slice(0, years);
  }, [data, timeframe]);

  const stats = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return Array(12).fill({ avg: 0, winRate: 0, count: 0 });

    return Array.from({ length: 12 }, (_, i) => {
      const monthIndex = i + 1; // 1-based index
      const values = filteredData
        .map(d => d.returns[monthIndex])
        .filter((v): v is number => v !== null && v !== undefined);

      const count = values.length;
      if (count === 0) return { avg: 0, winRate: 0, count: 0 };

      const sum = values.reduce((acc, val) => acc + val, 0);
      const avg = sum / count;
      const positiveCount = values.filter(v => v > 0).length;
      const winRate = (positiveCount / count) * 100;

      return { avg, winRate, count };
    });
  }, [filteredData]);

  const series = [{
    name: 'Retorno Médio',
    data: stats.map(s => s.avg * 100) // Convert to percentage
  }];

  const options: ApexOptions = {
    chart: {
      type: 'bar',
      height: 350,
      toolbar: { show: false },
      background: 'transparent',
      fontFamily: 'Inter, sans-serif'
    },
    plotOptions: {
      bar: {
        borderRadius: 4,
        columnWidth: '60%',
        colors: {
          ranges: [{
            from: -100,
            to: 0,
            color: '#ef4444' // red-500
          }, {
            from: 0,
            to: 100,
            color: '#22c55e' // green-500
          }]
        },
        dataLabels: {
          position: 'top', // top, center, bottom
        },
      }
    },
    dataLabels: {
      enabled: true,
      formatter: function (val: number) {
        return val.toFixed(1) + "%";
      },
      style: {
        colors: ['#fff'],
        fontSize: '12px'
      },
      offsetY: -20,
    },
    xaxis: {
      categories: months,
      labels: {
        style: { colors: '#94a3b8' }
      },
      axisBorder: { show: false },
      axisTicks: { show: false }
    },
    yaxis: {
      labels: {
        formatter: (val) => val.toFixed(1) + "%",
        style: { colors: '#94a3b8' }
      }
    },
    grid: {
      borderColor: '#334155',
      strokeDashArray: 4,
      xaxis: {
        lines: {
          show: false
        }
      }
    },
    theme: { mode: 'dark' },
    tooltip: {
      theme: 'dark',
      y: {
        formatter: (val) => val.toFixed(2) + "%"
      },
      custom: function({ series, seriesIndex, dataPointIndex }) {
        const stat = stats[dataPointIndex];
        const val = series[seriesIndex][dataPointIndex];
        const color = val >= 0 ? '#22c55e' : '#ef4444';
        
        return (
          '<div class="apexcharts-tooltip-box" style="background: #0f172a; border: 1px solid #334155; padding: 12px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">' +
            `<div style="margin-bottom: 8px; font-size: 14px; font-weight: 600; color: #e2e8f0; display: flex; align-items: center; justify-content: space-between;">` +
              `<span>${months[dataPointIndex]}</span>` +
              `<span style="color: ${color}">${val.toFixed(2)}%</span>` +
            `</div>` +
            `<div style="font-size: 12px; color: #94a3b8; margin-bottom: 4px;">Taxa de Acerto: <span style="color: #f1f5f9; font-weight: 500;">${stat.winRate.toFixed(1)}%</span></div>` +
            `<div style="font-size: 12px; color: #94a3b8;">Amostra: <span style="color: #f1f5f9; font-weight: 500;">${stat.count} anos</span></div>` +
          '</div>'
        );
      }
    }
  };

  if (!data || data.length === 0) return null;

  return (
    <div className="glass-card" style={{ marginTop: '2rem', padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Filter size={20} className="text-accent" />
          Sazonalidade Mensal ({ticker})
        </h3>
        
        <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '8px' }}>
          {(['5y', '10y', 'all'] as TimeFrame[]).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              style={{
                background: timeframe === tf ? 'var(--primary)' : 'transparent',
                color: timeframe === tf ? 'white' : 'var(--text-muted)',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {tf === 'all' ? 'Tudo' : tf === '5y' ? '5 Anos' : '10 Anos'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '1rem', display: 'flex', gap: '1.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '2px', backgroundColor: '#22c55e' }}></div>
          <span>Média Positiva</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '2px', backgroundColor: '#ef4444' }}></div>
          <span>Média Negativa</span>
        </div>
      </div>

      <ReactApexChart options={options} series={series} type="bar" height={350} />
      
      <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
        * Médias calculadas com base nos retornos mensais dos últimos {timeframe === 'all' ? data.length : timeframe === '5y' ? 5 : 10} anos disponíveis.
      </p>
    </div>
  );
};

export default SeasonalityChart;
