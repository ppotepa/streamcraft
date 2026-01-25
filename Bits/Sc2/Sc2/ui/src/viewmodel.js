/**
 * Maps plugin state to UI ViewModel
 * This is the adapter layer between backend field names and UI expectations
 */
export function mapPluginStateToVM(pluginState) {
    if (!pluginState || !pluginState.panels) {
        return {
            panel1: createEmptyPanel1VM(),
            panel2: createEmptyPanel2VM(),
            panel3: createEmptyPanel3VM(),
            panel4: createEmptyPanel4VM()
        };
    }

    const panels = pluginState.panels;

    return {
        panel1: {
            metricValue: panels.metric?.value ?? null,
            metricTimestampUtc: panels.metric?.timestampUtc ?? null,
            metricUnits: panels.metric?.units ?? null
        },
        panel2: {
            sessionContextTag: panels.session?.contextTag ?? null,
            sessionOpponentName: panels.session?.opponentName ?? null,
            sessionRankLabel: panels.session?.rankLabel ?? null,
            wins: panels.session?.wins ?? 0,
            games: panels.session?.games ?? 0,
            losses: panels.session?.losses ?? 0,
            recentItems: panels.session?.recentItems ?? [],
            altSlots: panels.session?.altSlots ?? {}
        },
        panel3: {
            // New 4-row layout
            row1: panels.opponent?.row1 ?? ['--', '--', '--', '--'],
            row2: panels.opponent?.row2 ?? ['--', '--', '--'],
            row3: panels.opponent?.row3 ?? ['--', '--', '--'],
            row4: panels.opponent?.row4 ?? ['--', '--', '--'],

            // Enhanced match history
            matchHistory: panels.opponent?.matchHistory ?? [],

            // Legacy format for backward compatibility
            summaryLine1: panels.opponent?.summaryLine1 ?? ['--', '--', '--'],
            summaryLine2: panels.opponent?.summaryLine2 ?? ['--', '--', '--'],
            summaryLine3: panels.opponent?.summaryLine3 ?? ['--', '--', '--'],
            recentItems: panels.opponent?.recentItems ?? []
        },
        panel4: {
            title: panels.map?.title ?? 'RESERVED',
            lines: panels.map?.lines ?? [],
            badge: panels.map?.badge ?? null
        }
    };
}

function createEmptyPanel1VM() {
    return {
        metricValue: null,
        metricTimestampUtc: null,
        metricUnits: null
    };
}

function createEmptyPanel2VM() {
    return {
        sessionContextTag: null,
        sessionOpponentName: null,
        sessionRankLabel: null,
        wins: 0,
        games: 0,
        losses: 0,
        recentItems: [],
        altSlots: {}
    };
}

function createEmptyPanel3VM() {
    return {
        // New 4-row layout
        row1: ['--', '--', '--', '--'],
        row2: ['--', '--', '--'],
        row3: ['--', '--', '--'],
        row4: ['--', '--', '--'],

        // Enhanced match history
        matchHistory: [],

        // Legacy format
        summaryLine1: ['--', '--', '--'],
        summaryLine2: ['--', '--', '--'],
        summaryLine3: ['--', '--', '--'],
        recentItems: []
    };
}

function createEmptyPanel4VM() {
    return {
        title: 'RESERVED',
        lines: [],
        badge: null
    };
}
