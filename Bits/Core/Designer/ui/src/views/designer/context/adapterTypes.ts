import type { CanvasItem, DataSource } from "../domain/types";
import type {
    EffectTemplateDescriptor,
    EventSourceDescriptor,
    TriggerTemplateDescriptor
} from "../types/triggers.types";

export type ContextTabId =
    | "general"
    | "data"
    | "runtime"
    | "style"
    | "source"
    | "appearance"
    | "triggers"
    | "effects";

export type ContextTabDefinition = {
    id: ContextTabId;
    title: string;
    disabled?: boolean;
};

export type ContextCapabilities = Record<ContextTabId, boolean>;

export type ContextEffectsCatalog = {
    open: (itemId: string) => void;
};

export type ContextTriggersService = {
    openBuilder: (itemId: string) => void;
    eventSources: EventSourceDescriptor[];
    triggerTemplates: TriggerTemplateDescriptor[];
    effectTemplates: EffectTemplateDescriptor[];
    getSelectedRuleId: (itemId: string) => string | null;
    selectRule: (itemId: string, ruleId: string) => void;
};

export type ContextRenderCtx = {
    updateItem: (itemId: string, updates: Partial<CanvasItem>) => void;
    dataSources: {
        sources: DataSource[];
        isSystemSource: (source: DataSource | null) => boolean;
        runTest: (sourceId: string, endpointPath: string) => void;
        defaultRuntimeIntervalMs: number;
    };
    effectsCatalog: ContextEffectsCatalog;
    triggersService: ContextTriggersService;
    status: string;
    setStatus: (value: string) => void;
};

export type ContextAdapter<TItem extends CanvasItem = CanvasItem> = {
    id: string;
    supports: (item: CanvasItem) => item is TItem;
    tabs: ContextTabDefinition[];
    getDefaultTab?: (item: TItem) => ContextTabId;
};
