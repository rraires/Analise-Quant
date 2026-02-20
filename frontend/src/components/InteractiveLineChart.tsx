import React, { useState, useMemo } from 'react';
import ReactApexChart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import { DollarSign, Percent } from 'lucide-react';

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
    const [viewMode, setViewMode] = useState<'price' | 'return'>('price');

    // Ordenar dados por data
    const sortedData = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const series = [{
        name: ticker,
        data: sortedData.map((item, index) => {
            if (viewMode === 'price') {
                return {
                    x: new Date(item.date).getTime(),
                    y: item.close
                };
            } else {
                // Calculate accumulated return relative to the first data point in the selected period
                const startPrice = sortedData[0].close;
                const accumulatedReturn = ((item.close - startPrice) / startPrice) * 100;
                return {
                    x: new Date(item.date).getTime(),
                    y: accumulatedReturn
                };
            }
        })
    }];

    const options: ApexOptions = {
        chart: {
            type: 'area',
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
        colors: [viewMode === 'price' ? '#38bdf8' : '#a855f7'],
        stroke: {
            curve: 'smooth',
            width: 2
        },
        fill: {
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
                formatter: (val) => viewMode === 'price' ? val.toFixed(2) : val.toFixed(2) + '%'
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
            y: {
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
                        {viewMode === 'price' ? 'Preço de Fechamento (R$)' : 'Retorno Acumulado (%)'}
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
                                background: viewMode === 'return' ? '#a855f7' : 'transparent',
                                color: viewMode === 'return' ? 'white' : 'var(--text-muted)',
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
                    options={options}
                    series={series}
                    type="area"
                    height={400}
                />
            </div>
        </div>
    );
};

export default InteractiveLineChart;
