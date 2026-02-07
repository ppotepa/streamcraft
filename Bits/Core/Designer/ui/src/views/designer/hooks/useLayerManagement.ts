/**
 * Hook for managing layer operations
 */

import { useState, useCallback } from "react";
import type { Layer } from "../types/layer.types";
import type { CanvasItem } from "../domain/types";
import { createLayer, reassignItemsToLayer } from "../domain/layerCommands";

const DEFAULT_LAYER: Layer = { id: "layer-1", name: "Layer 1" };

export const useLayerManagement = () => {
    const [layers, setLayers] = useState<Layer[]>([DEFAULT_LAYER]);
    const [activeLayerId, setActiveLayerId] = useState<string>(DEFAULT_LAYER.id);
    const [itemsInLayerExpanded, setItemsInLayerExpanded] = useState(true);

    const handleAddLayer = useCallback(() => {
        const newLayer = createLayer(layers);
        setLayers((prev) => [...prev, newLayer]);
        setActiveLayerId(newLayer.id);
        return newLayer;
    }, [layers]);

    const handleDeleteLayer = useCallback(
        (layerId: string, items: CanvasItem[], setItems: (items: CanvasItem[]) => void) => {
            if (layers.length <= 1) {
                return;
            }

            const remainingLayers = layers.filter((layer) => layer.id !== layerId);
            if (remainingLayers.length === 0) {
                return;
            }

            const fallbackLayerId = remainingLayers[0].id;
            setLayers(remainingLayers);
            setItems(reassignItemsToLayer(items, layerId, fallbackLayerId));

            if (activeLayerId === layerId) {
                setActiveLayerId(fallbackLayerId);
            }
        },
        [activeLayerId, layers]
    );

    const handleSelectActiveLayer = useCallback((layerId: string) => {
        setActiveLayerId(layerId);
    }, []);

    const handleSelectLayer = useCallback(
        (id: string, multiSelect: boolean, selectedIds: string[], items: CanvasItem[], setSelectedIds: (ids: string[]) => void) => {
            const layerItemIds = items.filter((item) => (item.layerId ?? activeLayerId) === id).map((item) => item.id);

            if (multiSelect) {
                const hasAll = layerItemIds.every((itemId) => selectedIds.includes(itemId));
                if (hasAll) {
                    setSelectedIds(selectedIds.filter((itemId) => !layerItemIds.includes(itemId)));
                } else {
                    setSelectedIds([...selectedIds, ...layerItemIds.filter((itemId) => !selectedIds.includes(itemId))]);
                }
            } else {
                setSelectedIds(layerItemIds);
            }
        },
        [activeLayerId]
    );

    const handleToggleVisibility = useCallback((id: string, items: CanvasItem[], setItems: (items: CanvasItem[]) => void) => {
        const item = items.find((candidate) => candidate.id === id);
        if (!item) return;
        setItems(items.map((candidate) => (candidate.id === id ? { ...candidate, visible: !candidate.visible } : candidate)));
    }, []);

    const handleToggleLock = useCallback((id: string, items: CanvasItem[], setItems: (items: CanvasItem[]) => void) => {
        setItems(items.map((item) => (item.id === id ? { ...item, locked: !item.locked } : item)));
    }, []);

    const handleReorderLayer = useCallback((id: string, newZIndex: number, items: CanvasItem[], setItems: (items: CanvasItem[]) => void) => {
        setItems(items.map((item) => (item.id === id ? { ...item, zIndex: newZIndex } : item)));
    }, []);

    const handleReorderItem = useCallback(
        (draggedId: string, targetId: string, items: CanvasItem[], setItems: (items: CanvasItem[]) => void) => {
            const draggedItem = items.find((item) => item.id === draggedId);
            const targetItem = items.find((item) => item.id === targetId);

            if (!draggedItem || !targetItem) {
                return;
            }

            const draggedLayerId = draggedItem.layerId ?? activeLayerId;
            const targetLayerId = targetItem.layerId ?? activeLayerId;

            if (draggedLayerId !== targetLayerId) {
                return;
            }

            setItems((prev) => {
                const nextLayerItems = prev
                    .filter((item) => (item.layerId ?? activeLayerId) === targetLayerId)
                    .sort((a, b) => (b.zIndex ?? 1) - (a.zIndex ?? 1));

                const draggedIndex = nextLayerItems.findIndex((item) => item.id === draggedId);
                const targetIndex = nextLayerItems.findIndex((item) => item.id === targetId);

                if (draggedIndex === -1 || targetIndex === -1) {
                    return prev;
                }

                nextLayerItems.splice(draggedIndex, 1);
                nextLayerItems.splice(targetIndex + (draggedIndex < targetIndex ? 0 : 1), 0, draggedItem);

                const updated = new Map<string, number>();
                const maxIndex = nextLayerItems.length;
                nextLayerItems.forEach((item, index) => {
                    updated.set(item.id, maxIndex - index);
                });

                return prev.map((item) => (updated.has(item.id) ? { ...item, zIndex: updated.get(item.id) } : item));
            });
        },
        [activeLayerId]
    );

    const handleLayerLock = useCallback(
        (layerId: string, items: CanvasItem[], setItems: (items: CanvasItem[]) => void) => {
            const hasUnlocked = items.some((item) => (item.layerId ?? layerId) === layerId && !item.locked);

            setItems(
                items.map((item) => ((item.layerId ?? layerId) === layerId ? { ...item, locked: hasUnlocked } : item))
            );
        },
        []
    );

    const toggleItemsFold = useCallback(() => {
        setItemsInLayerExpanded((prev) => !prev);
    }, []);

    return {
        // State
        layers,
        activeLayerId,
        itemsInLayerExpanded,

        // Setters
        setLayers,
        setActiveLayerId,

        // Operations
        handleAddLayer,
        handleDeleteLayer,
        handleSelectActiveLayer,
        handleSelectLayer,
        handleToggleVisibility,
        handleToggleLock,
        handleReorderLayer,
        handleReorderItem,
        handleLayerLock,
        toggleItemsFold
    };
};
