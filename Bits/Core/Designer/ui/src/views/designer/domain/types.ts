export type ApiFieldSpec = {
    path: string;
    type: string;
    example?: string | null;
    isContainer?: boolean;
};

export type ApiResponseMetadata = {
    success: boolean;
    statusCode?: number | null;
    contentType?: string | null;
    rootKind?: string | null;
    fetchedUtc?: string;
    fields?: ApiFieldSpec[];
    error?: string | null;
};

export type ApiEndpoint = {
    name: string;
    path: string;
    method: string;
    description?: string | null;
    response?: ApiResponseMetadata | null;
};

export type DataSource = {
    id: string;
    name: string;
    description?: string;
    kind?: string;
    kindLabel?: string;
    categoryId?: string;
    categoryLabel?: string;
    baseUrl?: string;
    docsUrl?: string;
    endpoints?: ApiEndpoint[];
};

export type DataSourceCategory = {
    id: string;
    name: string;
    parentId?: string | null;
    sortOrder?: number;
};

export type TestResponse = {
    success: boolean;
    statusCode: number;
    error?: string | null;
    data?: unknown;
    response?: unknown;
    timestamp?: number;
};

export type ChatRenderEntry = {
    id: string;
    username: string;
    message: string;
    timestamp: number;
    badges: string[];
    role?: string;
    avatarUrl?: string;
};

export type CanvasItem = {
    id: string;
    type: string;
    name?: string;
    x: number;
    y: number;
    width: number;
    height: number;
    zIndex?: number;
    visible?: boolean;
    locked?: boolean;
    layerId?: string;
    label?: string;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    src?: string;
    sourceId?: string;
    endpointPath?: string;
    fieldPath?: string;
    format?: "text" | "uppercase" | "json";
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: string;
    fontStyle?: "normal" | "italic";
    textColor?: string;
    textTransform?: "none" | "uppercase" | "lowercase";
    letterSpacing?: number;
    textShadowX?: number;
    textShadowY?: number;
    textShadowBlur?: number;
    textShadowColor?: string;
    chatTitle?: string;
    chatShowBadges?: boolean;
    chatShowUsername?: boolean;
    chatShowTimestamp?: boolean;
    chatShowAvatars?: boolean;
    chatRoleColors?: boolean;
    chatLines?: number;
    chatPresetId?: string;
    chatBackgroundMode?: "solid" | "transparent";
    chatContainerOpacity?: number;
    chatBubbleOpacity?: number;
    chatBorderIntensity?: number;
    chatShadowIntensity?: number;
    chatBlurPx?: number;
    chatMessageFlow?: "bottom" | "top";
    chatMessageAlign?: "left" | "center" | "right";
    chatWidthMode?: "full" | "compact";
    chatContainerColor?: string;
    chatBorderColor?: string;
    chatBubbleColor?: string;
    chatTextColor?: string;
    chatUsernameColor?: string;
    chatTimestampColor?: string;
    chatBadgeBgColor?: string;
    chatBadgeTextColor?: string;
    chatFontSize?: number;
    chatBubbleRadius?: number;
    chatBubblePadding?: number;
    chatRowGap?: number;
    chatCustomCssEnabled?: boolean;
    chatCustomCss?: string;
    value?: number;
    minimum?: number;
    maximum?: number;
    progressStyle?: "continuous" | "blocks";
    workerEnabled?: boolean;
    workerTrigger?: "interval" | "onLoad" | "onVisible";
    workerIntervalMs?: number;
    workerDebounceMs?: number;
    workerRetryCount?: number;
    workerBackoffMs?: number;
    workerTimeoutMs?: number;
    workerCacheTtlMs?: number;
    workerStaleWhileRevalidate?: boolean;
    workerOnError?: "ignore" | "fallback" | "notify";
    workerLog?: boolean;
    scheduleIntervalMs?: number;
};

export const buildDataKey = (sourceId: string | undefined, endpointPath: string | undefined) => {
    if (!sourceId || !endpointPath) return "";
    return `${sourceId}|${endpointPath}`;
};
