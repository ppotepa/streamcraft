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
const THEME_OVERRIDES_KEY = "streamcraft.theme.overrides";
const THEME_OVERRIDE_STYLE_ID = "sc-theme-overrides";

export type ThemeMode = "light" | "dark";

export type ThemeOverrides = {
    name?: string;
    description?: string;
    tokens?: {
        light?: Record<string, string>;
        dark?: Record<string, string>;
    };
    enabled?: boolean;
    updatedAt?: string;
};

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
    applyThemeOverrides(loadThemeOverrides());
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
    applyThemeOverrides(loadThemeOverrides());
    return settings;
};

const normalizeTokenKey = (raw: string): string => {
    const trimmed = raw.trim();
    if (!trimmed) return trimmed;
    if (trimmed.startsWith("--")) return trimmed;
    const withoutPrefix = trimmed.replace(/^-+/, "");
    const normalized = withoutPrefix.startsWith("sc-") ? withoutPrefix : `sc-${withoutPrefix}`;
    return `--${normalized}`;
};

const normalizeTokenMap = (input?: Record<string, string>): Record<string, string> => {
    const result: Record<string, string> = {};
    if (!input) return result;
    Object.entries(input).forEach(([key, value]) => {
        if (!value) return;
        const normalizedKey = normalizeTokenKey(key);
        if (!normalizedKey) return;
        result[normalizedKey] = String(value).trim();
    });
    return result;
};

const buildOverrideCss = (overrides: ThemeOverrides): string => {
    const lightTokens = normalizeTokenMap(overrides.tokens?.light);
    const darkTokens = normalizeTokenMap(overrides.tokens?.dark);
    const blocks: string[] = [];
    const toBlock = (mode: ThemeMode, tokens: Record<string, string>) => {
        const entries = Object.entries(tokens);
        if (entries.length === 0) return;
        const lines = entries.map(([key, value]) => `  ${key}: ${value};`).join("\n");
        blocks.push(`:root[data-sc-mode=\"${mode}\"] {\n${lines}\n}`);
    };
    toBlock("light", lightTokens);
    toBlock("dark", darkTokens);
    return blocks.join("\n\n");
};

export const loadThemeOverrides = (): ThemeOverrides | null => {
    if (typeof window === "undefined") return null;
    try {
        const raw = window.localStorage.getItem(THEME_OVERRIDES_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as ThemeOverrides;
        if (!parsed || typeof parsed !== "object") return null;
        return {
            ...parsed,
            tokens: {
                light: parsed.tokens?.light ?? {},
                dark: parsed.tokens?.dark ?? {}
            },
            enabled: parsed.enabled ?? true
        };
    } catch {
        return null;
    }
};

export const applyThemeOverrides = (overrides?: ThemeOverrides | null) => {
    if (typeof document === "undefined") return;
    const existing = document.getElementById(THEME_OVERRIDE_STYLE_ID) as HTMLStyleElement | null;
    if (!overrides || overrides.enabled === false) {
        if (existing) existing.remove();
        return;
    }
    const css = buildOverrideCss(overrides);
    if (!css) {
        if (existing) existing.remove();
        return;
    }
    const styleEl = existing ?? document.createElement("style");
    styleEl.id = THEME_OVERRIDE_STYLE_ID;
    styleEl.textContent = css;
    if (!existing) {
        document.head.appendChild(styleEl);
    }
};

export const setThemeOverrides = (overrides: ThemeOverrides | null) => {
    if (typeof window !== "undefined") {
        if (!overrides) {
            window.localStorage.removeItem(THEME_OVERRIDES_KEY);
        } else {
            const next: ThemeOverrides = {
                ...overrides,
                enabled: overrides.enabled ?? true,
                updatedAt: overrides.updatedAt ?? new Date().toISOString()
            };
            window.localStorage.setItem(THEME_OVERRIDES_KEY, JSON.stringify(next));
        }
    }
    applyThemeOverrides(overrides);
};

export const clearThemeOverrides = () => {
    setThemeOverrides(null);
};
