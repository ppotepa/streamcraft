import { useMemo, useCallback, useState } from "react";
import { element, type FormNode } from "@streamcraft/forms/core";
import { WF } from "@streamcraft/forms";
import { UiText } from "../../uiText";
import { buildCanvasSurfaceNode } from "../ui/CanvasSurface";
import { buildDockPanelNode } from "../ui/DockPanel";
import { buildMenuNode } from "../ui/MenuBar";
import { buildStatusBarNode } from "../ui/StatusBar";
import { buildToolboxNode } from "../ui/ToolboxPanel";
import { buildContextBarNode } from "../ui/ContextBar";
import { createOverlayVideoPreviewDialog, type OverlayVideoItem } from "../forms/OverlayVideoPreviewDialog";
import { DataSourceExplorer } from "../forms/DataSourceExplorer";
import {
    createAutosaveOverlay,
    createLoadingOverlay,
    createPropertiesSummaryDialog,
    createScheduleSetupDialog,
    createSchedulerOverviewDialog,
    TextStyleEditor,
    createEffectPreviewDialog,
    type PropertiesSummaryTextDetails
} from "../forms";
import { createLayersToolboxDialog } from "../ui/dialogs";
import { createTextStylesDialog } from "../forms/TextStylesDialog";
import { createTextStylesAiPromptDialog } from "../forms/TextStylesAiPromptDialog";
import { createDesignerSettingsDialog } from "../forms/DesignerSettingsDialog";
import { createThemeViewerDialog } from "../forms/ThemeViewerDialog";
import { buildDesktopDesigner } from "../../Desktop.Designer";
import { themes } from "../../../themeRegistry";
import { useCanvasState } from "./useCanvasState";
import { useLayerManagement } from "./useLayerManagement";
import { useWindowVisibility } from "./useWindowVisibility";
import { useThemeManagement } from "./useThemeManagement";
import { useExtensions } from "./useExtensions";
import { useTextStyleCatalog } from "./useTextStyleCatalog";
import { useDataSources } from "./useDataSources";
import { useEffectsCatalog } from "./useEffectsCatalog";
import { useCanvasInteractions } from "../ui/useCanvasInteractions";
import { CanvasItem } from "../domain/types";
import { type DesignerUiExtension } from "../types/extension.types";
import type { EventEffectOption } from "../types/effects.types";

export interface DesktopRenderProps {
    canvas: ReturnType<typeof useCanvasState>;
    layerMgmt: ReturnType<typeof useLayerManagement>;
    windows: ReturnType<typeof useWindowVisibility>;
    theme: ReturnType<typeof useThemeManagement>;
    extensions: ReturnType<typeof useExtensions>;
    textStyles: ReturnType<typeof useTextStyleCatalog>;
    dataSources: ReturnType<typeof useDataSources> & {
        selectedEndpoints: any;
        availableFields: any;
        selectedTest: any;
        arrayValueMessage: any;
        selectedFieldSpec: any;
        previewData: any;
    };
    effectsCatalog: ReturnType<typeof useEffectsCatalog>;
    itemOps: any; // Return type of useItemOperations
    getImageSource: (item: CanvasItem) => string;

    selectedItem: CanvasItem | null;
    status: string;
    setStatus: (s: string) => void;
    saveError: string | null;
    lastSavedUtc: Date | null;
    overlayName: string;
    isSaving: boolean;
    isDirty: boolean;
    isAutoSaving: boolean;
    loadingState: { active: boolean; step: string; progress: number; log: string[] };

    canUndo: boolean;
    canRedo: boolean;
    canBind: boolean;
    scheduleRuns: Map<string, number>;
    scheduleEpoch: number;

    videoState: {
        activeVideoList: OverlayVideoItem[];
        videoSelectedId: string | null;
        currentVideoUrl: string;
        videoLoading: boolean;
        videoStatus: string;
        videoSearchQuery: string;
        videoSearchTotal: number;
        videoPlaylist: OverlayVideoItem[];
        overlayPreviewVisible: boolean;
        overlayPreviewGrid: boolean;
        overlayPreviewNodes: FormNode[];
        playlistCollapsed: boolean;
        setPlaylistCollapsed: (v: React.SetStateAction<boolean>) => void;
        selectVideo: (id: string) => void;
        fetchRandomVideo: () => void;
        setVideoSearchQuery: (v: string) => void;
        setOverlayPreviewVisible: (v: boolean) => void;
        setOverlayPreviewGrid: (v: boolean) => void;
    };
    overlayPreviewNodes: FormNode[];

    // Passed down handlers that depend on app-level refs/services
    runTest: any;
    renderJsonTree: any;

    tools: any[];
    schedulerItems: CanvasItem[];
    scheduleTarget: CanvasItem | null;
    effectsTarget: CanvasItem | null;

    textEffectsExtensions: FormNode[];
    dialogExtensions: DesignerUiExtension[];
}





