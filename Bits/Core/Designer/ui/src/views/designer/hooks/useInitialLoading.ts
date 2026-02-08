import { useEffect, useRef } from "react";
import type { LoadingState } from "../types/designer.types";

export const useInitialLoading = (
    refreshSources: () => Promise<void>,
    refreshExtensions: () => Promise<void>,
    loadAutosave: () => Promise<void>,
    setLoadingState: React.Dispatch<React.SetStateAction<LoadingState>>
) => {
    const refreshSourcesRef = useRef(refreshSources);
    const refreshExtensionsRef = useRef(refreshExtensions);
    const loadAutosaveRef = useRef(loadAutosave);

    // Keep refs in sync without retriggering the main effect
    useEffect(() => {
        refreshSourcesRef.current = refreshSources;
    }, [refreshSources]);

    useEffect(() => {
        refreshExtensionsRef.current = refreshExtensions;
    }, [refreshExtensions]);

    useEffect(() => {
        loadAutosaveRef.current = loadAutosave;
    }, [loadAutosave]);

    useEffect(() => {
        let cancelled = false;
        const minDisplayMs = 2000;

        const pushLoading = (step: string, progress: number) => {
            if (cancelled) return;
            setLoadingState((prev) => {
                const log = prev.log.includes(step) ? prev.log : [...prev.log, step];
                return { ...prev, step, progress, log };
            });
        };

        const loadInitial = async () => {
            const startedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
            setLoadingState({
                active: true,
                step: "Starting Designer...",
                progress: 0,
                log: ["Starting Designer..."]
            });

            pushLoading("Reading data sources...", 25);
            try {
                await refreshSourcesRef.current?.();
            } catch (err) {
                console.warn("Failed to load sources", err);
            }

            pushLoading("Loading UI extensions...", 40);
            try {
                await refreshExtensionsRef.current?.();
            } catch (err) {
                console.warn("Failed to load extensions", err);
            }

            pushLoading("Loading autosave...", 65);
            try {
                await loadAutosaveRef.current?.();
            } catch (err) {
                console.warn("Failed to load autosave", err);
            }

            pushLoading("Preparing canvas...", 90);
            await new Promise((resolve) => setTimeout(resolve, 150));

            pushLoading("Ready", 100);
            const elapsed = (typeof performance !== "undefined" ? performance.now() : Date.now()) - startedAt;
            const remaining = Math.max(0, minDisplayMs - elapsed);
            setTimeout(() => {
                if (!cancelled) {
                    setLoadingState((prev) => ({ ...prev, active: false }));
                }
            }, remaining);
        };

        loadInitial();

        return () => {
            cancelled = true;
        };
    }, [setLoadingState]);
};
