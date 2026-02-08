import { useEffect } from "react";
import type { CanvasItem } from "../domain/types";

export const useTextStyleSync = (
    syncPreview: boolean,
    selectedItem: CanvasItem | null,
    getDisplayLabel: (item: CanvasItem) => string,
    previewText: string,
    setPreviewText: (text: string) => void,
    customText: string,
    setCustomText: (text: string) => void
) => {
    useEffect(() => {
        if (!syncPreview) return;
        if (!selectedItem || selectedItem.type !== "text") return;
        const display = getDisplayLabel(selectedItem).trim();
        if (!display) return;
        if (display !== previewText) {
            setPreviewText(display);
        }
        if (display !== customText) {
            setCustomText(display);
        }
    }, [getDisplayLabel, selectedItem, customText, previewText, syncPreview, setPreviewText, setCustomText]);
};
