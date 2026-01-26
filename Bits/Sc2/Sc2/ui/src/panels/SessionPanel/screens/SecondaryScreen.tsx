import type { SessionPanelState, MmrHistoryPoint } from '../../../types';

interface SecondaryScreenProps {
    vm?: SessionPanelState;
}

function SecondaryScreen(props: SecondaryScreenProps) {
    const vm = () => props.vm;

    // Debug: Log MMR history data
    console.log('[MMR Graph] vm:', vm());
    console.log('[MMR Graph] mmrHistory:', vm()?.mmrHistory);
    console.log('[MMR Graph] mmrHistory length:', vm()?.mmrHistory?.length);

    // Filter to last 30 days
    const getLast30DaysData = (): MmrHistoryPoint[] => {
        if (!vm()?.mmrHistory || vm()!.mmrHistory.length === 0) {
            console.log('[MMR Graph] No history data available');
            return [];
        }

        const now = Date.now() / 1000; // Convert to seconds
        const thirtyDaysAgo = now - (30 * 24 * 60 * 60);

        return vm()!.mmrHistory.filter(point => point.timestamp >= thirtyDaysAgo);
    };

    // Calculate candle data (green for increase, red for decrease)
    const renderCandles = () => {
        const data = getLast30DaysData();
        if (data.length === 0) {
            return <div class="mmr-graph-empty">No MMR data available</div>;
        }

        const maxRating = Math.max(...data.map(d => d.rating));
        const minRating = Math.min(...data.map(d => d.rating));
        const range = maxRating - minRating || 100;
        const padding = range * 0.1;

        const candles = [];
        for (let i = 1; i < data.length; i++) {
            const prevRating = data[i - 1].rating;
            const currRating = data[i].rating;
            const isGain = currRating >= prevRating;

            const height = Math.abs(currRating - prevRating);
            const bottom = Math.min(prevRating, currRating);

            // Calculate percentage positions
            const heightPercent = (height / (range + 2 * padding)) * 100;
            const bottomPercent = ((bottom - minRating + padding) / (range + 2 * padding)) * 100;
            const leftPercent = (i / data.length) * 100;
            const widthPercent = (1 / data.length) * 90; // 90% to add spacing

            candles.push(
                <div
                    class={`mmr-candle ${isGain ? 'mmr-candle-gain' : 'mmr-candle-loss'}`}
                    style={{
                        left: `${leftPercent}%`,
                        bottom: `${bottomPercent}%`,
                        height: `${Math.max(heightPercent, 1)}%`,
                        width: `${widthPercent}%`
                    }}
                    title={`${new Date(currRating * 1000).toLocaleDateString()}: ${currRating} MMR (${isGain ? '+' : ''}${currRating - prevRating})`}
                />
            );
        }

        return (
            <div class="mmr-graph-container">
                <div class="mmr-graph-header">
                    <span class="mmr-graph-title">30-Day MMR History</span>
                    <span class="mmr-graph-range">{minRating} - {maxRating}</span>
                </div>
                <div class="mmr-graph-chart">
                    {candles}
                </div>
                <div class="mmr-graph-footer">
                    <span>30 days ago</span>
                    <span>Today</span>
                </div>
            </div>
        );
    };

    return (
        <div class="mmr-graph-screen">
            {renderCandles()}
        </div>
    );
}

export default SecondaryScreen;
