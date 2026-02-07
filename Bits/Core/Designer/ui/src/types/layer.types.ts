export type Layer = {
    id: string;
    name: string;
    visible?: boolean;
    locked?: boolean;
};

export type LayerState = {
    layers: Layer[];
    activeLayerId: string;
    itemsInLayerExpanded: boolean;

    // Actions
    setLayers: (layers: Layer[] | ((prev: Layer[]) => Layer[])) => void;
    setActiveLayerId: (id: string) => void;
    setItemsInLayerExpanded: (expanded: boolean) => void;

    handleAddLayer: () => void;
    handleDeleteLayer: (layerId: string) => void;
    handleSelectLayer: (layerId: string) => void;
    handleRenameLayer: (layerId: string, newName: string) => void;
    handleToggleVisibility: (layerId: string) => void;
    handleToggleLock: (layerId: string) => void;
    handleReorderItem: (itemId: string, targetLayerId: string) => void;
};

export const DEFAULT_LAYER: Layer = { id: "layer-1", name: "Layer 1" };
