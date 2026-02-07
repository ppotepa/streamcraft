import { useEffect, useState } from "react";

export type LoadingState = { active: boolean; step: string; progress: number; log: string[] };

type UseDesignerBootstrapParams = {
    refreshSources: () => Promise<void>;
    refreshExtensions: () => Promise<void>;
    loadAutosave: () => Promise<void>;
    minDisplayMs?: number;
};

export const useDesignerBootstrap = ({
    refreshSources,
    refreshExtensions,
    loadAutosave,
    minDisplayMs = 2000
}: UseDesignerBootstrapParams) => {
    const [loadingState, setLoadingState] = useState<LoadingState>({
        active: true,
        step: "Starting Designer...",
        progress: 0,
        log: ["Starting Designer..."]
    });

    useEffect(() => {
        let cancelled = false;

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
                await refreshSources();
            } catch (err) {
                console.warn("Failed to load sources", err);
            }

            pushLoading("Loading UI extensions...", 40);
            try {
                await refreshExtensions();
            } catch (err) {
                console.warn("Failed to load extensions", err);
            }

            pushLoading("Loading autosave...", 65);
            try {
                await loadAutosave();
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
    }, [loadAutosave, minDisplayMs, refreshExtensions, refreshSources]);

    return loadingState;
};