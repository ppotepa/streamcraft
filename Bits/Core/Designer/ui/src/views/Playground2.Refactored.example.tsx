import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FormContainer } from "@streamcraft/forms/FormContainer";
import { element, type FormNode } from "@streamcraft/forms/core";
import { WF } from "@streamcraft/forms";
import { UiText } from "./uiText";
import { createLayersToolboxDialog } from "./designer/ui/dialogs";
import { buildDataKey, type CanvasItem } from "./designer/domain/types";
import { usePlaygroundHotkeys } from "./designer/ui/usePlaygroundHotkeys";
import { buildCanvasSurfaceNode } from "./designer/ui/CanvasSurface";
import { buildCanvasItems } from "./designer/ui/CanvasItems";
import { buildDockPanelNode } from "./designer/ui/DockPanel";
import { buildMenuNode } from "./designer/ui/MenuBar";
import { buildStatusBarNode } from "./designer/ui/StatusBar";
import { buildToolboxNode } from "./designer/ui/ToolboxPanel";
import { createCanvasItem } from "./designer/domain/itemCommands";
import { createLayer, reassignItemsToLayer } from "./designer/domain/layerCommands";
import { copyToClipboard, pasteFromClipboard, type ClipboardState } from "./designer/domain/clipboard";
import { canRedo, canUndo } from "./designer/domain/historyReducer";
import { buildFieldSpecs } from "./designer/services/dataSourceService";
import { useCanvasInteractions } from "./designer/ui/useCanvasInteractions";
import { createOverlayVideoPreviewDialog } from "./designer/forms/OverlayVideoPreviewDialog";
import { DataSourceExplorer } from "./designer/forms/DataSourceExplorer";
import {
    createAutosaveOverlay,
    createLoadingOverlay,
    createPropertiesSummaryDialog,
    createScheduleSetupDialog,
    createSchedulerOverviewDialog,
    TextStyleEditor,
    type PropertiesSummaryTextDetails
} from "./designer/forms";
import { createTextStylesDialog } from "./designer/forms/TextStylesDialog";
import { createTextStylesAiPromptDialog } from "./designer/forms/TextStylesAiPromptDialog";
import { buildPlayground2Designer } from "./Playground2.Designer";

// NEW: Import refactored hooks and utilities
import {
    useAutosave,
    useLayoutLoader,
    useCanvasHistory,
    useDataSources,
    useDockPreferences,
    useScheduler,
    useTextStyles,
    useVideoPlaylist
} from "./designer/hooks";
import {
    resolveFieldValue,
    getBindingSummary,
    getDisplayLabel,
    getProgressPercent,
    resolveImageSource,
    getVideoSource
} from "./designer/services/fieldResolver";
import {
    renderJsonTree,
    getExtensionGroupId,
    buildExtensionsByTarget,
    normalizeExtensionNodes,
    getExtensionsForTarget
} from "./designer/utils";
import type { DesignerUiExtension, LoadingState, SelectionBox, PlacementBox, TransformRef, DragStart } from "./designer/types";

/**
 * REFACTORED Playground2 Component
 * 
 * This is a simplified example showing how the component would look after refactoring.
 * The actual implementation would follow this pattern but use the real hooks.
 */
