/**
 * Layer-related type definitions
 */

export type Layer = {
    id: string;
    name: string;
};

export type LayerState = {
    layers: Layer[];
    activeLayerId: string;
};

export const DEFAULT_LAYER: Layer = { id: "layer-1", name: "Layer 1" } as const;
