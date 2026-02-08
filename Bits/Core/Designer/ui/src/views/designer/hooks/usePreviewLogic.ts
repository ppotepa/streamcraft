import { useCallback, useMemo } from "react";
import type { CanvasItem } from "../domain/types";
import { getPreviewItemStyle, getItemStyle } from "../ui/previewStyles";
import { buildCanvasItems } from "../ui/CanvasItems";

export const usePreviewLogic = (
    items: CanvasItem[],
    getDisplayLabel: (item: CanvasItem) => string,
    resolveImageSource: (item: CanvasItem) => string,
    getImageSource: (item: CanvasItem) => string,
    getVideoSource: (item: CanvasItem) => string,
    getProgressPercent: (item: CanvasItem) => number
) => {
    const getPreviewLabel = useCallback((item: CanvasItem) => {
        if (item.type !== "text") return "";
        return getDisplayLabel(item);
    }, [getDisplayLabel]);

    const getPreviewItemStyleCallback = useCallback((item: CanvasItem) => {
        return getPreviewItemStyle(item, resolveImageSource, getImageSource, getVideoSource);
    }, [getImageSource, getVideoSource, resolveImageSource]);

    const overlayPreviewNodes = useMemo(() => buildCanvasItems({
        items,
        selectedIds: [],
        getItemStyle: getPreviewItemStyleCallback,
        getDisplayLabel: getPreviewLabel,
        getProgressPercent,
        getImageSource,
        getVideoSource,
        beginResize: () => () => { },
        handleItemMouseDown: () => () => { }
    }), [getPreviewItemStyleCallback, getPreviewLabel, getProgressPercent, getImageSource, getVideoSource, items]);

    const getItemStyleCallback = useCallback((item: CanvasItem) =>
        getItemStyle(item, getImageSource, getVideoSource),
        [getImageSource, getVideoSource]);

    return {
        getPreviewLabel,
        getPreviewItemStyleCallback,
        overlayPreviewNodes,
        getItemStyleCallback
    };
};
