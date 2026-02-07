/**
 * Hook for managing image preloading and display sources
 */

import { useState, useEffect, useCallback } from "react";
import type { CanvasItem } from "../domain/types";

export const useImagePreloading = (
    items: CanvasItem[],
    resolveImageSource: (item: CanvasItem) => string
) => {
    const [imageDisplaySrc, setImageDisplaySrc] = useState<Record<string, string>>({});

    const updateDisplay = useCallback((itemId: string, src: string) => {
        setImageDisplaySrc((prev) => {
            if (prev[itemId] === src) return prev;
            return { ...prev, [itemId]: src };
        });
    }, []);

    const cleanupMissing = useCallback((itemId: string) => {
        setImageDisplaySrc((prev) => {
            if (!(itemId in prev)) return prev;
            const next = { ...prev };
            delete next[itemId];
            return next;
        });
    }, []);

    const getImageSource = useCallback(
        (item: CanvasItem) => imageDisplaySrc[item.id] ?? resolveImageSource(item),
        [imageDisplaySrc, resolveImageSource]
    );

    useEffect(() => {
        let cancelled = false;
        const loaders: HTMLImageElement[] = [];

        items
            .filter((item) => item.type === "image")
            .forEach((item) => {
                const resolved = resolveImageSource(item);
                if (!resolved) {
                    cleanupMissing(item.id);
                    return;
                }

                const current = imageDisplaySrc[item.id];
                if (current === resolved) return;

                const loader = new Image();
                loaders.push(loader);

                loader.onload = () => {
                    if (cancelled) return;
                    updateDisplay(item.id, resolved);
                };

                loader.onerror = () => {
                    if (cancelled) return;
                    cleanupMissing(item.id);
                };

                loader.src = resolved;
            });

        return () => {
            cancelled = true;
            loaders.forEach((loader) => {
                loader.onload = null;
                loader.onerror = null;
            });
        };
    }, [cleanupMissing, imageDisplaySrc, items, resolveImageSource, updateDisplay]);

    return {
        imageDisplaySrc,
        getImageSource
    };
};
