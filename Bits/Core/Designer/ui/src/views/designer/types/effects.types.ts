export type EventEffectOptionChoice = {
    value: string;
    label: string;
};

export type EventEffectOption = {
    key: string;
    label: string;
    valueType: string;
    path?: string | null;
    required: boolean;
    description?: string | null;
    defaultValue?: unknown;
    choices?: EventEffectOptionChoice[];
};

export type EventEffectPreset = {
    id: string;
    name: string;
    category: string;
    description?: string | null;
    defaultOptions?: Record<string, unknown> | null;
    optionKeys?: string[] | null;
};

export type EventEffectType = {
    typeName: string;
    displayName: string;
    category: string;
    description?: string | null;
    options: EventEffectOption[];
    presets: EventEffectPreset[];
};

export type EffectsCatalogEntry = {
    catalogId: string;
    typeName: string;
    presetId?: string;
    name: string;
    category: string;
    description?: string | null;
    options: EventEffectOption[];
    initialConfig: Record<string, unknown>;
};
