import { useState, useCallback, useMemo } from "react";
import { apiFetch } from "../views/designer/services/apiClient";
import type { ExtensionState, DesignerUiExtension } from "../types/extension.types";

export const useExtensions = (): ExtensionState => {
    const [uiExtensions, setUiExtensions] = useState<DesignerUiExtension[]>([]);
    const [openUiExtensions, setOpenUiExtensions] = useState<Set<string>>(new Set());

    const refreshExtensions = useCallback(async () => {
        const res = await apiFetch("/designer/extensions", { cache: "no-store" });
        if (!res.ok) throw new Error(await res.text());
        const data = (await res.json()) as DesignerUiExtension[];
        setUiExtensions(Array.isArray(data) ? data : []);
    }, []);

    const getExtensionGroupId = useCallback((extension: DesignerUiExtension) => {
        const group = extension.group?.trim();
        return group && group.length > 0 ? group : extension.id;
    }, []);

    const extensionByTarget = useMemo(() => {
        const map = new Map<string, DesignerUiExtension[]>();
        uiExtensions.forEach((extension) => {
            (extension.targets ?? []).forEach((target) => {
                if (!target) return;
                const list = map.get(target) ?? [];
                list.push(extension);
                map.set(target, list);
            });
        });
        map.forEach((list) => {
            list.sort((a, b) => {
                const orderA = a.order ?? 0;
                const orderB = b.order ?? 0;
                if (orderA !== orderB) return orderA - orderB;
                return (a.title ?? a.id).localeCompare(b.title ?? b.id);
            });
        });
        return map;
    }, [uiExtensions]);

    const openExtension = useCallback((id: string) => {
        setOpenUiExtensions((prev) => new Set([...prev, id]));
    }, []);

    const closeExtension = useCallback((id: string) => {
        setOpenUiExtensions((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
        });
    }, []);

    return {
        uiExtensions,
        openUiExtensions,

        setUiExtensions,
        refreshExtensions,
        openExtension,
        closeExtension,
        extensionByTarget,
        getExtensionGroupId
    };
};
