export type EventFieldDescriptor = {
    fieldId: string;
    displayName: string;
    valueType: string;
    payloadPath: string;
    isFilterable: boolean;
    allowedOperators: string[];
    description?: string | null;
};

export type EventTypeDescriptor = {
    eventTypeId: string;
    sourceTypeId: string;
    category: string;
    name: string;
    displayName: string;
    description: string;
    fields: EventFieldDescriptor[];
};

export type EventSourceDescriptor = {
    sourceTypeId: string;
    displayName: string;
    description: string;
    eventTypes: EventTypeDescriptor[];
};

export type TriggerConditionTemplate = {
    fieldId: string;
    defaultOperator: string;
    required: boolean;
    placeholder?: string | null;
    description?: string | null;
};

export type TriggerTemplateDescriptor = {
    templateId: string;
    displayName: string;
    description: string;
    eventTypeId: string;
    triggerFactoryTypeName: string;
    conditions: TriggerConditionTemplate[];
};

export type EffectTemplateOption = {
    key: string;
    label: string;
    valueType: string;
    required: boolean;
    description?: string | null;
    defaultValue?: unknown;
};

export type EffectTemplateDescriptor = {
    templateId: string;
    displayName: string;
    description: string;
    effectFactoryTypeName: string;
    options: EffectTemplateOption[];
};

export type ComponentTriggerRule = {
    ruleId: string;
    triggerId: string;
    effectId: string;
    triggerTemplateId: string;
    triggerTemplateName: string;
    effectTemplateId: string;
    effectTemplateName: string;
    eventTypeId: string;
    messageTypeCategory: string;
    messageTypeName: string;
    conditionFieldId?: string;
    conditionOperator?: string;
    conditionValue?: string;
    effectPayloadKey?: string;
    effectPayloadValue?: string;
    cooldownSec: number;
    createdUtc: string;
};
