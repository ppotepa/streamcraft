import { useState, useCallback } from "react";
import type { ThemeState, ThemeMode } from "../types/theme.types";
import { themes } from "../../themeRegistry";
import {
    loadSettings,
    loadThemeOverrides,
    setTheme,
    setThemeMode,
    setThemeOverrides,
    clearThemeOverrides
} from "../../themeService";
import { fetchAiStatus, generateAiTheme, type AiThemeResult } from "../views/designer/services/aiService";

export const useThemeManagement = (): ThemeState => {
    const [themeSelection, setThemeSelection] = useState(() => {
        const settings = loadSettings();
        const index = themes.findIndex((theme) => theme.id === settings.themeId);
        return index >= 0 ? index : 0;
    });
    const [themeModeSelection, setThemeModeSelection] = useState<ThemeMode>(() => loadSettings().themeMode);
    const [themeAiPrompt, setThemeAiPrompt] = useState("");
    const [themeAiResponse, setThemeAiResponse] = useState("AI theme output will appear here.");
    const [themeAiBusy, setThemeAiBusy] = useState(false);
    const [themeAiStatus, setThemeAiStatus] = useState(() =>
        loadThemeOverrides()?.name ? "AI theme loaded from storage." : "AI status: not checked."
    );
    const [themeAiThemeName, setThemeAiThemeName] = useState(() => loadThemeOverrides()?.name ?? "None");
    const [themeAiThemeDescription, setThemeAiThemeDescription] = useState(() => loadThemeOverrides()?.description ?? "");
    const [themeAiResult, setThemeAiResult] = useState<AiThemeResult | null>(null);

    const applyThemeByIndex = useCallback((index: number) => {
        const theme = themes[index];
        if (!theme) return;
        setTheme(theme.id, themeModeSelection);
        setThemeSelection(index);
    }, [themeModeSelection]);

    const applyThemeModeByIndex = useCallback((index: number) => {
        const mode: ThemeMode = index === 1 ? "dark" : "light";
        setThemeModeSelection(mode);
        setThemeMode(mode);
    }, []);

    const refreshAiStatus = useCallback(async () => {
        try {
            const status = await fetchAiStatus();
            const detail = status.configured
                ? `${status.message} (${status.model}, ${status.environment})`
                : `${status.message} (${status.environment})`;
            setThemeAiStatus(detail);
        } catch (err) {
            setThemeAiStatus(`AI status unavailable: ${String(err)}`);
        }
    }, []);

    const applyAiThemeResult = useCallback((result: AiThemeResult) => {
        setThemeOverrides({
            name: result.name,
            description: result.description,
            tokens: result.tokens,
            enabled: true
        });
        setThemeAiThemeName(result.name);
        setThemeAiThemeDescription(result.description);
    }, []);

    const handleAiThemeGenerate = useCallback(async () => {
        if (themeAiBusy) return;
        const trimmed = themeAiPrompt.trim();
        if (!trimmed) {
            setThemeAiResponse("Describe the theme you want first.");
            return;
        }
        setThemeAiBusy(true);
        setThemeAiResponse("Generating AI theme...");
        try {
            const baseThemeId = themes[themeSelection]?.id;
            const result = await generateAiTheme({
                prompt: trimmed,
                baseThemeId,
                themeMode: themeModeSelection
            });
            setThemeAiResult(result);
            applyAiThemeResult(result);
            setThemeAiResponse(`Generated "${result.name}". ${result.description}`);
            setThemeAiStatus(`Applied AI theme "${result.name}".`);
        } catch (err) {
            setThemeAiResponse(`AI theme failed: ${String(err)}`);
            setThemeAiStatus("AI theme generation failed.");
        } finally {
            setThemeAiBusy(false);
        }
    }, [applyAiThemeResult, themeAiBusy, themeAiPrompt, themeModeSelection, themeSelection]);

    const handleAiThemeApply = useCallback(() => {
        if (themeAiResult) {
            applyAiThemeResult(themeAiResult);
            setThemeAiStatus(`Applied AI theme "${themeAiResult.name}".`);
            return;
        }
        const stored = loadThemeOverrides();
        if (stored) {
            setThemeOverrides(stored);
            setThemeAiThemeName(stored.name ?? "Custom AI Theme");
            setThemeAiThemeDescription(stored.description ?? "");
            setThemeAiStatus("Applied stored AI theme.");
        } else {
            setThemeAiResponse("No AI theme available to apply.");
        }
    }, [applyAiThemeResult, themeAiResult]);

    return {
        themeSelection,
        themeModeSelection,
        themeAiPrompt,
        themeAiResponse,
        themeAiBusy,
        themeAiStatus,
        themeAiThemeName,
        themeAiThemeDescription,
        themeAiResult,

        setThemeSelection,
        setThemeModeSelection,
        setThemeAiPrompt,
        setThemeAiResponse,
        setThemeAiBusy,
        setThemeAiStatus,
        setThemeAiThemeName,
        setThemeAiThemeDescription,
        setThemeAiResult,

        applyThemeByIndex,
        handleAiThemeGenerate,
        handleAiThemeApply,
        refreshAiStatus
    };
};
