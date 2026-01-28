import type { OpponentPanelState, MmrHistoryPoint } from '../../../types';
import { onMount, onCleanup, createEffect } from 'solid-js';

interface MmrScreenProps {
    vm?: OpponentPanelState;
}

function MmrScreen(props: MmrScreenProps) {
    let chartContainer: HTMLDivElement | undefined;
    let chart: any = null;

    const vm = () => props.vm;

    // Aggregate data into candlesticks (OHLC format) - 24 hour periods
    function aggregateToCandlesticks(mmrHistory: MmrHistoryPoint[]) {
        if (!mmrHistory || mmrHistory.length === 0) return [];

        const periodSeconds = 24 * 60 * 60; // 24 hours
        const candleMap = new Map();

        // Group data points into time periods
        for (let i = 0; i < mmrHistory.length; i++) {
            const timestamp = mmrHistory[i].timestamp;
            const rating = mmrHistory[i].rating;

            const periodKey = Math.floor(timestamp / periodSeconds) * periodSeconds;

            if (!candleMap.has(periodKey)) {
                candleMap.set(periodKey, {
                    time: periodKey,
                    open: rating,
                    high: rating,
                    low: rating,
                    close: rating
                });
            } else {
                const candle = candleMap.get(periodKey);
                candle.high = Math.max(candle.high, rating);
                candle.low = Math.min(candle.low, rating);
                candle.close = rating; // Last value in period
            }
        }

        return Array.from(candleMap.values()).sort((a, b) => a.time - b.time);
    }

    function updateChart() {
        if (!chartContainer) return;

        const mmrHistory = vm()?.mmrHistory;

        // Clear previous chart
        if (chart) {
            chart.remove();
            chart = null;
        }

        // Show message if no data
        if (!mmrHistory || mmrHistory.length === 0) {
            chartContainer.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: rgba(255,255,255,0.5); font-size: 14px;">No MMR data available</div>';
            return;
        }

        // Check if LightweightCharts is available
        if (typeof (window as any).LightweightCharts === 'undefined') {
            chartContainer.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: rgba(255,255,255,0.5); font-size: 14px;">Loading chart library...</div>';
            return;
        }

        chartContainer.innerHTML = '';

        const candleData = aggregateToCandlesticks(mmrHistory);

        if (candleData.length === 0) {
            chartContainer.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: rgba(255,255,255,0.5); font-size: 14px;">No data to display</div>';
            return;
        }

        const width = chartContainer.clientWidth || 400;
        const height = chartContainer.clientHeight || 300;

        // Create chart with Lightweight Charts
        chart = (window as any).LightweightCharts.createChart(chartContainer, {
            width: width,
            height: height,
            layout: {
                background: { color: 'transparent' },
                textColor: 'rgba(255, 255, 255, 0.5)'
            },
            grid: {
                vertLines: { color: 'rgba(255, 255, 255, 0.1)' },
                horzLines: { color: 'rgba(255, 255, 255, 0.1)' }
            },
            timeScale: {
                timeVisible: true,
                secondsVisible: false,
                borderColor: 'rgba(255, 255, 255, 0.2)'
            },
            rightPriceScale: {
                borderColor: 'rgba(255, 255, 255, 0.2)'
            }
        });

        const series = chart.addCandlestickSeries({
            upColor: '#00FF00',
            downColor: '#FF0000',
            borderUpColor: '#00FF00',
            borderDownColor: '#FF0000',
            wickUpColor: '#00FF00',
            wickDownColor: '#FF0000'
        });

        series.setData(candleData.map((c: any) => ({
            time: c.time,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close
        })));

        chart.timeScale().fitContent();
    }

    // Wait for LightweightCharts to load, then create chart
    onMount(() => {
        const checkAndCreate = () => {
            if (typeof (window as any).LightweightCharts !== 'undefined') {
                updateChart();
            } else {
                setTimeout(checkAndCreate, 100);
            }
        };
        checkAndCreate();
    });

    // Update chart when data changes
    createEffect(() => {
        const mmrHistory = vm()?.mmrHistory;
        if (mmrHistory && typeof (window as any).LightweightCharts !== 'undefined') {
            updateChart();
        }
    });

    onCleanup(() => {
        if (chart) {
            chart.remove();
            chart = null;
        }
    });

    return (
        <div class="mmr-chart-screen">
            <div class="mmr-chart-header">
                <span class="mmr-chart-title">Opponent MMR History (Last 60 Days)</span>
            </div>
            <div class="mmr-chart-container" ref={chartContainer}></div>
        </div>
    );
}

export default MmrScreen;
