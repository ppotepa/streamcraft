import { apiFetch } from "./apiClient";
import type { EventEffectType } from "../types/effects.types";

export type UpsertEventEffectRequest = {
    id: string;
    typeName: string;
    description?: string;
    configurationJson?: string;
    enabled?: boolean;
};

export const fetchEventEffectTypes = async (): Promise<EventEffectType[]> => {
    const response = await apiFetch("/events/effect-types", { cache: "no-store" });
    if (!response.ok) {
        throw new Error(await response.text());
    }
    const payload = await response.json();
    return Array.isArray(payload) ? (payload as EventEffectType[]) : [];
};

export const upsertEventEffect = async (request: UpsertEventEffectRequest): Promise<void> => {
    const response = await apiFetch("/events/effects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            id: request.id,
            typeName: request.typeName,
            description: request.description,
            configurationJson: request.configurationJson,
            enabled: request.enabled ?? true
        })
    });

    if (!response.ok) {
        throw new Error(await response.text());
    }
};
