import type { CanvasItem } from "./types";

type Layer = { id: string; name: string };

export const createLayer = (layers: Layer[]) => {
    const nextIndex = layers.length + 1;
    return {
        id: `layer-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
        name: `Layer ${nextIndex}`
    };
};

export const reassignItemsToLayer = (items: CanvasItem[], fromLayerId: string, toLayerId: string) =>
    items.map((item) => (item.layerId === fromLayerId ? { ...item, layerId: toLayerId } : item));
