import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FormContainer } from "@streamcraft/forms/FormContainer";
import { element, type FormNode } from "@streamcraft/forms/core";
import { WF } from "@streamcraft/forms";
import { UiText } from "./uiText";
import { buildMainDesigner } from "./Main.Designer";
import { buildCanvasSurfaceNode } from "./designer/ui/CanvasSurface";
import { buildDockPanelNode } from "./designer/ui/DockPanel";
import { buildMenuNode } from "./designer/ui/MenuBar";
import { buildStatusBarNode } from "./designer/ui/StatusBar";
import { buildToolboxNode } from "./designer/ui/ToolboxPanel";
import { usePlaygroundHotkeys } from "./designer/ui/usePlaygroundHotkeys";
import { useCanvasInteractions } from "./designer/ui/useCanvasInteractions";
import { createCanvasItem } from "./designer/domain/itemCommands";
import { copyToClipboard, pasteFromClipboard, type ClipboardState } from "./designer/domain/clipboard";
import type { CanvasItem } from "./designer/domain/types";
import { useAutosave, useCanvasHistory, useDataSources, useDockPreferences, useTextStyles } from "./designer/hooks";
import { useLayoutLoader } from "./designer/hooks/useAutosave";
import { createAutosaveOverlay, createLoadingOverlay } from "./designer/forms";
import type {
    DesignerUiExtension,
    DragStart,
    LoadingState,
    PlacementBox,
    SelectionBox,
    TransformRef
} from "./designer/types";
import type { TextStylesState } from "./designer/types/textStyles.types";

const DEFAULT_LAYER = { id: "layer-1", name: "Layer 1" } as const;
const DEFAULT_SELECTION_BOX: SelectionBox = { active: false, x: 0, y: 0, width: 0, height: 0, addMode: false };
const DEFAULT_PLACEMENT_BOX: PlacementBox = { active: false, x: 0, y: 0, width: 0, height: 0, type: null };

const tools = [
    UiText.playground2.tools.select,
    UiText.playground2.tools.hand,
    UiText.playground2.tools.text,
    UiText.playground2.tools.image,
    UiText.playground2.tools.progress,
    UiText.playground2.tools.rect,
    UiText.playground2.tools.ellipse,
    UiText.playground2.tools.line
];

