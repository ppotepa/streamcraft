import type { DockPrefs, DOCK_STORAGE_KEY } from "../types/dock.types";

const STORAGE_KEY = "sc:designer:dockLayout:v1";

export const readDockPrefs = (): DockPrefs | null => {
    if (typeof window === "undefined") return null;
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as Partial<DockPrefs> | null;
        if (!parsed || parsed.version !== 1) return null;
        return {
            version: 1,
            isDockCollapsed: Boolean(parsed.isDockCollapsed),
            dockedWindows: Array.isArray(parsed.dockedWindows) ? parsed.dockedWindows.filter(Boolean) : [],
            showLayersToolbox: parsed.showLayersToolbox !== false,
            showOverlayVideoPreview: Boolean(parsed.showOverlayVideoPreview),
            showDataSourceExplorer: Boolean(parsed.showDataSourceExplorer),
            showTextStyleEditor: Boolean(parsed.showTextStyleEditor),
            showSchedulerOverview: Boolean(parsed.showSchedulerOverview)
        };
    } catch {
        return null;
    }
};

export const writeDockPrefs = (prefs: DockPrefs): void => {
    if (typeof window === "undefined") return;
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
        // Ignore storage errors
    }
};
