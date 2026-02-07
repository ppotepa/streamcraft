import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CanvasItem } from "../domain/types";
import { serializeLayout, applyLayoutJson, type ApplyLayoutCallbacks } from "../services/layoutSerializer";
import { loadAutosave as loadAutosaveService, saveAutosave as saveAutosaveService, saveLayout as saveLayoutService } from "../services/autosaveService";
import type { TextStylesState } from "../types/textStyles.types";

type UseAutosaveEffectParams = {
    currentJson: string;
    isDirty: boolean;
    isSaving: boolean;
    overlayName: string;
    saveLayout: (layoutId: string, json: string) => Promise<void>;
    saveAutosave: (json: string) => Promise<void>;
    setLastPersistedJson: (json: string) => void;
    setLastSavedUtc: (value: Date) => void;
    setIsSaving: (value: boolean) => void;
    setIsAutoSaving: (value: boolean) => void;
    setSaveError: (value: string | null) => void;
};

export const useAutosaveEffect = ({
    currentJson,
    isDirty,
    isSaving,
    overlayName,
    saveLayout,
    saveAutosave,
    setLastPersistedJson,
    setLastSavedUtc,
    setIsSaving,
    setIsAutoSaving,
    setSaveError
}: UseAutosaveEffectParams) => {
    const autosaveTimerRef = useRef<number | null>(null);

    useEffect(() => {
        if (!isDirty) {
            if (autosaveTimerRef.current) {
                window.clearTimeout(autosaveTimerRef.current);
                autosaveTimerRef.current = null;
            }
            return;
        }

        if (autosaveTimerRef.current) {
            window.clearTimeout(autosaveTimerRef.current);
        }

        autosaveTimerRef.current = window.setTimeout(() => {
            if (isSaving || !isDirty) {
                return;
            }
            const json = currentJson;
            setIsSaving(true);
            setIsAutoSaving(true);
            setSaveError(null);
            (async () => {
                try {
                    if (overlayName) {
                        await saveLayout(overlayName, json);
                    }
                    await saveAutosave(json);
                    setLastPersistedJson(json);
                    setLastSavedUtc(new Date());
                } catch (err) {
                    setSaveError(String(err));
                } finally {
                    setIsSaving(false);
                    setIsAutoSaving(false);
                }
            })();
        }, 5000);

        return () => {
            if (autosaveTimerRef.current) {
                window.clearTimeout(autosaveTimerRef.current);
                autosaveTimerRef.current = null;
            }
        };
    }, [currentJson, isDirty, isSaving, overlayName, saveAutosave, saveLayout, setIsAutoSaving, setIsSaving, setLastPersistedJson, setLastSavedUtc, setSaveError]);
};

export const useAutosave = (
    overlayName: string,
    layers: Array<{ id: string; name: string }>,
    activeLayerId: string,
    items: CanvasItem[],
    textStylesState: TextStylesState,
    projectId: string
) => {
    const [lastPersistedJson, setLastPersistedJson] = useState<string>("");
    const [isSaving, setIsSaving] = useState(false);
    const [isAutoSaving, setIsAutoSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [lastSavedUtc, setLastSavedUtc] = useState<Date | null>(null);

    const currentJson = useMemo(
        () => serializeLayout(overlayName, layers, activeLayerId, items, textStylesState),
        [activeLayerId, items, layers, overlayName, textStylesState]
    );
    const isDirty = currentJson !== lastPersistedJson;

    const saveAutosave = useCallback(async (json: string) => {
        await saveAutosaveService(json, projectId);
    }, [projectId]);

    const saveLayout = useCallback(async (layoutId: string, json: string) => {
        await saveLayoutService(layoutId, json);
    }, []);

    const handleManualSave = useCallback(async () => {
        let targetName = overlayName;
        if (!targetName) {
            targetName = prompt("Enter overlay name:", `overlay-${Date.now()}`) ?? "";
            if (!targetName) return;
        }

        setIsSaving(true);
        setSaveError(null);
        try {
            await saveLayout(targetName, currentJson);
            await saveAutosave(currentJson);
            setLastPersistedJson(currentJson);
            setLastSavedUtc(new Date());
        } catch (err) {
            setSaveError(String(err));
        } finally {
            setIsSaving(false);
        }
    }, [currentJson, overlayName, saveAutosave, saveLayout]);

    useAutosaveEffect({
        currentJson,
        isDirty,
        isSaving,
        overlayName,
        saveLayout,
        saveAutosave,
        setLastPersistedJson,
        setLastSavedUtc,
        setIsSaving,
        setIsAutoSaving,
        setSaveError
    });

    return {
        currentJson,
        lastPersistedJson,
        setLastPersistedJson,
        isDirty,
        isSaving,
        isAutoSaving,
        saveError,
        lastSavedUtc,
        handleManualSave
    };
};

export const useLayoutLoader = (
    callbacks: ApplyLayoutCallbacks
) => {
    const loadAutosave = useCallback(async (projectId: string) => {
        const json = await loadAutosaveService(projectId);
        if (!json) return;
        applyLayoutJson(json, callbacks);
    }, [callbacks]);

    return { loadAutosave };
};
