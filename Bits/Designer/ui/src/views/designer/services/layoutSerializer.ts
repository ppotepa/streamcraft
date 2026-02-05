import type { CanvasItem } from "../domain/types";
import type { TextStylesState } from "../types/textStyles.types";

export type LayoutJson = {
    version: 2;
    overlayName: string | null;
    layers: Array<{ id: string; name: string }>;
    activeLayerId: string;
    items: CanvasItem[];
    textStyles: {
        search: string;
        previewText: string;
        customText: string;
        categoryId: string;
        weightFilter: string;
        caseFilter: string;
        shadowFilter: string;
        selectedId: string | null;
        fontSource: string;
        favorites: string[];
        syncPreview: boolean;
    };
};

export const serializeLayout = (
    overlayName: string,
    layers: Array<{ id: string; name: string }>,
    activeLayerId: string,
    items: CanvasItem[],
    textStylesState: TextStylesState
): string => {
    return JSON.stringify({
        version: 2,
        overlayName: overlayName || null,
        layers,
        activeLayerId,
        items,
        textStyles: {
            search: textStylesState.search,
            previewText: textStylesState.previewText,
            customText: textStylesState.customText,
            categoryId: textStylesState.categoryId,
            weightFilter: textStylesState.weightFilter,
            caseFilter: textStylesState.caseFilter,
            shadowFilter: textStylesState.shadowFilter,
            selectedId: textStylesState.selectedId,
            fontSource: textStylesState.fontSource,
            favorites: textStylesState.favorites,
            syncPreview: textStylesState.syncPreview
        }
    } as LayoutJson);
};

export type ApplyLayoutCallbacks = {
    setOverlayName: (name: string) => void;
    setLayers: (layers: Array<{ id: string; name: string }>) => void;
    setActiveLayerId: (id: string) => void;
    setTextStylesSearch: (search: string) => void;
    setTextStylesPreviewText: (text: string) => void;
    setTextStylesCustomText: (text: string) => void;
    setTextStylesCategoryId: (id: string) => void;
    setTextStylesWeightFilter: (filter: string) => void;
    setTextStylesCaseFilter: (filter: string) => void;
    setTextStylesShadowFilter: (filter: string) => void;
    setTextStylesSelectedId: (id: string | null) => void;
    setTextStylesFontSource: (source: string) => void;
    setTextStylesFavorites: (favorites: string[]) => void;
    setTextStylesSyncPreview: (sync: boolean) => void;
    setItems: (items: CanvasItem[]) => void;
    setSelectedIds: (ids: string[]) => void;
    setLastPersistedJson: (json: string) => void;
};

export const applyLayoutJson = (json: string, callbacks: ApplyLayoutCallbacks): void => {
    try {
        const parsed = JSON.parse(json) as Partial<LayoutJson>;

        if (parsed?.overlayName) {
            callbacks.setOverlayName(parsed.overlayName);
        }

        const nextLayers = Array.isArray(parsed?.layers) && parsed.layers.length > 0
            ? parsed.layers
            : [{ id: "layer-1", name: "Layer 1" }];
        const fallbackLayerId = nextLayers[0]?.id ?? "layer-1";
        const nextActiveLayerId = parsed?.activeLayerId && nextLayers.some(layer => layer.id === parsed.activeLayerId)
            ? parsed.activeLayerId
            : fallbackLayerId;

        callbacks.setLayers(nextLayers);
        callbacks.setActiveLayerId(nextActiveLayerId);

        if (parsed?.textStyles) {
            if (typeof parsed.textStyles.search === "string") {
                callbacks.setTextStylesSearch(parsed.textStyles.search);
            }
            if (typeof parsed.textStyles.previewText === "string") {
                callbacks.setTextStylesPreviewText(parsed.textStyles.previewText);
            }
            if (typeof parsed.textStyles.customText === "string") {
                callbacks.setTextStylesCustomText(parsed.textStyles.customText);
            }
            if (typeof parsed.textStyles.categoryId === "string") {
                callbacks.setTextStylesCategoryId(parsed.textStyles.categoryId);
            }
            if (typeof parsed.textStyles.weightFilter === "string") {
                callbacks.setTextStylesWeightFilter(parsed.textStyles.weightFilter);
            }
            if (typeof parsed.textStyles.caseFilter === "string") {
                callbacks.setTextStylesCaseFilter(parsed.textStyles.caseFilter);
            }
            if (typeof parsed.textStyles.shadowFilter === "string") {
                callbacks.setTextStylesShadowFilter(parsed.textStyles.shadowFilter);
            }
            if (typeof parsed.textStyles.selectedId === "string" || parsed.textStyles.selectedId === null) {
                callbacks.setTextStylesSelectedId(parsed.textStyles.selectedId ?? null);
            }
            if (typeof parsed.textStyles.fontSource === "string") {
                callbacks.setTextStylesFontSource(parsed.textStyles.fontSource);
            }
            if (Array.isArray(parsed.textStyles.favorites)) {
                callbacks.setTextStylesFavorites(parsed.textStyles.favorites.filter((entry) => typeof entry === "string"));
            }
            if (typeof parsed.textStyles.syncPreview === "boolean") {
                callbacks.setTextStylesSyncPreview(parsed.textStyles.syncPreview);
            }
        }

        if (Array.isArray(parsed?.items)) {
            const nextItems = parsed.items.map((item: any) => {
                const normalized = item.layerId ? { ...item } : { ...item, layerId: fallbackLayerId };
                if (normalized.scheduleIntervalMs === undefined) {
                    const legacyInterval = typeof normalized.workerIntervalMs === "number" ? normalized.workerIntervalMs : 0;
                    normalized.scheduleIntervalMs = normalized.workerEnabled ? legacyInterval : 0;
                }
                return normalized;
            });
            callbacks.setItems(nextItems as CanvasItem[]);
            callbacks.setSelectedIds([]);
        }
        callbacks.setLastPersistedJson(json);
    } catch (err) {
        console.warn("Failed to parse layout json", err);
    }
};
