import type { FormNode } from "@streamcraft/forms/core";
import type { DesignerUiExtension } from "../types/designer.types";

export const getExtensionGroupId = (extension: DesignerUiExtension): string => {
    const group = extension.group?.trim();
    return group && group.length > 0 ? group : extension.id;
};

export const normalizeExtensionNodes = (form?: FormNode | FormNode[] | null): FormNode[] => {
    if (!form) return [];
    return Array.isArray(form) ? (form.filter(Boolean) as FormNode[]) : [form as FormNode];
};

export const getExtensionsForTarget = (
    target: string,
    extensionByTarget: Map<string, DesignerUiExtension[]>
): DesignerUiExtension[] => {
    return extensionByTarget.get(target) ?? [];
};

export const buildExtensionsByTarget = (
    uiExtensions: DesignerUiExtension[],
    getExtensionGroupId: (extension: DesignerUiExtension) => string
): Map<string, DesignerUiExtension[]> => {
    const map = new Map<string, DesignerUiExtension[]>();

    uiExtensions.forEach((extension) => {
        const targets = extension.targets ?? ["*"];
        targets.forEach((target) => {
            const existing = map.get(target) ?? [];
            map.set(target, [...existing, extension]);
        });
    });

    map.forEach((list) => {
        list.sort((a, b) => {
            const orderA = a.order ?? 0;
            const orderB = b.order ?? 0;
            if (orderA !== orderB) return orderA - orderB;
            return getExtensionGroupId(a).localeCompare(getExtensionGroupId(b));
        });
    });

    return map;
};

