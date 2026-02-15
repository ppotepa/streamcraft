import type { CanvasItem } from "../domain/types";

export type ChatSettingsTabId = "dataSource" | "style";

export type ChatStylePresetId = "classic" | "compact" | "streamer" | "minimal" | "glass" | "terminal" | "neon" | "alert";

export type ChatStyleTokens = {
    containerColor: string;
    borderColor: string;
    bubbleColor: string;
    textColor: string;
    usernameColor: string;
    timestampColor: string;
    badgeBgColor: string;
    badgeTextColor: string;
    fontSize: number;
    bubbleRadius: number;
    bubblePadding: number;
    rowGap: number;
};

export type ChatSettingsDraft = {
    sourceId: string;
    lineCount: number;
    showUsername: boolean;
    showTimestamp: boolean;
    showBadges: boolean;
    showAvatars: boolean;
    showRoleColors: boolean;
    presetId: ChatStylePresetId;
    backgroundMode: "solid" | "transparent";
    containerOpacity: number;
    bubbleOpacity: number;
    borderIntensity: number;
    shadowIntensity: number;
    blurAmount: number;
    messageFlow: "bottom" | "top";
    messageAlign: "left" | "center" | "right";
    widthMode: "full" | "compact";
    customCssEnabled: boolean;
    customCss: string;
} & ChatStyleTokens;

export type ChatStylePreset = {
    label: string;
    description: string;
    tokens: ChatStyleTokens;
    settings?: Partial<Pick<ChatSettingsDraft, "backgroundMode" | "containerOpacity" | "bubbleOpacity" | "borderIntensity" | "shadowIntensity" | "blurAmount" | "messageFlow" | "messageAlign" | "widthMode">>;
};

export type ChatSourceStatusTone = "connected" | "no-data" | "error";

