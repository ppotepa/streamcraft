import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FormContainer } from "@streamcraft/forms/FormContainer";
import { element, type FormNode } from "@streamcraft/forms/core";
import { WF } from "@streamcraft/forms";
import { renderJsonTree } from "./designer/ui/jsonTree";
import { TOOLS } from "./designer/domain/constants";
import { UiText } from "./uiText";

import { buildDataKey, type ApiFieldSpec, type ApiResponseMetadata, type DataSource, type DataSourceCategory, type TestResponse, type CanvasItem } from "./designer/domain/types";
import { usePlaygroundHotkeys } from "./designer/ui/usePlaygroundHotkeys";
import type { LoadingState } from "./designer/types/designer.types";


import { useDataSources } from "./designer/hooks/useDataSources";
import { useTextStyleCatalog } from "./designer/hooks/useTextStyleCatalog";
import { useDesktopHandlers } from "./designer/hooks/useDesktopHandlers";
import { loadAutosave as loadAutosaveService } from "./designer/services/autosaveService";
import { useChatMessages } from "./designer/hooks/useChatMessages";


import { themes } from "../themeRegistry";
import {
    useCanvasState,
    useLayerManagement,
    useThemeManagement,
    useWindowVisibility,
    useExtensions,
    useItemOperations,
    useVideoPlaylist,
    useSelectionAnalysis,
    useSelectionSync,
    useLayoutPersistence,
    useScheduler,
    useImageDisplay,
    useHistoryManager,
    useDockingInteractions,
    useExtensionHandlers,
    useTextStyleSync,
    useInitialLoading,
    usePreviewLogic,
    useDerivedState,
    useEffectsCatalog,
    useRuntimeSettings
} from "./designer/hooks";
import { useDesktopRender } from "./designer/hooks/useDesktopRender";
import type { DesignerUiExtension } from "./designer/types/extension.types";
import { resolveEffectiveIntervalMs } from "./designer/runtime/runtimePolicy";

