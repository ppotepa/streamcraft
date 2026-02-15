import { apiFetch } from "./apiClient";
import type {
    EffectTemplateDescriptor,
    EventSourceDescriptor,
    TriggerTemplateDescriptor
} from "../types/triggers.types";

export type UpsertTemplateEffectRequest = {
    id: string;
    typeName: string;
    description?: string;
    configuration: Record<string, unknown>;
    enabled?: boolean;
};

export type UpsertTemplateTriggerRequest = {
    id: string;
    messageTypeCategory: string;
    messageTypeName: string;
    effectIds: string[];
    typeName: string;
    filter: Record<string, unknown>;
    description?: string;
    enabled?: boolean;
};

export type EmitTestEventRequest = {
    category: string;
    name: string;
    payload: Record<string, unknown>;
    source?: string;
};

const ensureOk = async (response: Response) => {
    if (response.ok) return;
    throw new Error(await response.text());
};

export const fetchEventSources = async (): Promise<EventSourceDescriptor[]> => {
    const response = await apiFetch("/events/sources", { cache: "no-store" });
    await ensureOk(response);
    const payload = await response.json();
    return Array.isArray(payload) ? (payload as EventSourceDescriptor[]) : [];
};

export const fetchTriggerTemplates = async (): Promise<TriggerTemplateDescriptor[]> => {
    const response = await apiFetch("/events/trigger-templates", { cache: "no-store" });
    await ensureOk(response);
    const payload = await response.json();
    return Array.isArray(payload) ? (payload as TriggerTemplateDescriptor[]) : [];
};

export const fetchEffectTemplates = async (): Promise<EffectTemplateDescriptor[]> => {
    const response = await apiFetch("/events/effect-templates", { cache: "no-store" });
    await ensureOk(response);
    const payload = await response.json();
    return Array.isArray(payload) ? (payload as EffectTemplateDescriptor[]) : [];
};

export const upsertTemplateEffect = async (request: UpsertTemplateEffectRequest): Promise<void> => {
    const response = await apiFetch("/events/effects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            id: request.id,
            typeName: request.typeName,
            description: request.description,
            configurationJson: JSON.stringify(request.configuration),
            enabled: request.enabled ?? true
        })
    });
    await ensureOk(response);
};

export const upsertTemplateTrigger = async (request: UpsertTemplateTriggerRequest): Promise<void> => {
    const response = await apiFetch("/events/triggers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            id: request.id,
            messageType: {
                category: request.messageTypeCategory,
                name: request.messageTypeName
            },
            effectIds: request.effectIds,
            typeName: request.typeName,
            filterJson: JSON.stringify(request.filter),
            description: request.description,
            enabled: request.enabled ?? true
        })
    });
    await ensureOk(response);
};

export const deleteTrigger = async (triggerId: string): Promise<void> => {
    const response = await apiFetch(`/events/triggers/${encodeURIComponent(triggerId)}`, {
        method: "DELETE"
    });
    await ensureOk(response);
};

export const deleteEffect = async (effectId: string): Promise<void> => {
    const response = await apiFetch(`/events/effects/${encodeURIComponent(effectId)}`, {
        method: "DELETE"
    });
    await ensureOk(response);
};

export const emitTestEvent = async (request: EmitTestEventRequest): Promise<void> => {
    const response = await apiFetch("/events/emit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            messageType: {
                category: request.category,
                name: request.name
            },
            payload: request.payload,
            source: request.source ?? "designer.trigger-context"
        })
    });
    await ensureOk(response);
};
