import type { AiThemeResult } from "../views/designer/services/aiService";

export type ThemeMode = "light" | "dark" | "auto";

export type ThemeState = {
    themeSelection: number;
    themeModeSelection: ThemeMode;
    themeAiPrompt: string;
    themeAiResponse: string;
    themeAiBusy: boolean;
    themeAiStatus: string;
    themeAiThemeName: string;
    themeAiThemeDescription: string;
    themeAiResult: AiThemeResult | null;

    setThemeSelection: (index: number) => void;
    setThemeModeSelection: (mode: ThemeMode) => void;
    setThemeAiPrompt: (prompt: string) => void;
    setThemeAiResponse: (response: string) => void;
    setThemeAiBusy: (busy: boolean) => void;
    setThemeAiStatus: (status: string) => void;
    setThemeAiThemeName: (name: string) => void;
    setThemeAiThemeDescription: (description: string) => void;
    setThemeAiResult: (result: AiThemeResult | null) => void;

    applyThemeByIndex: (index: number) => void;
    handleAiThemeGenerate: () => Promise<void>;
    handleAiThemeApply: () => void;
    refreshAiStatus: () => void;
};
