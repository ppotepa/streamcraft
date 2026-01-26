import { For, Show } from 'solid-js';
import type { MatchHistoryItem } from '../types';

interface MatchHistoryListProps {
    matches: MatchHistoryItem[];
    maxRows?: number;
}

function MatchHistoryList(props: MatchHistoryListProps) {
    const formatMatchup = (match: MatchHistoryItem): string => {
        const oppRace = match.vsRace?.charAt(0)?.toUpperCase() || '?';
        const myRace = match.myRace?.charAt(0)?.toUpperCase();

        if (myRace) {
            return `${myRace}v${oppRace}`;
        }
        return `v${oppRace}`;
    };

    const visibleMatches = () => {
        if (props.maxRows && props.matches) {
            return props.matches.slice(0, props.maxRows);
        }
        return props.matches || [];
    };

    return (
        <div class="list-container">
            <Show when={visibleMatches().length > 0} fallback={
                <div class="list-empty">No matches yet</div>
            }>
                <For each={visibleMatches()}>
                    {(match) => (
                        <div class="list-row">
                            <div class="list-row-col time">{match.timeAgo}</div>
                            <div class="list-row-col player">vs {match.vsPlayerName}</div>
                            <div class="list-row-col race">{formatMatchup(match)}</div>
                            <div class="list-row-col points">{match.pointsChange}</div>
                            <div class="list-row-col duration">{match.duration}</div>
                            <div class={`list-row-col result ${match.result.toLowerCase()}`}>
                                {match.result}
                            </div>
                        </div>
                    )}
                </For>
            </Show>
        </div>
    );
}

export default MatchHistoryList;
