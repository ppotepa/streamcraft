/**
 * Hook for managing UI extensions
 */

import { useEffect, useState, useCallback, useMemo } from "react";
import type { DesignerUiExtension, Extension } from "../domain/types";
import { apiFetch } from "../services/apiClient";
import type { FormNode } from "@streamcraft/forms/core";

export const useExtensions = () => {
    const [uiExtensions, setUiExtensions] = useState<DesignerUiExtension[]>([]);
    const [openUiExtensions, setOpenUiExtensions] = useState<Set<string>>(new Set());

    const refreshExtensions = useCallback(async () => {
        const res = await apiFetch("designer/extensions", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as DesignerUiExtension[];
        setUiExtensions(Array.isArray(data) ? data : []);
    }, []);

    const getExtensionGroupId = useCallback((extension: DesignerUiExtension) => {
        return extension.group ?? extension.id ?? "unknown";
    }, []);

    const extensionByTarget = useMemo(() => {
        const result = new Map<string, DesignerUiExtension[]>();
        for (const extension of uiExtensions) {
            const targets = extension.targets ?? [];
            for (const target of targets) {
                if (!result.has(target)) {
                    result.set(target, []);
                }
                result.get(target)?.push(extension);
            }
        }
        // Sort each target group by order
        for (const [_, extensions] of result.entries()) {
            extensions.sort((a, b) => {
                const orderA = a.order ?? 0;
                const orderB = b.order ?? 0;
                if (orderA !== orderB) return orderA - orderB;
                return (a.title ?? a.id ?? "").localeCompare(b.title ?? b.id ?? "");
            });
        }
        return result;
    }, [uiExtensions]);

    const normalizeExtensionNodes = useCallback((form?: FormNode | FormNode[] | null) => {
        return Array.isArray(form) ? form : form ? [form] : [];
    }, []);

    const getExtensionsForTarget = useCallback(
        (target: string) => extensionByTarget.get(target) ?? [],
        [extensionByTarget]
    );

    const openExtension = useCallback((extensionId: string) => {
        setOpenUiExtensions((prev) => new Set([...prev, extensionId]));
    }, []);

    const closeExtension = useCallback((extensionId: string) => {
        setOpenUiExtensions((prev) => {
            const next = new Set(prev);
            next.delete(extensionId);
            return next;
        });
    }, []);

    const toggleExtension = useCallback((extensionId: string) => {
        setOpenUiExtensions((prev) => {
            const next = new Set(prev);
            if (next.has(extensionId)) {
                next.delete(extensionId);
            } else {
                next.add(extensionId);
            }
            return next;
        });
    }, []);

    return {
        // State
        uiExtensions,
        openUiExtensions,
        setUiExtensions,
        setOpenUiExtensions,

        // Computed
        extensionByTarget,

        // Operations
        refreshExtensions,
        getExtensionGroupId,
        normalizeExtensionNodes,
        getExtensionsForTarget,
        openExtension,
        closeExtension,
        toggleExtension
    };
};
