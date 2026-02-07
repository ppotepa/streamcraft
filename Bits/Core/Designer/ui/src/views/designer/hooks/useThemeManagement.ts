/**
 * Hook for managing theme state and operations
 */

import { useState, useCallback } from "react";
import type { ThemeMode } from "../types/theme.types";
import type { AiThemeResult } from "../services/aiService";
import { themes } from "../../../themeRegistry";
import {
    loadSettings,
    loadThemeOverrides,
    setTheme,
    setThemeMode,
    setThemeOverrides,
    clearThemeOverrides
} from "../../../themeService";
import { fetchAiStatus, generateAiTheme } from "../services/aiService";

export const useThemeManagement = () => {
    const [themeSelection, setThemeSelection] = useState(() => {
        const settings = loadSettings();
        const index = themes.findIndex((theme) => theme.id === settings.themeId);
        return index >= 0 ? index : 0;
    });

    const [themeModeSelection, setThemeModeSelection] = useState<ThemeMode>(() => loadSettings().themeMode);
    const [showThemeViewer, setShowThemeViewer] = useState(false);
    const [themeAiPrompt, setThemeAiPrompt] = useState("");
    const [themeAiResponse, setThemeAiResponse] = useState("AI theme output will appear here.");
    const [themeAiBusy, setThemeAiBusy] = useState(false);
    const [themeAiStatus, setThemeAiStatus] = useState(() =>
        loadThemeOverrides()?.name ? "AI theme loaded from storage." : "AI status: not checked."
    );
    const [themeAiThemeName, setThemeAiThemeName] = useState(() => loadThemeOverrides()?.name ?? "None");
    const [themeAiThemeDescription, setThemeAiThemeDescription] = useState(
        () => loadThemeOverrides()?.description ?? ""
    );
    const [themeAiResult, setThemeAiResult] = useState<AiThemeResult | null>(null);

    const applyThemeByIndex = useCallback(
        (index: number) => {
            const theme = themes[index];
            if (theme) {
                setTheme(theme.id, themeModeSelection);
            }
        },
        [themeModeSelection]
    );

    const applyThemeModeByIndex = useCallback((index: number) => {
        const mode = index === 0 ? "light" : "dark";
        setThemeMode(mode);
    }, []);

    const refreshAiStatus = useCallback(async () => {
        try {
            const result = await fetchAiStatus();
            setThemeAiStatus(result.message);
            setThemeAiThemeName(result.themeName);
            setThemeAiThemeDescription(result.description);
        } catch {
            setThemeAiStatus("Failed to fetch AI theme status.");
        }
    }, []);

    const applyAiThemeResult = useCallback((result: AiThemeResult) => {
        setThemeOverrides({
            name: result.name,
            description: result.description,
            overrides: result.theme
        });
        setThemeAiResult(result);
        setThemeAiStatus("AI theme applied successfully.");
        setThemeAiThemeName(result.name);
        setThemeAiThemeDescription(result.description);
    }, []);

    const handleAiThemeGenerate = useCallback(async () => {
        if (themeAiBusy) return;
        if (!themeAiPrompt.trim()) return;

        setThemeAiBusy(true);
        setThemeAiResponse("Generating theme...");
        try {
            const result = await generateAiTheme(themeAiPrompt, themeModeSelection, themeSelection);
            setThemeAiResponse(JSON.stringify(result.theme, null, 2));
            setThemeAiResult(result);
            setThemeAiStatus("Theme generated successfully. Click 'Apply' to use.");
        } catch (err) {
            const message = err instanceof Error ? err.message : "Unknown error";
            setThemeAiResponse(`Error: ${message}`);
            setThemeAiStatus(`Generation failed: ${message}`);
        } finally {
            setThemeAiBusy(false);
        }
    }, [themeAiBusy, themeAiPrompt, themeModeSelection, themeSelection]);

    const handleAiThemeApply = useCallback(() => {
        if (!themeAiResult) {
            setThemeAiStatus("No AI theme to apply. Generate one first.");
            return;
        }
        applyAiThemeResult(themeAiResult);
        setThemeAiStatus("AI theme applied and saved.");
    }, [applyAiThemeResult, themeAiResult]);

    const handleAiThemeClear = useCallback(() => {
        clearThemeOverrides();
        setThemeAiStatus("AI theme overrides cleared.");
        setThemeAiThemeName("None");
        setThemeAiThemeDescription("");
        setThemeAiResult(null);
    }, []);

    return {
        // State
        themeSelection,
        themeModeSelection,
        showThemeViewer,
        themeAiPrompt,
        themeAiResponse,
        themeAiBusy,
        themeAiStatus,
        themeAiThemeName,
        themeAiThemeDescription,
        themeAiResult,

        // Setters
        setThemeSelection,
        setThemeModeSelection,
        setShowThemeViewer,
        setThemeAiPrompt,

        // Operations
        applyThemeByIndex,
        applyThemeModeByIndex,
        refreshAiStatus,
        applyAiThemeResult,
        handleAiThemeGenerate,
        handleAiThemeApply,
        handleAiThemeClear
    };
};