export const CHAT_STYLE_PRESETS: Record<ChatStylePresetId, ChatStylePreset> = {
    classic: {
        label: "Classic",
        description: "Balanced default for most streams.",
        tokens: {
            containerColor: "#101318",
            borderColor: "#3d4652",
            bubbleColor: "#1b212b",
            textColor: "#f2f4f8",
            usernameColor: "#8ec8ff",
            timestampColor: "#a9b2c0",
            badgeBgColor: "#ffd95a",
            badgeTextColor: "#2a2a2a",
            fontSize: 14,
            bubbleRadius: 7,
            bubblePadding: 8,
            rowGap: 6
        }
    },
    compact: {
        label: "Compact",
        description: "Dense and minimal spacing for busy chats.",
        tokens: {
            containerColor: "#111315",
            borderColor: "#43464d",
            bubbleColor: "#171a1f",
            textColor: "#e6e8ed",
            usernameColor: "#a6c8ff",
            timestampColor: "#9ba3af",
            badgeBgColor: "#c4e470",
            badgeTextColor: "#1d2610",
            fontSize: 12,
            bubbleRadius: 4,
            bubblePadding: 6,
            rowGap: 4
        }
    },
    streamer: {
        label: "Streamer",
        description: "Colorful streamer look with rounded bubbles.",
        tokens: {
            containerColor: "#1b1224",
            borderColor: "#8255a7",
            bubbleColor: "#2a1b38",
            textColor: "#f7efff",
            usernameColor: "#ffb7ff",
            timestampColor: "#d7bfdc",
            badgeBgColor: "#ff7dc8",
            badgeTextColor: "#2b1230",
            fontSize: 15,
            bubbleRadius: 9,
            bubblePadding: 9,
            rowGap: 7
        }
    },
    minimal: {
        label: "Minimal",
        description: "Low-noise monochrome style.",
        tokens: {
            containerColor: "#0d0d0d",
            borderColor: "#2b2b2b",
            bubbleColor: "#131313",
            textColor: "#f2f2f2",
            usernameColor: "#ffffff",
            timestampColor: "#9a9a9a",
            badgeBgColor: "#dcdcdc",
            badgeTextColor: "#212121",
            fontSize: 13,
            bubbleRadius: 3,
            bubblePadding: 7,
            rowGap: 5
        }
    },
    glass: {
        label: "Glass",
        description: "Transparent frosted glass overlay.",
        tokens: {
            containerColor: "#0d1524",
            borderColor: "#5c82b0",
            bubbleColor: "#1a2f4d",
            textColor: "#e9f4ff",
            usernameColor: "#8de7ff",
            timestampColor: "#b8cbdf",
            badgeBgColor: "#7df0c6",
            badgeTextColor: "#113023",
            fontSize: 14,
            bubbleRadius: 11,
            bubblePadding: 8,
            rowGap: 6
        },
        settings: {
            backgroundMode: "transparent",
            containerOpacity: 62,
            bubbleOpacity: 68,
            borderIntensity: 55,
            shadowIntensity: 25,
            blurAmount: 8
        }
    },
    terminal: {
        label: "Terminal",
        description: "Hacker terminal vibe with green text.",
        tokens: {
            containerColor: "#050906",
            borderColor: "#1f5f2a",
            bubbleColor: "#08130c",
            textColor: "#8fffa1",
            usernameColor: "#c6ff5d",
            timestampColor: "#5bcf74",
            badgeBgColor: "#17391f",
            badgeTextColor: "#b5ff92",
            fontSize: 13,
            bubbleRadius: 2,
            bubblePadding: 6,
            rowGap: 4
        },
        settings: {
            backgroundMode: "solid",
            containerOpacity: 100,
            bubbleOpacity: 100,
            borderIntensity: 80,
            shadowIntensity: 0,
            blurAmount: 0,
            messageAlign: "left"
        }
    },
    neon: {
        label: "Neon",
        description: "High-contrast cyber neon style.",
        tokens: {
            containerColor: "#110622",
            borderColor: "#35d6ff",
            bubbleColor: "#1e0f39",
            textColor: "#f7f5ff",
            usernameColor: "#35d6ff",
            timestampColor: "#9b7dff",
            badgeBgColor: "#ff4db8",
            badgeTextColor: "#19062c",
            fontSize: 15,
            bubbleRadius: 12,
            bubblePadding: 10,
            rowGap: 8
        },
        settings: {
            backgroundMode: "transparent",
            containerOpacity: 70,
            bubbleOpacity: 85,
            borderIntensity: 100,
            shadowIntensity: 60,
            blurAmount: 5,
            messageAlign: "left",
            widthMode: "compact"
        }
    },
    alert: {
        label: "Alert",
        description: "Attention style for event-heavy moments.",
        tokens: {
            containerColor: "#2a0909",
            borderColor: "#ff5a5a",
            bubbleColor: "#3b1010",
            textColor: "#fff0f0",
            usernameColor: "#ffd166",
            timestampColor: "#ff9b9b",
            badgeBgColor: "#ff5a5a",
            badgeTextColor: "#2b0909",
            fontSize: 15,
            bubbleRadius: 6,
            bubblePadding: 9,
            rowGap: 7
        },
        settings: {
            backgroundMode: "solid",
            containerOpacity: 100,
            bubbleOpacity: 100,
            borderIntensity: 95,
            shadowIntensity: 45,
            blurAmount: 0,
            messageAlign: "left",
            widthMode: "full"
        }
    }
};

export const CHAT_PRESET_IDS = Object.keys(CHAT_STYLE_PRESETS) as ChatStylePresetId[];

export const CHAT_CSS_SNIPPETS = [
    {
        id: "left-accent",
        label: "Left Accent",
        css: `.msg { border-left: 3px solid #ff4d88; }\n.username { letter-spacing: 0.3px; }`
    },
    {
        id: "soft-glass",
        label: "Soft Glass",
        css: `.container { backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); }\n.msg { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.22); }\n.text { text-shadow: 0 1px 0 rgba(0,0,0,0.35); }`
    },
    {
        id: "compact-clean",
        label: "Compact Clean",
        css: `.meta { margin-bottom: 2px; gap: 4px; font-size: 10px; }\n.msg { padding: 5px 7px; border-radius: 4px; }\n.text { line-height: 1.22; }`
    },
    {
        id: "neon-outline",
        label: "Neon Outline",
        css: `.msg { border-color: #35d6ff; box-shadow: inset 0 0 0 1px rgba(53,214,255,0.35), 0 0 6px rgba(53,214,255,0.25); }\n.username { text-shadow: 0 0 6px rgba(53,214,255,0.45); }`
    }
] as const;

