import { createMemo } from 'solid-js';
import MatchHistoryList from '../../../components/MatchHistoryList';

function UserMatchHistoryScreen(props) {
    const vm = () => props.vm;

    const visibleHistoryItems = createMemo(() => {
        const items = vm()?.userMatchHistory ?? [];
        return items.slice(0, 6); // Max 6 rows for match history
    });

    return (
        <>
            <div class="strip">MY RECENT MATCHES</div>
            <MatchHistoryList matches={visibleHistoryItems()} />
        </>
    );
}

export default UserMatchHistoryScreen;
