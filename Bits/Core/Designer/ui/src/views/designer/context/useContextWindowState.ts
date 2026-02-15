import { useCallback, useMemo, useState } from "react";
import type { CanvasItem } from "../domain/types";
import type { ContextTabId } from "./adapterTypes";
import { resolveAdapter } from "./adapterRegistry";

type ActiveTabByType = Record<string, ContextTabId | undefined>;

export const useContextWindowState = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [targetItemId, setTargetItemId] = useState<string | null>(null);
    const [activeTabByType, setActiveTabByType] = useState<ActiveTabByType>({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const openForItem = useCallback((item: CanvasItem) => {
        const adapter = resolveAdapter(item);
        const remembered = activeTabByType[item.type];
        const firstTab = adapter.getDefaultTab?.(item) ?? adapter.tabs[0]?.id ?? "general";
        const activeTab = adapter.tabs.some((tab) => tab.id === remembered) ? remembered : firstTab;

        setTargetItemId(item.id);
        setIsOpen(true);
        setError(null);
        setActiveTabByType((prev) => ({ ...prev, [item.type]: activeTab }));
    }, [activeTabByType]);

    const close = useCallback(() => {
        setIsOpen(false);
        setTargetItemId(null);
        setLoading(false);
        setError(null);
    }, []);

    const setActiveTab = useCallback((itemType: string, tabId: ContextTabId) => {
        setActiveTabByType((prev) => ({ ...prev, [itemType]: tabId }));
    }, []);

    const getActiveTab = useCallback((item: CanvasItem | null): ContextTabId => {
        const adapter = resolveAdapter(item);
        if (!item) {
            return adapter.tabs[0]?.id ?? "general";
        }
        const remembered = activeTabByType[item.type];
        if (remembered && adapter.tabs.some((tab) => tab.id === remembered)) {
            return remembered;
        }
        return adapter.getDefaultTab?.(item) ?? adapter.tabs[0]?.id ?? "general";
    }, [activeTabByType]);

    const state = useMemo(() => ({
        isOpen,
        targetItemId,
        loading,
        error
    }), [error, isOpen, loading, targetItemId]);

    return {
        ...state,
        openForItem,
        close,
        setActiveTab,
        getActiveTab,
        setLoading,
        setError
    };
};