export const MainForm: React.FC = () => {
    const [status, setStatus] = useState(UiText.playground2.statusIdle);
    const [activeTool, setActiveTool] = useState<string | null>("select");
    const [items, setItems] = useState<CanvasItem[]>([]);
    const [layers, setLayers] = useState<Array<{ id: string; name: string }>>([DEFAULT_LAYER]);
    const [activeLayerId, setActiveLayerId] = useState<string>(DEFAULT_LAYER.id);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [overlayName, setOverlayName] = useState("");
    const [selectionBox, setSelectionBox] = useState<SelectionBox>(DEFAULT_SELECTION_BOX);
    const [placementBox, setPlacementBox] = useState<PlacementBox>(DEFAULT_PLACEMENT_BOX);
    const [canvasScale, setCanvasScale] = useState(1);
    const [isTransforming, setIsTransforming] = useState(false);
    const [loadingState, setLoadingState] = useState<LoadingState>({
        active: true,
        step: "Bootstrapping designer",
        progress: 10,
        log: ["Starting designer..."]
    });

    const clipboardRef = useRef<ClipboardState | null>(null);
    const dragStart = useRef<DragStart | null>(null);
    const placementStart = useRef<DragStart | null>(null);
    const panRef = useRef<{
        startX: number;
        startY: number;
        scrollLeft: number;
        scrollTop: number;
        container: HTMLDivElement;
    } | null>(null);
    const transformRef = useRef<TransformRef | null>(null);
    const transformHoldUntil = useRef(0);
    const nameCounters = useRef<Record<string, number>>({});
    const projectId = useMemo(() => {
        const queryValue = typeof window !== "undefined"
            ? new URLSearchParams(window.location.search).get("project")
            : null;
        return queryValue?.trim() || Math.random().toString(36).slice(2, 11);
    }, []);
    const [uiExtensions, setUiExtensions] = useState<DesignerUiExtension[]>([]);
    const [openUiExtensions] = useState<Set<string>>(() => new Set());

    const selectedItem = selectedIds.length > 0
        ? items.find((item) => item.id === selectedIds[0]) ?? null
        : null;

    const updateItem = useCallback((itemId: string, updates: Partial<CanvasItem>) => {
        setItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, ...updates } : item)));
    }, []);

    const refreshExtensions = useCallback(async () => {
        const res = await fetch("/designer/extensions", { cache: "no-store" });
        if (!res.ok) {
            setUiExtensions([]);
            return [] as DesignerUiExtension[];
        }
        const data = (await res.json()) as DesignerUiExtension[];
        setUiExtensions(Array.isArray(data) ? data : []);
        return data;
    }, []);

    const textStyles = useTextStyles(uiExtensions, selectedItem, openUiExtensions, refreshExtensions, updateItem);

    const textStylesState: TextStylesState = {
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
    };

    const autosave = useAutosave(overlayName, layers, activeLayerId, items, textStylesState, projectId);
    const dataSources = useDataSources();
    const dockPrefs = useDockPreferences();
    const history = useCanvasHistory(items, selectedIds, isTransforming);
    const { undo, redo } = history;
    const canUndoValue = history.canUndo();
    const canRedoValue = history.canRedo();

    const layoutCallbacks = useMemo(() => ({
        setOverlayName,
        setLayers,
        setActiveLayerId,
        setTextStylesSearch: textStyles.setSearch,
        setTextStylesPreviewText: textStyles.setPreviewText,
        setTextStylesCustomText: textStyles.setCustomText,
        setTextStylesCategoryId: textStyles.setCategoryId,
        setTextStylesWeightFilter: textStyles.setWeightFilter,
        setTextStylesCaseFilter: textStyles.setCaseFilter,
        setTextStylesShadowFilter: textStyles.setShadowFilter,
        setTextStylesSelectedId: textStyles.setSelectedId,
        setTextStylesFontSource: textStyles.setFontSource,
        setTextStylesFavorites: textStyles.setFavorites,
        setTextStylesSyncPreview: textStyles.setSyncPreview,
        setItems,
        setSelectedIds,
        setLastPersistedJson: autosave.setLastPersistedJson
    }), [autosave.setLastPersistedJson, setActiveLayerId, setItems, setLayers, setOverlayName, setSelectedIds, textStyles]);

    const { loadAutosave } = useLayoutLoader(layoutCallbacks);

    useEffect(() => {
        let cancelled = false;
        const bootstrap = async () => {
            setLoadingState({ active: true, step: "Loading data sources", progress: 25, log: ["Starting designer..."] });
            try {
                await dataSources.refreshSources();
                if (cancelled) return;
                setLoadingState((prev) => ({ ...prev, step: "Loading extensions", progress: 55, log: [...prev.log, "Sources ready"] }));
                await refreshExtensions();
                if (cancelled) return;
                setLoadingState((prev) => ({ ...prev, step: "Restoring autosave", progress: 80, log: [...prev.log, "Extensions ready"] }));
                await loadAutosave(projectId);
                if (cancelled) return;
                setStatus("Designer ready");
            } finally {
                if (!cancelled) {
                    setLoadingState({ active: false, step: "Ready", progress: 100, log: ["Designer ready"] });
                }
            }
        };
        bootstrap();
        return () => {
            cancelled = true;
        };
    }, [dataSources.refreshSources, loadAutosave, projectId, refreshExtensions]);

    const getNextName = useCallback((toolType: string) => {
        const base = toolType.charAt(0).toUpperCase() + toolType.slice(1);
        const next = (nameCounters.current[base] ?? 0) + 1;
        nameCounters.current[base] = next;
        return `${base}${next}`;
    }, []);

    const addItem = useCallback((toolType: string, x: number, y: number, width: number, height: number) => {
        const created = createCanvasItem({
            toolType,
            x,
            y,
            width,
            height,
            items,
            activeLayerId,
            layers,
            getNextName
        });
        setItems((prev) => [...prev, created.item]);
        setSelectedIds([created.id]);
        setActiveTool("select");
    }, [activeLayerId, getNextName, items, layers]);

    const copySelection = useCallback(() => {
        const nextClipboard = copyToClipboard(items, selectedIds);
        if (nextClipboard) {
            clipboardRef.current = nextClipboard;
            setStatus("Selection copied");
        }
    }, [items, selectedIds, setStatus]);

    const deleteSelection = useCallback(() => {
        if (selectedIds.length === 0) return;
        setItems((prev) => prev.filter((item) => !selectedIds.includes(item.id)));
        setSelectedIds([]);
        setStatus("Selection deleted");
    }, [selectedIds, setItems, setSelectedIds, setStatus]);

    const pasteSelection = useCallback(() => {
        if (!clipboardRef.current) return;
        const result = pasteFromClipboard(clipboardRef.current, items, getNextName);
        setItems(result.items);
        setSelectedIds(result.selectedIds);
        clipboardRef.current = result.nextClipboard;
        setStatus("Selection pasted");
    }, [getNextName, items, setItems, setSelectedIds, setStatus]);

    const beginTransformHold = useCallback(() => {
        setIsTransforming(true);
        transformHoldUntil.current = Date.now() + 300;
    }, []);

    const endTransformHold = useCallback(() => {
        setIsTransforming(false);
        transformHoldUntil.current = Date.now() + 300;
    }, []);

    const handleNewLayout = useCallback(() => {
        setItems([]);
        setSelectedIds([]);
        setOverlayName("");
        setLayers([DEFAULT_LAYER]);
        setActiveLayerId(DEFAULT_LAYER.id);
        autosave.setLastPersistedJson("");
        setStatus("Started new overlay");
    }, [autosave.setLastPersistedJson, setActiveLayerId, setItems, setLayers, setOverlayName, setSelectedIds, setStatus]);

    const handleSave = useCallback(async () => {
        await autosave.handleManualSave();
        setStatus("Overlay saved");
    }, [autosave.handleManualSave, setStatus]);

    const openDesignerSettings = useCallback(() => {
        setStatus("Designer settings are coming soon.");
    }, [setStatus]);

    const openLayersToolbox = useCallback(() => {
        dockPrefs.setIsDockCollapsed(false);
        dockPrefs.setShowLayersToolbox(true);
        setStatus("Layers toolbox will be available soon.");
    }, [dockPrefs, setStatus]);

    const openLivePreview = useCallback(() => {
        setStatus("Live preview is not wired yet.");
    }, [setStatus]);

    const openOverlayVideoPreview = useCallback(() => {
        dockPrefs.setIsDockCollapsed(false);
        dockPrefs.setShowOverlayVideoPreview(true);
        setStatus("Overlay video preview coming soon.");
    }, [dockPrefs, setStatus]);

    const openSchedulerOverview = useCallback(() => {
        dockPrefs.setIsDockCollapsed(false);
        dockPrefs.setShowSchedulerOverview(true);
        setStatus("Scheduler overview is not wired yet.");
    }, [dockPrefs, setStatus]);

    const toggleDockPanel = useCallback(() => {
        dockPrefs.setIsDockCollapsed((prev) => !prev);
    }, [dockPrefs]);

    const historyUndo = useCallback(() => {
        const snapshot = undo();
        if (snapshot) {
            setItems(snapshot.items);
            setSelectedIds(snapshot.selectedIds);
        }
    }, [setItems, setSelectedIds, undo]);

    const historyRedo = useCallback(() => {
        const snapshot = redo();
        if (snapshot) {
            setItems(snapshot.items);
            setSelectedIds(snapshot.selectedIds);
        }
    }, [redo, setItems, setSelectedIds]);

    usePlaygroundHotkeys({
        save: () => void handleSave(),
        undo: historyUndo,
        redo: historyRedo,
        copy: copySelection,
        cut: () => {
            copySelection();
            deleteSelection();
        },
        paste: pasteSelection,
        deleteSelection
    });

    const {
        beginResize,
        handleCanvasMouseDown,
        handleCanvasMouseMove,
        handleCanvasMouseUp,
        handleItemMouseDown
    } = useCanvasInteractions({
        activeTool,
        setActiveTool,
        items,
        setItems,
        selectedIds,
        setSelectedIds,
        selectionBox,
        setSelectionBox,
        placementBox,
        setPlacementBox,
        dragStart,
        placementStart,
        transformRef,
        canvasScale,
        panRef,
        beginTransformHold,
        endTransformHold,
        addItem
    });

    const getDisplayLabel = useCallback((item: CanvasItem) => item.label ?? item.name ?? item.type, []);

    const getProgressPercent = useCallback((item: CanvasItem) => {
        const min = typeof item.minimum === "number" ? item.minimum : 0;
        const max = typeof item.maximum === "number" ? item.maximum : 100;
        const value = typeof item.value === "number" ? item.value : min;
        if (max <= min) return 0;
        return Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
    }, []);

    const getImageSource = useCallback((item: CanvasItem) => item.src ?? "", []);
    const getVideoSource = useCallback(() => "", []);

    const layoutNode = useMemo(() => buildCanvasSurfaceNode({
        items,
        selectedIds,
        getItemStyle: (item) => {
            const styles = [
                `left: ${item.x}px;`,
                `top: ${item.y}px;`,
                `width: ${item.width}px;`,
                `height: ${item.height}px;`,
                `z-index: ${item.zIndex ?? 1};`
            ];
            if (item.type === "text") {
                styles.push(`font-size: ${item.fontSize ?? 16}px;`);
            }
            return styles.join(" ");
        },
        getDisplayLabel,
        getProgressPercent,
        getImageSource,
        getVideoSource,
        beginResize,
        handleItemMouseDown,
        selectionBox,
        placementBox,
        onMouseDown: handleCanvasMouseDown,
        onMouseMove: handleCanvasMouseMove,
        onMouseUp: handleCanvasMouseUp
    }), [beginResize, getDisplayLabel, getImageSource, getProgressPercent, getVideoSource, handleCanvasMouseDown, handleCanvasMouseMove, handleCanvasMouseUp, handleItemMouseDown, items, placementBox, selectedIds, selectionBox]);

    const canvasFormNode = useMemo(() => WF.Panel({
        ClassName: "playground2-canvas-form",
        Style: "position: relative; flex: 1; min-height: 0; display: flex; align-items: center; justify-content: center; overflow: auto;"
    }, element(
        "div",
        { className: "canvas-wrapper", style: `transform: scale(${canvasScale}); transform-origin: center;` },
        layoutNode
    )), [canvasScale, layoutNode]);

    const contextBarNode = useMemo(() => buildContextBarNode({
        overlayName,
        setOverlayName,
        selectedItem,
        updateItem,
        canUndo: canUndoValue,
        canRedo: canRedoValue,
        onUndo: historyUndo,
        onRedo: historyRedo,
        onNew: handleNewLayout,
        onSave: handleSave,
        canvasScale,
        setCanvasScale
    }), [canvasScale, canRedoValue, canUndoValue, handleNewLayout, handleSave, historyRedo, historyUndo, overlayName, selectedItem, setCanvasScale, setOverlayName, updateItem]);

    const menuNode = useMemo(() => buildMenuNode(), []);
    const toolboxNode = useMemo(() => buildToolboxNode(tools, activeTool), [activeTool]);
    const statusBarNode = useMemo(() => buildStatusBarNode({
        status,
        saveError: autosave.saveError,
        lastSavedUtc: autosave.lastSavedUtc,
        overlayName,
        isSaving: autosave.isSaving,
        isDirty: autosave.isDirty,
        canvasScale
    }), [autosave.isDirty, autosave.isSaving, autosave.lastSavedUtc, autosave.saveError, canvasScale, overlayName, status]);

    const loadingOverlayNode = loadingState.active
        ? createLoadingOverlay({ step: loadingState.step, progress: loadingState.progress, log: loadingState.log })
        : null;
    const autosaveOverlayNode = autosave.isAutoSaving ? createAutosaveOverlay() : null;

    const dockPanelNode = useMemo(() => buildDockPanelNode({
        isDockCollapsed: dockPrefs.isDockCollapsed,
        dockedNodes: []
    }), [dockPrefs.isDockCollapsed]);

    const formNode = useMemo(() => buildMainDesigner({
        menuNode,
        contextBarNode,
        canvasFormNode,
        toolboxNode,
        isDockPreview: dockPrefs.isDockPreview,
        dockPanelNode,
        statusBarNode
    }), [canvasFormNode, contextBarNode, dockPanelNode, dockPrefs.isDockPreview, menuNode, statusBarNode, toolboxNode]);

    const handlers = useMemo(() => ({
        toolboxSelect: (args: any) => {
            setActiveTool(args?.tool?.id ?? "select");
        },
        newOverlay: () => handleNewLayout(),
        saveOverlay: () => void handleSave(),
        undoAction: () => historyUndo(),
        redoAction: () => historyRedo(),
        zoomIn: () => setCanvasScale((prev) => Math.min(3, Math.round((prev + 0.1) * 100) / 100)),
        zoomOut: () => setCanvasScale((prev) => Math.max(0.25, Math.round((prev - 0.1) * 100) / 100)),
        zoomReset: () => setCanvasScale(1),
        openDesignerSettings: () => openDesignerSettings(),
        openLayersToolbox: () => openLayersToolbox(),
        openLivePreview: () => openLivePreview(),
        openOverlayVideoPreview: () => openOverlayVideoPreview(),
        openSchedulerOverview: () => openSchedulerOverview(),
        toggleDockPanel: () => toggleDockPanel()
    }), [handleNewLayout, handleSave, historyRedo, historyUndo, openDesignerSettings, openLayersToolbox, openLivePreview, openOverlayVideoPreview, openSchedulerOverview, toggleDockPanel]);

    return (
        <>
            <FormContainer node={formNode} handlers={handlers} />
            {loadingOverlayNode}
            {autosaveOverlayNode}
        </>
    );
};

