import { useEffect } from "react";
import type { CanvasItem, DataSource } from "../domain/types";

export const useSelectionSync = (
    selectedItem: CanvasItem | null,
    sources: DataSource[],
    ensurePreview: (sourceId: string) => void,
    selectedCategoryId: string,
    setSelectedCategoryId: (id: string) => void,
    selectedSubcategoryId: string,
    setSelectedSubcategoryId: (id: string) => void,
    updateItem: (id: string, updates: Partial<CanvasItem>) => void
) => {
    useEffect(() => {
        if (selectedItem?.sourceId) {
            ensurePreview(selectedItem.sourceId);
        }
    }, [ensurePreview, selectedItem?.sourceId]);

    useEffect(() => {
        if (!selectedItem?.sourceId) return;
        const source = sources.find((candidate) => candidate.id === selectedItem.sourceId);
        if (!source) return;
        if (source.kind && selectedCategoryId !== source.kind) {
            setSelectedCategoryId(source.kind);
        }
        if (source.categoryId) {
            if (selectedSubcategoryId !== source.categoryId) {
                setSelectedSubcategoryId(source.categoryId);
            }
        } else if (selectedSubcategoryId) {
            setSelectedSubcategoryId("");
        }
    }, [selectedCategoryId, selectedItem?.sourceId, selectedSubcategoryId, sources]);

    useEffect(() => {
        if (!selectedItem?.sourceId) return;
        if (sources.some((source) => source.id === selectedItem.sourceId)) return;
        updateItem(selectedItem.id, { sourceId: undefined, endpointPath: undefined, fieldPath: undefined, scheduleIntervalMs: 0 });
    }, [selectedItem?.id, selectedItem?.sourceId, sources, updateItem]);
};
