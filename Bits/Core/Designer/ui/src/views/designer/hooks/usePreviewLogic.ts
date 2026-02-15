import { useCallback, useMemo } from "react";
import type { CanvasItem, ChatRenderEntry } from "../domain/types";
import { getPreviewItemStyle, getItemStyle } from "../ui/previewStyles";
import { buildCanvasItems } from "../ui/CanvasItems";

export const usePreviewLogic = (
    items: CanvasItem[],
    getDisplayLabel: (item: CanvasItem) => string,
    getChatLines: (item: CanvasItem) => string[],
    getChatEntries: (item: CanvasItem) => ChatRenderEntry[],
    resolveImageSource: (item: CanvasItem) => string,
    getImageSource: (item: CanvasItem) => string,
    getVideoSource: (item: CanvasItem) => string,
    getProgressPercent: (item: CanvasItem) => number
) => {
    const getPreviewLabel = useCallback((item: CanvasItem) => {
        if (item.type !== "text" && item.type !== "chat") return "";
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
        getChatLines,
        getChatEntries,
        getProgressPercent,
        getImageSource,
        getVideoSource,
        beginResize: () => () => { },
        handleItemMouseDown: () => () => { },
        handleItemDoubleClick: () => () => { }
    }), [getChatEntries, getChatLines, getPreviewItemStyleCallback, getPreviewLabel, getProgressPercent, getImageSource, getVideoSource, items]);

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
