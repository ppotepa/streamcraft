import { useState, useCallback } from "react";
import type { CanvasItem } from "../views/designer/domain/types";
import type { Layer, LayerState } from "../types/layer.types";
import { createLayer, reassignItemsToLayer } from "../views/designer/domain/layerCommands";

type UseLayerManagementProps = {
    items: CanvasItem[];
    setItems: (items: CanvasItem[] | ((prev: CanvasItem[]) => CanvasItem[])) => void;
};

export const useLayerManagement = ({ items, setItems }: UseLayerManagementProps): LayerState => {
    const [layers, setLayers] = useState<Layer[]>([{ id: "layer-1", name: "Layer 1" }]);
    const [activeLayerId, setActiveLayerId] = useState<string>("layer-1");
    const [itemsInLayerExpanded, setItemsInLayerExpanded] = useState(true);

    const handleAddLayer = useCallback(() => {
        const newLayer = createLayer(layers);
        setLayers((prev) => [...prev, newLayer]);
        setActiveLayerId(newLayer.id);
    }, [layers]);

    const handleDeleteLayer = useCallback((layerId: string) => {
        if (layers.length <= 1) {
            return;
        }

        const remainingLayers = layers.filter((layer) => layer.id !== layerId);
        if (remainingLayers.length === 0) {
            return;
        }

        const fallbackLayerId = remainingLayers[0].id;
        setLayers(remainingLayers);
        setItems((prev) => reassignItemsToLayer(prev, layerId, fallbackLayerId));
        if (activeLayerId === layerId) {
            setActiveLayerId(fallbackLayerId);
        }
    }, [layers, activeLayerId, setItems]);

    const handleSelectLayer = useCallback((layerId: string) => {
        setActiveLayerId(layerId);
    }, []);

    const handleRenameLayer = useCallback((layerId: string, newName: string) => {
        setLayers((prev) =>
            prev.map((layer) =>
                layer.id === layerId ? { ...layer, name: newName } : layer
            )
        );
    }, []);

    const handleToggleVisibility = useCallback((layerId: string) => {
        setLayers((prev) =>
            prev.map((layer) =>
                layer.id === layerId
                    ? { ...layer, visible: layer.visible === false ? true : false }
                    : layer
            )
        );
    }, []);

    const handleToggleLock = useCallback((layerId: string) => {
        setLayers((prev) =>
            prev.map((layer) =>
                layer.id === layerId ? { ...layer, locked: !layer.locked } : layer
            )
        );
    }, []);

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

            return prev.map((item) =>
                updated.has(item.id) ? { ...item, zIndex: updated.get(item.id) } : item
            );
        });
    }, [activeLayerId, layers, setItems]);

    return {
        layers,
        activeLayerId,
        itemsInLayerExpanded,

        setLayers,
        setActiveLayerId,
        setItemsInLayerExpanded,

        handleAddLayer,
        handleDeleteLayer,
        handleSelectLayer,
        handleRenameLayer,
        handleToggleVisibility,
        handleToggleLock,
        handleReorderItem
    };
};