export const clampNumber = (value: number, min: number, max: number, fallback: number) => {
    if (!Number.isFinite(value)) return fallback;
    return Math.min(max, Math.max(min, value));
};

export const normalizeHexColor = (value: unknown, fallback: string) => {
    if (typeof value !== "string") return fallback;
    const trimmed = value.trim();
    const short = /^#([0-9a-f]{3})$/i.exec(trimmed);
    if (short) {
        const [r, g, b] = short[1].split("");
        return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
    }
    const full = /^#([0-9a-f]{6})$/i.exec(trimmed);
    if (full) {
        return `#${full[1].toLowerCase()}`;
    }
    const rgb = /^rgba?\(([^)]+)\)$/i.exec(trimmed);
    if (rgb) {
        const parts = rgb[1].split(",").map((part) => Number.parseFloat(part.trim()));
        if (parts.length >= 3) {
            const r = clampNumber(parts[0], 0, 255, 0);
            const g = clampNumber(parts[1], 0, 255, 0);
            const b = clampNumber(parts[2], 0, 255, 0);
            const hex = (component: number) => Math.round(component).toString(16).padStart(2, "0");
            return `#${hex(r)}${hex(g)}${hex(b)}`;
        }
    }
    return fallback;
};

export const colorToRgba = (color: string, alpha: number, fallback = "rgba(0,0,0,1)") => {
    const normalized = normalizeHexColor(color, "");
    if (normalized.startsWith("#") && normalized.length === 7) {
        const r = Number.parseInt(normalized.slice(1, 3), 16);
        const g = Number.parseInt(normalized.slice(3, 5), 16);
        const b = Number.parseInt(normalized.slice(5, 7), 16);
        return `rgba(${r},${g},${b},${clampNumber(alpha, 0, 1, 1).toFixed(3)})`;
    }
    return fallback;
};

