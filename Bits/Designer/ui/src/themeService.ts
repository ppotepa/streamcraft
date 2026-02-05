import { defaultThemeId, getThemeById, type ThemeId } from "./themeRegistry";

export type StreamCraftSettings = {
    themeId: ThemeId;
    themeMode: ThemeMode;
    autosaveEnabled: boolean;
    autosaveIntervalSeconds: number;
    showAutosaveOverlay: boolean;
    showStatusBar: boolean;
    showContextBar: boolean;
    rememberDockLayout: boolean;
    restoreWorkspaceOnStartup: boolean;
};

const SETTINGS_KEY = "streamcraft.settings";

export type ThemeMode = "light" | "dark";

export const defaultSettings: StreamCraftSettings = {
    themeId: defaultThemeId,
    themeMode: "light",
    autosaveEnabled: true,
    autosaveIntervalSeconds: 5,
    showAutosaveOverlay: true,
    showStatusBar: true,
    showContextBar: true,
    rememberDockLayout: true,
    restoreWorkspaceOnStartup: true
};

const isThemeId = (value: unknown): value is ThemeId => typeof value === "string" && Boolean(getThemeById(value));
const isThemeMode = (value: unknown): value is ThemeMode => value === "light" || value === "dark";

export const loadSettings = (): StreamCraftSettings => {
    if (typeof window === "undefined") return { ...defaultSettings };
    try {
        const raw = window.localStorage.getItem(SETTINGS_KEY);
        if (!raw) return { ...defaultSettings };
        const parsed = JSON.parse(raw) as Partial<StreamCraftSettings>;
        return {
            ...defaultSettings,
            ...parsed,
            themeId: isThemeId(parsed.themeId) ? parsed.themeId : defaultThemeId,
            themeMode: isThemeMode(parsed.themeMode) ? parsed.themeMode : defaultSettings.themeMode
        };
    } catch {
        return { ...defaultSettings };
    }
};

export const saveSettings = (partial: Partial<StreamCraftSettings>): StreamCraftSettings => {
    const current = loadSettings();
    const next: StreamCraftSettings = {
        ...current,
        ...partial,
        themeId: isThemeId(partial.themeId) ? partial.themeId : current.themeId,
        themeMode: isThemeMode(partial.themeMode) ? partial.themeMode : current.themeMode
    };
    if (typeof window !== "undefined") {
        window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    }
    return next;
};

export const applyTheme = (themeId?: ThemeId, themeMode?: ThemeMode) => {
    const theme = getThemeById(themeId ?? defaultThemeId);
    if (!theme) return;
    if (typeof document === "undefined") return;
    const mode = isThemeMode(themeMode) ? themeMode : defaultSettings.themeMode;
    document.documentElement.setAttribute("data-sc-theme", theme.id);
    document.documentElement.setAttribute("data-sc-mode", mode);
};

export const setTheme = (themeId: ThemeId, themeMode?: ThemeMode): StreamCraftSettings => {
    const updated = saveSettings({ themeId, themeMode });
    applyTheme(updated.themeId, updated.themeMode);
    return updated;
};

export const setThemeMode = (themeMode: ThemeMode): StreamCraftSettings => {
    const updated = saveSettings({ themeMode });
    applyTheme(updated.themeId, updated.themeMode);
    return updated;
};

export const ensureThemeApplied = () => {
    const settings = loadSettings();
    applyTheme(settings.themeId, settings.themeMode);
    saveSettings(settings);
    return settings;
};
