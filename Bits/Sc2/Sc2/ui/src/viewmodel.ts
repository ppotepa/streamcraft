import type { Sc2BitState, PanelViewModel } from '../types';

/**
 * Maps the raw plugin state from the backend to a structured view model
 * Backend uses panel IDs (session, opponent, metric, map) derived from class names
 */
export function mapPluginStateToVM(pluginState: Sc2BitState | null): PanelViewModel | null {
    if (!pluginState?.panels) return null;

    const panels = pluginState.panels as any;

    return {
        vitalsPanel: panels.metric,
        sessionPanel: panels.session,
        opponentPanel: panels.opponent,
        variousPanel: panels.map
    };
}
