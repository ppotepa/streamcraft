import { useCallback } from "react";
import type { CanvasItem } from "../domain/types";
import type { Layer } from "../types/layer.types";

export const useItemLayerActions = (
    setItems: React.Dispatch<React.SetStateAction<CanvasItem[]>>,
    setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>,
    activeLayerId: string,
    layers: Layer[]
) => {
    const handleSelectLayer = useCallback((id: string, multiSelect: boolean) => {
        setSelectedIds((prev) => {
            if (multiSelect) {
                return prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
            }
            return [id];
        });
    }, [setSelectedIds]);

    const handleToggleVisibility = useCallback((id: string) => {
        setItems((prev) =>
            prev.map((item) => (item.id === id ? { ...item, visible: item.visible === false ? true : false } : item))
        );
    }, [setItems]);

    const handleToggleLock = useCallback((id: string) => {
        setItems((prev) => prev.map((item) => (item.id === id ? { ...item, locked: !item.locked } : item)));
    }, [setItems]);

    const handleReorderLayer = useCallback((id: string, newZIndex: number) => {
        setItems((prev) => prev.map((item) => (item.id === id ? { ...item, zIndex: newZIndex } : item)));
    }, [setItems]);

    const handleReorderItem = useCallback((draggedId: string, targetId: string) => {
        if (!draggedId || !targetId || draggedId === targetId) return;
        setItems((prev) => {
            const layerId = activeLayerId || layers[0]?.id || "layer-1";
            const layerItems = prev
                .filter((item) => (item.layerId ?? layerId) === layerId)
                .sort((a, b) => (b.zIndex ?? 1) - (a.zIndex ?? 1));

            const fromIndex = layerItems.findIndex((item) => item.id === draggedId);
            const toIndex = layerItems.findIndex((item) => item.id === targetId);
            if (fromIndex === -1 || toIndex === -1) return prev;

            const nextLayerItems = [...layerItems];
            const [moved] = nextLayerItems.splice(fromIndex, 1);
            nextLayerItems.splice(toIndex, 0, moved);

            const updated = new Map<string, number>();
            const maxIndex = nextLayerItems.length;
            nextLayerItems.forEach((item, index) => {
                updated.set(item.id, maxIndex - index);
            });

            return prev.map((item) => {
                const newZ = updated.get(item.id);
                return newZ !== undefined ? { ...item, zIndex: newZ } : item;
            });
        });
    }, [activeLayerId, layers, setItems]);

    return {
        handleSelectLayer,
        handleToggleVisibility,
        handleToggleLock,
        handleReorderLayer,
        handleReorderItem
    };
};
