/**
 * Maps plugin state to UI ViewModel
 * This is the adapter layer between backend field names and UI expectations
 */
export function mapPluginStateToVM(pluginState) {
    if (!pluginState) {
        return {
            panel1: createEmptyPanel1VM(),
            panel2: createEmptyPanel2VM(),
            panel3: createEmptyPanel3VM(),
            panel4: createEmptyPanel4VM()
        };
    }

    return {
        panel1: {
            metricValue: pluginState.metric?.value ?? null,
            metricTimestampUtc: pluginState.metric?.timestampUtc ?? null,
            metricUnits: pluginState.metric?.units ?? null
        },
        panel2: {
            sessionContextTag: pluginState.session?.contextTag ?? null,
            sessionOpponentName: pluginState.session?.opponentName ?? null,
            sessionRankLabel: pluginState.session?.rankLabel ?? null,
            wins: pluginState.session?.wins ?? 0,
            games: pluginState.session?.games ?? 0,
            losses: pluginState.session?.losses ?? 0,
            recentItems: pluginState.session?.recentItems ?? [],
            altSlots: pluginState.session?.altSlots ?? {}
        },
        panel3: {
            summaryLine1: pluginState.entity?.summaryLine1 ?? ['--', '--', '--'],
            summaryLine2: pluginState.entity?.summaryLine2 ?? ['--', '--', '--'],
            summaryLine3: pluginState.entity?.summaryLine3 ?? ['--', '--', '--'],
            recentItems: pluginState.entity?.recentItems ?? []
        },
        panel4: {
            title: pluginState.panel4?.title ?? 'RESERVED',
            lines: pluginState.panel4?.lines ?? [],
            badge: pluginState.panel4?.badge ?? null
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
