import { defaultThemeId, getThemeById, type ThemeId } from "./themeRegistry";

export type StreamCraftSettings = {
    themeId: ThemeId;
    autosaveEnabled: boolean;
    autosaveIntervalSeconds: number;
    showAutosaveOverlay: boolean;
    showStatusBar: boolean;
    showContextBar: boolean;
    rememberDockLayout: boolean;
    restoreWorkspaceOnStartup: boolean;
};

const SETTINGS_KEY = "streamcraft.settings";
const THEME_LINK_ID = "sc-theme-stylesheet";

export const defaultSettings: StreamCraftSettings = {
    themeId: defaultThemeId,
    autosaveEnabled: true,
    autosaveIntervalSeconds: 5,
    showAutosaveOverlay: true,
    showStatusBar: true,
    showContextBar: true,
    rememberDockLayout: true,
    restoreWorkspaceOnStartup: true
};

const isThemeId = (value: unknown): value is ThemeId => typeof value === "string" && Boolean(getThemeById(value));

export const loadSettings = (): StreamCraftSettings => {
    if (typeof window === "undefined") return { ...defaultSettings };
    try {
        const raw = window.localStorage.getItem(SETTINGS_KEY);
        if (!raw) return { ...defaultSettings };
        const parsed = JSON.parse(raw) as Partial<StreamCraftSettings>;
        return {
            ...defaultSettings,
            ...parsed,
            themeId: isThemeId(parsed.themeId) ? parsed.themeId : defaultThemeId
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
        themeId: isThemeId(partial.themeId) ? partial.themeId : current.themeId
    };
    if (typeof window !== "undefined") {
        window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    }
    return next;
};

const ensureThemeLink = (): HTMLLinkElement | null => {
    if (typeof document === "undefined") return null;
    let link = document.getElementById(THEME_LINK_ID) as HTMLLinkElement | null;
    if (!link) {
        link = document.createElement("link");
        link.id = THEME_LINK_ID;
        link.rel = "stylesheet";
        document.head.appendChild(link);
    }
    return link;
};

export const applyTheme = (themeId?: ThemeId) => {
    const theme = getThemeById(themeId ?? defaultThemeId);
    if (!theme) return;
    const link = ensureThemeLink();
    if (!link) return;
    if (link.href !== theme.url) {
        link.href = theme.url;
        link.dataset.themeId = theme.id;
    }
    document.documentElement.setAttribute("data-sc-theme", theme.id);
};

export const setTheme = (themeId: ThemeId): StreamCraftSettings => {
    const updated = saveSettings({ themeId });
    applyTheme(themeId);
    return updated;
};

export const ensureThemeApplied = () => {
    const settings = loadSettings();
    applyTheme(settings.themeId);
    saveSettings(settings);
    return settings;
};
