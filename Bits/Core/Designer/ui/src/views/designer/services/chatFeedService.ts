const MESSAGE_FIELDS = ["message", "notes", "reason", "details"] as const;
const MAX_MESSAGES = 100;

export type ChatMessage = {
    id: string;
    username: string;
    message: string;
    role?: string;
    badges: string[];
    scenarioId?: string;
    scenarioName?: string;
    timestamp: number;
};

type StreamApiMockEventRecord = {
    eventId?: string;
    messageType?: string;
    scenarioId?: string;
    scenarioName?: string;
    payload?: {
        eventType?: string;
        timestampUtc?: string;
        data?: Record<string, unknown> | null;
        channel?: Record<string, unknown> | null;
    } | null;
    timestampUtc?: string;
};

const toTimestamp = (value: unknown): number => {
    if (!value) return Date.now();
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }
    if (typeof value === "string") {
        const parsed = Date.parse(value);
        if (!Number.isNaN(parsed)) {
            return parsed;
        }
    }
    return Date.now();
};

const toStringValue = (value: unknown): string | null => {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
};

const normalizeBadges = (value: unknown): string[] => {
    if (!Array.isArray(value)) return [];
    return value
        .map((entry) => {
            if (typeof entry === "string") return entry;
            if (entry && typeof entry === "object" && typeof (entry as any).name === "string") {
                return String((entry as any).name);
            }
            return null;
        })
        .filter((entry): entry is string => Boolean(entry));
};

const resolveParticipant = (
    data: Record<string, unknown> | null | undefined,
    payload: StreamApiMockEventRecord["payload"]
) => {
    const source = data as any;
    const candidate = (source?.viewer ?? source?.target ?? source?.moderator ?? source?.user) as Record<string, unknown> | undefined;
    if (candidate && typeof candidate === "object") {
        const username = toStringValue((candidate as any).name) || toStringValue((candidate as any).displayName);
        if (username) {
            return {
                name: username,
                role: toStringValue((candidate as any).role) ?? undefined
            };
        }
    }

    const channel = payload?.channel as Record<string, unknown> | undefined;
    const channelName = channel ? toStringValue(channel.name) : null;
    if (channelName) {
        return { name: channelName, role: "channel" };
    }

    const fallback = toStringValue(payload?.eventType);
    return { name: fallback ?? "Chat", role: "system" };
};

const extractMessage = (data: Record<string, unknown> | null | undefined): string | null => {
    if (!data) return null;
    for (const field of MESSAGE_FIELDS) {
        const candidate = toStringValue((data as any)[field]);
        if (candidate) {
            return candidate;
        }
    }
    return null;
};

export const mapHistoryToChatMessages = (records: StreamApiMockEventRecord[] | null | undefined): ChatMessage[] => {
    if (!Array.isArray(records) || records.length === 0) {
        return [];
    }

    const next: ChatMessage[] = [];
    for (const record of records) {
        if (!record) continue;
        const payload = record.payload ?? undefined;
        const data = payload?.data ?? undefined;
        const message = extractMessage(data);
        if (!message) continue;
        const participant = resolveParticipant(data, payload);
        const timestamp = toTimestamp(record.timestampUtc ?? payload?.timestampUtc);
        next.push({
            id: record.eventId ?? `${record.scenarioId ?? "chat"}-${timestamp}-${next.length}`,
            username: participant.name,
            role: participant.role,
            message,
            badges: normalizeBadges((data as any)?.badges),
            scenarioId: record.scenarioId ?? payload?.eventType ?? undefined,
            scenarioName: record.scenarioName ?? undefined,
            timestamp
        });
    }

    next.sort((a, b) => a.timestamp - b.timestamp);
    return next.slice(-MAX_MESSAGES);
};

export const fetchChatHistory = async (): Promise<ChatMessage[]> => {
    const res = await fetch("/stream-api-mock/history", { cache: "no-store" });
    if (!res.ok) {
        throw new Error(`Chat history request failed (${res.status})`);
    }
    const payload = (await res.json()) as StreamApiMockEventRecord[];
    return mapHistoryToChatMessages(payload);
};
