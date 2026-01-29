import { createMemo } from 'solid-js';
import MatchHistoryList from '../../../components/MatchHistoryList';

function MatchHistoryScreen(props) {
    const vm = () => props.vm;

    const visibleHistoryItems = createMemo(() => {
        const items = vm()?.matchHistory ?? [];
        return items.slice(0, 6); // Max 6 rows for match history
    });

    return (
        <>
            <div class="strip">RECENT MATCHES</div>
            <MatchHistoryList matches={visibleHistoryItems()} />
        </>
    );
}

export default MatchHistoryScreen;
