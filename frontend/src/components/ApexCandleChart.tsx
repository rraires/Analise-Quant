import ReactApexChart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';

interface MarketData {
    ticker: string;
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

interface ApexCandleProps {
    data: MarketData[];
    ticker: string;
}

const ApexCandleChart = ({ data, ticker }: ApexCandleProps) => {
    // 1. Processar dados para o formato do ApexCharts
    // Formato Candle: [timestamp, open, high, low, close]
    // Formato Volume: [timestamp, volume]
    const seriesData = [...data]
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .map(item => ({
            x: new Date(item.date).getTime(),
            y: [item.open, item.high, item.low, item.close]
        }));


    const candlestickOptions: ApexOptions = {
        chart: {
            type: 'candlestick',
            height: 290,
            id: 'candles',
            toolbar: {
                autoSelected: 'pan',
                show: false
            },
            zoom: {
                enabled: false
            },
            background: 'transparent',
            foreColor: '#94a3b8' // Cor do texto
        },
        plotOptions: {
            candlestick: {
                colors: {
                    upward: '#10b981', // Verde sucesso
                    downward: '#ef4444' // Vermelho erro
                }
            }
        },
        xaxis: {
            type: 'datetime',
            axisBorder: { color: '#334155' },
            axisTicks: { color: '#334155' }
        },
        grid: {
            borderColor: '#334155',
            xaxis: {
                lines: { show: true }
            }
        },
        tooltip: {
            theme: 'dark'
        }
    };

    const candlestickSeries = [{
        data: seriesData
    }];

    return (
        <div className="glass-card" style={{ padding: '20px', marginBottom: '20px' }}>
            <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ fontSize: '1.25rem' }}>Gráfico: {ticker}</h3>
                <div className="text-accent" style={{ fontSize: '0.8rem', fontWeight: 600 }}>APEX CHARTS</div>
            </div>

            <div id="chart-candlestick">
                <ReactApexChart
                    options={candlestickOptions}
                    series={candlestickSeries}
                    type="candlestick"
                    height={350}
                />
            </div>
        </div>
    );
};

export default ApexCandleChart;