export const Desktop: React.FC = () => {
    const [status, setStatus] = useState<string>(UiText.desktop.statusIdle);
    const canvas = useCanvasState();
    const layerMgmt = useLayerManagement();
    const theme = useThemeManagement();
    const windows = useWindowVisibility();
    const runtimeSettings = useRuntimeSettings();
    const extensions = useExtensions();
    // Replaced local data source state with useDataSources hook (Phase 4)
    const dataSources = useDataSources();
    const {
        sources, liveData, setLiveData, virtualState, refreshSources, isSystemSource,
        previews, testResponses,
        categories, topCategories, subcategories, filteredSources,
        selectedCategoryId, setSelectedCategoryId,
        selectedSubcategoryId, setSelectedSubcategoryId,
        ensurePreview, runTest, ingestData
    } = dataSources;
    const itemOps = useItemOperations(sources, liveData, virtualState);

    // Destructure hooks for compatibility with refactored code (Phase 2)
    const { items, setItems, selectedIds, setSelectedIds, activeTool, setActiveTool, canvasScale, setCanvasScale, isTransforming, setIsTransforming, transformHoldUntil, updateItem, zoomIn, zoomOut, zoomReset } = canvas;
    const { resolveFieldValue, hasBindingForItem, getBindingSummary, getDisplayLabel, getChatLines, getChatEntries, getProgressPercent, resolveImageSource, getVideoSource } = itemOps;

    const selectionAnalysis = useSelectionAnalysis(
        items, selectedIds, sources, liveData, virtualState, previews, testResponses, isSystemSource, resolveFieldValue
    );
    const {
        selectedItem, selectedSource, selectedEndpoints, selectedEndpoint, selectedPreview,
        previewFields, endpointFields, systemFields, availableFields,
        selectedKey, selectedTest, canBind, selectedFieldPath, selectedFieldKey, selectedFieldSpec,
        previewData, selectedResolvedValue, arrayValueMessage
    } = selectionAnalysis;

    const enhancedDataSources = useMemo(() => {
        const safeSelectedEndpoints = Array.isArray(selectedEndpoints) ? selectedEndpoints : [];
        const safeAvailableFields = Array.isArray(availableFields) ? availableFields : [];
        const safeFilteredSources = Array.isArray(filteredSources) ? filteredSources : [];

        return {
            ...dataSources,
            filteredSources: safeFilteredSources,
            selectedEndpoints: safeSelectedEndpoints,
            availableFields: safeAvailableFields,
            selectedTest,
            selectedFieldSpec,
            arrayValueMessage,
            previewData
        };
    }, [dataSources, filteredSources, selectedEndpoints, availableFields, selectedTest, selectedFieldSpec, arrayValueMessage, previewData]);

    const {
        scheduleTargetId, setScheduleTargetId,
        effectsTargetId, setEffectsTargetId,
        isDockCollapsed,
        setIsDockCollapsed,
        setDockedWindows,
        setIsDockPreview
    } = windows;
    const {
        setOpenUiExtensions,
        refreshExtensions,
        getExtensionsForTarget,
        normalizeExtensionNodes
    } = extensions;

    const textStyles = useTextStyleCatalog(
        { selectedItem, updateItem: canvas.updateItem },
        {
            uiExtensions: extensions.uiExtensions,
            setUiExtensions: extensions.setUiExtensions,
            getExtensionGroupId: extensions.getExtensionGroupId,
            openUiExtensions: extensions.openUiExtensions,
            refreshExtensions: extensions.refreshExtensions
        }
    );

    const {
        previewText: textStylesPreviewText, setPreviewText: setTextStylesPreviewText,
        customText: textStylesCustomText, setCustomText: setTextStylesCustomText,
        syncPreview: textStylesSyncPreview,
        aiPromptOpen: textStylesAiPromptOpen, setAiPromptOpen: setTextStylesAiPromptOpen,
        applyStyleById: applyTextStyleById
    } = textStyles;

    const [loadingState, setLoadingState] = useState<LoadingState>({
        active: true,
        step: "Starting Designer...",
        progress: 0,
        log: ["Starting Designer..."]
    });

    const layoutPersistence = useLayoutPersistence(canvas, layerMgmt, textStyles);
    const {
        overlayName, setOverlayName,
        isSaving, isAutoSaving, saveError, lastSavedUtc,
        serializeLayout, applyLayoutJson,
        handleManualSave,
        saveProject,
        listRecentProjects,
        openProject,
        autosaveProjectIdRef,
        isDirty
    } = layoutPersistence;

    const historyManager = useHistoryManager(canvas.setItems, canvas.setSelectedIds);
    const { pushHistory, applyHistory, resetHistory, undo, redo, canUndo, canRedo } = historyManager;

    const scheduler = useScheduler(items, sources, runtimeSettings.defaultIntervalMs, isTransforming, canvas.transformHoldUntil, dataSources.isSystemSource, dataSources.runTest);
    const { scheduleEpoch, scheduleRuns, setScheduleEpoch, setScheduleRuns, scheduleEpochRef, scheduleTickRef } = scheduler;

    const imageDisplay = useImageDisplay(items, resolveImageSource);
    const { imageDisplaySrc, getImageSource } = imageDisplay;

    // Extracted video state to useVideoPlaylist (Phase 3/5)
    const videoState = useVideoPlaylist(windows.showOverlayVideoPreview);
    const { clearOverlayVideoCache } = videoState;
    const effectsCatalog = useEffectsCatalog(windows.showEffectsCatalog);
    const activeChatSourceIds = useMemo(
        () =>
            Array.from(
                new Set(
                    items
                        .filter(
                            (item) =>
                                item.type === "chat" &&
                                item.workerEnabled === true &&
                                typeof item.sourceId === "string" &&
                                item.sourceId.trim().length > 0
                        )
                        .map((item) => item.sourceId!.trim())
                )
            ),
        [items]
    );
    const activeChatPollIntervalMs = useMemo(() => {
        const intervals = items
            .filter(
                (item) =>
                    item.type === "chat" &&
                    item.workerEnabled === true &&
                    typeof item.sourceId === "string" &&
                    item.sourceId.trim().length > 0
            )
            .map((item) => resolveEffectiveIntervalMs(item, runtimeSettings.defaultIntervalMs));

        if (intervals.length === 0) {
            return runtimeSettings.defaultIntervalMs;
        }

        return Math.max(250, Math.min(...intervals));
    }, [items, runtimeSettings.defaultIntervalMs]);
    const { messagesBySource: chatMessagesBySource } = useChatMessages({
        enabled: activeChatSourceIds.length > 0,
        pollIntervalMs: activeChatPollIntervalMs,
        sourceIds: activeChatSourceIds
    });
















    const loadAutosave = useCallback(async () => {
        const json = await loadAutosaveService(autosaveProjectIdRef.current);
        if (!json) return;
        applyLayoutJson(json);
    }, [applyLayoutJson]);

    useInitialLoading(refreshSources, refreshExtensions, loadAutosave, setLoadingState);

    useEffect(() => {
        setLiveData((prev) => {
            const next = new Map(prev);
            for (const sourceId of activeChatSourceIds) {
                const messages = chatMessagesBySource[sourceId] ?? [];
                const latest = messages.length > 0 ? messages[messages.length - 1] : null;
                next.set(sourceId, {
                    count: messages.length,
                    latest,
                    messages
                });
            }
            return next;
        });
    }, [activeChatSourceIds, chatMessagesBySource, setLiveData]);

    const handleNewLayout = useCallback(() => {
        layoutPersistence.handleNewLayout(resetHistory);
    }, [layoutPersistence, resetHistory]);

    const openProjectWithHistoryReset = useCallback(async (projectId: string) => {
        const opened = await openProject(projectId);
        if (opened) {
            resetHistory();
        }
        return opened;
    }, [openProject, resetHistory]);

    const { overlayPreviewNodes } = usePreviewLogic(
        items,
        getDisplayLabel,
        getChatLines,
        getChatEntries,
        resolveImageSource,
        getImageSource,
        getVideoSource,
        getProgressPercent
    );

    useEffect(() => {
        if (canvas.isTransforming || canvas.transformRef.current) {
            return;
        }
        pushHistory(canvas.items, canvas.selectedIds);
    }, [canvas, pushHistory]);

    const { handleDockDragStart, handleDockDragMove, handleDockDragEnd, handleDockUndock } = useDockingInteractions(
        isDockCollapsed,
        setIsDockPreview,
        setDockedWindows
    );

    useTextStyleSync(
        textStylesSyncPreview,
        selectedItem,
        getDisplayLabel,
        textStylesPreviewText,
        setTextStylesPreviewText,
        textStylesCustomText,
        setTextStylesCustomText
    );

    const { handleUiExtensionEvent } = useExtensionHandlers(setOpenUiExtensions, applyTextStyleById);

    const { textEffectsExtensions, dialogExtensions, schedulerItems } = useDerivedState(
        items,
        hasBindingForItem,
        getExtensionsForTarget,
        normalizeExtensionNodes
    );

    const handlers = useDesktopHandlers({
        canvas: {
            setActiveTool: canvas.setActiveTool,
            setCanvasScale: canvas.setCanvasScale,
            selectedItem
        },
        windows: {
            setShowLayersToolbox: windows.setShowLayersToolbox,
            setShowSchedulerOverview: windows.setShowSchedulerOverview,
            setShowOverlayVideoPreview: windows.setShowOverlayVideoPreview,
            setShowDesignerSettings: windows.setShowDesignerSettings,
            setShowRuntimeSettings: windows.setShowRuntimeSettings,
            setShowSaveProjectDialog: windows.setShowSaveProjectDialog,
            setShowProjectLauncher: windows.setShowProjectLauncher,
            setShowThemeViewer: theme.setShowThemeViewer,
            setShowTextStyleEditor: windows.setShowTextStyleEditor,
            setShowDataSourceExplorer: windows.setShowDataSourceExplorer,
            setShowScheduleSetup: windows.setShowScheduleSetup,
            setShowEffectsCatalog: windows.setShowEffectsCatalog,
        },
        theme: {
            setThemeSelection: theme.setThemeSelection,
            setThemeModeSelection: theme.setThemeModeSelection,
            themeSelection: theme.themeSelection,
            setThemeAiPrompt: theme.setThemeAiPrompt,
            refreshAiStatus: theme.refreshAiStatus,
            applyThemeByIndex: theme.applyThemeByIndex,
            applyThemeModeByIndex: theme.applyThemeModeByIndex,
            handleAiThemeGenerate: theme.handleAiThemeGenerate,
            handleAiThemeApply: theme.handleAiThemeApply,
            handleAiThemeClear: theme.handleAiThemeClear
        },
        extensions: {
            setTextStylesAiPromptOpen: setTextStylesAiPromptOpen,
            handleUiExtensionEvent: handleUiExtensionEvent
        },
        dock: {
            setIsDockCollapsed: setIsDockCollapsed,
            handleDockDragStart: handleDockDragStart,
            handleDockDragMove: handleDockDragMove,
            handleDockDragEnd: handleDockDragEnd,
            handleDockUndock: handleDockUndock
        },
        scheduling: {
            setScheduleTargetId: setScheduleTargetId,
            setEffectsTargetId: setEffectsTargetId,
            setScheduleEpoch: setScheduleEpoch,
            setScheduleRuns: setScheduleRuns,
            scheduleEpochRef: scheduleEpochRef,
            scheduleTickRef: scheduleTickRef
        },
        actions: {
            handleNewLayout: handleNewLayout,
            handleManualSave: handleManualSave,
            undo: undo,
            redo: redo,
            clearOverlayVideoCache: clearOverlayVideoCache
        },
        refs: {
            autosaveProjectIdRef: autosaveProjectIdRef
        },
        utils: {
            hasBindingForItem: hasBindingForItem,
            hasOverlayName: overlayName.trim().length > 0
        }
    });

    useSelectionSync(
        selectedItem,
        sources,
        ensurePreview,
        selectedCategoryId,
        setSelectedCategoryId,
        selectedSubcategoryId,
        setSelectedSubcategoryId,
        canvas.updateItem
    );

    usePlaygroundHotkeys({
        save: () => {
            if (overlayName.trim().length > 0) {
                void handleManualSave();
                return;
            }

            windows.setShowSaveProjectDialog(true);
        },
        undo,
        redo,
        copy: canvas.copySelection,
        cut: () => {
            canvas.copySelection();
            canvas.deleteSelection();
        },
        paste: canvas.pasteSelection,
        deleteSelection: canvas.deleteSelection
    });




    const render = useDesktopRender({
        canvas, layerMgmt, windows, theme, extensions, textStyles, dataSources: enhancedDataSources, itemOps, getImageSource,
        effectsCatalog,
        selectedItem,
        status, setStatus, saveError, lastSavedUtc, overlayName,
        isSaving, isDirty, isAutoSaving, loadingState,
        canUndo,
        canRedo,
        canBind,
        scheduleRuns, scheduleEpoch,
        videoState: {
            ...videoState,
            overlayPreviewNodes
        },
        overlayPreviewNodes,
        tools: TOOLS,
        schedulerItems,
        scheduleTarget: schedulerItems.find((i) => i.id === scheduleTargetId) ?? null,
        effectsTarget: items.find((i) => i.id === effectsTargetId) ?? null,
        textEffectsExtensions,
        dialogExtensions,
        runTest,
        renderJsonTree,
        runtimeSettings,
        projectActions: {
            saveProject,
            listRecentProjects,
            openProject: openProjectWithHistoryReset,
            createNewProject: handleNewLayout
        }
    });

    return (
        <>
            <FormContainer node={render.formNode} handlers={handlers} />
            {render.loadingOverlayNode}
            {render.autosaveOverlayNode}
        </>
    );
};



