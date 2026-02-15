import { useMemo, useCallback, useEffect, useState } from "react";
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
import { DataSourceExplorer, type DataSourceExplorerTabId } from "../forms/DataSourceExplorer";
import { buildContextTabBar } from "../context/contextTabBar";
import { getVisibleContextTabsForScope } from "../context/contextTabs";
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
import { fetchChatHistory } from "../services/chatFeedService";
import { CanvasItem } from "../domain/types";
import { buildChatPatchFromDraft, CHAT_CSS_SNIPPETS, CHAT_PRESET_IDS, CHAT_STYLE_PRESETS, clampNumber, colorToRgba, computeContrastTone, createChatDraft, formatTimestampLabel, isDraftPresetModified, normalizeHexColor, scopeChatCss, serializeChatDraft, type ChatSettingsDraft, type ChatSettingsTabId, type ChatSourceStatusTone, type ChatStylePresetId, validateCustomChatCss, withPresetTokens } from "../chatSettings/shared";
import type { DesignerProjectSummary } from "../services/projectService";
import { clampRuntimeIntervalMs } from "../runtime/runtimePolicy";
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
    runtimeSettings: {
        defaultIntervalMs: number;
        setDefaultIntervalMs: (value: number) => void;
        resetRuntimeSettings: () => void;
    };
    projectActions: {
        saveProject: (projectName: string) => Promise<boolean>;
        listRecentProjects: (limit: number) => Promise<DesignerProjectSummary[]>;
        openProject: (projectId: string) => Promise<boolean>;
        createNewProject: () => void;
    };

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
        runTest, renderJsonTree, runtimeSettings, projectActions
    } = props;

    const {
        getDisplayLabel, getChatLines, getChatEntries, getProgressPercent, getVideoSource, getBindingSummary
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

    const [showChatSettings, setShowChatSettings] = useState(false);
    const [chatSettingsTargetId, setChatSettingsTargetId] = useState<string | null>(null);
    const [chatSettingsTab, setChatSettingsTab] = useState<ChatSettingsTabId>("data");
    const [chatSettingsDraft, setChatSettingsDraft] = useState<ChatSettingsDraft | null>(null);
    const [chatSettingsInitialDraft, setChatSettingsInitialDraft] = useState<ChatSettingsDraft | null>(null);
    const [chatPreviewMode, setChatPreviewMode] = useState<"desktop" | "mobile">("desktop");
    const [chatSourceTesting, setChatSourceTesting] = useState(false);
    const [chatSourceProbe, setChatSourceProbe] = useState<{
        sourceId: string;
        tone: ChatSourceStatusTone;
        note: string;
        lastMessageAt: number | null;
    }>({
        sourceId: "system-chat",
        tone: "no-data",
        note: "Not tested",
        lastMessageAt: null
    });
    const [dataSourceExplorerTab, setDataSourceExplorerTab] = useState<DataSourceExplorerTabId>("data");
    const [saveProjectName, setSaveProjectName] = useState<string>("");
    const [saveProjectBusy, setSaveProjectBusy] = useState(false);
    const [recentProjects, setRecentProjects] = useState<DesignerProjectSummary[]>([]);
    const [recentProjectsLoading, setRecentProjectsLoading] = useState(false);
    const [recentProjectsError, setRecentProjectsError] = useState<string | null>(null);
    const [selectedRecentProjectId, setSelectedRecentProjectId] = useState<string>("");
    const [openRecentBusy, setOpenRecentBusy] = useState(false);

    const openDataSourceExplorer = useCallback((tab: DataSourceExplorerTabId = "data") => {
        setDataSourceExplorerTab(tab);
        windows.setShowDataSourceExplorer(true);
    }, [windows]);

    const openChatSettingsForItem = useCallback((item: CanvasItem) => {
        const draft = createChatDraft(item);
        setChatSettingsTargetId(item.id);
        setChatSettingsDraft(draft);
        setChatSettingsInitialDraft(draft);
        setChatSettingsTab("data");
        setChatPreviewMode("desktop");
        setChatSourceTesting(false);
        setChatSourceProbe({
            sourceId: draft.sourceId,
            tone: "no-data",
            note: "Not tested",
            lastMessageAt: null
        });
        setShowChatSettings(true);
    }, []);

    const closeChatSettings = useCallback(() => {
        setShowChatSettings(false);
        setChatSettingsTargetId(null);
        setChatSettingsDraft(null);
        setChatSettingsInitialDraft(null);
        setChatSettingsTab("data");
        setChatPreviewMode("desktop");
        setChatSourceTesting(false);
    }, []);

    const refreshRecentProjects = useCallback(async () => {
        setRecentProjectsLoading(true);
        setRecentProjectsError(null);
        try {
            const projects = await projectActions.listRecentProjects(20);
            setRecentProjects(projects);
            setSelectedRecentProjectId((prev) => {
                if (projects.length === 0) return "";
                if (prev && projects.some((entry) => entry.layoutId === prev)) return prev;
                return projects[0]?.layoutId ?? "";
            });
        } catch (error) {
            setRecentProjectsError(String(error));
            setRecentProjects([]);
            setSelectedRecentProjectId("");
        } finally {
            setRecentProjectsLoading(false);
        }
    }, [projectActions]);

    useEffect(() => {
        if (!windows.showSaveProjectDialog) return;
        setSaveProjectName(overlayName || "my-overlay");
    }, [overlayName, windows.showSaveProjectDialog]);

    useEffect(() => {
        if (!windows.showProjectLauncher) return;
        void refreshRecentProjects();
    }, [refreshRecentProjects, windows.showProjectLauncher]);

    const handleSaveProjectConfirm = useCallback(async () => {
        const nextName = saveProjectName.trim();
        if (!nextName) {
            setStatus("Project name is required.");
            return;
        }

        setSaveProjectBusy(true);
        try {
            const saved = await projectActions.saveProject(nextName);
            if (saved) {
                windows.setShowSaveProjectDialog(false);
                setStatus(`Saved project: ${nextName} · URL: /layout/${encodeURIComponent(nextName)}`);
                await refreshRecentProjects();
            } else {
                setStatus("Save aborted.");
            }
        } finally {
            setSaveProjectBusy(false);
        }
    }, [projectActions, refreshRecentProjects, saveProjectName, setStatus, windows]);

    const handleOpenRecentProject = useCallback(async () => {
        const target = selectedRecentProjectId.trim();
        if (!target) {
            setStatus("Select a recent project first.");
            return;
        }

        setOpenRecentBusy(true);
        try {
            const opened = await projectActions.openProject(target);
            if (opened) {
                windows.setShowProjectLauncher(false);
                setStatus(`Opened project: ${target}`);
            } else {
                setStatus(`Project not found: ${target}`);
            }
        } finally {
            setOpenRecentBusy(false);
        }
    }, [projectActions, selectedRecentProjectId, setStatus, windows]);

    const handleCreateProjectFromLauncher = useCallback(() => {
        projectActions.createNewProject();
        windows.setShowProjectLauncher(false);
    }, [projectActions, windows]);

    const handleItemDoubleClick = useCallback((itemId: string) => (event: React.MouseEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();

        const item = canvas.items.find((entry) => entry.id === itemId);
        if (!item) return;
        canvas.setSelectedIds([itemId]);

        if (item.type === "chat") {
            openChatSettingsForItem(item);
            return;
        }

        if (item.type === "text" || item.type === "image" || item.type === "progress") {
            openDataSourceExplorer("data");
        }
    }, [canvas, openChatSettingsForItem, openDataSourceExplorer]);

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
        if (item.type === "text" || item.type === "chat") {
            const chatFontSize = item.type === "chat" ? (item.chatFontSize ?? item.fontSize ?? 14) : (item.fontSize ?? 16);
            const chatTextColor = item.type === "chat" ? (item.chatTextColor ?? item.textColor ?? "#f2f4f8") : (item.textColor ?? "#222222");
            parts.push(`font-family: ${item.fontFamily ?? "Segoe UI"};`);
            parts.push(`font-size: ${chatFontSize}px;`);
            parts.push(`font-weight: ${item.fontWeight ?? "normal"};`);
            parts.push(`font-style: ${item.fontStyle ?? "normal"};`);
            parts.push(`color: ${chatTextColor};`);
            parts.push(`text-transform: ${item.textTransform ?? "none"};`);
            parts.push(`letter-spacing: ${item.letterSpacing ?? 0}px;`);
            const shadowX = item.textShadowX ?? 0;
            const shadowY = item.textShadowY ?? 0;
            const shadowBlur = item.textShadowBlur ?? 0;
            const shadowColor = item.textShadowColor ?? "#000000";
            parts.push(`text-shadow: ${shadowX}px ${shadowY}px ${shadowBlur}px ${shadowColor};`);
            if (item.type === "chat") {
                const containerColor = normalizeHexColor(item.chatContainerColor ?? item.fill, "#101318");
                const borderColor = normalizeHexColor(item.chatBorderColor ?? item.stroke, "#3d4652");
                const bubbleColor = normalizeHexColor(item.chatBubbleColor, "#1b212b");
                const usernameColor = normalizeHexColor(item.chatUsernameColor, "#8ec8ff");
                const timestampColor = normalizeHexColor(item.chatTimestampColor, "#a9b2c0");
                const badgeBgColor = normalizeHexColor(item.chatBadgeBgColor, "#ffd95a");
                const badgeTextColor = normalizeHexColor(item.chatBadgeTextColor, "#2a2a2a");
                const containerOpacity = item.chatBackgroundMode === "transparent"
                    ? clampNumber(item.chatContainerOpacity ?? 100, 0, 100, 100) / 100
                    : 1;
                const borderOpacity = clampNumber(item.chatBorderIntensity ?? 70, 0, 100, 70) / 100;
                const bubbleOpacity = clampNumber(item.chatBubbleOpacity ?? 100, 0, 100, 100) / 100;
                const shadowOpacity = clampNumber(item.chatShadowIntensity ?? 35, 0, 100, 35) / 100;
                const blurPx = clampNumber(item.chatBlurPx ?? 0, 0, 20, 0);
                const bubbleRadius = clampNumber(item.chatBubbleRadius ?? 7, 0, 16, 7);
                const bubblePadding = clampNumber(item.chatBubblePadding ?? 8, 4, 16, 8);
                const rowGap = clampNumber(item.chatRowGap ?? 6, 2, 14, 6);
                const bubbleMaxWidth = item.chatWidthMode === "compact" ? "82%" : "100%";
                const align = item.chatMessageAlign === "right"
                    ? "flex-end"
                    : item.chatMessageAlign === "center"
                        ? "center"
                        : "flex-start";
                parts.push(`background: ${colorToRgba(containerColor, containerOpacity, "rgba(16,19,24,1)")};`);
                parts.push(`border: 1px solid ${colorToRgba(borderColor, borderOpacity, "rgba(61,70,82,0.7)")};`);
                parts.push(`--sc-chat-border-color: ${colorToRgba(borderColor, borderOpacity, "rgba(61,70,82,0.7)")};`);
                parts.push(`--sc-chat-bubble-bg: ${colorToRgba(bubbleColor, bubbleOpacity, "rgba(27,33,43,1)")};`);
                parts.push(`--sc-chat-text: ${chatTextColor};`);
                parts.push(`--sc-chat-username: ${usernameColor};`);
                parts.push(`--sc-chat-timestamp: ${timestampColor};`);
                parts.push(`--sc-chat-badge-bg: ${badgeBgColor};`);
                parts.push(`--sc-chat-badge-text: ${badgeTextColor};`);
                parts.push(`--sc-chat-font-size: ${chatFontSize}px;`);
                parts.push(`--sc-chat-radius: ${bubbleRadius}px;`);
                parts.push(`--sc-chat-padding: ${bubblePadding}px;`);
                parts.push(`--sc-chat-gap: ${rowGap}px;`);
                parts.push(`--sc-chat-align: ${align};`);
                parts.push(`--sc-chat-bubble-max-width: ${bubbleMaxWidth};`);
                parts.push(`--sc-chat-shadow: rgba(0,0,0,${shadowOpacity.toFixed(3)});`);
                if (blurPx > 0) {
                    parts.push(`backdrop-filter: blur(${blurPx}px);`);
                    parts.push(`-webkit-backdrop-filter: blur(${blurPx}px);`);
                }
            }
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

    const liveChatPatch = useMemo(
        () => (chatSettingsDraft ? buildChatPatchFromDraft(chatSettingsDraft) : null),
        [chatSettingsDraft]
    );

    const renderedItems = useMemo(() => {
        if (!showChatSettings || !chatSettingsTargetId || !liveChatPatch) {
            return canvas.items;
        }
        return canvas.items.map((item) => {
            if (item.id === chatSettingsTargetId && item.type === "chat") {
                return { ...item, ...liveChatPatch };
            }
            return item;
        });
    }, [canvas.items, chatSettingsTargetId, liveChatPatch, showChatSettings]);



    const menuNode = buildMenuNode();

    const contextBarNode = buildContextBarNode({
        selectedItem,
        onUpdateItem: canvas.updateItem,
        onShowTextStyleEditor: () => windows.setShowTextStyleEditor(true),
        onShowChatSettings: () => {
            if (!selectedItem || selectedItem.type !== "chat") return;
            openChatSettingsForItem(selectedItem);
        },
        onShowDataSourceExplorer: () => openDataSourceExplorer("binding"),
        textEffectsExtensions,
        canUndo,
        canRedo,
        canBind,
        hasBinding: Boolean(selectedItem && canvas.items && getBindingSummary(selectedItem)),
        scheduleIntervalMs: selectedItem?.scheduleIntervalMs ?? 0,
        UiText
    });

    const layoutNode = buildCanvasSurfaceNode({
        items: renderedItems,
        selectedIds: canvas.selectedIds,
        getItemStyle,
        getDisplayLabel,
        getChatLines,
        getChatEntries,
        getProgressPercent,
        getImageSource,
        getVideoSource,
        beginResize,
        handleItemMouseDown,
        handleItemDoubleClick,
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
            activeTab: dataSourceExplorerTab,
            defaultRuntimeIntervalMs: runtimeSettings.defaultIntervalMs,
            isSystemSource: dataSources.isSystemSource,
            renderJsonTree,
            onUpdateItem: canvas.updateItem,
            onSetSelectedCategoryId: dataSources.setSelectedCategoryId,
            onSetSelectedSubcategoryId: dataSources.setSelectedSubcategoryId,
            onRunTest: runTest,
            onSetActiveTab: setDataSourceExplorerTab,
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
            onUpdateInterval: (value) => canvas.updateItem(scheduleTarget.id, { scheduleIntervalMs: value }),
            onClose: windows.closeScheduleSetup
        }), "scheduleSetup")
        : null;

    const chatSettingsTarget = showChatSettings && chatSettingsTargetId
        ? (canvas.items.find((item) => item.id === chatSettingsTargetId && item.type === "chat") ?? null)
        : null;
    const chatSourceOptions = dataSources.sources.filter((source) =>
        source.id === "system-chat" || source.kind?.startsWith("chat") || source.categoryId?.startsWith("chat")
    );
    const chatSourceChoices = chatSourceOptions.length > 0
        ? chatSourceOptions
        : [{ id: "system-chat", name: "Chat Source" }];
    const chatSettingsSource = chatSettingsDraft?.sourceId
        ? (dataSources.sources.find((source) => source.id === chatSettingsDraft.sourceId) ?? null)
        : null;

    const chatLivePayload = chatSettingsDraft?.sourceId
        ? (dataSources.liveData.get(chatSettingsDraft.sourceId) as any)
        : null;
    const chatLiveMessages = Array.isArray(chatLivePayload?.messages) ? chatLivePayload.messages : [];
    const chatLiveLatestAt = chatLiveMessages.length > 0
        ? Number(chatLiveMessages[chatLiveMessages.length - 1]?.timestamp ?? Date.now())
        : null;
    const chatSettingsDirty = serializeChatDraft(chatSettingsDraft) !== serializeChatDraft(chatSettingsInitialDraft);
    const chatContrast = chatSettingsDraft
        ? computeContrastTone(chatSettingsDraft.textColor, chatSettingsDraft.bubbleColor)
        : "OK";
    const chatPresetModified = isDraftPresetModified(chatSettingsDraft);
    const chatStatusTone: ChatSourceStatusTone = chatSourceTesting
        ? "no-data"
        : chatSourceProbe.sourceId === (chatSettingsDraft?.sourceId ?? "")
            ? chatSourceProbe.tone
            : chatLiveMessages.length > 0
                ? "connected"
                : "no-data";
    const chatStatusText = chatSourceTesting
        ? "Checking..."
        : chatStatusTone === "connected"
            ? "Connected"
            : chatStatusTone === "error"
                ? "Error"
                : "No data";
    const chatStatusNote = chatSourceTesting
        ? "Testing source..."
        : chatSourceProbe.sourceId === (chatSettingsDraft?.sourceId ?? "")
            ? chatSourceProbe.note
            : chatLiveMessages.length > 0
                ? `${chatLiveMessages.length} message(s) loaded`
                : "No data for selected source";
    const chatLastMessageAt = chatSourceProbe.sourceId === (chatSettingsDraft?.sourceId ?? "")
        ? chatSourceProbe.lastMessageAt
        : chatLiveLatestAt;

    const applyChatSettings = useCallback((closeAfterApply: boolean) => {
        if (!chatSettingsTarget || !chatSettingsDraft) return;
        const sourceId = chatSettingsDraft.sourceId || "system-chat";
        canvas.updateItem(chatSettingsTarget.id, buildChatPatchFromDraft(chatSettingsDraft));
        setChatSettingsInitialDraft(chatSettingsDraft);
        setStatus(`Chat settings applied (${chatSettingsSource?.name ?? sourceId}).`);
        if (closeAfterApply) {
            closeChatSettings();
        }
    }, [canvas, chatSettingsDraft, chatSettingsSource?.name, chatSettingsTarget, closeChatSettings, setStatus]);

    const probeChatSource = useCallback(async (sourceId: string, silent = false) => {
        setChatSourceTesting(true);
        try {
            const history = await fetchChatHistory(sourceId);
            const latest = history.length > 0 ? history[history.length - 1]?.timestamp ?? null : null;
            dataSources.setLiveData((prev) => {
                const next = new Map(prev);
                next.set(sourceId, {
                    count: history.length,
                    latest: history.length > 0 ? history[history.length - 1] : null,
                    messages: history
                });
                return next;
            });
            const tone: ChatSourceStatusTone = history.length > 0 ? "connected" : "no-data";
            setChatSourceProbe({
                sourceId,
                tone,
                note: history.length > 0 ? `${history.length} message(s) returned` : "Source reachable but no messages",
                lastMessageAt: latest
            });
            if (!silent) {
                setStatus(`Chat source test: ${tone === "connected" ? "connected" : "no data"} (${sourceId}).`);
            }
        } catch (error) {
            setChatSourceProbe({
                sourceId,
                tone: "error",
                note: String(error),
                lastMessageAt: null
            });
            if (!silent) {
                setStatus(`Chat source test failed (${sourceId}).`);
            }
        } finally {
            setChatSourceTesting(false);
        }
    }, [dataSources.setLiveData, setStatus]);

    const testChatSource = useCallback(async () => {
        if (!chatSettingsDraft) return;
        const sourceId = chatSettingsDraft.sourceId || "system-chat";
        await probeChatSource(sourceId);
    }, [chatSettingsDraft, probeChatSource]);

    useEffect(() => {
        if (!showChatSettings || !chatSettingsDraft) return;
        const sourceId = chatSettingsDraft.sourceId || "system-chat";
        void probeChatSource(sourceId, true);
    }, [chatSettingsDraft?.sourceId, probeChatSource, showChatSettings]);

    const resetChatSettingsDraft = useCallback(() => {
        if (!chatSettingsInitialDraft) return;
        setChatSettingsDraft(chatSettingsInitialDraft);
        setStatus("Chat settings reverted to the last saved state.");
    }, [chatSettingsInitialDraft, setStatus]);

    const appendChatCssSnippet = useCallback((css: string) => {
        setChatSettingsDraft((prev) => {
            if (!prev) return prev;
            const base = prev.customCss.trim();
            const nextCss = base.length > 0 ? `${base}\n\n${css}` : css;
            return { ...prev, customCssEnabled: true, customCss: nextCss };
        });
    }, []);

    const chatPreviewEntries = useMemo(() => {
        if (!chatSettingsTarget || !chatSettingsDraft) return [];
        return getChatEntries({
            ...chatSettingsTarget,
            sourceId: chatSettingsDraft.sourceId,
            chatLines: Math.min(chatSettingsDraft.lineCount, 3),
            chatMessageFlow: chatSettingsDraft.messageFlow,
            workerEnabled: true
        }).slice(0, 3);
    }, [chatSettingsDraft, chatSettingsTarget, getChatEntries]);

    const chatPreviewStyle = chatSettingsDraft
        ? [
            `background: ${colorToRgba(chatSettingsDraft.containerColor, chatSettingsDraft.backgroundMode === "transparent" ? chatSettingsDraft.containerOpacity / 100 : 1, "rgba(16,19,24,1)")};`,
            `border: 1px solid ${colorToRgba(chatSettingsDraft.borderColor, chatSettingsDraft.borderIntensity / 100, "rgba(61,70,82,0.7)")};`,
            `--sc-chat-border-color: ${colorToRgba(chatSettingsDraft.borderColor, chatSettingsDraft.borderIntensity / 100, "rgba(61,70,82,0.7)")};`,
            `--sc-chat-bubble-bg: ${colorToRgba(chatSettingsDraft.bubbleColor, chatSettingsDraft.bubbleOpacity / 100, "rgba(27,33,43,1)")};`,
            `--sc-chat-text: ${chatSettingsDraft.textColor};`,
            `--sc-chat-username: ${chatSettingsDraft.usernameColor};`,
            `--sc-chat-timestamp: ${chatSettingsDraft.timestampColor};`,
            `--sc-chat-badge-bg: ${chatSettingsDraft.badgeBgColor};`,
            `--sc-chat-badge-text: ${chatSettingsDraft.badgeTextColor};`,
            `--sc-chat-font-size: ${chatSettingsDraft.fontSize}px;`,
            `--sc-chat-radius: ${chatSettingsDraft.bubbleRadius}px;`,
            `--sc-chat-padding: ${chatSettingsDraft.bubblePadding}px;`,
            `--sc-chat-gap: ${chatSettingsDraft.rowGap}px;`,
            `--sc-chat-align: ${chatSettingsDraft.messageAlign === "right" ? "flex-end" : chatSettingsDraft.messageAlign === "center" ? "center" : "flex-start"};`,
            `--sc-chat-bubble-max-width: ${chatSettingsDraft.widthMode === "compact" ? "82%" : "100%"};`,
            `--sc-chat-shadow: rgba(0,0,0,${(chatSettingsDraft.shadowIntensity / 100).toFixed(3)});`,
            chatSettingsDraft.blurAmount > 0 ? `backdrop-filter: blur(${chatSettingsDraft.blurAmount}px);` : "",
            chatSettingsDraft.blurAmount > 0 ? `-webkit-backdrop-filter: blur(${chatSettingsDraft.blurAmount}px);` : ""
        ].filter(Boolean).join(" ")
        : "";
    const chatCssValidation = validateCustomChatCss(chatSettingsDraft?.customCss ?? "");
    const chatCssError = chatSettingsDraft?.customCssEnabled && !chatCssValidation.ok
        ? `Invalid CSS: ${chatCssValidation.error}`
        : "";
    const chatPreviewScopedCss = chatSettingsDraft?.customCssEnabled && chatCssValidation.ok
        ? scopeChatCss(chatSettingsDraft.customCss, ".chat-settings-preview-inner")
        : "";
    const chatCssScopeHint = ".container .msg .meta .username .timestamp .badge .text";
    const chatCssScopeSelector = chatSettingsTarget ? `[data-chat-scope="chat-${chatSettingsTarget.id}"]` : `[data-chat-scope="chat-item-id"]`;
    const chatPreviewInnerClassName = `chat-settings-preview-inner canvas-item-chat ${chatSettingsDraft?.showAvatars ? "chat-show-avatars" : ""} ${chatSettingsDraft?.showRoleColors ? "chat-role-colors" : ""} ${chatPreviewMode === "mobile" ? "chat-preview-mobile" : ""}`.trim();
    const chatSettingsTabs = (chatSettingsTarget ? getVisibleContextTabsForScope(chatSettingsTarget, "chatSettings") : [])
        .map((tab) => ({
            id: tab.id as ChatSettingsTabId,
            title: tab.id === "data" ? "Data Source" : tab.title
        }));

    const chatSettingsNode = chatSettingsTarget && chatSettingsDraft
        ? WF.Window(
            {
                Text: "Chat Settings",
                Icon: "text",
                Dialog: true,
                Draggable: true,
                OnClose: closeChatSettings,
                Style: "position: absolute; left: 280px; top: 110px; width: min(760px, 96vw); height: min(680px, 88vh);",
                BodyClassName: "chat-settings-window"
            },
            WF.Element("div", { className: "chat-settings-shell" },
                WF.Element("div", { className: "chat-settings-header" },
                    WF.Element("div", { className: "chat-settings-title" }, chatSettingsTarget.name ?? "Chat"),
                    WF.Element("div", { className: "chat-settings-sub" }, "Data source and style for this chat component.")
                ),
                buildContextTabBar({
                    tabs: chatSettingsTabs,
                    activeTab: chatSettingsTab,
                    onSelect: setChatSettingsTab,
                    idPrefix: `chat-settings-${chatSettingsTarget.id}`
                }),
                WF.Element("div", { className: "chat-settings-body" },
                    WF.Element("div", {
                        className: `chat-settings-panel ${chatSettingsTab === "data" ? "is-active" : ""}`.trim(),
                        role: "tabpanel",
                        id: `chat-settings-${chatSettingsTarget.id}-panel-data`,
                        "aria-labelledby": `chat-settings-${chatSettingsTarget.id}-tab-data`
                    },
                        WF.Element("div", { className: "chat-settings-section" },
                            WF.Element("div", { className: "chat-settings-section-title" }, "Connection"),
                            WF.Element("div", { className: "chat-settings-grid" },
                                WF.Element("div", { className: "chat-settings-field" },
                                    WF.Element("label", { className: "chat-settings-label" }, "Chat source"),
                                    WF.Element("select", {
                                        className: "combobox chat-settings-input",
                                        value: chatSettingsDraft.sourceId,
                                        onChange: (event: React.ChangeEvent<HTMLSelectElement>) =>
                                            setChatSettingsDraft((prev) => prev ? { ...prev, sourceId: event.target.value } : prev)
                                    },
                                    ...chatSourceChoices.map((source) =>
                                        WF.Element("option", { key: `chat-source-${source.id}`, value: source.id }, source.name)
                                    ))
                                ),
                                WF.Element("div", { className: "chat-settings-field" },
                                    WF.Element("label", { className: "chat-settings-slider-label" },
                                        WF.Element("span", { className: "chat-settings-label" }, "Visible messages"),
                                        WF.Element("span", { className: "chat-settings-slider-value" }, `${chatSettingsDraft.lineCount}`)
                                    ),
                                    WF.Element("input", {
                                        className: "chat-settings-slider",
                                        type: "range",
                                        min: 1,
                                        max: 10,
                                        step: 1,
                                        value: chatSettingsDraft.lineCount,
                                        onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
                                            setChatSettingsDraft((prev) => prev ? { ...prev, lineCount: clampNumber(Number(event.target.value), 1, 10, prev.lineCount) } : prev)
                                    })
                                )
                            ),
                            WF.Element("div", { className: "chat-settings-status-grid" },
                                WF.Element("div", { className: "chat-settings-status-card" },
                                    WF.Element("div", { className: "chat-settings-status-title" }, "Source status"),
                                    WF.Element("div", { className: "chat-settings-status-row" },
                                        WF.Element("span", null, "Status"),
                                        WF.Element("span", { className: `chat-settings-status-pill ${chatStatusTone}`.trim() }, chatStatusText)
                                    ),
                                    WF.Element("div", { className: "chat-settings-status-row" },
                                        WF.Element("span", null, "Last message"),
                                        WF.Element("strong", null, formatTimestampLabel(chatLastMessageAt))
                                    ),
                                    WF.Element("div", { className: "chat-settings-note" }, chatStatusNote),
                                    WF.Element("button", {
                                        className: "button",
                                        disabled: chatSourceTesting,
                                        onClick: () => void testChatSource()
                                    }, chatSourceTesting ? "Testing..." : "Test Source")
                                ),
                                WF.Element("div", { className: "chat-settings-status-card" },
                                    WF.Element("div", { className: "chat-settings-status-title" }, "Display"),
                                    WF.Element("label", { className: "checkbox-label" },
                                        WF.Element("input", {
                                            className: "checkbox",
                                            type: "checkbox",
                                            checked: chatSettingsDraft.showUsername,
                                            onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
                                                setChatSettingsDraft((prev) => prev ? { ...prev, showUsername: event.target.checked } : prev)
                                        }),
                                        WF.Element("span", { className: "checkbox-text" }, "Show username")
                                    ),
                                    WF.Element("label", { className: "checkbox-label" },
                                        WF.Element("input", {
                                            className: "checkbox",
                                            type: "checkbox",
                                            checked: chatSettingsDraft.showTimestamp,
                                            onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
                                                setChatSettingsDraft((prev) => prev ? { ...prev, showTimestamp: event.target.checked } : prev)
                                        }),
                                        WF.Element("span", { className: "checkbox-text" }, "Show timestamp")
                                    ),
                                    WF.Element("label", { className: "checkbox-label" },
                                        WF.Element("input", {
                                            className: "checkbox",
                                            type: "checkbox",
                                            checked: chatSettingsDraft.showBadges,
                                            onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
                                                setChatSettingsDraft((prev) => prev ? { ...prev, showBadges: event.target.checked } : prev)
                                        }),
                                        WF.Element("span", { className: "checkbox-text" }, "Show badges")
                                    ),
                                    WF.Element("label", { className: "checkbox-label" },
                                        WF.Element("input", {
                                            className: "checkbox",
                                            type: "checkbox",
                                            checked: chatSettingsDraft.showAvatars,
                                            onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
                                                setChatSettingsDraft((prev) => prev ? { ...prev, showAvatars: event.target.checked } : prev)
                                        }),
                                        WF.Element("span", { className: "checkbox-text" }, "Show avatars")
                                    ),
                                    WF.Element("label", { className: "checkbox-label" },
                                        WF.Element("input", {
                                            className: "checkbox",
                                            type: "checkbox",
                                            checked: chatSettingsDraft.showRoleColors,
                                            onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
                                                setChatSettingsDraft((prev) => prev ? { ...prev, showRoleColors: event.target.checked } : prev)
                                        }),
                                        WF.Element("span", { className: "checkbox-text" }, "Role colors")
                                    )
                                )
                            )
                        )
                    ),
                    WF.Element("div", {
                        className: `chat-settings-panel ${chatSettingsTab === "style" ? "is-active" : ""}`.trim(),
                        role: "tabpanel",
                        id: `chat-settings-${chatSettingsTarget.id}-panel-style`,
                        "aria-labelledby": `chat-settings-${chatSettingsTarget.id}-tab-style`
                    },
                        WF.Element("div", { className: "chat-settings-section" },
                            WF.Element("div", { className: "chat-settings-section-title" }, "Preset"),
                            WF.Element("div", { className: "chat-settings-field" },
                                WF.Element("label", { className: "chat-settings-label" }, "Style list"),
                                WF.Element("select", {
                                    className: "combobox chat-settings-input",
                                    value: chatSettingsDraft.presetId,
                                    onChange: (event: React.ChangeEvent<HTMLSelectElement>) =>
                                        setChatSettingsDraft((prev) => prev ? withPresetTokens(prev, event.target.value as ChatStylePresetId) : prev)
                                },
                                ...CHAT_PRESET_IDS.map((presetId) =>
                                    WF.Element("option", { key: `chat-preset-select-${presetId}`, value: presetId }, CHAT_STYLE_PRESETS[presetId].label)
                                ))
                            ),
                            WF.Element("div", { className: "chat-settings-preset-bar" },
                                ...CHAT_PRESET_IDS.map((presetId) =>
                                    WF.Element("button", {
                                        key: `chat-preset-${presetId}`,
                                        className: `button chat-settings-preset-btn ${chatSettingsDraft.presetId === presetId ? "is-active" : ""}`.trim(),
                                        onClick: () => setChatSettingsDraft((prev) => prev ? withPresetTokens(prev, presetId) : prev)
                                    }, CHAT_STYLE_PRESETS[presetId].label)
                                )
                            ),
                            WF.Element("div", { className: "chat-settings-note" }, CHAT_STYLE_PRESETS[chatSettingsDraft.presetId].description),
                            WF.Element("div", { className: "chat-settings-note" }, chatPresetModified ? "Modified from preset" : "Preset unchanged")
                        ),
                        WF.Element("div", { className: "chat-settings-section" },
                            WF.Element("div", { className: "chat-settings-section-title" }, "Container"),
                            WF.Element("div", { className: "chat-settings-grid" },
                                WF.Element("div", { className: "chat-settings-field" },
                                    WF.Element("label", { className: "chat-settings-label" }, "Background mode"),
                                    WF.Element("select", {
                                        className: "combobox chat-settings-input",
                                        value: chatSettingsDraft.backgroundMode,
                                        onChange: (event: React.ChangeEvent<HTMLSelectElement>) =>
                                            setChatSettingsDraft((prev) => prev ? { ...prev, backgroundMode: event.target.value as "solid" | "transparent" } : prev)
                                    },
                                    WF.Element("option", { value: "solid" }, "Solid"),
                                    WF.Element("option", { value: "transparent" }, "Transparent"))
                                ),
                                WF.Element("div", { className: "chat-settings-field" },
                                    WF.Element("label", { className: "chat-settings-label" }, "Container color"),
                                    WF.Element("input", {
                                        className: "chat-settings-color",
                                        type: "color",
                                        value: chatSettingsDraft.containerColor,
                                        onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
                                            setChatSettingsDraft((prev) => prev ? { ...prev, containerColor: normalizeHexColor(event.target.value, prev.containerColor) } : prev)
                                    })
                                ),
                                WF.Element("div", { className: "chat-settings-field" },
                                    WF.Element("label", { className: "chat-settings-label" }, "Border color"),
                                    WF.Element("input", {
                                        className: "chat-settings-color",
                                        type: "color",
                                        value: chatSettingsDraft.borderColor,
                                        onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
                                            setChatSettingsDraft((prev) => prev ? { ...prev, borderColor: normalizeHexColor(event.target.value, prev.borderColor) } : prev)
                                    })
                                ),
                                WF.Element("div", { className: "chat-settings-field" },
                                    WF.Element("label", { className: "chat-settings-slider-label" },
                                        WF.Element("span", { className: "chat-settings-label" }, "Container opacity"),
                                        WF.Element("span", { className: "chat-settings-slider-value" }, `${chatSettingsDraft.containerOpacity}%`)
                                    ),
                                    WF.Element("input", {
                                        className: "chat-settings-slider",
                                        type: "range",
                                        min: 0,
                                        max: 100,
                                        step: 1,
                                        value: chatSettingsDraft.containerOpacity,
                                        disabled: chatSettingsDraft.backgroundMode === "solid",
                                        onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
                                            setChatSettingsDraft((prev) => prev ? { ...prev, containerOpacity: clampNumber(Number(event.target.value), 0, 100, prev.containerOpacity) } : prev)
                                    })
                                ),
                                WF.Element("div", { className: "chat-settings-field" },
                                    WF.Element("label", { className: "chat-settings-slider-label" },
                                        WF.Element("span", { className: "chat-settings-label" }, "Border intensity"),
                                        WF.Element("span", { className: "chat-settings-slider-value" }, `${chatSettingsDraft.borderIntensity}%`)
                                    ),
                                    WF.Element("input", {
                                        className: "chat-settings-slider",
                                        type: "range",
                                        min: 0,
                                        max: 100,
                                        step: 1,
                                        value: chatSettingsDraft.borderIntensity,
                                        onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
                                            setChatSettingsDraft((prev) => prev ? { ...prev, borderIntensity: clampNumber(Number(event.target.value), 0, 100, prev.borderIntensity) } : prev)
                                    })
                                ),
                                WF.Element("div", { className: "chat-settings-field" },
                                    WF.Element("label", { className: "chat-settings-slider-label" },
                                        WF.Element("span", { className: "chat-settings-label" }, "Shadow intensity"),
                                        WF.Element("span", { className: "chat-settings-slider-value" }, `${chatSettingsDraft.shadowIntensity}%`)
                                    ),
                                    WF.Element("input", {
                                        className: "chat-settings-slider",
                                        type: "range",
                                        min: 0,
                                        max: 100,
                                        step: 1,
                                        value: chatSettingsDraft.shadowIntensity,
                                        onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
                                            setChatSettingsDraft((prev) => prev ? { ...prev, shadowIntensity: clampNumber(Number(event.target.value), 0, 100, prev.shadowIntensity) } : prev)
                                    })
                                ),
                                WF.Element("div", { className: "chat-settings-field" },
                                    WF.Element("label", { className: "chat-settings-slider-label" },
                                        WF.Element("span", { className: "chat-settings-label" }, "Backdrop blur"),
                                        WF.Element("span", { className: "chat-settings-slider-value" }, `${chatSettingsDraft.blurAmount}px`)
                                    ),
                                    WF.Element("input", {
                                        className: "chat-settings-slider",
                                        type: "range",
                                        min: 0,
                                        max: 20,
                                        step: 1,
                                        value: chatSettingsDraft.blurAmount,
                                        onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
                                            setChatSettingsDraft((prev) => prev ? { ...prev, blurAmount: clampNumber(Number(event.target.value), 0, 20, prev.blurAmount) } : prev)
                                    })
                                )
                            ),
                            WF.Element("div", { className: "chat-settings-note" }, "Backdrop blur uses CSS backdrop-filter and may be limited in some browsers.")
                        ),
                        WF.Element("div", { className: "chat-settings-section" },
                            WF.Element("div", { className: "chat-settings-section-title" }, "Messages"),
                            WF.Element("div", { className: "chat-settings-grid" },
                                WF.Element("div", { className: "chat-settings-field" },
                                    WF.Element("label", { className: "chat-settings-label" }, "Bubble color"),
                                    WF.Element("input", {
                                        className: "chat-settings-color",
                                        type: "color",
                                        value: chatSettingsDraft.bubbleColor,
                                        onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
                                            setChatSettingsDraft((prev) => prev ? { ...prev, bubbleColor: normalizeHexColor(event.target.value, prev.bubbleColor) } : prev)
                                    })
                                ),
                                WF.Element("div", { className: "chat-settings-field" },
                                    WF.Element("label", { className: "chat-settings-label" }, "Text color"),
                                    WF.Element("input", {
                                        className: "chat-settings-color",
                                        type: "color",
                                        value: chatSettingsDraft.textColor,
                                        onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
                                            setChatSettingsDraft((prev) => prev ? { ...prev, textColor: normalizeHexColor(event.target.value, prev.textColor) } : prev)
                                    })
                                ),
                                WF.Element("div", { className: "chat-settings-field" },
                                    WF.Element("label", { className: "chat-settings-label" }, "Username color"),
                                    WF.Element("input", {
                                        className: "chat-settings-color",
                                        type: "color",
                                        value: chatSettingsDraft.usernameColor,
                                        onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
                                            setChatSettingsDraft((prev) => prev ? { ...prev, usernameColor: normalizeHexColor(event.target.value, prev.usernameColor) } : prev)
                                    })
                                ),
                                WF.Element("div", { className: "chat-settings-field" },
                                    WF.Element("label", { className: "chat-settings-label" }, "Timestamp color"),
                                    WF.Element("input", {
                                        className: "chat-settings-color",
                                        type: "color",
                                        value: chatSettingsDraft.timestampColor,
                                        onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
                                            setChatSettingsDraft((prev) => prev ? { ...prev, timestampColor: normalizeHexColor(event.target.value, prev.timestampColor) } : prev)
                                    })
                                ),
                                WF.Element("div", { className: "chat-settings-field" },
                                    WF.Element("label", { className: "chat-settings-label" }, "Badge background"),
                                    WF.Element("input", {
                                        className: "chat-settings-color",
                                        type: "color",
                                        value: chatSettingsDraft.badgeBgColor,
                                        onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
                                            setChatSettingsDraft((prev) => prev ? { ...prev, badgeBgColor: normalizeHexColor(event.target.value, prev.badgeBgColor) } : prev)
                                    })
                                ),
                                WF.Element("div", { className: "chat-settings-field" },
                                    WF.Element("label", { className: "chat-settings-label" }, "Badge text"),
                                    WF.Element("input", {
                                        className: "chat-settings-color",
                                        type: "color",
                                        value: chatSettingsDraft.badgeTextColor,
                                        onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
                                            setChatSettingsDraft((prev) => prev ? { ...prev, badgeTextColor: normalizeHexColor(event.target.value, prev.badgeTextColor) } : prev)
                                    })
                                ),
                                WF.Element("div", { className: "chat-settings-field" },
                                    WF.Element("label", { className: "chat-settings-slider-label" },
                                        WF.Element("span", { className: "chat-settings-label" }, "Bubble opacity"),
                                        WF.Element("span", { className: "chat-settings-slider-value" }, `${chatSettingsDraft.bubbleOpacity}%`)
                                    ),
                                    WF.Element("input", {
                                        className: "chat-settings-slider",
                                        type: "range",
                                        min: 0,
                                        max: 100,
                                        step: 1,
                                        value: chatSettingsDraft.bubbleOpacity,
                                        onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
                                            setChatSettingsDraft((prev) => prev ? { ...prev, bubbleOpacity: clampNumber(Number(event.target.value), 0, 100, prev.bubbleOpacity) } : prev)
                                    })
                                ),
                                WF.Element("div", { className: "chat-settings-field" },
                                    WF.Element("label", { className: "chat-settings-slider-label" },
                                        WF.Element("span", { className: "chat-settings-label" }, "Bubble radius"),
                                        WF.Element("span", { className: "chat-settings-slider-value" }, `${chatSettingsDraft.bubbleRadius}px`)
                                    ),
                                    WF.Element("input", {
                                        className: "chat-settings-slider",
                                        type: "range",
                                        min: 0,
                                        max: 16,
                                        step: 1,
                                        value: chatSettingsDraft.bubbleRadius,
                                        onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
                                            setChatSettingsDraft((prev) => prev ? { ...prev, bubbleRadius: clampNumber(Number(event.target.value), 0, 16, prev.bubbleRadius) } : prev)
                                    })
                                ),
                                WF.Element("div", { className: "chat-settings-field" },
                                    WF.Element("label", { className: "chat-settings-slider-label" },
                                        WF.Element("span", { className: "chat-settings-label" }, "Bubble padding"),
                                        WF.Element("span", { className: "chat-settings-slider-value" }, `${chatSettingsDraft.bubblePadding}px`)
                                    ),
                                    WF.Element("input", {
                                        className: "chat-settings-slider",
                                        type: "range",
                                        min: 4,
                                        max: 16,
                                        step: 1,
                                        value: chatSettingsDraft.bubblePadding,
                                        onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
                                            setChatSettingsDraft((prev) => prev ? { ...prev, bubblePadding: clampNumber(Number(event.target.value), 4, 16, prev.bubblePadding) } : prev)
                                    })
                                )
                            )
                        ),
                        WF.Element("div", { className: "chat-settings-section" },
                            WF.Element("div", { className: "chat-settings-section-title" }, "Layout"),
                            WF.Element("div", { className: "chat-settings-grid" },
                                WF.Element("div", { className: "chat-settings-field" },
                                    WF.Element("label", { className: "chat-settings-slider-label" },
                                        WF.Element("span", { className: "chat-settings-label" }, "Font size"),
                                        WF.Element("span", { className: "chat-settings-slider-value" }, `${chatSettingsDraft.fontSize}px`)
                                    ),
                                    WF.Element("input", {
                                        className: "chat-settings-slider",
                                        type: "range",
                                        min: 11,
                                        max: 22,
                                        step: 1,
                                        value: chatSettingsDraft.fontSize,
                                        onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
                                            setChatSettingsDraft((prev) => prev ? { ...prev, fontSize: clampNumber(Number(event.target.value), 11, 22, prev.fontSize) } : prev)
                                    })
                                ),
                                WF.Element("div", { className: "chat-settings-field" },
                                    WF.Element("label", { className: "chat-settings-slider-label" },
                                        WF.Element("span", { className: "chat-settings-label" }, "Row gap"),
                                        WF.Element("span", { className: "chat-settings-slider-value" }, `${chatSettingsDraft.rowGap}px`)
                                    ),
                                    WF.Element("input", {
                                        className: "chat-settings-slider",
                                        type: "range",
                                        min: 2,
                                        max: 14,
                                        step: 1,
                                        value: chatSettingsDraft.rowGap,
                                        onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
                                            setChatSettingsDraft((prev) => prev ? { ...prev, rowGap: clampNumber(Number(event.target.value), 2, 14, prev.rowGap) } : prev)
                                    })
                                ),
                                WF.Element("div", { className: "chat-settings-field" },
                                    WF.Element("label", { className: "chat-settings-label" }, "Flow"),
                                    WF.Element("select", {
                                        className: "combobox chat-settings-input",
                                        value: chatSettingsDraft.messageFlow,
                                        onChange: (event: React.ChangeEvent<HTMLSelectElement>) =>
                                            setChatSettingsDraft((prev) => prev ? { ...prev, messageFlow: event.target.value as "bottom" | "top" } : prev)
                                    },
                                    WF.Element("option", { value: "bottom" }, "Newest at bottom"),
                                    WF.Element("option", { value: "top" }, "Newest at top"))
                                ),
                                WF.Element("div", { className: "chat-settings-field" },
                                    WF.Element("label", { className: "chat-settings-label" }, "Align"),
                                    WF.Element("select", {
                                        className: "combobox chat-settings-input",
                                        value: chatSettingsDraft.messageAlign,
                                        onChange: (event: React.ChangeEvent<HTMLSelectElement>) =>
                                            setChatSettingsDraft((prev) => prev ? { ...prev, messageAlign: event.target.value as "left" | "center" | "right" } : prev)
                                    },
                                    WF.Element("option", { value: "left" }, "Left"),
                                    WF.Element("option", { value: "center" }, "Center"),
                                    WF.Element("option", { value: "right" }, "Right"))
                                ),
                                WF.Element("div", { className: "chat-settings-field" },
                                    WF.Element("label", { className: "chat-settings-label" }, "Width mode"),
                                    WF.Element("select", {
                                        className: "combobox chat-settings-input",
                                        value: chatSettingsDraft.widthMode,
                                        onChange: (event: React.ChangeEvent<HTMLSelectElement>) =>
                                            setChatSettingsDraft((prev) => prev ? { ...prev, widthMode: event.target.value as "full" | "compact" } : prev)
                                    },
                                    WF.Element("option", { value: "full" }, "Full width"),
                                    WF.Element("option", { value: "compact" }, "Compact"))
                                )
                            ),
                            WF.Element("div", { className: "chat-settings-note" }, `Contrast: ${chatContrast}.`)
                        ),
                        WF.Element("div", { className: "chat-settings-section" },
                            WF.Element("div", { className: "chat-settings-section-title" }, "Custom CSS"),
                            WF.Element("label", { className: "checkbox-label" },
                                WF.Element("input", {
                                    className: "checkbox",
                                    type: "checkbox",
                                    checked: chatSettingsDraft.customCssEnabled,
                                    onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
                                        setChatSettingsDraft((prev) => prev ? { ...prev, customCssEnabled: event.target.checked } : prev)
                                }),
                                WF.Element("span", { className: "checkbox-text" }, "Enable custom CSS")
                            ),
                            WF.Element("div", { className: "chat-settings-note" }, `Available tags: ${chatCssScopeHint}`),
                            WF.Element("div", { className: "chat-settings-note" }, `Final scope: ${chatCssScopeSelector}`),
                            WF.Element("div", { className: "chat-settings-snippets" },
                                ...CHAT_CSS_SNIPPETS.map((snippet) =>
                                    WF.Element("button", {
                                        key: `chat-css-snippet-${snippet.id}`,
                                        className: "button chat-settings-snippet-btn",
                                        disabled: !chatSettingsDraft.customCssEnabled,
                                        onClick: () => appendChatCssSnippet(snippet.css)
                                    }, snippet.label)
                                ),
                                WF.Element("button", {
                                    className: "button chat-settings-snippet-btn",
                                    disabled: !chatSettingsDraft.customCssEnabled || chatSettingsDraft.customCss.trim().length === 0,
                                    onClick: () => setChatSettingsDraft((prev) => prev ? { ...prev, customCss: "" } : prev)
                                }, "Clear CSS")
                            ),
                            WF.Element("textarea", {
                                className: "textbox chat-settings-input",
                                rows: 6,
                                disabled: !chatSettingsDraft.customCssEnabled,
                                value: chatSettingsDraft.customCss,
                                placeholder: ".msg { border-left: 3px solid #ff4d88; }\n.username { text-transform: uppercase; }",
                                onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) =>
                                    setChatSettingsDraft((prev) => prev ? { ...prev, customCss: event.target.value } : prev)
                            }),
                            chatCssError
                                ? WF.Element("div", { className: "chat-settings-note" }, chatCssError)
                                : WF.Element("div", { className: "chat-settings-note" }, "Custom CSS is scoped to this chat component.")
                        ),
                        WF.Element("div", { className: "chat-settings-section" },
                            WF.Element("div", { className: "chat-settings-section-title" }, "Preview"),
                            WF.Element("div", { className: "chat-settings-preview-modes" },
                                WF.Element("button", {
                                    className: `button ${chatPreviewMode === "desktop" ? "chat-settings-preview-mode-active" : ""}`.trim(),
                                    onClick: () => setChatPreviewMode("desktop")
                                }, "Desktop"),
                                WF.Element("button", {
                                    className: `button ${chatPreviewMode === "mobile" ? "chat-settings-preview-mode-active" : ""}`.trim(),
                                    onClick: () => setChatPreviewMode("mobile")
                                }, "Mobile width")
                            ),
                            WF.Element("div", { className: "chat-settings-preview" },
                                WF.Element("div", {
                                    className: chatPreviewInnerClassName,
                                    style: chatPreviewStyle
                                },
                                chatPreviewScopedCss ? WF.Element("style", { type: "text/css" }, chatPreviewScopedCss) : null,
                                WF.Element("div", { className: "canvas-item-chat-title" }, chatSettingsTarget.chatTitle ?? "Live Chat"),
                                WF.Element("div", { className: "canvas-item-chat-lines" },
                                    ...(chatPreviewEntries.length > 0
                                        ? chatPreviewEntries.map((entry, index) =>
                                            WF.Element("div", { key: `chat-preview-${entry.id}-${index}`, className: "canvas-item-chat-line", "data-role": entry.role ?? "viewer" },
                                                chatSettingsDraft.showAvatars ? WF.Element("div", { className: "canvas-item-chat-avatar" }) : null,
                                                WF.Element("div", { className: "canvas-item-chat-content" },
                                                    WF.Element("div", { className: "canvas-item-chat-meta" },
                                                        ...(chatSettingsDraft.showBadges
                                                            ? entry.badges.map((badge, badgeIndex) =>
                                                                WF.Element("span", { key: `chat-preview-badge-${entry.id}-${badgeIndex}`, className: "canvas-item-chat-badge" }, badge)
                                                            )
                                                            : []),
                                                        chatSettingsDraft.showUsername ? WF.Element("span", { className: "canvas-item-chat-username" }, entry.username) : null,
                                                        chatSettingsDraft.showTimestamp ? WF.Element("span", { className: "canvas-item-chat-timestamp" }, new Date(entry.timestamp).toLocaleTimeString()) : null
                                                    ),
                                                    WF.Element("div", { className: "canvas-item-chat-text" }, entry.message)
                                                )
                                            )
                                        )
                                        : [WF.Element("div", { key: "chat-preview-empty", className: "canvas-item-chat-line" }, "Chat preview is waiting for messages.")])
                                ))
                            )
                        )
                    ),
                    WF.Element("div", {
                        className: `chat-settings-panel ${chatSettingsTab === "triggers" ? "is-active" : ""}`.trim(),
                        role: "tabpanel",
                        id: `chat-settings-${chatSettingsTarget.id}-panel-triggers`,
                        "aria-labelledby": `chat-settings-${chatSettingsTarget.id}-tab-triggers`
                    },
                        WF.Element("div", { className: "chat-settings-section" },
                            WF.Element("div", { className: "chat-settings-section-title" }, "Triggers"),
                            WF.Element("div", { className: "chat-settings-note" }, "Rules for chat-triggered actions will appear here."),
                            WF.Element("div", { className: "chat-settings-note" }, "Next step: condition builder, e.g. message equals !help.")
                        )
                    ),
                    WF.Element("div", {
                        className: `chat-settings-panel ${chatSettingsTab === "effects" ? "is-active" : ""}`.trim(),
                        role: "tabpanel",
                        id: `chat-settings-${chatSettingsTarget.id}-panel-effects`,
                        "aria-labelledby": `chat-settings-${chatSettingsTarget.id}-tab-effects`
                    },
                        WF.Element("div", { className: "chat-settings-section" },
                            WF.Element("div", { className: "chat-settings-section-title" }, "Effects"),
                            WF.Element("div", { className: "chat-settings-note" }, "Bind this chat component to visual/audio effects."),
                            WF.Element("div", { className: "chat-settings-note" }, "Next step: choose effect + preview + save binding.")
                        )
                    )
                ),
                WF.Element("div", { className: "chat-settings-actions" },
                    WF.Element("span", { className: `chat-settings-unsaved ${chatSettingsDirty ? "dirty" : "clean"}`.trim() }, chatSettingsDirty ? "Unsaved changes" : "No unsaved changes"),
                    WF.Element("button", { className: "button", disabled: Boolean(chatCssError), onClick: () => applyChatSettings(false) }, "Apply"),
                    WF.Element("button", { className: "button", disabled: Boolean(chatCssError), onClick: () => applyChatSettings(true) }, "Save"),
                    WF.Element("button", { className: "button", onClick: closeChatSettings }, "Cancel"),
                    WF.Element("button", { className: "button", onClick: resetChatSettingsDraft }, "Reset")
                )
            )
        )
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
                    WF.Element("button", { className: "button", onClick: windows.closeEffectsCatalog }, "Close")
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

    const runtimeSettingsNode = windows.showRuntimeSettings
        ? WF.Window(
            {
                Text: "Runtime Settings",
                Icon: "gear",
                Dialog: true,
                Draggable: true,
                OnClose: "closeRuntimeSettings",
                Style: "position: absolute; left: 260px; top: 110px; width: min(460px, 92vw);"
            },
            WF.Element("div", { className: "chat-settings-shell" },
                WF.Element("div", { className: "chat-settings-header" },
                    WF.Element("div", { className: "chat-settings-title" }, "Global Runtime"),
                    WF.Element("div", { className: "chat-settings-sub" }, "Default interval for all bindings that use global runtime policy.")
                ),
                WF.Element("div", { className: "chat-settings-section" },
                    WF.Element("div", { className: "chat-settings-field" },
                        WF.Element("label", { className: "chat-settings-slider-label" },
                            WF.Element("span", { className: "chat-settings-label" }, "Default interval"),
                            WF.Element("span", { className: "chat-settings-slider-value" }, `${runtimeSettings.defaultIntervalMs} ms`)
                        ),
                        WF.Element("input", {
                            className: "chat-settings-slider",
                            type: "range",
                            min: 250,
                            max: 10000,
                            step: 250,
                            value: runtimeSettings.defaultIntervalMs,
                            onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
                                runtimeSettings.setDefaultIntervalMs(clampRuntimeIntervalMs(Number(event.target.value), runtimeSettings.defaultIntervalMs))
                        }),
                        WF.Element("input", {
                            className: "textbox chat-settings-input",
                            type: "number",
                            min: 250,
                            max: 60000,
                            step: 50,
                            value: runtimeSettings.defaultIntervalMs,
                            onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
                                runtimeSettings.setDefaultIntervalMs(clampRuntimeIntervalMs(Number(event.target.value), runtimeSettings.defaultIntervalMs))
                        }),
                        WF.Element("div", { className: "chat-settings-note" }, "Components can override this value per item using Runtime tab.")
                    )
                ),
                WF.Element("div", { className: "chat-settings-actions" },
                    WF.Element("button", { className: "button", onClick: () => runtimeSettings.resetRuntimeSettings() }, "Reset"),
                    WF.Element("button", { className: "button", onClick: "closeRuntimeSettings" }, "Close")
                )
            )
        )
        : null;

    const saveProjectDialogNode = windows.showSaveProjectDialog
        ? WF.Window(
            {
                Text: "Save Project",
                Icon: "save",
                Dialog: true,
                Draggable: true,
                OnClose: "closeSaveProjectDialog",
                Style: "position: absolute; left: 320px; top: 140px; width: min(460px, 92vw);"
            },
            WF.Element("div", { className: "project-dialog-shell" },
                WF.Element("div", { className: "project-dialog-header" },
                    WF.Element("div", { className: "project-dialog-title" }, "Save current work"),
                    WF.Element("div", { className: "project-dialog-sub" }, "Choose project name. This name will be used for future autosaves.")
                ),
                WF.Element("div", { className: "project-dialog-section" },
                    WF.Element("label", { className: "project-dialog-label" }, "Project name"),
                    WF.Element("input", {
                        className: "textbox project-dialog-input",
                        type: "text",
                        value: saveProjectName,
                        onChange: (event: React.ChangeEvent<HTMLInputElement>) => setSaveProjectName(event.target.value),
                        onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => {
                            if (event.key === "Enter") {
                                event.preventDefault();
                                void handleSaveProjectConfirm();
                            }
                        }
                    }),
                    WF.Element("div", { className: "project-dialog-note" }, "Example: stream-overlay-main")
                ),
                WF.Element("div", { className: "project-dialog-actions" },
                    WF.Element("button", { className: "button", onClick: "closeSaveProjectDialog" }, "Cancel"),
                    WF.Element("button", {
                        className: "button",
                        disabled: saveProjectBusy || saveProjectName.trim().length === 0,
                        onClick: () => void handleSaveProjectConfirm()
                    }, saveProjectBusy ? "Saving..." : "Save")
                )
            )
        )
        : null;

    const projectLauncherNode = windows.showProjectLauncher
        ? WF.Window(
            {
                Text: "Projects",
                Icon: "new",
                Dialog: true,
                Draggable: true,
                OnClose: "closeProjectLauncher",
                Style: "position: absolute; left: 220px; top: 90px; width: min(640px, 96vw); height: min(520px, 82vh);"
            },
            WF.Element("div", { className: "project-dialog-shell" },
                WF.Element("div", { className: "project-dialog-header" },
                    WF.Element("div", { className: "project-dialog-title" }, "Recent Projects"),
                    WF.Element("div", { className: "project-dialog-sub" }, "Open an existing project or start a new one.")
                ),
                WF.Element("div", { className: "project-dialog-section project-launcher-list" },
                    recentProjectsLoading
                        ? WF.Element("div", { className: "project-dialog-note" }, "Loading projects...")
                        : recentProjectsError
                            ? WF.Element("div", { className: "project-dialog-note" }, `Failed to load projects: ${recentProjectsError}`)
                            : recentProjects.length === 0
                                ? WF.Element("div", { className: "project-dialog-note" }, "No saved projects yet.")
                                : WF.Element(
                                    "div",
                                    { className: "project-launcher-items" },
                                    ...recentProjects.map((entry) => {
                                        const updatedLabel = entry.updatedUtc
                                            ? new Date(entry.updatedUtc).toLocaleString()
                                            : "Unknown";

                                        return WF.Element("button", {
                                            key: `recent-project-${entry.layoutId}`,
                                            className: `project-launcher-item ${selectedRecentProjectId === entry.layoutId ? "is-active" : ""}`.trim(),
                                            onClick: () => setSelectedRecentProjectId(entry.layoutId)
                                        },
                                        WF.Element("div", { className: "project-launcher-item-name" }, entry.layoutId),
                                        WF.Element("div", { className: "project-launcher-item-meta" }, `Updated ${updatedLabel}`));
                                    })
                                )
                ),
                WF.Element("div", { className: "project-dialog-actions" },
                    WF.Element("button", { className: "button", onClick: () => void refreshRecentProjects(), disabled: recentProjectsLoading }, "Refresh"),
                    WF.Element("button", { className: "button", onClick: "closeProjectLauncher" }, "Continue"),
                    WF.Element("button", { className: "button", onClick: handleCreateProjectFromLauncher }, "New Project"),
                    WF.Element("button", {
                        className: "button",
                        disabled: openRecentBusy || selectedRecentProjectId.trim().length === 0,
                        onClick: () => void handleOpenRecentProject()
                    }, openRecentBusy ? "Opening..." : "Open")
                )
            )
        )
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
        chatSettingsNode,
        effectPreviewNode,
        isDocked("dataSourceExplorer") ? null : dataSourceExplorerNode,
        isDocked("textStyleEditor") ? null : textStyleEditorNode,
        textStylesAiPromptNode,
        isDocked("overlayPreview") ? null : overlayVideoPreviewNode,
        designerSettingsNode,
        runtimeSettingsNode,
        saveProjectDialogNode,
        projectLauncherNode,
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



