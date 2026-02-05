export type AiStatus = {
    configured: boolean;
    environment: string;
    model: string;
    message: string;
};

export type AiThemeTokens = {
    light: Record<string, string>;
    dark: Record<string, string>;
};

export type AiThemeResult = {
    name: string;
    description: string;
    tokens: AiThemeTokens;
    model: string;
};

export const fetchAiStatus = async (): Promise<AiStatus> => {
    const res = await fetch("/ai/status", { cache: "no-store" });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to fetch AI status.");
    }
    return (await res.json()) as AiStatus;
};

export const runAiPrompt = async (prompt: string): Promise<string> => {
    const res = await fetch("/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt })
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "AI prompt failed.");
    }
    const payload = (await res.json()) as { output?: string };
    return payload.output ?? "";
};

export const generateAiTheme = async (payload: {
    prompt: string;
    baseThemeId?: string;
    themeMode?: string;
}): Promise<AiThemeResult> => {
    const res = await fetch("/ai/themes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "AI theme generation failed.");
    }
    return (await res.json()) as AiThemeResult;
};
