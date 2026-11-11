import { useState } from 'react';
import ReactApexChart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import { DollarSign, Percent, BarChart2, Activity } from 'lucide-react';

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

const computeRollingMA = (items: MarketData[], windowSize: number) => {
    const out: { x: number; y: number }[] = [];
    let sum = 0;
    for (let i = 0; i < items.length; i++) {
        sum += items[i].close;
        if (i >= windowSize) {
            sum -= items[i - windowSize].close;
        }
        const count = Math.min(i + 1, windowSize);
        out.push({
            x: new Date(items[i].date).getTime(),
            y: Number((sum / count).toFixed(2)),
        });
    }
    return out;
};

const InteractiveLineChart = ({ data, ticker, period, onPeriodChange, isLoading = false }: InteractiveLineChartProps) => {
    const [viewMode, setViewMode] = useState<'price' | 'return' | 'candles'>('price');
    const [showMAs, setShowMAs] = useState<boolean>(true);

    // Ordenar dados por data em ordem crescente
    const sortedData = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Em modo Candles, garante que ativos de cota única (CDI, Tesouro, Fundos) também tenham corpo OHLC visível
    const candleData = sortedData.map((item, idx) => {
        const prevClose = idx > 0 ? sortedData[idx - 1].close : item.open || item.close;
        const rawOpen = Number(item.open ?? prevClose);
        const rawClose = Number(item.close);
        const rawHigh = Number(item.high ?? Math.max(rawOpen, rawClose));
        const rawLow = Number(item.low ?? Math.min(rawOpen, rawClose));

        const isFlat = Math.abs(rawOpen - rawClose) < 1e-6 && Math.abs(rawHigh - rawLow) < 1e-6;
        const openVal = isFlat ? Number(prevClose.toFixed(2)) : Number(rawOpen.toFixed(2));
        const closeVal = Number(rawClose.toFixed(2));
        const highVal = Number(Math.max(rawHigh, openVal, closeVal).toFixed(2));
        const lowVal = Number(Math.min(rawLow, openVal, closeVal).toFixed(2));

        return {
            x: new Date(item.date).getTime(),
            y: [openVal, highVal, lowVal, closeVal],
        };
    });

    const priceOrReturnData = sortedData.map((item) => {
        if (viewMode === 'price') {
            return {
                x: new Date(item.date).getTime(),
                y: Number(item.close.toFixed(2)),
            };
        }
        const startPrice = sortedData[0]?.close || 1;
        const accumulatedReturn = ((item.close - startPrice) / startPrice) * 100;
        return {
            x: new Date(item.date).getTime(),
            y: Number(accumulatedReturn.toFixed(2)),
        };
    });

    const maSeries = (viewMode === 'price' && showMAs && sortedData.length >= 5)
        ? [
            {
                name: 'MA5 (Curta)',
                data: computeRollingMA(sortedData, 5),
            },
            {
                name: 'MA20 (Média)',
                data: computeRollingMA(sortedData, 20),
            },
            {
                name: 'MA60 (Longa)',
                data: computeRollingMA(sortedData, 60),
            },
        ]
        : [];

    const candleSeries = [
        {
            name: ticker,
            data: candleData,
        },
    ];

    const lineSeries = [
        {
            name: ticker,
            data: priceOrReturnData,
        },
        ...maSeries,
    ];

    const candleOptions: ApexOptions = {
        chart: {
            type: 'candlestick',
            height: 360,
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
                    reset: true,
                },
                autoSelected: 'zoom',
            },
            foreColor: '#94a3b8',
            fontFamily: 'Inter, sans-serif',
        },
        plotOptions: {
            candlestick: {
                colors: {
                    upward: '#10b981',
                    downward: '#ef4444',
                },
                wick: {
                    useFillColor: true,
                },
            },
        },
        grid: {
            borderColor: '#334155',
            strokeDashArray: 4,
            xaxis: {
                lines: { show: false },
            },
            yaxis: {
                lines: { show: true },
            },
        },
        xaxis: {
            type: 'datetime',
            axisBorder: { show: false },
            axisTicks: { show: false },
        },
        yaxis: {
            tooltip: {
                enabled: true,
            },
            labels: {
                formatter: (val) => (typeof val === 'number' ? `R$ ${val.toFixed(2)}` : String(val)),
            },
        },
        theme: {
            mode: 'dark',
        },
        tooltip: {
            theme: 'dark',
            x: {
                format: 'dd MMM yyyy',
            },
        },
    };

    const lineOptions: ApexOptions = {
        chart: {
            type: 'line',
            height: 360,
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
                    reset: true,
                },
                autoSelected: 'zoom',
            },
            foreColor: '#94a3b8',
            fontFamily: 'Inter, sans-serif',
        },
        colors: viewMode === 'price'
            ? ['#38bdf8', '#f59e0b', '#10b981', '#14b8a6']
            : ['#10b981'],
        stroke: {
            curve: 'smooth',
            width: viewMode === 'price' && showMAs ? [3, 1.8, 2, 2] : 2.5,
            dashArray: viewMode === 'price' && showMAs ? [0, 3, 0, 4] : 0,
        },
        fill: {
            type: 'solid',
            opacity: [1, 0.9, 0.9, 0.85],
        },
        dataLabels: {
            enabled: false,
        },
        grid: {
            borderColor: '#334155',
            strokeDashArray: 4,
            xaxis: {
                lines: { show: false },
            },
            yaxis: {
                lines: { show: true },
            },
        },
        xaxis: {
            type: 'datetime',
            axisBorder: { show: false },
            axisTicks: { show: false },
            tooltip: {
                enabled: false,
            },
        },
        yaxis: {
            labels: {
                formatter: (val) =>
                    typeof val === 'number'
                        ? viewMode === 'return'
                            ? `${val.toFixed(2)}%`
                            : `R$ ${val.toFixed(2)}`
                        : String(val),
            },
            tooltip: {
                enabled: true,
            },
        },
        legend: {
            show: true,
            position: 'top',
            horizontalAlign: 'left',
        },
        theme: {
            mode: 'dark',
        },
        tooltip: {
            theme: 'dark',
            shared: true,
            x: {
                format: 'dd MMM yyyy',
            },
            y: {
                formatter: (val) =>
                    typeof val === 'number'
                        ? viewMode === 'price'
                            ? `R$ ${val.toFixed(2)}`
                            : `${val.toFixed(2)}%`
                        : '',
            },
            style: {
                fontSize: '12px',
            },
        },
    };

    const periods = [
        { label: '6M', value: '6m' },
        { label: '1A', value: '1y' },
        { label: '3A', value: '3y' },
        { label: '5A', value: '5y' },
        { label: '10A', value: '10y' },
    ];

    const subtitleByMode = {
        price: showMAs ? 'Preço de Fechamento (R$) + Médias Móveis (MA5, MA20, MA60)' : 'Preço de Fechamento (R$)',
        return: 'Retorno Acumulado (%)',
        candles: 'Candlestick OHLC — Abertura, Máxima, Mínima e Fechamento (R$)',
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
                    borderRadius: '16px',
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

                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* View Mode Toggle */}
                    <div style={{ display: 'flex', gap: '0.25rem', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '8px' }}>
                        <button
                            type="button"
                            onClick={() => setViewMode('price')}
                            style={{
                                padding: '6px 12px',
                                borderRadius: '6px',
                                border: 'none',
                                cursor: 'pointer',
                                background: viewMode === 'price' ? '#38bdf8' : 'transparent',
                                color: viewMode === 'price' ? '#0f172a' : 'var(--text-muted)',
                                fontWeight: 500,
                                fontSize: '0.85rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                transition: 'all 0.2s',
                            }}
                            title="Preço de Fechamento"
                        >
                            <DollarSign size={15} />
                            <span>Preço</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('return')}
                            style={{
                                padding: '6px 12px',
                                borderRadius: '6px',
                                border: 'none',
                                cursor: 'pointer',
                                background: viewMode === 'return' ? '#10b981' : 'transparent',
                                color: viewMode === 'return' ? '#0f172a' : 'var(--text-muted)',
                                fontWeight: 500,
                                fontSize: '0.85rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                transition: 'all 0.2s',
                            }}
                            title="Retorno Acumulado %"
                        >
                            <Percent size={15} />
                            <span>Retorno %</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('candles')}
                            style={{
                                padding: '6px 12px',
                                borderRadius: '6px',
                                border: 'none',
                                cursor: 'pointer',
                                background: viewMode === 'candles' ? '#f59e0b' : 'transparent',
                                color: viewMode === 'candles' ? '#0f172a' : 'var(--text-muted)',
                                fontWeight: 500,
                                fontSize: '0.85rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                transition: 'all 0.2s',
                            }}
                            title="Gráfico de Candlestick (OHLC)"
                        >
                            <BarChart2 size={15} />
                            <span>Candles</span>
                        </button>
                    </div>

                    {/* Toggle Médias Móveis (MA5/20/60) */}
                    {viewMode === 'price' && (
                        <button
                            type="button"
                            onClick={() => setShowMAs(!showMAs)}
                            style={{
                                padding: '6px 12px',
                                borderRadius: '8px',
                                border: showMAs ? '1px solid #f59e0b' : '1px solid rgba(255,255,255,0.12)',
                                cursor: 'pointer',
                                background: showMAs ? 'rgba(245, 158, 11, 0.16)' : 'rgba(255,255,255,0.05)',
                                color: showMAs ? '#f59e0b' : 'var(--text-muted)',
                                fontWeight: 600,
                                fontSize: '0.82rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                            }}
                            title="Exibir ou ocultar Médias Móveis MA5, MA20 e MA60"
                        >
                            <Activity size={15} />
                            <span>Médias (MA5/20/60)</span>
                        </button>
                    )}

                    {/* Period Selector */}
                    <div style={{ display: 'flex', gap: '0.25rem', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '8px' }}>
                        {periods.map((p) => (
                            <button
                                key={p.value}
                                type="button"
                                onClick={() => onPeriodChange(p.value)}
                                style={{
                                    padding: '6px 12px',
                                    borderRadius: '6px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    background: period === p.value ? '#38bdf8' : 'transparent',
                                    color: period === p.value ? '#0f172a' : 'var(--text-muted)',
                                    fontWeight: period === p.value ? 600 : 400,
                                    fontSize: '0.85rem',
                                    transition: 'all 0.2s',
                                }}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div id="chart-timeline">
                {viewMode === 'candles' ? (
                    <ReactApexChart
                        key={`candles-${ticker}-${period}`}
                        options={candleOptions}
                        series={candleSeries}
                        type="candlestick"
                        height={360}
                    />
                ) : (
                    <ReactApexChart
                        key={`${viewMode}-${ticker}-${period}-${showMAs}`}
                        options={lineOptions}
                        series={lineSeries}
                        type="line"
                        height={360}
                    />
                )}
            </div>
        </div>
    );
};

export default InteractiveLineChart;
