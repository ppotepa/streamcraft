import { useState, useCallback, useRef, useMemo } from "react";
import type { CanvasItem } from "../domain/types";
import { loadAutosave as loadAutosaveService, saveAutosave as saveAutosaveService, saveLayout as saveLayoutService } from "../services/autosaveService";
import { listLayouts as listLayoutsService, loadLayout as loadLayoutService, type DesignerProjectSummary } from "../services/projectService";
import { useAutosaveEffect } from "./useAutosave";

export const useLayoutPersistence = (
    canvas: any,
    layerMgmt: any,
    textStyles: any
) => {
    const normalizeProjectId = useCallback((value: string) => value.trim().toLowerCase(), []);

    const [overlayName, setOverlayName] = useState<string>("");
    const [lastPersistedJson, setLastPersistedJson] = useState<string>("");
    const [isSaving, setIsSaving] = useState(false);
    const [isAutoSaving, setIsAutoSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [lastSavedUtc, setLastSavedUtc] = useState<Date | null>(null);

    // Project ID initialization
    const initialProjectId = useMemo(() => {
        if (typeof window === "undefined") {
            return Math.random().toString(36).slice(2, 11);
        }

        const queryValue = new URLSearchParams(window.location.search).get("project");
        const previewPathMatch = window.location.pathname.match(/\/designer\/ui\/preview\/([^/?#]+)/i);
        const previewPathValue = previewPathMatch?.[1] ? decodeURIComponent(previewPathMatch[1]) : null;
        return (queryValue && queryValue.trim().length > 0)
            ? queryValue.trim()
            : (previewPathValue && previewPathValue.trim().length > 0)
                ? previewPathValue.trim()
            : Math.random().toString(36).slice(2, 11);
    }, []);
    const autosaveProjectIdRef = useRef<string>(initialProjectId);

    const setProjectContext = useCallback((projectId: string) => {
        if (!projectId || typeof window === "undefined") return;

        const normalizedProjectId = normalizeProjectId(projectId);
        autosaveProjectIdRef.current = normalizedProjectId;

        const url = new URL(window.location.href);
        url.searchParams.set("project", normalizedProjectId);
        window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
    }, [normalizeProjectId]);

    const serializeLayout = useCallback((overrideOverlayName?: string) => {
        return JSON.stringify({
            version: 2,
            overlayName: (overrideOverlayName ?? overlayName) || null,
            layers: layerMgmt.layers,
            activeLayerId: layerMgmt.activeLayerId,
            items: canvas.items,
            textStyles: {
                search: textStyles.search,
                previewText: textStyles.previewText,
                customText: textStyles.customText,
                categoryId: textStyles.categoryId,
                weightFilter: textStyles.weightFilter,
                caseFilter: textStyles.caseFilter,
                shadowFilter: textStyles.shadowFilter,
                selectedId: textStyles.selectedId,
                fontSource: textStyles.fontSource,
                favorites: textStyles.favorites,
                syncPreview: textStyles.syncPreview
            }
        });
    }, [
        canvas.items,
        layerMgmt.activeLayerId,
        layerMgmt.layers,
        overlayName,
        textStyles
    ]);

    const applyLayoutJson = useCallback((json: string) => {
        try {
            const parsed = JSON.parse(json);
            if (parsed?.overlayName) {
                setOverlayName(parsed.overlayName);
            }

            const nextLayers = Array.isArray(parsed?.layers) && parsed.layers.length > 0
                ? parsed.layers
                : [{ id: "layer-1", name: "Layer 1" }];
            const fallbackLayerId = nextLayers[0]?.id ?? "layer-1";
            const nextActiveLayerId = parsed?.activeLayerId && nextLayers.some((layer: any) => layer.id === parsed.activeLayerId)
                ? parsed.activeLayerId
                : fallbackLayerId;

            layerMgmt.setLayers(nextLayers);
            layerMgmt.setActiveLayerId(nextActiveLayerId);

            if (parsed?.textStyles) {
                if (typeof parsed.textStyles.search === "string") textStyles.setSearch(parsed.textStyles.search);
                if (typeof parsed.textStyles.previewText === "string") textStyles.setPreviewText(parsed.textStyles.previewText);
                if (typeof parsed.textStyles.customText === "string") textStyles.setCustomText(parsed.textStyles.customText);
                if (typeof parsed.textStyles.categoryId === "string") textStyles.setCategoryId(parsed.textStyles.categoryId);
                if (typeof parsed.textStyles.weightFilter === "string") textStyles.setWeightFilter(parsed.textStyles.weightFilter);
                if (typeof parsed.textStyles.caseFilter === "string") textStyles.setCaseFilter(parsed.textStyles.caseFilter);
                if (typeof parsed.textStyles.shadowFilter === "string") textStyles.setShadowFilter(parsed.textStyles.shadowFilter);
                if (typeof parsed.textStyles.selectedId === "string" || parsed.textStyles.selectedId === null) textStyles.setSelectedId(parsed.textStyles.selectedId ?? null);
                if (typeof parsed.textStyles.fontSource === "string") textStyles.setFontSource(parsed.textStyles.fontSource);
                if (Array.isArray(parsed.textStyles.favorites)) textStyles.setFavorites(parsed.textStyles.favorites.filter((entry: any) => typeof entry === "string"));
                if (typeof parsed.textStyles.syncPreview === "boolean") textStyles.setSyncPreview(parsed.textStyles.syncPreview);
            }

            if (Array.isArray(parsed?.items)) {
                const nextItems = parsed.items.map((item: any) => {
                    const normalized = item.layerId ? { ...item } : { ...item, layerId: fallbackLayerId };
                    if (normalized.scheduleIntervalMs === undefined) {
                        const legacyInterval = typeof normalized.workerIntervalMs === "number" ? normalized.workerIntervalMs : 0;
                        normalized.scheduleIntervalMs = normalized.workerEnabled ? legacyInterval : 0;
                    }
                    if (normalized.runtimeIntervalMode !== "custom") {
                        normalized.runtimeIntervalMode = "global";
                        normalized.runtimeCustomIntervalMs = undefined;
                    } else if (normalized.runtimeCustomIntervalMs === undefined) {
                        const fallbackCustom = typeof normalized.scheduleIntervalMs === "number" && normalized.scheduleIntervalMs > 0
                            ? normalized.scheduleIntervalMs
                            : typeof normalized.workerIntervalMs === "number" && normalized.workerIntervalMs > 0
                                ? normalized.workerIntervalMs
                                : 1000;
                        normalized.runtimeCustomIntervalMs = fallbackCustom;
                    }
                    return normalized;
                });
                canvas.setItems(nextItems);
                canvas.setSelectedIds([]);
            }
            setLastPersistedJson(json);
        } catch (err) {
            console.warn("Failed to parse layout json", err);
        }
    }, [canvas, layerMgmt, textStyles]);

    const loadAutosave = useCallback(async () => {
        const json = await loadAutosaveService(autosaveProjectIdRef.current);
        if (!json) return;
        applyLayoutJson(json);
    }, [applyLayoutJson]);

    const saveAutosave = useCallback(async (json: string) => {
        await saveAutosaveService(json, autosaveProjectIdRef.current);
    }, []);

    const saveLayout = useCallback(async (layoutId: string, json: string) => {
        await saveLayoutService(layoutId, json);
    }, []);

    const saveProject = useCallback(async (projectName?: string) => {
        const targetName = (projectName ?? overlayName).trim();
        if (!targetName) {
            return false;
        }

        const currentJson = serializeLayout(targetName);
        setIsSaving(true);
        setSaveError(null);
        try {
            await saveLayout(targetName, currentJson);
            setProjectContext(targetName);
            await saveAutosave(currentJson);
            setOverlayName(targetName);
            setLastPersistedJson(currentJson);
            setLastSavedUtc(new Date());
            return true;
        } catch (err) {
            setSaveError(String(err));
            return false;
        } finally {
            setIsSaving(false);
        }
    }, [overlayName, saveLayout, saveAutosave, serializeLayout, setProjectContext]);

    const handleManualSave = useCallback(async () => {
        await saveProject();
    }, [saveProject]);

    const listRecentProjects = useCallback(async (limit = 20): Promise<DesignerProjectSummary[]> => {
        return await listLayoutsService(limit);
    }, []);

    const openProject = useCallback(async (layoutId: string) => {
        const normalizedId = normalizeProjectId(layoutId);
        if (!normalizedId) return false;

        const json = await loadLayoutService(normalizedId);
        if (!json) return false;

        let resolvedOverlayName = layoutId.trim();
        try {
            const parsed = JSON.parse(json);
            if (typeof parsed?.overlayName === "string" && parsed.overlayName.trim().length > 0) {
                resolvedOverlayName = parsed.overlayName.trim();
            }
        } catch {
            // keep fallback name
        }

        applyLayoutJson(json);
        setOverlayName(resolvedOverlayName);
        setProjectContext(normalizedId);
        setLastPersistedJson(json);
        setLastSavedUtc(new Date());
        return true;
    }, [applyLayoutJson, normalizeProjectId, setProjectContext]);

    const handleNewLayout = useCallback((onReset?: () => void) => {
        const hasChanges = serializeLayout() !== lastPersistedJson;
        if (hasChanges) {
            const confirmReset = window.confirm("Discard the current layout and start a new one?");
            if (!confirmReset) return;
        }
        const baseLayer = { id: "layer-1", name: "Layer 1" };
        layerMgmt.setLayers([baseLayer]);
        layerMgmt.setActiveLayerId(baseLayer.id);
        canvas.setItems([]);
        canvas.setSelectedIds([]);
        setOverlayName("");
        setLastPersistedJson("");
        setLastSavedUtc(null);
        onReset?.();
    }, [lastPersistedJson, serializeLayout, layerMgmt, canvas]);

    // Autosave Effect
    const currentJson = useMemo(() => serializeLayout(), [serializeLayout]);
    const isDirty = currentJson !== lastPersistedJson;

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
        overlayName, setOverlayName,
        lastPersistedJson,
        isSaving,
        isAutoSaving,
        saveError,
        lastSavedUtc,
        autosaveProjectIdRef,

        serializeLayout,
        applyLayoutJson,
        loadAutosave,
        saveAutosave,
        saveLayout,
        saveProject,
        listRecentProjects,
        openProject,
        handleManualSave,
        handleNewLayout,

        // Expose state for loading sequences
        isDirty
    };
};
