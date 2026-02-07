/**
 * Theme-related type definitions
 */

import type { ThemeMode } from "../../../themeService";

export type ThemeState = {
    selection: number;
    modeSelection: ThemeMode;
    aiPrompt: string;
    aiResponse: string;
    aiBusy: boolean;
    aiStatus: string;
    aiThemeName: string;
    aiThemeDescription: string;
};

export type { ThemeMode };