type ContextBarProps = {
    overlayName: string;
    setOverlayName: (name: string) => void;
    selectedItem: CanvasItem | null;
    updateItem: (itemId: string, updates: Partial<CanvasItem>) => void;
    canUndo: boolean;
    canRedo: boolean;
    onUndo: () => void;
    onRedo: () => void;
    onNew: () => void;
    onSave: () => void;
    canvasScale: number;
    setCanvasScale: (value: number) => void;
};

const contextField = (label: string, control: FormNode) => WF.Element(
    "div",
    { className: "context-bar-field" },
    WF.Element("span", { className: "context-bar-label" }, label),
    control
);

const buildContextBarNode = (props: ContextBarProps): FormNode => {
    const { overlayName, setOverlayName, selectedItem, updateItem, canUndo, canRedo, onUndo, onRedo, onNew, onSave, canvasScale, setCanvasScale } = props;

    const center: FormNode[] = [
        contextField("Overlay", element("input", {
            className: "textbox context-bar-input",
            value: overlayName,
            placeholder: "Untitled overlay",
            onChange: (event: React.ChangeEvent<HTMLInputElement>) => setOverlayName(event.target.value)
        }))
    ];

    if (selectedItem) {
        center.push(
            contextField("Name", element("input", {
                className: "textbox context-bar-input",
                value: selectedItem.name ?? "",
                onChange: (event: React.ChangeEvent<HTMLInputElement>) => updateItem(selectedItem.id, { name: event.target.value })
            })),
            contextField("X", element("input", {
                type: "number",
                className: "textbox context-bar-input",
                value: selectedItem.x,
                onChange: (event: React.ChangeEvent<HTMLInputElement>) => updateItem(selectedItem.id, { x: Number(event.target.value) || 0 })
            })),
            contextField("Y", element("input", {
                type: "number",
                className: "textbox context-bar-input",
                value: selectedItem.y,
                onChange: (event: React.ChangeEvent<HTMLInputElement>) => updateItem(selectedItem.id, { y: Number(event.target.value) || 0 })
            })),
            contextField("W", element("input", {
                type: "number",
                className: "textbox context-bar-input",
                value: selectedItem.width,
                onChange: (event: React.ChangeEvent<HTMLInputElement>) => updateItem(selectedItem.id, { width: Math.max(2, Number(event.target.value) || 0) })
            })),
            contextField("H", element("input", {
                type: "number",
                className: "textbox context-bar-input",
                value: selectedItem.height,
                onChange: (event: React.ChangeEvent<HTMLInputElement>) => updateItem(selectedItem.id, { height: Math.max(2, Number(event.target.value) || 0) })
            }))
        );
    } else {
        center.push(WF.Element("span", { className: "context-bar-empty" }, "Select an item to edit its properties."));
    }

    return WF.ContextBar({
        Left: [
            element("button", { className: "context-bar-button", onClick: onNew }, "New"),
            element("button", { className: "context-bar-button", onClick: onSave }, "Save"),
            WF.Element("div", { className: "context-bar-separator" }),
            element("button", { className: "context-bar-button", onClick: onUndo, disabled: !canUndo }, "Undo"),
            element("button", { className: "context-bar-button", onClick: onRedo, disabled: !canRedo }, "Redo")
        ],
        Center: center,
        Right: [
            contextField("Zoom", element("input", {
                type: "number",
                step: 0.1,
                min: 0.25,
                max: 3,
                className: "textbox context-bar-input",
                value: canvasScale,
                onChange: (event: React.ChangeEvent<HTMLInputElement>) => setCanvasScale(Math.min(3, Math.max(0.25, Number(event.target.value) || 1)))
            }))
        ]
    });
};

