import type { Sc2BitState } from '../types';

type StateHandler = (state: Sc2BitState) => void;

function toUiState(raw: unknown): Sc2BitState {
    const data = raw as Record<string, unknown> | null;
    const panels = (data?.panels as Sc2BitState['panels']) ?? {};
    const timestamp =
        (data?.timestamp as string | undefined) ??
        (data?.panelsUpdatedAt as string | undefined) ??
        new Date().toISOString();

    return {
        panels,
        timestamp
    };
}

export function createSc2StateSubscription(
    handler: StateHandler,
    options?: { pollIntervalMs?: number }
): () => void {
    const pollIntervalMs = options?.pollIntervalMs ?? 2000;
    let poller: number | null = null;
    let source: EventSource | null = null;
    let stopped = false;

    const fetchState = async (): Promise<void> => {
        try {
            const response = await fetch('/sc2/state');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            handler(toUiState(data));
        } catch (err) {
            console.error('Error fetching SC2 state:', err);
        }
    };

    const startPolling = (): void => {
        if (poller !== null) {
            return;
        }
        fetchState();
        poller = window.setInterval(fetchState, pollIntervalMs);
    };

    const startStreaming = (): void => {
        if (typeof EventSource === 'undefined') {
            startPolling();
            return;
        }

        source = new EventSource('/sc2/state/stream');

        source.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                handler(toUiState(data));
            } catch (err) {
                console.error('Error parsing SC2 state stream:', err);
            }
        };

        source.onerror = () => {
            if (stopped) {
                return;
            }
            source?.close();
            source = null;
            startPolling();
        };
    };

    startStreaming();

    return () => {
        stopped = true;
        if (source) {
            source.close();
            source = null;
        }
        if (poller !== null) {
            window.clearInterval(poller);
            poller = null;
        }
    };
}
