import { useState } from 'react';
import ReactApexChart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import { DollarSign, Percent, BarChart2 } from 'lucide-react';

interface MarketData {
    ticker: string;
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

interface InteractiveLineChartProps {
    data: MarketData[];
    ticker: string;
    period: string;
    onPeriodChange: (period: string) => void;
    isLoading?: boolean;
}

const InteractiveLineChart = ({ data, ticker, period, onPeriodChange, isLoading = false }: InteractiveLineChartProps) => {
    const [viewMode, setViewMode] = useState<'price' | 'return' | 'candles'>('price');

    // Ordenar dados por data
    const sortedData = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const series = [{
        name: ticker,
        data: sortedData.map((item) => {
            if (viewMode === 'candles') {
                return {
                    x: new Date(item.date).getTime(),
                    y: [item.open, item.high, item.low, item.close]
                };
            }
            if (viewMode === 'price') {
                return {
                    x: new Date(item.date).getTime(),
                    y: item.close
                };
            } else {
                const startPrice = sortedData[0].close;
                const accumulatedReturn = ((item.close - startPrice) / startPrice) * 100;
                return {
                    x: new Date(item.date).getTime(),
                    y: accumulatedReturn
                };
            }
        })
    }];

    const chartType = viewMode === 'candles' ? 'candlestick' : 'area';

    const options: ApexOptions = {
        chart: {
            type: chartType,
            height: 350,
            background: 'transparent',
            toolbar: {
                show: true,
                tools: {
                    download: false,
                    selection: true,
                    zoom: true,
                    zoomin: true,
                    zoomout: true,
                    pan: true,
                    reset: true
                },
                autoSelected: 'zoom'
            },
            foreColor: '#94a3b8',
            fontFamily: 'Inter, sans-serif'
        },
        colors: [viewMode === 'price' ? '#38bdf8' : '#10b981'],
        plotOptions: {
            candlestick: {
                colors: {
                    upward: '#10b981',
                    downward: '#ef4444'
                }
            }
        },
        stroke: {
            curve: 'smooth',
            width: viewMode === 'candles' ? 1 : 2
        },
        fill: viewMode === 'candles' ? { type: 'solid' } : {
            type: 'gradient',
            gradient: {
                shadeIntensity: 1,
                opacityFrom: 0.7,
                opacityTo: 0.1,
                stops: [0, 90, 100]
            }
        },
        dataLabels: {
            enabled: false
        },
        grid: {
            borderColor: '#334155',
            strokeDashArray: 4,
            xaxis: {
                lines: { show: false }
            },
            yaxis: {
                lines: { show: true }
            }
        },
        xaxis: {
            type: 'datetime',
            axisBorder: { show: false },
            axisTicks: { show: false },
            tooltip: {
                enabled: false
            }
        },
        yaxis: {
            labels: {
                formatter: (val) => viewMode === 'return' ? val.toFixed(2) + '%' : val.toFixed(2)
            },
            tooltip: {
                enabled: true
            }
        },
        theme: {
            mode: 'dark'
        },
        tooltip: {
            theme: 'dark',
            x: {
                format: 'dd MMM yyyy'
            },
            y: viewMode === 'candles' ? undefined : {
                formatter: (val) => viewMode === 'price' ? `R$ ${val?.toFixed(2)}` : `${val?.toFixed(2)}%`
            },
            style: {
                fontSize: '12px'
            }
        }
    };

    const periods = [
        { label: '6M', value: '6m' },
        { label: '1A', value: '1y' },
        { label: '3A', value: '3y' },
        { label: '5A', value: '5y' },
        { label: '10A', value: '10y' }
    ];

    const subtitleByMode = {
        price: 'Preço de Fechamento (R$)',
        return: 'Retorno Acumulado (%)',
        candles: 'Candlestick OHLC (R$)'
    };

    return (
        <div className="glass-card" style={{ padding: '20px', marginBottom: '20px', position: 'relative' }}>
            {isLoading && (
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.6)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 10,
                    borderRadius: '16px'
                }}>
                    <div className="spinner" style={{ width: '40px', height: '40px', borderWidth: '3px' }}></div>
                </div>
            )}
            <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Evolução: {ticker}</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                        {subtitleByMode[viewMode]}
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* View Mode Toggle */}
                    <div style={{ display: 'flex', gap: '0.25rem', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '8px' }}>
                        <button
                            onClick={() => setViewMode('price')}
                            style={{
                                padding: '6px 12px',
                                borderRadius: '6px',
                                border: 'none',
                                cursor: 'pointer',
                                background: viewMode === 'price' ? '#38bdf8' : 'transparent',
                                color: viewMode === 'price' ? '#0f172a' : 'var(--text-muted)',
                                fontWeight: 500,
                                fontSize: '0.875rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                transition: 'all 0.2s'
                            }}
                            title="Preço de Fechamento"
                        >
                            <DollarSign size={16} />
                            <span className="hidden sm:inline">Preço</span>
                        </button>
                        <button
                            onClick={() => setViewMode('return')}
                            style={{
                                padding: '6px 12px',
                                borderRadius: '6px',
                                border: 'none',
                                cursor: 'pointer',
                                background: viewMode === 'return' ? '#10b981' : 'transparent',
                                color: viewMode === 'return' ? '#0f172a' : 'var(--text-muted)',
                                fontWeight: 500,
                                fontSize: '0.875rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                transition: 'all 0.2s'
                            }}
                            title="Retorno Acumulado %"
                        >
                            <Percent size={16} />
                            <span className="hidden sm:inline">Retorno %</span>
                        </button>
                        <button
                            onClick={() => setViewMode('candles')}
                            style={{
                                padding: '6px 12px',
                                borderRadius: '6px',
                                border: 'none',
                                cursor: 'pointer',
                                background: viewMode === 'candles' ? '#f59e0b' : 'transparent',
                                color: viewMode === 'candles' ? '#0f172a' : 'var(--text-muted)',
                                fontWeight: 500,
                                fontSize: '0.875rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                transition: 'all 0.2s'
                            }}
                            title="Gráfico de Candlestick (OHLC)"
                        >
                            <BarChart2 size={16} />
                            <span className="hidden sm:inline">Candles</span>
                        </button>
                    </div>

                    {/* Period Selector */}
                    <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '8px' }}>
                        {periods.map((p) => (
                            <button
                                key={p.value}
                                onClick={() => onPeriodChange(p.value)}
                                style={{
                                    padding: '6px 12px',
                                    borderRadius: '6px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    background: period === p.value ? 'var(--accent)' : 'transparent',
                                    color: period === p.value ? '#0f172a' : 'var(--text-muted)',
                                    fontWeight: period === p.value ? 700 : 500,
                                    fontSize: '0.875rem',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div id="chart-line">
                <ReactApexChart
                    key={chartType}
                    options={options}
                    series={series}
                    type={chartType}
                    height={400}
                />
            </div>
        </div>
    );
};

export default InteractiveLineChart;