export const computeContrastTone = (foreground: string, background: string): "Low" | "OK" => {
    const toLuma = (hex: string) => {
        const normalized = normalizeHexColor(hex, "#000000");
        const channels = [
            Number.parseInt(normalized.slice(1, 3), 16),
            Number.parseInt(normalized.slice(3, 5), 16),
            Number.parseInt(normalized.slice(5, 7), 16)
        ].map((value) => {
            const s = value / 255;
            return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
    };

    const fg = toLuma(foreground);
    const bg = toLuma(background);
    const ratio = (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05);
    return ratio >= 4.5 ? "OK" : "Low";
};

export const withPresetTokens = (draft: ChatSettingsDraft, presetId: ChatStylePresetId): ChatSettingsDraft => {
    const preset = CHAT_STYLE_PRESETS[presetId] ?? CHAT_STYLE_PRESETS.classic;
    return {
        ...draft,
        presetId,
        ...preset.tokens,
        ...(preset.settings ?? {})
    };
};

export const createChatDraft = (item: CanvasItem): ChatSettingsDraft => {
    const presetId = (item.chatPresetId as ChatStylePresetId | undefined) ?? "classic";
    const preset = CHAT_STYLE_PRESETS[presetId] ?? CHAT_STYLE_PRESETS.classic;
    return {
        sourceId: item.sourceId ?? "system-chat",
        lineCount: clampNumber(item.chatLines ?? 4, 1, 10, 4),
        showUsername: item.chatShowUsername !== false,
        showTimestamp: item.chatShowTimestamp === true,
        showBadges: item.chatShowBadges === true,
        showAvatars: item.chatShowAvatars === true,
        showRoleColors: item.chatRoleColors !== false,
        presetId,
        backgroundMode: item.chatBackgroundMode ?? "solid",
        containerOpacity: clampNumber(item.chatContainerOpacity ?? 100, 0, 100, 100),
        bubbleOpacity: clampNumber(item.chatBubbleOpacity ?? 100, 0, 100, 100),
        borderIntensity: clampNumber(item.chatBorderIntensity ?? 70, 0, 100, 70),
        shadowIntensity: clampNumber(item.chatShadowIntensity ?? 35, 0, 100, 35),
        blurAmount: clampNumber(item.chatBlurPx ?? 0, 0, 20, 0),
        messageFlow: item.chatMessageFlow ?? "bottom",
        messageAlign: item.chatMessageAlign ?? "left",
        widthMode: item.chatWidthMode ?? "full",
        customCssEnabled: item.chatCustomCssEnabled === true,
        customCss: typeof item.chatCustomCss === "string" ? item.chatCustomCss : "",
        containerColor: normalizeHexColor(item.chatContainerColor ?? item.fill, preset.tokens.containerColor),
        borderColor: normalizeHexColor(item.chatBorderColor ?? item.stroke, preset.tokens.borderColor),
        bubbleColor: normalizeHexColor(item.chatBubbleColor, preset.tokens.bubbleColor),
        textColor: normalizeHexColor(item.chatTextColor ?? item.textColor, preset.tokens.textColor),
        usernameColor: normalizeHexColor(item.chatUsernameColor, preset.tokens.usernameColor),
        timestampColor: normalizeHexColor(item.chatTimestampColor, preset.tokens.timestampColor),
        badgeBgColor: normalizeHexColor(item.chatBadgeBgColor, preset.tokens.badgeBgColor),
        badgeTextColor: normalizeHexColor(item.chatBadgeTextColor, preset.tokens.badgeTextColor),
        fontSize: clampNumber(item.chatFontSize ?? item.fontSize ?? preset.tokens.fontSize, 11, 22, preset.tokens.fontSize),
        bubbleRadius: clampNumber(item.chatBubbleRadius ?? preset.tokens.bubbleRadius, 0, 16, preset.tokens.bubbleRadius),
        bubblePadding: clampNumber(item.chatBubblePadding ?? preset.tokens.bubblePadding, 4, 16, preset.tokens.bubblePadding),
        rowGap: clampNumber(item.chatRowGap ?? preset.tokens.rowGap, 2, 14, preset.tokens.rowGap)
    };
};

export const serializeChatDraft = (draft: ChatSettingsDraft | null) => {
    if (!draft) return "";
    return JSON.stringify(draft);
};

const getDraftTokenSnapshot = (draft: ChatSettingsDraft | null) => {
    if (!draft) return "";
    return JSON.stringify({
        containerColor: draft.containerColor,
        borderColor: draft.borderColor,
        bubbleColor: draft.bubbleColor,
        textColor: draft.textColor,
        usernameColor: draft.usernameColor,
        timestampColor: draft.timestampColor,
        badgeBgColor: draft.badgeBgColor,
        badgeTextColor: draft.badgeTextColor,
        fontSize: draft.fontSize,
        bubbleRadius: draft.bubbleRadius,
        bubblePadding: draft.bubblePadding,
        rowGap: draft.rowGap
    });
};

export const isDraftPresetModified = (draft: ChatSettingsDraft | null) => {
    if (!draft) return false;
    const preset = CHAT_STYLE_PRESETS[draft.presetId] ?? CHAT_STYLE_PRESETS.classic;
    return getDraftTokenSnapshot({ ...draft, ...preset.tokens }) !== getDraftTokenSnapshot(draft);
};

export const formatTimestampLabel = (value: number | null) => {
    if (!value || !Number.isFinite(value)) return "--:--:--";
    return new Date(value).toLocaleTimeString();
};

const mapChatCssTags = (selector: string) =>
    selector
        .replace(/\.container\b/g, ".canvas-item-chat")
        .replace(/\.line\b/g, ".canvas-item-chat-line")
        .replace(/\.msg\b/g, ".canvas-item-chat-content")
        .replace(/\.meta\b/g, ".canvas-item-chat-meta")
        .replace(/\.username\b/g, ".canvas-item-chat-username")
        .replace(/\.timestamp\b/g, ".canvas-item-chat-timestamp")
        .replace(/\.badge\b/g, ".canvas-item-chat-badge")
        .replace(/\.text\b/g, ".canvas-item-chat-text");

export const scopeChatCss = (rawCss: string, scopeSelector: string) => {
    const css = rawCss.trim();
    if (!css) return "";
    if (/@import\b/i.test(css)) return "";

    const blockRegex = /([^{}]+)\{([^{}]*)\}/g;
    const scopedBlocks: string[] = [];
    let match = blockRegex.exec(css);
    while (match) {
        const selectorPart = match[1]?.trim() ?? "";
        const bodyPart = match[2] ?? "";
        if (selectorPart.length > 0 && bodyPart.trim().length > 0) {
            const selectors = selectorPart
                .split(",")
                .map((selector) => mapChatCssTags(selector.trim()))
                .filter((selector) => selector.length > 0)
                .map((selector) => selector.startsWith(scopeSelector) ? selector : `${scopeSelector} ${selector}`);
            if (selectors.length > 0) {
                scopedBlocks.push(`${selectors.join(", ")} { ${bodyPart.trim()} }`);
            }
        }
        match = blockRegex.exec(css);
    }
    return scopedBlocks.join("\n");
};

export const validateCustomChatCss = (rawCss: string) => {
    const css = rawCss.trim();
    if (!css) return { ok: true as const, error: "" };
    if (/@import\b/i.test(css)) return { ok: false as const, error: "@import is not allowed." };
    const open = (css.match(/\{/g) ?? []).length;
    const close = (css.match(/\}/g) ?? []).length;
    if (open !== close) return { ok: false as const, error: "Mismatched braces in CSS." };
    return { ok: true as const, error: "" };
};

export const buildChatPatchFromDraft = (draft: ChatSettingsDraft) => {
    const sourceId = draft.sourceId || "system-chat";
    return {
        sourceId,
        endpointPath: undefined,
        fieldPath: "response.messages",
        chatLines: clampNumber(draft.lineCount, 1, 10, 4),
        chatShowUsername: draft.showUsername,
        chatShowTimestamp: draft.showTimestamp,
        chatShowBadges: draft.showBadges,
        chatShowAvatars: draft.showAvatars,
        chatRoleColors: draft.showRoleColors,
        chatPresetId: draft.presetId,
        chatBackgroundMode: draft.backgroundMode,
        chatContainerOpacity: clampNumber(draft.containerOpacity, 0, 100, 100),
        chatBubbleOpacity: clampNumber(draft.bubbleOpacity, 0, 100, 100),
        chatBorderIntensity: clampNumber(draft.borderIntensity, 0, 100, 70),
        chatShadowIntensity: clampNumber(draft.shadowIntensity, 0, 100, 35),
        chatBlurPx: clampNumber(draft.blurAmount, 0, 20, 0),
        chatMessageFlow: draft.messageFlow,
        chatMessageAlign: draft.messageAlign,
        chatWidthMode: draft.widthMode,
        chatContainerColor: draft.containerColor,
        chatBorderColor: draft.borderColor,
        chatBubbleColor: draft.bubbleColor,
        chatTextColor: draft.textColor,
        chatUsernameColor: draft.usernameColor,
        chatTimestampColor: draft.timestampColor,
        chatBadgeBgColor: draft.badgeBgColor,
        chatBadgeTextColor: draft.badgeTextColor,
        chatFontSize: clampNumber(draft.fontSize, 11, 22, 14),
        chatBubbleRadius: clampNumber(draft.bubbleRadius, 0, 16, 7),
        chatBubblePadding: clampNumber(draft.bubblePadding, 4, 16, 8),
        chatRowGap: clampNumber(draft.rowGap, 2, 14, 6),
        chatCustomCssEnabled: draft.customCssEnabled,
        chatCustomCss: draft.customCss,
        fill: draft.containerColor,
        stroke: draft.borderColor,
        textColor: draft.textColor,
        fontSize: clampNumber(draft.fontSize, 11, 22, 14),
        workerEnabled: true,
        workerTrigger: "interval" as const,
        workerIntervalMs: 2500
    };
};
