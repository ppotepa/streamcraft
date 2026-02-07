import { useState, useEffect, useCallback } from "react";
import type { CanvasItem } from "../views/designer/domain/types";

type UseImagePreloadingProps = {
    items: CanvasItem[];
    resolveImageSource: (item: CanvasItem) => string;
};

export const useImagePreloading = ({ items, resolveImageSource }: UseImagePreloadingProps) => {
    const [imageDisplaySrc, setImageDisplaySrc] = useState<Record<string, string>>({});

    const updateDisplay = useCallback((itemId: string, src: string) => {
        setImageDisplaySrc((prev) => {
            if (prev[itemId] === src) return prev;
            return { ...prev, [itemId]: src };
        });
    }, []);

    const cleanupMissing = useCallback((itemId: string) => {
        setImageDisplaySrc((prev) => {
            if (!prev[itemId]) return prev;
            const next = { ...prev };
            delete next[itemId];
            return next;
        });
    }, []);

    useEffect(() => {
        let cancelled = false;
        const loaders: HTMLImageElement[] = [];

        items
            .filter((item) => item.type === "image")
            .forEach((item) => {
                const src = resolveImageSource(item);
                if (!src) {
                    cleanupMissing(item.id);
                    return;
                }
                if (imageDisplaySrc[item.id] === src) {
                    return;
                }
                const img = new Image();
                loaders.push(img);
                img.onload = () => {
                    if (cancelled) return;
                    updateDisplay(item.id, src);
                };
                img.onerror = () => {
                    if (cancelled) return;
                };
                img.src = src;
            });

        return () => {
            cancelled = true;
            loaders.forEach((img) => {
                img.onload = null;
                img.onerror = null;
            });
        };
    }, [imageDisplaySrc, items, resolveImageSource, updateDisplay, cleanupMissing]);

    const getImageSource = useCallback((item: CanvasItem) => {
        return imageDisplaySrc[item.id] ?? resolveImageSource(item);
    }, [imageDisplaySrc, resolveImageSource]);

    return {
        imageDisplaySrc,
        getImageSource
    };
};