export const Playground2Refactored: React.FC = () => {
    // =========================
    // BASIC STATE (Remaining in component)
    // =========================
    const [status, setStatus] = useState<string>(UiText.playground2.statusIdle);
    const [activeTool, setActiveTool] = useState<string | null>(null);
    const [items, setItems] = useState<CanvasItem[]>([]);
    const [layers, setLayers] = useState<Array<{ id: string; name: string }>>(() => [
        { id: "layer-1", name: "Layer 1" }
    ]);
    const [activeLayerId, setActiveLayerId] = useState<string>("layer-1");
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [overlayName, setOverlayName] = useState<string>("");
    const [isTransforming, setIsTransforming] = useState(false);
    const [canvasScale, setCanvasScale] = useState(1);
    const [imageDisplaySrc, setImageDisplaySrc] = useState<Record<string, string>>({});
    const [loadingState, setLoadingState] = useState<LoadingState>({
        active: true,
        step: "Starting Designer...",
        progress: 0,
        log: ["Starting Designer..."]
    });
    const [uiExtensions, setUiExtensions] = useState<DesignerUiExtension[]>([]);
    const [openUiExtensions, setOpenUiExtensions] = useState<Set<string>>(new Set());
    const [showScheduleSetup, setShowScheduleSetup] = useState(false);
    const [scheduleTargetId, setScheduleTargetId] = useState<string | null>(null);
    const [itemsInLayerExpanded, setItemsInLayerExpanded] = useState(true);
    const [selectionBox, setSelectionBox] = useState<SelectionBox>({
        active: false,
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        addMode: false
    });
    const [placementBox, setPlacementBox] = useState<PlacementBox>({
        active: false,
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        type: null
    });

    // =========================
    // REFS
    // =========================
    const dragStart = useRef<DragStart | null>(null);
    const placementStart = useRef<DragStart | null>(null);
    const panRef = useRef<any>(null);
    const clipboardRef = useRef<ClipboardState | null>(null);
    const transformHoldUntil = useRef(0);
    const transformRef = useRef<TransformRef | null>(null);
    const nameCounters = useRef<Record<string, number>>({});
    const initialProjectId = useMemo(() => {
        const queryValue = typeof window !== "undefined"
            ? new URLSearchParams(window.location.search).get("project")
            : null;
        return (queryValue && queryValue.trim().length > 0)
            ? queryValue.trim()
            : Math.random().toString(36).slice(2, 11);
    }, []);

    // =========================
    // CUSTOM HOOKS (Refactored)
    // =========================

    // Data sources management
    const dataSourcesHook = useDataSources();
    const {
        sources,
        selectedCategoryId,
        selectedSubcategoryId,
        previews,
        testResponses,
        liveData,
        virtualState,
        topCategories,
        subcategories,
        filteredSources,
        setSelectedCategoryId,
        setSelectedSubcategoryId,
        setLiveData,
        isSystemSource,
        refreshSources,
        ensurePreview,
        runTest,
        ingestData
    } = dataSourcesHook;

    // Dock preferences
    const dockPrefs = useDockPreferences();
    const {
        isDockCollapsed,
        setIsDockCollapsed,
        dockedWindows,
        setDockedWindows,
        showLayersToolbox,
        setShowLayersToolbox,
        showOverlayVideoPreview,
        setShowOverlayVideoPreview,
        showDataSourceExplorer,
        setShowDataSourceExplorer,
        showTextStyleEditor,
        setShowTextStyleEditor,
        showSchedulerOverview,
        setShowSchedulerOverview,
        isDockPreview,
        setIsDockPreview,
        isDocked
    } = dockPrefs;

    // Text styles
    const textStyles = useTextStyles(
        uiExtensions,
        selectedIds.length > 0 ? items.find(item => item.id === selectedIds[0]) ?? null : null,
        openUiExtensions,
        async () => {
            const res = await fetch("/designer/extensions", { cache: "no-store" });
            if (!res.ok) return;
            const data = (await res.json()) as DesignerUiExtension[];
            setUiExtensions(Array.isArray(data) ? data : []);
        },
        (itemId, updates) => setItems(prev => prev.map(item => item.id === itemId ? { ...item, ...updates } : item))
    );

    // Video playlist
    const videoPlaylist = useVideoPlaylist(showOverlayVideoPreview);

    // Scheduler
    const scheduler = useScheduler(
        items,
        sources,
        isTransforming,
        transformHoldUntil,
        isSystemSource,
        runTest
    );

    // Canvas history
    const history = useCanvasHistory(items, selectedIds, isTransforming);

    // Auto-save
    const autosaveHook = useAutosave(
        overlayName,
        layers,
        activeLayerId,
        items,
        {
            search: textStyles.search,
            previewText: textStyles.previewText,
            customText: textStyles.customText,
            categoryId: textStyles.categoryId,
            weightFilter: textStyles.weightFilter,
            caseFilter: textStyles.caseFilter,
            shadowFilter: textStyles.shadowFilter,
            selectedId: textStyles.selectedId,
            status: textStyles.status,
            statusTone: textStyles.statusTone,
            refreshing: textStyles.refreshing,
            fontSource: textStyles.fontSource,
            favorites: textStyles.favorites,
            hoveredId: textStyles.hoveredId,
            page: textStyles.page,
            syncPreview: textStyles.syncPreview,
            aiPromptOpen: textStyles.aiPromptOpen,
            aiPrompt: textStyles.aiPrompt,
            aiResponse: textStyles.aiResponse,
            aiBusy: textStyles.aiBusy
        },
        initialProjectId
    );

    // =========================
    // HELPER FUNCTIONS
    // =========================

    const updateItem = useCallback((itemId: string, updates: Partial<CanvasItem>) => {
        setItems(prev => prev.map(item => item.id === itemId ? { ...item, ...updates } : item));
    }, []);

    const getNextName = useCallback((toolType: string) => {
        const base = toolType.charAt(0).toUpperCase() + toolType.slice(1);
        const next = (nameCounters.current[base] ?? 0) + 1;
        nameCounters.current[base] = next;
        return `${base}${next}`;
    }, []);

    // =========================
    // RENDER
    // =========================

    return (
        <div>
            <h2>Refactored Playground2 Component</h2>
            <p>State is now managed by focused custom hooks!</p>
            <ul>
                <li>Data Sources: {sources.length} sources loaded</li>
                <li>Text Styles: {textStyles.pagedStyles.length} styles</li>
                <li>Videos: {videoPlaylist.videoPlaylist.length} in playlist</li>
                <li>History: Can undo: {history.canUndo() ? "Yes" : "No"}</li>
                <li>Dirty: {autosaveHook.isDirty ? "Yes" : "No"}</li>
            </ul>
        </div>
    );
};

/**
 * NOTE: This is a demonstration file showing the refactored structure.
 * To complete the refactoring of Playground2.tsx:
 * 
 * 1. Replace all useState declarations with hook imports
 * 2. Remove inline useCallback/useMemo logic that's now in hooks
 * 3. Replace direct service calls with hook methods
 * 4. Keep only UI rendering and event handler logic in the component
 * 5. Component should be ~500 lines instead of 3000+
 */