export const useDesktopRender = (props: DesktopRenderProps) => {
    const {
        canvas, layerMgmt, windows, theme, extensions, textStyles, dataSources, effectsCatalog, itemOps, getImageSource,
        selectedItem, status, setStatus, saveError, lastSavedUtc, overlayName,
        isSaving, isDirty, isAutoSaving, loadingState,
        canUndo, canRedo, canBind, scheduleRuns, scheduleEpoch,
        videoState, overlayPreviewNodes, tools, schedulerItems, scheduleTarget, effectsTarget,
        textEffectsExtensions, dialogExtensions,
        runTest, renderJsonTree
    } = props;

    const {
        getDisplayLabel, getProgressPercent, getVideoSource, getBindingSummary
    } = itemOps;

    // --- Helper Implementations ---

    const addItem = useCallback((toolType: string, x: number, y: number, width: number, height: number) => {
        if (toolType === "bind" || toolType === "polygon") {
            setStatus(`${toolType} tool not implemented yet.`);
            return;
        }
        canvas.addItem(toolType, x, y, width, height, layerMgmt.activeLayerId, layerMgmt.layers);
        canvas.setActiveTool("select");
    }, [canvas, layerMgmt.activeLayerId, layerMgmt.layers, setStatus]);

    // Canvas Interactions
    const {
        beginResize,
        handleCanvasMouseDown,
        handleCanvasMouseMove,
        handleCanvasMouseUp,
        handleItemMouseDown
    } = useCanvasInteractions({
        activeTool: canvas.activeTool,
        setActiveTool: canvas.setActiveTool,
        items: canvas.items,
        setItems: canvas.setItems,
        selectedIds: canvas.selectedIds,
        setSelectedIds: canvas.setSelectedIds,
        selectionBox: canvas.selectionBox,
        setSelectionBox: canvas.setSelectionBox,
        placementBox: canvas.placementBox,
        setPlacementBox: canvas.setPlacementBox,
        dragStart: canvas.dragStart,
        placementStart: canvas.placementStart,
        transformRef: canvas.transformRef,
        canvasScale: canvas.canvasScale,
        panRef: canvas.panRef,
        beginTransformHold: canvas.beginTransformHold,
        endTransformHold: canvas.endTransformHold,
        addItem
    });

    const getItemStyle = useCallback((item: CanvasItem) => {
        const parts = [
            `left: ${item.x}px;`,
            `top: ${item.y}px;`,
            `width: ${item.width}px;`,
            `height: ${item.height}px;`,
            `z-index: ${item.zIndex ?? 1};`,
            item.visible === false ? 'display: none;' : '',
            item.locked ? 'pointer-events: none;' : ''
        ].filter(Boolean);

        if (item.type === "line") {
            const thickness = Math.max(2, item.strokeWidth ?? item.height);
            parts.push(`height: ${thickness}px;`);
            parts.push(`background: ${item.stroke ?? "rgba(0,0,0,0.6)"};`);
            parts.push("border: none;");
            return parts.join(" ");
        }
        if (item.type === "text") {
            parts.push(`font-family: ${item.fontFamily ?? "Segoe UI"};`);
            parts.push(`font-size: ${item.fontSize ?? 16}px;`);
            parts.push(`font-weight: ${item.fontWeight ?? "normal"};`);
            parts.push(`font-style: ${item.fontStyle ?? "normal"};`);
            parts.push(`color: ${item.textColor ?? "#222222"};`);
            parts.push(`text-transform: ${item.textTransform ?? "none"};`);
            parts.push(`letter-spacing: ${item.letterSpacing ?? 0}px;`);
            const shadowX = item.textShadowX ?? 0;
            const shadowY = item.textShadowY ?? 0;
            const shadowBlur = item.textShadowBlur ?? 0;
            const shadowColor = item.textShadowColor ?? "#000000";
            parts.push(`text-shadow: ${shadowX}px ${shadowY}px ${shadowBlur}px ${shadowColor};`);
        }
        if (item.type === "image") {
            const videoSource = getVideoSource(item);
            if (videoSource) {
                return parts.join(" ");
            }
            const source = getImageSource(item);
            if (source) {
                parts.push(`background-image: url('${source}');`);
                parts.push("background-size: cover;");
                parts.push("background-position: center;");
            }
        }
        if (item.type === "rect" || item.type === "ellipse") {
            parts.push(`background: ${item.fill ?? "transparent"};`);
            parts.push(`border: 1px solid ${item.stroke ?? "rgba(0,0,0,0.35)"};`);
        }
        return parts.join(" ");
    }, [getImageSource, getVideoSource]);

    // Layer Management Helpers
    const handleSelectActiveLayer = useCallback((layerId: string) => {
        layerMgmt.handleSelectActiveLayer(layerId);
        canvas.setSelectedIds(canvas.items.filter((item) => (item.layerId ?? layerId) === layerId).map((item) => item.id));
    }, [layerMgmt, canvas]);

    const handleAddLayer = useCallback(() => {
        layerMgmt.handleAddLayer();
    }, [layerMgmt]);

    const handleDeleteLayer = useCallback((layerId: string) => {
        layerMgmt.handleDeleteLayer(layerId, canvas.items, canvas.setItems);
    }, [layerMgmt, canvas.items, canvas.setItems]);

    const handleLayerCss = useCallback((layerId: string) => {
        const layer = layerMgmt.layers.find((entry) => entry.id === layerId);
        setStatus(`Layer CSS settings for ${layer?.name ?? "Layer"} (coming soon)`);
    }, [layerMgmt.layers, setStatus]);

    const handleLayerBlending = useCallback((layerId: string) => {
        const layer = layerMgmt.layers.find((entry) => entry.id === layerId);
        setStatus(`Layer blending settings for ${layer?.name ?? "Layer"} (coming soon)`);
    }, [layerMgmt.layers, setStatus]);

    const handleLayerGroup = useCallback((layerId: string) => {
        const layer = layerMgmt.layers.find((entry) => entry.id === layerId);
        setStatus(`Layer grouping for ${layer?.name ?? "Layer"} (coming soon)`);
    }, [layerMgmt.layers, setStatus]);

    const handleLayerLock = useCallback((layerId: string) => {
        layerMgmt.handleLayerLock(layerId, canvas.items, canvas.setItems);
    }, [layerMgmt, canvas.items, canvas.setItems]);

    const handleSelectLayer = useCallback((id: string, multiSelect: boolean) => {
        canvas.setSelectedIds((prev) => {
            if (multiSelect) {
                return prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
            }
            return [id];
        });
    }, [canvas]);

    const handleToggleVisibility = useCallback((id: string) => {
        canvas.setItems((prev) =>
            prev.map((item) => (item.id === id ? { ...item, visible: item.visible === false ? true : false } : item))
        );
    }, [canvas]);

    const handleToggleLock = useCallback((id: string) => {
        canvas.setItems((prev) => prev.map((item) => (item.id === id ? { ...item, locked: !item.locked } : item)));
    }, [canvas]);

    const handleReorderLayer = useCallback((id: string, newZIndex: number) => {
        canvas.setItems((prev) => prev.map((item) => (item.id === id ? { ...item, zIndex: newZIndex } : item)));
    }, [canvas]);

    const handleReorderItem = useCallback((draggedId: string, targetId: string) => {
        if (!draggedId || !targetId || draggedId === targetId) return;
        canvas.setItems((prev) => {
            const layerId = layerMgmt.activeLayerId || layerMgmt.layers[0]?.id || "layer-1";
            const layerItems = prev
                .filter((item) => (item.layerId ?? layerId) === layerId)
                .sort((a, b) => (b.zIndex ?? 1) - (a.zIndex ?? 1));

            const fromIndex = layerItems.findIndex((item) => item.id === draggedId);
            const toIndex = layerItems.findIndex((item) => item.id === targetId);
            if (fromIndex === -1 || toIndex === -1) return prev;

            const nextLayerItems = [...layerItems];
            const [moved] = nextLayerItems.splice(fromIndex, 1);
            nextLayerItems.splice(toIndex, 0, moved);

            const updated = new Map<string, number>();
            const maxIndex = nextLayerItems.length;
            nextLayerItems.forEach((item, index) => {
                updated.set(item.id, maxIndex - index);
            });

            return prev.map((item) =>
                updated.has(item.id) ? { ...item, zIndex: updated.get(item.id) } : item
            );
        });
    }, [canvas, layerMgmt]);

    const formatInterval = useCallback((value: number) => {
        if (!value || value <= 0) return "Off";
        if (value < 1000) return `${value}ms`;
        if (value < 60000) {
            const seconds = value / 1000;
            return `${Number.isInteger(seconds) ? seconds.toFixed(0) : seconds.toFixed(1)}s`;
        }
        const minutes = Math.round((value / 60000) * 10) / 10;
        return `${minutes}m`;
    }, []);

    const formatTimeAgo = useCallback((timestamp?: number) => {
        if (!timestamp) return "Never";
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        if (seconds < 60) return `${seconds}s ago`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        return `${hours}h ago`;
    }, []);

    const normalizeExtensionNodes = useCallback((form?: FormNode | FormNode[] | null) => {
        if (!form) return [] as FormNode[];
        return Array.isArray(form) ? (form.filter(Boolean) as FormNode[]) : [form as FormNode];
    }, []);

    const withDockProps = useCallback((dialogNode: any, dockId: string) => {
        if (!dialogNode) return null;
        return {
            ...dialogNode,
            props: {
                ...(dialogNode.props ?? {}),
                dockId,
                dragBounds: ".playground2-outer-form",
                onDragStart: "dockDragStart",
                onDragMove: "dockDragMove",
                onDragEnd: "dockDragEnd"
            }
        };
    }, []);

    const asDocked = useCallback((dialogNode: any) => {
        if (!dialogNode) return null;
        return {
            ...dialogNode,
            props: {
                ...(dialogNode.props ?? {}),
                isDocked: true,
                draggable: false,
                onUndock: "dockUndock"
            }
        };
    }, []);

    const isDocked = useCallback((dockId: string) => windows.dockedWindows.includes(dockId), [windows.dockedWindows]);

    const [triggerSource, setTriggerSource] = useState("EventPlayground.Donation");
    const [triggerRule, setTriggerRule] = useState("Always");

    const parseEffectOptionValue = useCallback((option: EventEffectOption, rawValue: string | boolean) => {
        if (option.valueType === "boolean") {
            return Boolean(rawValue);
        }
        if (option.valueType === "number") {
            const parsed = Number(rawValue);
            return Number.isFinite(parsed) ? parsed : option.defaultValue ?? 0;
        }
        if (option.valueType === "json") {
            if (typeof rawValue !== "string" || rawValue.trim().length === 0) {
                return {};
            }
            try {
                return JSON.parse(rawValue);
            } catch {
                return rawValue;
            }
        }
        return String(rawValue);
    }, []);

    const renderEffectOptionInput = useCallback((option: EventEffectOption) => {
        const currentValue = effectsCatalog.readOptionValue(option);
        if (option.valueType === "boolean") {
            return WF.Element(
                "label",
                { className: "checkbox-label effects-catalog-checkbox" },
                WF.Element("input", {
                    className: "checkbox",
                    type: "checkbox",
                    checked: Boolean(currentValue),
                    onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
                        effectsCatalog.updateSelectedOption(option, event.target.checked);
                    }
                }),
                WF.Element("span", { className: "checkbox-text" }, option.label)
            );
        }

        if (option.valueType === "select") {
            return WF.Element(
                "select",
                {
                    className: "combobox effects-catalog-input",
                    value: String(currentValue ?? option.defaultValue ?? ""),
                    onChange: (event: React.ChangeEvent<HTMLSelectElement>) =>
                        effectsCatalog.updateSelectedOption(option, parseEffectOptionValue(option, event.target.value))
                },
                ...(option.choices ?? []).map((choice) =>
                    WF.Element("option", { key: `${option.key}-${choice.value}`, value: choice.value }, choice.label)
                )
            );
        }

        if (option.valueType === "json") {
            return WF.Element("textarea", {
                className: "textbox effects-catalog-textarea",
                value: typeof currentValue === "string"
                    ? currentValue
                    : JSON.stringify(currentValue ?? {}, null, 2),
                onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) =>
                    effectsCatalog.updateSelectedOption(option, parseEffectOptionValue(option, event.target.value))
            });
        }

        const inputType = option.valueType === "number"
            ? "number"
            : option.valueType === "color"
                ? "color"
                : "text";

        return WF.Element("input", {
            className: "textbox effects-catalog-input",
            type: inputType,
            value: String(currentValue ?? option.defaultValue ?? ""),
            onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
                effectsCatalog.updateSelectedOption(option, parseEffectOptionValue(option, event.target.value))
        });
    }, [effectsCatalog, parseEffectOptionValue]);

    const triggerSourceOptions = useMemo(
        () => [
            "EventPlayground.Donation",
            "EventPlayground.ChatMessage",
            "Manual.Click"
        ],
        []
    );

    const triggerRuleOptions = useMemo(
        () => [
            "Always",
            "Amount >= 5",
            "Amount >= 20",
            "Message contains keyword"
        ],
        []
    );



    const menuNode = buildMenuNode();

    const contextBarNode = buildContextBarNode({
        selectedItem,
        onUpdateItem: canvas.updateItem,
        onShowTextStyleEditor: () => windows.setShowTextStyleEditor(true),
        onShowDataSourceExplorer: () => windows.setShowDataSourceExplorer(true),
        textEffectsExtensions,
        canUndo,
        canRedo,
        canBind,
        hasBinding: Boolean(selectedItem && canvas.items && getBindingSummary(selectedItem)),
        scheduleIntervalMs: selectedItem?.scheduleIntervalMs ?? 0,
        UiText
    });

    const layoutNode = buildCanvasSurfaceNode({
        items: canvas.items,
        selectedIds: canvas.selectedIds,
        getItemStyle,
        getDisplayLabel,
        getProgressPercent,
        getImageSource,
        getVideoSource,
        beginResize,
        handleItemMouseDown,
        selectionBox: canvas.selectionBox,
        placementBox: canvas.placementBox,
        onMouseDown: handleCanvasMouseDown,
        onMouseMove: handleCanvasMouseMove,
        onMouseUp: handleCanvasMouseUp
    });

    const toolboxNode = buildToolboxNode(tools, canvas.activeTool);

    const statusBarNode = buildStatusBarNode({
        status,
        saveError,
        lastSavedUtc,
        overlayName,
        isSaving,
        isDirty,
        canvasScale: canvas.canvasScale
    });

    const canvasFormNode = WF.Panel(
        {
            ClassName: "playground2-canvas-form",
            Style: "position: relative; flex: 1; min-height: 0; display: flex; align-items: center; justify-content: center; overflow: auto;"
        },
        element(
            "div",
            {
                className: "canvas-wrapper",
                style: `transform: scale(${canvas.canvasScale}); transform-origin: center;`
            },
            layoutNode
        )
    );

    const propertiesTextDetails: PropertiesSummaryTextDetails | null = selectedItem?.type === "text"
        ? {
            fontFamily: selectedItem.fontFamily ?? UiText.desktop.options.fonts[0] ?? "Segoe UI",
            fontSize: `${selectedItem.fontSize ?? 16}px`,
            fontWeight: selectedItem.fontWeight ?? "normal",
            fontStyle: selectedItem.fontStyle ?? "normal",
            textTransform: selectedItem.textTransform ?? "none",
            textColor: selectedItem.textColor ?? "#222222",
            letterSpacing: String(selectedItem.letterSpacing ?? 0),
            shadow: `${selectedItem.textShadowX ?? 0}px, ${selectedItem.textShadowY ?? 0}px, ${selectedItem.textShadowBlur ?? 0}px, ${selectedItem.textShadowColor ?? "#000000"}`
        }
        : null;

    const propertiesNode = selectedItem
        ? withDockProps(createPropertiesSummaryDialog({
            canBind,
            bindingSummary: canBind ? getBindingSummary(selectedItem) : "",
            fieldPath: selectedItem.fieldPath ?? UiText.desktop.options.select,
            textDetails: propertiesTextDetails
        }), "properties")
        : null;

    const dataSourceExplorerNode = windows.showDataSourceExplorer
        ? withDockProps(DataSourceExplorer({
            selectedItem,
            sources: dataSources.sources,
            topCategories: dataSources.topCategories,
            subcategories: dataSources.subcategories,
            filteredSources: dataSources.filteredSources,
            selectedCategoryId: dataSources.selectedCategoryId,
            selectedSubcategoryId: dataSources.selectedSubcategoryId,
            selectedEndpoints: dataSources.selectedEndpoints,
            availableFields: dataSources.availableFields,
            selectedTest: dataSources.selectedTest,
            arrayValueMessage: dataSources.arrayValueMessage,
            selectedFieldSpec: dataSources.selectedFieldSpec,
            previewData: dataSources.previewData,
            isSystemSource: dataSources.isSystemSource,
            renderJsonTree,
            onUpdateItem: canvas.updateItem,
            onSetSelectedCategoryId: dataSources.setSelectedCategoryId,
            onSetSelectedSubcategoryId: dataSources.setSelectedSubcategoryId,
            onRunTest: runTest,
            onClose: () => windows.setShowDataSourceExplorer(false)
        }), "dataSourceExplorer")
        : null;

    const loadingOverlayNode = loadingState.active
        ? createLoadingOverlay({
            step: loadingState.step,
            progress: loadingState.progress,
            log: loadingState.log
        })
        : null;

    const autosaveOverlayNode = isAutoSaving ? createAutosaveOverlay() : null;

    const textStyleEditorNode = selectedItem && selectedItem.type === "text" && windows.showTextStyleEditor
        ? withDockProps(TextStyleEditor({
            selectedItem,
            onUpdateItem: canvas.updateItem,
            onClose: () => windows.setShowTextStyleEditor(false)
        }), "textStyleEditor")
        : null;

    const textStylesAiPromptNode = textStyles.aiPromptOpen
        ? createTextStylesAiPromptDialog({
            prompt: textStyles.aiPrompt,
            response: textStyles.aiResponse,
            isGenerating: textStyles.aiBusy,
            onPromptChange: (value) => textStyles.setAiPrompt(value),
            onGenerate: textStyles.handleAiGenerate,
            onClose: () => textStyles.setAiPromptOpen(false)
        })
        : null;

    const schedulerOverviewItemsData = schedulerItems.map((item) => ({
        id: item.id,
        label: item.name ?? item.label ?? item.type,
        bindingSummary: getBindingSummary(item),
        intervalLabel: formatInterval(item.scheduleIntervalMs ?? 0),
        lastRunLabel: formatTimeAgo(scheduleRuns.get(item.id))
    }));

    const scheduleSetupNode = windows.showScheduleSetup && scheduleTarget
        ? withDockProps(createScheduleSetupDialog({
            targetLabel: scheduleTarget.name ?? scheduleTarget.label ?? scheduleTarget.type,
            bindingSummary: getBindingSummary(scheduleTarget),
            intervalMs: scheduleTarget.scheduleIntervalMs ?? 0,
            onUpdateInterval: (value) => canvas.updateItem(scheduleTarget.id, { scheduleIntervalMs: value })
        }), "scheduleSetup")
        : null;

    const effectsCatalogNode = windows.showEffectsCatalog && effectsTarget
        ? withDockProps(WF.Window(
            {
                Text: "Effects",
                Icon: "star",
                Dialog: true,
                Draggable: true,
                OnClose: "closeEffectsCatalog",
                Style: "position: absolute; left: 220px; top: 120px; width: min(560px, 92vw); height: min(520px, 78vh);",
                BodyClassName: "effects-catalog-window"
            },
            WF.Element("div", { className: "effects-catalog-shell" },
                WF.Element("div", { className: "effects-catalog-header" },
                    WF.Element("div", { className: "effects-catalog-title" }, "Effects for ", effectsTarget.name ?? effectsTarget.label ?? effectsTarget.type),
                    WF.Element("div", { className: "effects-catalog-sub" }, "Select effect, configure options, test preview, then save.")
                ),
                WF.Element("div", { className: "effects-catalog-body" },
                    WF.Element("div", { className: "effects-catalog-left" },
                        WF.Element("div", { className: "effects-catalog-filters" },
                            WF.Element("input", {
                                className: "textbox effects-catalog-search",
                                type: "text",
                                value: effectsCatalog.search,
                                placeholder: "Search effects...",
                                onChange: (event: React.ChangeEvent<HTMLInputElement>) => effectsCatalog.setSearch(event.target.value)
                            }),
                            WF.Element(
                                "select",
                                {
                                    className: "combobox effects-catalog-category",
                                    value: effectsCatalog.category,
                                    onChange: (event: React.ChangeEvent<HTMLSelectElement>) => effectsCatalog.setCategory(event.target.value)
                                },
                                ...effectsCatalog.categories.map((entry) =>
                                    WF.Element("option", { key: `effect-category-${entry}`, value: entry }, entry)
                                )
                            )
                        ),
                        WF.Element("div", { className: "effects-catalog-list" },
                            ...(effectsCatalog.entries.length > 0
                                ? effectsCatalog.entries.map((entry) =>
                                    WF.Element(
                                        "button",
                                        {
                                            key: entry.catalogId,
                                            className: `effects-catalog-item ${effectsCatalog.selectedEntry?.catalogId === entry.catalogId ? "is-active" : ""}`.trim(),
                                            onClick: () => {
                                                effectsCatalog.selectEffect(entry.catalogId);
                                                effectsCatalog.runPreview();
                                            }
                                        },
                                        WF.Element("div", { className: "effects-catalog-item-title" }, entry.name),
                                        WF.Element("div", { className: "effects-catalog-item-meta" }, `${entry.category}  |  ${entry.typeName}`),
                                        WF.Element("div", { className: "effects-catalog-item-desc" }, entry.description ?? "No description.")
                                    )
                                )
                                : [
                                    WF.Element("div", { key: "effects-empty", className: "effects-catalog-note" }, "No effects found.")
                                ])
                        )
                    ),
                    WF.Element("div", { className: "effects-catalog-right" },
                        effectsCatalog.selectedEntry
                            ? WF.Element(
                                "div",
                                { className: "effects-catalog-detail" },
                                WF.Element("div", { className: "effects-catalog-detail-title" }, effectsCatalog.selectedEntry.name),
                                WF.Element("div", { className: "effects-catalog-detail-meta" }, `Type: ${effectsCatalog.selectedEntry.typeName}`),
                                WF.Element("div", { className: "effects-catalog-detail-meta" }, `Category: ${effectsCatalog.selectedEntry.category}`),
                                WF.Element("div", { className: "effects-catalog-detail-desc" }, effectsCatalog.selectedEntry.description ?? ""),
                                WF.Element("div", { className: "effects-catalog-options" },
                                    ...(effectsCatalog.selectedEntry.options.length > 0
                                        ? effectsCatalog.selectedEntry.options.map((option) =>
                                            WF.Element(
                                                "div",
                                                { key: `${effectsCatalog.selectedEntry?.catalogId}-${option.key}`, className: "effects-catalog-option" },
                                                option.valueType === "boolean"
                                                    ? renderEffectOptionInput(option)
                                                    : [
                                                        WF.Element("label", { className: "effects-catalog-option-label" }, option.label),
                                                        renderEffectOptionInput(option)
                                                    ]
                                            )
                                        )
                                        : [WF.Element("div", { key: "effects-no-options", className: "effects-catalog-note" }, "This effect has no configurable options.")])
                                ),
                                WF.Element("div", { className: "effects-catalog-trigger-grid" },
                                    WF.Element("div", { className: "effects-catalog-option" },
                                        WF.Element("label", { className: "effects-catalog-option-label" }, "Trigger Source"),
                                        WF.Element(
                                            "select",
                                            {
                                                className: "combobox effects-catalog-input",
                                                value: triggerSource,
                                                onChange: (event: React.ChangeEvent<HTMLSelectElement>) => setTriggerSource(event.target.value)
                                            },
                                            ...triggerSourceOptions.map((entry) =>
                                                WF.Element("option", { key: `trigger-source-${entry}`, value: entry }, entry)
                                            )
                                        )
                                    ),
                                    WF.Element("div", { className: "effects-catalog-option" },
                                        WF.Element("label", { className: "effects-catalog-option-label" }, "Simple Rule"),
                                        WF.Element(
                                            "select",
                                            {
                                                className: "combobox effects-catalog-input",
                                                value: triggerRule,
                                                onChange: (event: React.ChangeEvent<HTMLSelectElement>) => setTriggerRule(event.target.value)
                                            },
                                            ...triggerRuleOptions.map((entry) =>
                                                WF.Element("option", { key: `trigger-rule-${entry}`, value: entry }, entry)
                                            )
                                        )
                                    )
                                )
                            )
                            : WF.Element("div", { className: "effects-catalog-note" }, "Select an effect from the list.")
                    )
                ),
                WF.Element("div", { className: "effects-catalog-status" }, effectsCatalog.loading ? "Loading effect types..." : effectsCatalog.loadingError ?? effectsCatalog.status),
                WF.Element("div", { className: "effects-catalog-actions" },
                    WF.Element("button", {
                        className: "button",
                        onClick: () => {
                            if (!effectsCatalog.selectedEntry || !effectsTarget) return;
                            setStatus(`Attached placeholder: ${effectsCatalog.selectedEntry.name} <- ${triggerSource} (${triggerRule})`);
                        }
                    }, "Attach Trigger"),
                    WF.Element("button", { className: "button", onClick: () => effectsCatalog.runPreview() }, "Test"),
                    WF.Element("button", {
                        className: "button",
                        onClick: () => void effectsCatalog.saveSelectedEffect(
                            effectsTarget.id,
                            effectsTarget.name ?? effectsTarget.label ?? effectsTarget.type
                        )
                    }, effectsCatalog.isSaving ? "Saving..." : "Save Effect"),
                    WF.Element("button", { className: "button", onClick: () => void effectsCatalog.refreshTypes() }, "Refresh Types"),
                    WF.Element("div", { style: "flex: 1;" }),
                    WF.Element("button", { className: "button", onClick: "closeEffectsCatalog" }, "Close")
                )
            )
        ), "effectsCatalog")
        : null;

    const previewConfig = effectsCatalog.selectedConfig as Record<string, unknown> | null;
    const previewCommand = typeof previewConfig?.command === "string" ? previewConfig.command : "";
    const effectPreviewNode = windows.showEffectsCatalog && effectsTarget
        ? createEffectPreviewDialog({
            overlayNodes: overlayPreviewNodes,
            overlayName,
            targetLabel: effectsTarget.name ?? effectsTarget.label ?? effectsTarget.type,
            effectName: effectsCatalog.selectedEntry?.name ?? "None",
            effectKind: effectsCatalog.selectedEntry?.presetId ?? previewCommand,
            options: previewConfig,
            previewTick: effectsCatalog.previewTick
        })
        : null;

    const schedulerOverviewNode = windows.showSchedulerOverview
        ? withDockProps(createSchedulerOverviewDialog({
            scheduleEpoch,
            items: schedulerOverviewItemsData
        }), "schedulerOverview")
        : null;

    const layersToolboxNode = windows.showLayersToolbox
        ? withDockProps(createLayersToolboxDialog({
            layers: layerMgmt.layers,
            activeLayerId: layerMgmt.activeLayerId,
            onSelectActiveLayer: handleSelectActiveLayer,
            onAddLayer: handleAddLayer,
            onDeleteLayer: handleDeleteLayer,
            onLayerCss: handleLayerCss,
            onLayerBlending: handleLayerBlending,
            onLayerGroup: handleLayerGroup,
            onLayerLock: handleLayerLock,
            items: canvas.items.map((item) => ({
                id: item.id,
                name: item.name,
                type: item.type,
                zIndex: item.zIndex ?? 1,
                visible: item.visible !== false,
                locked: item.locked === true,
                layerId: item.layerId ?? layerMgmt.activeLayerId
            })),
            selectedIds: canvas.selectedIds,
            onSelectLayer: handleSelectLayer,
            onToggleVisibility: handleToggleVisibility,
            onToggleLock: handleToggleLock,
            onReorderLayer: handleReorderLayer,
            onReorderItem: handleReorderItem,
            itemsExpanded: layerMgmt.itemsInLayerExpanded,
            onToggleItemsFold: layerMgmt.toggleItemsFold,
            onClose: () => windows.setShowLayersToolbox(false)
        }), "layers")
        : null;

    const overlayVideoPreviewNode = windows.showOverlayVideoPreview
        ? withDockProps(createOverlayVideoPreviewDialog({
            videos: videoState.activeVideoList,
            selectedId: videoState.videoSelectedId,
            currentVideoUrl: videoState.currentVideoUrl,
            isLoading: videoState.videoLoading,
            statusMessage: videoState.videoStatus,
            searchQuery: videoState.videoSearchQuery,
            filteredCount: videoState.activeVideoList.length,
            totalCount: videoState.videoSearchQuery.trim().length > 0
                ? (videoState.videoSearchTotal > 0 ? videoState.videoSearchTotal : videoState.activeVideoList.length)
                : videoState.videoPlaylist.length,
            showOverlay: videoState.overlayPreviewVisible,
            showGrid: videoState.overlayPreviewGrid,
            overlayNodes: videoState.overlayPreviewNodes,
            playlistCollapsed: videoState.playlistCollapsed,
            onTogglePlaylist: () => videoState.setPlaylistCollapsed((prev: boolean) => !prev),
            onSelectVideo: (videoId) => videoState.selectVideo(videoId),
            onRandom: () => videoState.fetchRandomVideo(),
            onSearchChange: (value) => videoState.setVideoSearchQuery(value),
            onToggleOverlay: (value) => videoState.setOverlayPreviewVisible(value),
            onToggleGrid: (value) => videoState.setOverlayPreviewGrid(value),
            onClose: () => windows.setShowOverlayVideoPreview(false)
        }), "overlayPreview")
        : null;

    // We already moved selectedId logic to the hook, so we pass it from hook state
    const textStylesDialogNode = extensions.openUiExtensions.has("text-styles")
        ? createTextStylesDialog({
            categories: textStyles.categories,
            activeCategoryId: textStyles.categoryId,
            styles: textStyles.pagedTextStyles,
            totalCount: textStyles.totalCount,
            selectedId: textStyles.selectedId,
            search: textStyles.search,
            previewText: textStyles.previewText,
            customText: textStyles.customText,
            fontSource: textStyles.fontSource,
            weightFilter: textStyles.weightFilter,
            caseFilter: textStyles.caseFilter,
            shadowFilter: textStyles.shadowFilter,
            favorites: textStyles.favorites,
            statusTone: textStyles.statusTone,
            canLoadMore: textStyles.canLoadMore,
            isSyncPreview: textStyles.syncPreview,
            isRefreshing: textStyles.refreshing,
            statusMessage: textStyles.status,
            onSelectCategory: (id) => textStyles.setCategoryId(id),
            onSelectStyle: (id) => textStyles.setSelectedId(id),
            onApplyStyle: (id) => textStyles.applyStyleById(id),
            onApplySelected: textStyles.applySelectedStyle,
            onToggleFavorite: (id) => textStyles.toggleFavorite(id),
            onHoverStyle: (id) => textStyles.setHoveredId(id),
            onLoadMore: () => {
                const maxTotal = Math.min(textStyles.totalCount, 500);
                const maxPage = Math.max(1, Math.ceil(maxTotal / 24)); // Page size was 24 in Desktop
                if (textStyles.page < maxPage) {
                    textStyles.setPage((prev) => prev + 1);
                }
            },
            onToggleSyncPreview: (value) => textStyles.setSyncPreview(value),
            onSearchChange: (value) => textStyles.setSearch(value),
            onPreviewChange: (value) => textStyles.setPreviewText(value),
            onCustomTextChange: (value) => textStyles.setCustomText(value),
            onFontSourceChange: (value) => textStyles.setFontSource(value),
            onWeightFilterChange: (value) => textStyles.setWeightFilter(value),
            onCaseFilterChange: (value) => textStyles.setCaseFilter(value),
            onShadowFilterChange: (value) => textStyles.setShadowFilter(value),
            onRefresh: () => void textStyles.refreshCatalog(),
            onAiPrompt: () => textStyles.setAiPromptOpen(true)
        })
        : null;

    const themeLabels = useMemo(() => themes.map((t) => t.label), [themes]);

    const designerSettingsNode = windows.showDesignerSettings
        ? createDesignerSettingsDialog({
            onClose: "closeDesignerSettings",
            onApply: "applyThemeSelection",
            onConfirm: "closeDesignerSettings",
            themeOptions: themeLabels,
            // Oh right, themeItems was just `themes.map(t => t.label)`. I can recompute it here or pass it.
            themeSelectedIndex: theme.themeSelection,
            onThemeChange: "changeTheme",
            themeModeOptions: ["Light", "Dark"],
            themeModeIndex: theme.themeModeSelection === "dark" ? 1 : 0,
            onThemeModeChange: "changeThemeMode",
            onOpenThemeViewer: "openThemeViewer"
        })
        : null;

    const themeViewerNode = theme.showThemeViewer
        ? createThemeViewerDialog({
            themes: themeLabels,
            selectedIndex: theme.themeSelection,
            onThemeSelect: "selectTheme",
            modeOptions: ["Light", "Dark"],
            modeSelectedIndex: theme.themeModeSelection === "dark" ? 1 : 0,
            onModeChange: "changeThemeMode",
            onApply: "applyThemeSelection",
            aiPrompt: theme.themeAiPrompt,
            aiResponse: theme.themeAiResponse,
            aiStatus: theme.themeAiStatus,
            aiIsBusy: theme.themeAiBusy,
            aiThemeName: theme.themeAiThemeName,
            aiThemeDescription: theme.themeAiThemeDescription,
            aiOnPromptChange: "aiThemePromptChange",
            aiOnGenerate: "aiThemeGenerate",
            aiOnApply: "aiThemeApply",
            aiOnClear: "aiThemeClear",
            aiOnRefreshStatus: "aiThemeRefresh",
            onClose: "closeThemeViewer"
        })
        : null;

    const extensionDialogNodes = [
        textStylesDialogNode,
        ...dialogExtensions
            .filter((extension) => extensions.getExtensionGroupId(extension) !== "text-styles")
            .filter((extension) => extensions.openUiExtensions.has(extensions.getExtensionGroupId(extension)))
            .flatMap((extension) => normalizeExtensionNodes(extension.form))
    ].filter(Boolean);

    const dockedNodes = [
        isDocked("properties") ? asDocked(propertiesNode) : null,
        isDocked("layers") ? asDocked(layersToolboxNode) : null,
        isDocked("schedulerOverview") ? asDocked(schedulerOverviewNode) : null,
        isDocked("scheduleSetup") ? asDocked(scheduleSetupNode) : null,
        isDocked("effectsCatalog") ? asDocked(effectsCatalogNode) : null,
        isDocked("dataSourceExplorer") ? asDocked(dataSourceExplorerNode) : null,
        isDocked("textStyleEditor") ? asDocked(textStyleEditorNode) : null,
        isDocked("overlayPreview") ? asDocked(overlayVideoPreviewNode) : null
    ].filter(Boolean);

    const dockPanelNode = buildDockPanelNode({ isDockCollapsed: windows.isDockCollapsed, dockedNodes });
    const floatingNodes = [
        isDocked("properties") ? null : propertiesNode,
        isDocked("layers") ? null : layersToolboxNode,
        isDocked("schedulerOverview") ? null : schedulerOverviewNode,
        isDocked("scheduleSetup") ? null : scheduleSetupNode,
        isDocked("effectsCatalog") ? null : effectsCatalogNode,
        effectPreviewNode,
        isDocked("dataSourceExplorer") ? null : dataSourceExplorerNode,
        isDocked("textStyleEditor") ? null : textStyleEditorNode,
        textStylesAiPromptNode,
        isDocked("overlayPreview") ? null : overlayVideoPreviewNode,
        designerSettingsNode,
        themeViewerNode,
        ...extensionDialogNodes
    ].filter(Boolean);

    const formNode = buildDesktopDesigner({
        menuNode,
        contextBarNode,
        canvasFormNode,
        toolboxNode,
        floatingNodes,
        isDockPreview: windows.isDockPreview,
        dockPanelNode,
        statusBarNode
    });

    return {
        formNode,
        loadingOverlayNode,
        autosaveOverlayNode,
        // Expose individual nodes if needed for debugging or override
        floatingNodes,
        dockPanelNode
    };
};

