import { useMemo, useCallback, useEffect, useRef, useState } from "react";
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
import { buildContextWindow } from "../context/ContextWindow";
import { useContextWindowState } from "../context/useContextWindowState";
import { getSupportedTabs, resolveAdapter } from "../context/adapterRegistry";
import type { ContextRenderCtx } from "../context/adapterTypes";
import { renderContextTab } from "../context/tabs";
import {
    buildEffectPreviewConfiguration,
    renderEffectLayerNodes,
    renderTriggerEffectPreview
} from "../context/tabs/TriggerEffectPreview";
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
import {
    deleteEffect,
    deleteTrigger,
    emitTestEvent,
    fetchEffectTemplates,
    fetchEventSources,
    fetchTriggerTemplates,
    upsertTemplateEffect,
    upsertTemplateTrigger
} from "../services/triggersService";
import { CanvasItem, type ChatRenderEntry } from "../domain/types";
import { clampNumber, colorToRgba, normalizeHexColor } from "../chatSettings/shared";
import type { DesignerProjectSummary } from "../services/projectService";
import { clampRuntimeIntervalMs } from "../runtime/runtimePolicy";
import { type DesignerUiExtension } from "../types/extension.types";
import type { EventEffectOption } from "../types/effects.types";
import type {
    ComponentTriggerRule,
    EffectTemplateDescriptor,
    EffectTemplateOption,
    EventSourceDescriptor,
    EventTypeDescriptor,
    TriggerConditionTemplate,
    TriggerTemplateDescriptor
} from "../types/triggers.types";

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
    isPreviewMode: boolean;
    previewBackground: "transparent" | "white";
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

const sanitizeSegment = (value: string): string => value.replace(/[^a-zA-Z0-9._:-]/g, "-");

const pushLogLine = (entries: string[], message: string): string[] => {
    const line = `[${new Date().toLocaleTimeString()}] ${message}`;
    const next = [line, ...entries];
    return next.slice(0, 16);
};

const isOperatorWithoutValue = (operator: string): boolean => {
    const op = operator.trim().toLowerCase();
    return op === "isempty" || op === "isnotempty" || op === "istrue" || op === "isfalse";
};

const setPathValue = (root: Record<string, unknown>, path: string, value: unknown): void => {
    const tokens = path.split(".").map((token) => token.trim()).filter(Boolean);
    if (tokens.length === 0) return;
    let current: Record<string, unknown> = root;
    for (let i = 0; i < tokens.length - 1; i += 1) {
        const token = tokens[i]!;
        const existing = current[token];
        if (!existing || typeof existing !== "object" || Array.isArray(existing)) {
            const next: Record<string, unknown> = {};
            current[token] = next;
            current = next;
            continue;
        }
        current = existing as Record<string, unknown>;
    }
    current[tokens[tokens.length - 1]!] = value;
};

const sampleValueForType = (valueType: string): unknown => {
    const kind = valueType.trim().toLowerCase();
    if (kind === "number" || kind === "int" || kind === "float" || kind === "double") return 1;
    if (kind === "boolean" || kind === "bool") return true;
    if (kind === "datetime" || kind === "date") return new Date().toISOString();
    return "sample";
};

const OVERLAY_EFFECT_TOP_LEVEL_KEYS = new Set([
    "route",
    "command",
    "description",
    "includemetadata",
    "includepayload",
    "messagetypecategory",
    "messagetypename",
    "metadataoverrides",
    "data"
]);

const hasMeaningfulValue = (value: unknown): boolean => {
    if (value === null || typeof value === "undefined") return false;
    if (typeof value === "string") return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === "object") return Object.keys(value as Record<string, unknown>).length > 0;
    return true;
};

const parseEffectOptionValue = (option: EffectTemplateOption, value: unknown): unknown => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    const kind = option.valueType.trim().toLowerCase();

    if (kind === "number" || kind === "int" || kind === "float" || kind === "double") {
        const parsed = Number(trimmed);
        return Number.isFinite(parsed) ? parsed : value;
    }

    if (kind === "boolean" || kind === "bool") {
        if (trimmed.toLowerCase() === "true") return true;
        if (trimmed.toLowerCase() === "false") return false;
        return value;
    }

    if (kind === "json") {
        if (trimmed.length === 0) return null;
        try {
            return JSON.parse(trimmed);
        } catch {
            return value;
        }
    }

    return value;
};

const inferSourceTypeId = (
    item: CanvasItem | null,
    sources: Array<{ id: string; kind?: string; categoryId?: string; name?: string }>
): string | null => {
    if (!item) return null;
    const source = item.sourceId ? (sources.find((entry) => entry.id === item.sourceId) ?? null) : null;
    const tokens = [
        item.type,
        item.sourceId ?? "",
        source?.kind ?? "",
        source?.categoryId ?? "",
        source?.name ?? ""
    ]
        .join(" ")
        .toLowerCase();

    if (tokens.includes("chat")) return "chat";
    if (tokens.includes("donation") || tokens.includes("cheer") || tokens.includes("tip")) return "donation";
    if (
        tokens.includes("stream")
        || tokens.includes("follower")
        || tokens.includes("raid")
        || tokens.includes("subscription")
    ) return "stream";

    if (item.type === "chat") return "chat";
    return null;
};

type LiveOverlayEffectInstance = {
    id: string;
    command: string;
    configuration: Record<string, unknown>;
    tick: number;
    expiresAt: number;
};

const resolveChatFieldValue = (entry: ChatRenderEntry, fieldId?: string): unknown => {
    const key = (fieldId ?? "").trim().toLowerCase();
    if (!key) return entry.message;
    if (key.includes("user") || key.includes("viewer")) return entry.username;
    if (key.includes("badge")) return entry.badges.join(",");
    if (key.includes("role")) return entry.role ?? "";
    if (key.includes("text") || key.includes("message")) return entry.message;
    return entry.message;
};

const normalizeCommandName = (input?: string | null): string => {
    const text = (input ?? "").trim().toLowerCase();
    if (text.includes("confetti")) return "confetti";
    if (text.includes("caption") || text.includes("banner") || text.includes("lower")) return "caption";
    if (text.includes("sound") || text.includes("ding") || text.includes("tone")) return "sound";
    if (text.includes("flash")) return "flash";
    if (text.includes("badge")) return "badge";
    return text || "confetti";
};

const toNumber = (value: unknown): number | null => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
};

const evaluateTriggerCondition = (rule: ComponentTriggerRule, entry: ChatRenderEntry): boolean => {
    const operator = (rule.conditionOperator ?? "contains").trim().toLowerCase();
    const noValueOperator = isOperatorWithoutValue(operator);
    const left = resolveChatFieldValue(entry, rule.conditionFieldId);
    const rightRaw = rule.conditionValue ?? "";
    const right = rightRaw.trim();

    if (noValueOperator) {
        const text = String(left ?? "").trim();
        if (operator === "isempty") return text.length === 0;
        if (operator === "isnotempty") return text.length > 0;
        if (operator === "istrue") return String(left).toLowerCase() === "true";
        if (operator === "isfalse") return String(left).toLowerCase() === "false";
    }

    if (right.length === 0) return true;

    const leftNumber = toNumber(left);
    const rightNumber = toNumber(right);
    if (leftNumber !== null && rightNumber !== null) {
        if (operator === "equals" || operator === "==") return leftNumber === rightNumber;
        if (operator === "notequals" || operator === "!=") return leftNumber !== rightNumber;
        if (operator === "greaterthan" || operator === ">") return leftNumber > rightNumber;
        if (operator === "greaterorequal" || operator === ">=") return leftNumber >= rightNumber;
        if (operator === "lessthan" || operator === "<") return leftNumber < rightNumber;
        if (operator === "lessorequal" || operator === "<=") return leftNumber <= rightNumber;
    }

    const leftText = String(left ?? "").toLowerCase();
    const rightText = right.toLowerCase();
    if (operator === "equals" || operator === "==") return leftText === rightText;
    if (operator === "notequals" || operator === "!=") return leftText !== rightText;
    if (operator === "startswith") return leftText.startsWith(rightText);
    if (operator === "endswith") return leftText.endsWith(rightText);
    return leftText.includes(rightText);
};

const resolveEffectLifetimeMs = (command: string, configuration: Record<string, unknown>): number => {
    const data = configuration.data;
    const dataRecord = data && typeof data === "object" && !Array.isArray(data)
        ? (data as Record<string, unknown>)
        : null;

    const fromData = toNumber(dataRecord?.durationMs);
    const fromRoot = toNumber(configuration.durationMs);
    const durationMs = fromData ?? fromRoot ?? (command === "sound" ? 650 : command === "badge" ? 1200 : 2200);
    return Math.max(400, durationMs + 450);
};

const USE_UNIFIED_CONTEXT_WINDOW = import.meta.env.DEV
    && String(import.meta.env.VITE_USE_UNIFIED_CONTEXT_WINDOW ?? "1") !== "0";

export const useDesktopRender = (props: DesktopRenderProps) => {
    const {
        canvas, layerMgmt, windows, theme, extensions, textStyles, dataSources, effectsCatalog, itemOps, getImageSource,
        selectedItem, status, setStatus, saveError, lastSavedUtc, overlayName,
        isSaving, isDirty, isAutoSaving, loadingState,
        canUndo, canRedo, canBind, scheduleRuns, scheduleEpoch,
        videoState, overlayPreviewNodes, tools, schedulerItems, scheduleTarget, effectsTarget,
        textEffectsExtensions, dialogExtensions,
        runTest, renderJsonTree, runtimeSettings, isPreviewMode, previewBackground, projectActions
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

    // Legacy Chat Settings removed in favor of unified Context Window
    const [dataSourceExplorerTab, setDataSourceExplorerTab] = useState<DataSourceExplorerTabId>("data");
    const [saveProjectName, setSaveProjectName] = useState<string>("");
    const [saveProjectBusy, setSaveProjectBusy] = useState(false);
    const [recentProjects, setRecentProjects] = useState<DesignerProjectSummary[]>([]);
    const [recentProjectsLoading, setRecentProjectsLoading] = useState(false);
    const [recentProjectsError, setRecentProjectsError] = useState<string | null>(null);
    const [selectedRecentProjectId, setSelectedRecentProjectId] = useState<string>("");
    const [openRecentBusy, setOpenRecentBusy] = useState(false);
    const refreshRecentProjectsInFlightRef = useRef<Promise<void> | null>(null);
    const [contextSelectedTriggerRuleByItem, setContextSelectedTriggerRuleByItem] = useState<Record<string, string>>({});
    const contextWindow = useContextWindowState();
    const [showTriggerContext, setShowTriggerContext] = useState(false);
    const [triggerContextTargetId, setTriggerContextTargetId] = useState<string | null>(null);
    const [eventSources, setEventSources] = useState<EventSourceDescriptor[]>([]);
    const [triggerTemplateCatalog, setTriggerTemplateCatalog] = useState<TriggerTemplateDescriptor[]>([]);
    const [effectTemplateCatalog, setEffectTemplateCatalog] = useState<EffectTemplateDescriptor[]>([]);
    const [triggerContextLoading, setTriggerContextLoading] = useState(false);
    const [triggerContextError, setTriggerContextError] = useState<string | null>(null);
    const [triggerContextSaving, setTriggerContextSaving] = useState(false);
    const [selectedTriggerTemplateId, setSelectedTriggerTemplateId] = useState("");
    const [selectedEffectTemplateId, setSelectedEffectTemplateId] = useState("");
    const [triggerEffectSearch, setTriggerEffectSearch] = useState("");
    const [triggerConditionValue, setTriggerConditionValue] = useState("");
    const [effectPayloadValue, setEffectPayloadValue] = useState("");
    const [triggerPreviewTick, setTriggerPreviewTick] = useState(1);
    const [triggerCooldownSec, setTriggerCooldownSec] = useState(3);
    const [triggerContextStatus, setTriggerContextStatus] = useState("Select trigger and effect.");
    const [triggerContextPreview, setTriggerContextPreview] = useState("No preview yet.");
    const [triggerContextLog, setTriggerContextLog] = useState<string[]>(["Ready."]);
    const [liveOverlayEffects, setLiveOverlayEffects] = useState<LiveOverlayEffectInstance[]>([]);
    const processedChatTimestampByItemRef = useRef<Map<string, number>>(new Map());
    const cooldownByRuleRef = useRef<Map<string, number>>(new Map());
    const liveEffectTickRef = useRef(1);

    const openDataSourceExplorer = useCallback((tab: DataSourceExplorerTabId = "data") => {
        setDataSourceExplorerTab(tab);
        windows.setShowDataSourceExplorer(true);
    }, [windows]);

    const openContextWindowForItem = useCallback((itemId: string) => {
        const item = canvas.items.find((entry) => entry.id === itemId);
        if (!item) return;
        canvas.setSelectedIds([itemId]);
        contextWindow.openForItem(item);
    }, [canvas, contextWindow]);

    const appendTriggerLog = useCallback((message: string) => {
        setTriggerContextLog((prev) => pushLogLine(prev, message));
    }, []);

    const openTriggerContextForItem = useCallback((item: CanvasItem) => {
        // Legacy trigger builder remains (bridge) until unified flow fully migrates.
        setTriggerContextTargetId(item.id);
        setShowTriggerContext(true);
        setTriggerEffectSearch("");
        setTriggerPreviewTick(1);
        setTriggerContextStatus("Select trigger and effect.");
        setTriggerContextPreview("No preview yet.");
        setTriggerContextLog(["Ready."]);
    }, []);

    const selectContextTriggerRule = useCallback((itemId: string, ruleId: string) => {
        setContextSelectedTriggerRuleByItem((prev) => {
            if (prev[itemId] === ruleId) return prev;
            return { ...prev, [itemId]: ruleId };
        });
    }, []);

    const getContextTriggerRuleSelection = useCallback((itemId: string): string | null => {
        const selected = contextSelectedTriggerRuleByItem[itemId];
        return selected ?? null;
    }, [contextSelectedTriggerRuleByItem]);

    const closeTriggerContext = useCallback(() => {
        setShowTriggerContext(false);
        setTriggerContextTargetId(null);
        setTriggerContextError(null);
        setTriggerEffectSearch("");
        setTriggerPreviewTick(1);
        setTriggerContextStatus("Select trigger and effect.");
        setTriggerContextPreview("No preview yet.");
    }, []);

    const refreshRecentProjects = useCallback(async () => {
        if (refreshRecentProjectsInFlightRef.current) {
            await refreshRecentProjectsInFlightRef.current;
            return;
        }

        const request = (async () => {
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
        })();

        refreshRecentProjectsInFlightRef.current = request;
        try {
            await request;
        } finally {
            if (refreshRecentProjectsInFlightRef.current === request) {
                refreshRecentProjectsInFlightRef.current = null;
            }
        }
    }, [projectActions.listRecentProjects]);

    useEffect(() => {
        if (!windows.showSaveProjectDialog) return;
        setSaveProjectName(overlayName || "my-overlay");
    }, [overlayName, windows.showSaveProjectDialog]);

    useEffect(() => {
        if (!windows.showProjectLauncher) return;
        void refreshRecentProjects();
    }, [refreshRecentProjects, windows.showProjectLauncher]);

    useEffect(() => {
        if (!showTriggerContext) return;
        let cancelled = false;

        const load = async () => {
            setTriggerContextLoading(true);
            setTriggerContextError(null);
            try {
                const [sources, triggerTemplates, effectTemplates] = await Promise.all([
                    fetchEventSources(),
                    fetchTriggerTemplates(),
                    fetchEffectTemplates()
                ]);
                if (cancelled) return;
                setEventSources(sources);
                setTriggerTemplateCatalog(triggerTemplates);
                setEffectTemplateCatalog(effectTemplates);
                setSelectedTriggerTemplateId((prev) => prev || triggerTemplates[0]?.templateId || "");
                setSelectedEffectTemplateId((prev) => prev || effectTemplates[0]?.templateId || "");
            } catch (error) {
                if (cancelled) return;
                setTriggerContextError(String(error));
            } finally {
                if (!cancelled) {
                    setTriggerContextLoading(false);
                }
            }
        };

        void load();
        return () => {
            cancelled = true;
        };
    }, [showTriggerContext]);

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
        openContextWindowForItem(itemId);
    }, [openContextWindowForItem]);

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

    const renderedItems = canvas.items;
    const menuNode = isPreviewMode ? null : buildMenuNode({ showEffectsLive: windows.showEffectsLive });
    const liveEffectsNode = windows.showEffectsLive && liveOverlayEffects.length > 0
        ? WF.Element(
            "div",
            { className: "canvas-live-effects-layer" },
            ...liveOverlayEffects.flatMap((entry) => renderEffectLayerNodes(entry.command, entry.configuration, entry.tick))
        )
        : null;

    const contextBarNode = isPreviewMode
        ? null
        : buildContextBarNode({
            selectedItem,
            onUpdateItem: canvas.updateItem,
            onShowTextStyleEditor: () => windows.setShowTextStyleEditor(true),
            onShowContextWindow: () => {
                if (!selectedItem) return;
                openContextWindowForItem(selectedItem.id);
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
        selectedIds: isPreviewMode ? [] : canvas.selectedIds,
        getItemStyle,
        getDisplayLabel,
        getChatLines,
        getChatEntries,
        getProgressPercent,
        getImageSource,
        getVideoSource,
        beginResize: isPreviewMode ? () => () => undefined : beginResize,
        handleItemMouseDown: isPreviewMode ? () => () => undefined : handleItemMouseDown,
        handleItemDoubleClick: isPreviewMode ? () => () => undefined : handleItemDoubleClick,
        selectionBox: isPreviewMode ? { active: false, x: 0, y: 0, width: 0, height: 0 } : canvas.selectionBox,
        placementBox: isPreviewMode ? { active: false, x: 0, y: 0, width: 0, height: 0 } : canvas.placementBox,
        onMouseDown: isPreviewMode ? (() => undefined) : handleCanvasMouseDown,
        onMouseMove: isPreviewMode ? (() => undefined) : handleCanvasMouseMove,
        onMouseUp: isPreviewMode ? (() => undefined) : handleCanvasMouseUp,
        isPreviewMode,
        previewBackground,
        liveEffectsNode
    });

    const toolboxNode = isPreviewMode ? null : buildToolboxNode(tools, canvas.activeTool);

    const statusBarNode = isPreviewMode
        ? null
        : buildStatusBarNode({
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
            ClassName: `playground2-canvas-form ${isPreviewMode ? "is-preview-mode" : ""}`.trim(),
            Style: "position: relative; flex: 1; min-height: 0; display: flex; align-items: center; justify-content: center; overflow: auto;"
        },
        element(
            "div",
            {
                className: `canvas-wrapper ${isPreviewMode ? "is-preview-mode" : ""}`.trim(),
                style: isPreviewMode ? undefined : `transform: scale(${canvas.canvasScale}); transform-origin: center;`
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

    const triggerContextTarget = showTriggerContext && triggerContextTargetId
        ? (canvas.items.find((item) => item.id === triggerContextTargetId) ?? null)
        : null;
    const triggerContextSourceTypeId = inferSourceTypeId(triggerContextTarget, dataSources.sources);
    const triggerContextSource = triggerContextSourceTypeId
        ? (eventSources.find((source) => source.sourceTypeId === triggerContextSourceTypeId) ?? null)
        : null;
    const triggerContextEventTypes = triggerContextSource?.eventTypes ?? [];
    const allEventTypes = eventSources.flatMap((source) => source.eventTypes);
    const eventTypeById = new Map<string, EventTypeDescriptor>(
        allEventTypes.map((eventType) => [eventType.eventTypeId, eventType])
    );
    const allowedEventTypeIds = new Set(triggerContextEventTypes.map((eventType) => eventType.eventTypeId));
    const availableTriggerTemplates = triggerContextSource
        ? triggerTemplateCatalog.filter((template) => allowedEventTypeIds.has(template.eventTypeId))
        : triggerTemplateCatalog;
    const selectedTriggerTemplate = availableTriggerTemplates.find((template) => template.templateId === selectedTriggerTemplateId)
        ?? availableTriggerTemplates[0]
        ?? null;
    const selectedEffectTemplate = effectTemplateCatalog.find((template) => template.templateId === selectedEffectTemplateId)
        ?? effectTemplateCatalog[0]
        ?? null;
    const triggerEffectSearchNormalized = triggerEffectSearch.trim().toLowerCase();
    const filteredEffectTemplates = useMemo(() => {
        if (triggerEffectSearchNormalized.length === 0) return effectTemplateCatalog;
        return effectTemplateCatalog.filter((template) => {
            const haystack = [
                template.displayName,
                template.templateId,
                template.description ?? "",
                template.effectFactoryTypeName
            ]
                .join(" ")
                .toLowerCase();
            return haystack.includes(triggerEffectSearchNormalized);
        });
    }, [effectTemplateCatalog, triggerEffectSearchNormalized]);
    const selectedEventType = selectedTriggerTemplate
        ? (eventTypeById.get(selectedTriggerTemplate.eventTypeId) ?? null)
        : null;
    const selectedCondition: TriggerConditionTemplate | null = selectedTriggerTemplate?.conditions?.[0] ?? null;
    const selectedConditionField = selectedCondition
        ? (selectedEventType?.fields.find((field) => field.fieldId === selectedCondition.fieldId) ?? null)
        : null;
    const editableEffectOption: EffectTemplateOption | null = selectedEffectTemplate
        ? (selectedEffectTemplate.options.find((option) => option.key.toLowerCase() !== "command" && option.valueType.toLowerCase() === "string")
            ?? selectedEffectTemplate.options.find((option) => option.key.toLowerCase() !== "command")
            ?? null)
        : null;
    const triggerContextRules = triggerContextTarget?.triggerRules ?? [];
    const triggerConditionRequiresValue = Boolean(
        selectedCondition?.required
        && !isOperatorWithoutValue(selectedCondition.defaultOperator)
    );
    const isTriggerConditionSatisfied = !triggerConditionRequiresValue || triggerConditionValue.trim().length > 0;
    const isTriggerConfiguredForEffect = Boolean(selectedTriggerTemplate) && isTriggerConditionSatisfied;

    useEffect(() => {
        if (!showTriggerContext) return;
        if (availableTriggerTemplates.length > 0) {
            const hasCurrent = availableTriggerTemplates.some((template) => template.templateId === selectedTriggerTemplateId);
            if (!hasCurrent) {
                setSelectedTriggerTemplateId(availableTriggerTemplates[0]!.templateId);
            }
        } else {
            setSelectedTriggerTemplateId("");
        }

        if (effectTemplateCatalog.length > 0) {
            const hasCurrent = effectTemplateCatalog.some((template) => template.templateId === selectedEffectTemplateId);
            if (!hasCurrent) {
                setSelectedEffectTemplateId(effectTemplateCatalog[0]!.templateId);
            }
        } else {
            setSelectedEffectTemplateId("");
        }
    }, [
        availableTriggerTemplates,
        effectTemplateCatalog,
        selectedEffectTemplateId,
        selectedTriggerTemplateId,
        showTriggerContext
    ]);

    useEffect(() => {
        if (!showTriggerContext) return;
        setTriggerConditionValue(selectedCondition?.placeholder ?? "");
    }, [selectedCondition?.fieldId, selectedCondition?.placeholder, showTriggerContext]);

    useEffect(() => {
        if (!showTriggerContext) return;
        if (!editableEffectOption) {
            setEffectPayloadValue("");
            return;
        }
        const fallback = typeof editableEffectOption.defaultValue === "string"
            ? editableEffectOption.defaultValue
            : "";
        setEffectPayloadValue(fallback);
    }, [editableEffectOption?.key, editableEffectOption?.defaultValue, showTriggerContext]);

    useEffect(() => {
        if (!showTriggerContext || !isTriggerConfiguredForEffect || !selectedEffectTemplate) return;
        setTriggerPreviewTick((value) => value + 1);
    }, [
        showTriggerContext,
        isTriggerConfiguredForEffect,
        selectedEffectTemplate?.templateId,
        effectPayloadValue
    ]);

    const triggerContextSentence = useMemo(() => {
        if (!selectedTriggerTemplate || !selectedEffectTemplate) {
            return "Choose trigger and effect.";
        }
        const operator = selectedCondition?.defaultOperator ?? "";
        const conditionPart = selectedCondition
            ? isOperatorWithoutValue(operator)
                ? ` (${selectedCondition.fieldId} ${operator})`
                : triggerConditionValue.trim().length > 0
                    ? ` (${selectedCondition.fieldId} ${operator} "${triggerConditionValue.trim()}")`
                    : ""
            : "";
        const payloadPart = editableEffectOption && effectPayloadValue.trim().length > 0
            ? ` with ${editableEffectOption.label} "${effectPayloadValue.trim()}"`
            : "";
        if (!isTriggerConfiguredForEffect) {
            return `When ${selectedTriggerTemplate.displayName}${conditionPart} ... configure required trigger fields to unlock effects.`;
        }
        return `When ${selectedTriggerTemplate.displayName}${conditionPart}, then ${selectedEffectTemplate.displayName}${payloadPart}. Cooldown ${triggerCooldownSec}s.`;
    }, [
        editableEffectOption,
        effectPayloadValue,
        isTriggerConfiguredForEffect,
        selectedCondition,
        selectedEffectTemplate,
        selectedTriggerTemplate,
        triggerConditionValue,
        triggerCooldownSec
    ]);

    const buildEffectConfiguration = useCallback((): Record<string, unknown> => {
        if (!selectedEffectTemplate) return {};
        const config: Record<string, unknown> = {};

        for (const option of selectedEffectTemplate.options) {
            if (typeof option.defaultValue !== "undefined") {
                config[option.key] = parseEffectOptionValue(option, option.defaultValue);
            }
        }

        if (editableEffectOption && effectPayloadValue.trim().length > 0) {
            config[editableEffectOption.key] = parseEffectOptionValue(editableEffectOption, effectPayloadValue.trim());
        }

        if (selectedEffectTemplate.effectFactoryTypeName === "core.overlay") {
            if (!hasMeaningfulValue(config.route)) {
                config.route = "overlay";
            }

            const dataFromOptions: Record<string, unknown> = {};
            for (const option of selectedEffectTemplate.options) {
                const key = option.key;
                if (OVERLAY_EFFECT_TOP_LEVEL_KEYS.has(key.toLowerCase())) {
                    continue;
                }
                if (hasMeaningfulValue(config[key])) {
                    dataFromOptions[key] = config[key];
                }
                delete config[key];
            }

            const existingData = config.data;
            const baseData = existingData && typeof existingData === "object" && !Array.isArray(existingData)
                ? { ...(existingData as Record<string, unknown>) }
                : {};
            const mergedData = { ...baseData, ...dataFromOptions };
            if (Object.keys(mergedData).length > 0) {
                config.data = mergedData;
            } else {
                delete config.data;
            }
        }

        if (!hasMeaningfulValue(config.command)) {
            const commandOption = selectedEffectTemplate.options.find((option) => option.key.toLowerCase() === "command");
            if (commandOption && typeof commandOption.defaultValue === "string" && commandOption.defaultValue.trim().length > 0) {
                config.command = commandOption.defaultValue.trim();
            }
        }

        return config;
    }, [editableEffectOption, effectPayloadValue, selectedEffectTemplate]);

    const validateEffectConfiguration = useCallback((configuration: Record<string, unknown>): string | null => {
        if (!selectedEffectTemplate) {
            return "Effect template is required.";
        }

        for (const option of selectedEffectTemplate.options) {
            if (!option.required) continue;

            const keyLower = option.key.toLowerCase();
            if (
                selectedEffectTemplate.effectFactoryTypeName === "core.overlay"
                && !OVERLAY_EFFECT_TOP_LEVEL_KEYS.has(keyLower)
            ) {
                const dataValue = (configuration.data as Record<string, unknown> | undefined)?.[option.key];
                if (!hasMeaningfulValue(dataValue)) {
                    return `Effect option "${option.label}" is required.`;
                }
                continue;
            }

            if (!hasMeaningfulValue(configuration[option.key])) {
                return `Effect option "${option.label}" is required.`;
            }
        }

        if (selectedEffectTemplate.effectFactoryTypeName === "core.overlay") {
            if (!hasMeaningfulValue(configuration.route)) {
                return "Effect route is required.";
            }
            if (!hasMeaningfulValue(configuration.command)) {
                return "Effect command is required.";
            }
        }

        return null;
    }, [selectedEffectTemplate]);

    const effectConfigurationPreview = useMemo(
        () => buildEffectConfiguration(),
        [buildEffectConfiguration]
    );
    const triggerPreviewEffectKind = typeof effectConfigurationPreview.command === "string"
        ? effectConfigurationPreview.command
        : (selectedEffectTemplate?.displayName ?? "");
    const effectTemplateById = useMemo(
        () => new Map(effectTemplateCatalog.map((template) => [template.templateId, template])),
        [effectTemplateCatalog]
    );

    useEffect(() => {
        if (!windows.showEffectsLive) {
            processedChatTimestampByItemRef.current.clear();
            cooldownByRuleRef.current.clear();
            setLiveOverlayEffects([]);
            return;
        }

        const now = Date.now();
        const spawned: LiveOverlayEffectInstance[] = [];

        for (const item of canvas.items) {
            if (item.type !== "chat" || !item.sourceId) continue;
            const rules = Array.isArray(item.triggerRules) ? item.triggerRules : [];
            if (rules.length === 0) continue;

            const entries = getChatEntries(item);
            if (!Array.isArray(entries) || entries.length === 0) continue;

            const hasProcessedValue = processedChatTimestampByItemRef.current.has(item.id);
            const lastProcessed = processedChatTimestampByItemRef.current.get(item.id) ?? 0;
            if (!hasProcessedValue) {
                const latestTimestamp = entries.reduce((max, entry) => Math.max(max, entry.timestamp), 0);
                processedChatTimestampByItemRef.current.set(item.id, latestTimestamp);
                continue;
            }
            const newEntries = entries.filter((entry) => entry.timestamp > lastProcessed);
            const latestTimestamp = entries.reduce((max, entry) => Math.max(max, entry.timestamp), lastProcessed);
            processedChatTimestampByItemRef.current.set(item.id, latestTimestamp);
            if (newEntries.length === 0) continue;

            for (const entry of newEntries) {
                for (const rule of rules) {
                    if (!evaluateTriggerCondition(rule, entry)) continue;

                    const cooldownKey = `${item.id}:${rule.ruleId}`;
                    const cooldownSec = Number.isFinite(Number(rule.cooldownSec)) ? Math.max(0, Number(rule.cooldownSec)) : 0;
                    const lastFiredAt = cooldownByRuleRef.current.get(cooldownKey) ?? 0;
                    if (cooldownSec > 0 && now - lastFiredAt < cooldownSec * 1000) continue;

                    const template = effectTemplateById.get(rule.effectTemplateId) ?? null;
                    const configuration = template
                        ? buildEffectPreviewConfiguration(
                            template,
                            rule.effectPayloadKey
                                ? {
                                    key: rule.effectPayloadKey,
                                    value: rule.effectPayloadValue
                                }
                                : null
                        )
                        : {
                            route: "overlay",
                            command: normalizeCommandName(rule.effectTemplateName),
                            data: rule.effectPayloadKey && rule.effectPayloadValue
                                ? { [rule.effectPayloadKey]: rule.effectPayloadValue }
                                : {}
                        };

                    const command = normalizeCommandName(
                        typeof configuration.command === "string" ? configuration.command : rule.effectTemplateName
                    );
                    const lifetimeMs = resolveEffectLifetimeMs(command, configuration);
                    const tick = liveEffectTickRef.current;
                    liveEffectTickRef.current += 1;

                    spawned.push({
                        id: `live:${item.id}:${rule.ruleId}:${entry.id}:${tick}`,
                        command,
                        configuration,
                        tick,
                        expiresAt: now + lifetimeMs
                    });

                    cooldownByRuleRef.current.set(cooldownKey, now);
                }
            }
        }

        if (spawned.length > 0) {
            setLiveOverlayEffects((previous) => {
                const alive = previous.filter((entry) => entry.expiresAt > now);
                return [...alive, ...spawned].slice(-36);
            });
        }
    }, [canvas.items, effectTemplateById, getChatEntries, windows.showEffectsLive]);

    useEffect(() => {
        if (liveOverlayEffects.length === 0) return;
        const timer = window.setInterval(() => {
            const now = Date.now();
            setLiveOverlayEffects((previous) => previous.filter((entry) => entry.expiresAt > now));
        }, 220);

        return () => window.clearInterval(timer);
    }, [liveOverlayEffects.length]);

    const buildTriggerFilter = useCallback((): Record<string, unknown> => {
        const fields: Record<string, string> = {};
        const conditions: Array<{ field: string; operator: string; value?: string | null }> = [];

        if (selectedCondition) {
            const conditionPath = selectedConditionField?.payloadPath || selectedCondition.fieldId;
            fields[selectedCondition.fieldId] = conditionPath;
            const includeCondition = selectedCondition.required
                || triggerConditionValue.trim().length > 0
                || isOperatorWithoutValue(selectedCondition.defaultOperator);
            if (includeCondition) {
                conditions.push({
                    field: selectedCondition.fieldId,
                    operator: selectedCondition.defaultOperator,
                    value: isOperatorWithoutValue(selectedCondition.defaultOperator)
                        ? null
                        : (triggerConditionValue.trim().length > 0 ? triggerConditionValue.trim() : null)
                });
            }
        }

        return {
            match: "all",
            fields,
            conditions
        };
    }, [selectedCondition, selectedConditionField?.payloadPath, triggerConditionValue]);

    const buildTestPayload = useCallback((): Record<string, unknown> => {
        const payload: Record<string, unknown> = {};
        if (!selectedEventType) return payload;

        for (const field of selectedEventType.fields) {
            const sample = sampleValueForType(field.valueType);
            setPathValue(payload, field.payloadPath || field.fieldId, sample);
        }

        if (selectedCondition && selectedConditionField) {
            const op = selectedCondition.defaultOperator;
            let value: unknown = triggerConditionValue.trim();
            const valueType = selectedConditionField.valueType.toLowerCase();

            if (isOperatorWithoutValue(op)) {
                const opKey = op.trim().toLowerCase();
                if (opKey === "istrue") value = true;
                else if (opKey === "isfalse") value = false;
                else if (opKey === "isempty") value = "";
                else value = "sample";
            } else if (valueType === "number") {
                const parsed = Number(triggerConditionValue.trim());
                value = Number.isFinite(parsed) ? parsed : 1;
            } else if (valueType === "boolean") {
                value = triggerConditionValue.trim().toLowerCase() === "true";
            } else if ((triggerConditionValue.trim().length === 0) && selectedCondition.placeholder) {
                value = selectedCondition.placeholder;
            } else if (triggerConditionValue.trim().length === 0) {
                value = "sample";
            }

            setPathValue(payload, selectedConditionField.payloadPath || selectedCondition.fieldId, value);
        }

        return payload;
    }, [selectedCondition, selectedConditionField, selectedEventType, triggerConditionValue]);

    const testTriggerContextRule = useCallback(async () => {
        if (!selectedTriggerTemplate || !selectedEventType || !selectedEffectTemplate) {
            setTriggerContextStatus("Select trigger and effect first.");
            return;
        }

        const payload = buildTestPayload();
        try {
            await emitTestEvent({
                category: selectedEventType.category,
                name: selectedEventType.name,
                payload,
                source: `designer.trigger-context.${triggerContextTarget?.id ?? "unknown"}`
            });
            setTriggerContextPreview(`Test emitted: ${selectedTriggerTemplate.displayName} -> ${selectedEffectTemplate.displayName}`);
            setTriggerContextStatus(`Emitted ${selectedEventType.category}.${selectedEventType.name}.`);
            appendTriggerLog(`Test event emitted for ${selectedTriggerTemplate.displayName}.`);
        } catch (error) {
            setTriggerContextStatus(`Test failed: ${String(error)}`);
            appendTriggerLog(`Test failed: ${String(error)}`);
        }
    }, [
        appendTriggerLog,
        buildTestPayload,
        selectedEffectTemplate,
        selectedEventType,
        selectedTriggerTemplate,
        triggerContextTarget?.id
    ]);

    const addTriggerContextRule = useCallback(async () => {
        if (!triggerContextTarget?.id) {
            setTriggerContextStatus("No component selected.");
            return;
        }
        if (!selectedTriggerTemplate || !selectedEffectTemplate || !selectedEventType) {
            setTriggerContextStatus("Select trigger and effect first.");
            return;
        }

        const conditionNeeded = selectedCondition?.required && !isOperatorWithoutValue(selectedCondition.defaultOperator);
        if (conditionNeeded && triggerConditionValue.trim().length === 0) {
            setTriggerContextStatus("Trigger condition value is required.");
            return;
        }

        const stamp = Date.now();
        const baseId = `ui-rule:${sanitizeSegment(triggerContextTarget.id)}:${sanitizeSegment(selectedTriggerTemplate.templateId)}:${sanitizeSegment(selectedEffectTemplate.templateId)}:${stamp}`;
        const effectId = `${baseId}:effect`;
        const triggerId = `${baseId}:trigger`;
        const effectConfiguration = buildEffectConfiguration();
        const effectValidationError = validateEffectConfiguration(effectConfiguration);
        if (effectValidationError) {
            setTriggerContextStatus(effectValidationError);
            appendTriggerLog(`Rule validation failed: ${effectValidationError}`);
            return;
        }

        setTriggerContextSaving(true);
        try {
            await upsertTemplateEffect({
                id: effectId,
                typeName: selectedEffectTemplate.effectFactoryTypeName,
                description: `UI effect for ${triggerContextTarget.name ?? triggerContextTarget.type}`,
                configuration: effectConfiguration,
                enabled: true
            });

            await upsertTemplateTrigger({
                id: triggerId,
                messageTypeCategory: selectedEventType.category,
                messageTypeName: selectedEventType.name,
                effectIds: [effectId],
                typeName: selectedTriggerTemplate.triggerFactoryTypeName,
                filter: buildTriggerFilter(),
                description: `UI trigger for ${triggerContextTarget.name ?? triggerContextTarget.type}`,
                enabled: true
            });

            const createdUtc = new Date().toISOString();
            const nextRule: ComponentTriggerRule = {
                ruleId: baseId,
                triggerId,
                effectId,
                triggerTemplateId: selectedTriggerTemplate.templateId,
                triggerTemplateName: selectedTriggerTemplate.displayName,
                effectTemplateId: selectedEffectTemplate.templateId,
                effectTemplateName: selectedEffectTemplate.displayName,
                eventTypeId: selectedTriggerTemplate.eventTypeId,
                messageTypeCategory: selectedEventType.category,
                messageTypeName: selectedEventType.name,
                conditionFieldId: selectedCondition?.fieldId,
                conditionOperator: selectedCondition?.defaultOperator,
                conditionValue: triggerConditionValue.trim() || undefined,
                effectPayloadKey: editableEffectOption?.key,
                effectPayloadValue: effectPayloadValue.trim() || undefined,
                cooldownSec: Math.max(0, Math.min(120, Number.isFinite(triggerCooldownSec) ? triggerCooldownSec : 0)),
                createdUtc
            };

            const nextRules = [...triggerContextRules, nextRule];
            canvas.updateItem(triggerContextTarget.id, { triggerRules: nextRules });

            setTriggerContextStatus(`Rule saved: ${selectedTriggerTemplate.displayName} -> ${selectedEffectTemplate.displayName}`);
            setTriggerContextPreview(`Added ${selectedEffectTemplate.displayName}`);
            appendTriggerLog(`Rule saved: ${selectedTriggerTemplate.displayName} -> ${selectedEffectTemplate.displayName}.`);
        } catch (error) {
            setTriggerContextStatus(`Save failed: ${String(error)}`);
            appendTriggerLog(`Save failed: ${String(error)}`);
        } finally {
            setTriggerContextSaving(false);
        }
    }, [
        appendTriggerLog,
        buildEffectConfiguration,
        buildTriggerFilter,
        canvas,
        editableEffectOption?.key,
        effectPayloadValue,
        selectedCondition,
        selectedEffectTemplate,
        selectedEventType,
        selectedTriggerTemplate,
        triggerConditionValue,
        triggerContextRules,
        triggerContextTarget,
        triggerCooldownSec,
        validateEffectConfiguration
    ]);

    const deleteTriggerContextRule = useCallback(async (rule: ComponentTriggerRule) => {
        if (!triggerContextTarget?.id) return;
        try {
            await deleteTrigger(rule.triggerId);
            await deleteEffect(rule.effectId);
            const nextRules = triggerContextRules.filter((entry) => entry.ruleId !== rule.ruleId);
            canvas.updateItem(triggerContextTarget.id, { triggerRules: nextRules });
            setTriggerContextStatus(`Rule removed: ${rule.triggerTemplateName}`);
            appendTriggerLog(`Rule removed: ${rule.triggerTemplateName}.`);
        } catch (error) {
            setTriggerContextStatus(`Delete failed: ${String(error)}`);
            appendTriggerLog(`Delete failed: ${String(error)}`);
        }
    }, [appendTriggerLog, canvas, triggerContextRules, triggerContextTarget]);

    const contextTarget = contextWindow.isOpen && contextWindow.targetItemId
        ? (canvas.items.find((item) => item.id === contextWindow.targetItemId) ?? null)
        : null;
    const contextAdapter = resolveAdapter(contextTarget);
    const contextTabs = getSupportedTabs(contextTarget);
    const contextActiveTab = contextWindow.getActiveTab(contextTarget);

    const openTriggerBuilderById = useCallback((itemId: string) => {
        const item = canvas.items.find((entry) => entry.id === itemId);
        if (!item) return;
        openTriggerContextForItem(item);
    }, [canvas.items, openTriggerContextForItem]);

    const openEffectsCatalogById = useCallback((itemId: string) => {
        windows.openEffectsCatalog(itemId);
    }, [windows]);

    const contextRenderCtx: ContextRenderCtx = {
        updateItem: canvas.updateItem,
        dataSources: {
            sources: dataSources.sources,
            isSystemSource: dataSources.isSystemSource,
            runTest,
            defaultRuntimeIntervalMs: runtimeSettings.defaultIntervalMs
        },
        effectsCatalog: {
            open: openEffectsCatalogById
        },
        triggersService: {
            openBuilder: openTriggerBuilderById,
            eventSources,
            triggerTemplates: triggerTemplateCatalog,
            effectTemplates: effectTemplateCatalog,
            getSelectedRuleId: getContextTriggerRuleSelection,
            selectRule: selectContextTriggerRule
        },
        status,
        setStatus
    };

    const unifiedContextFooterNode = contextTarget
        ? WF.Element("div", { className: "context-window-footer" },
            WF.Element("div", { className: "context-window-note" }, `Adapter: ${contextAdapter.id}`),
            WF.Element("button", { className: "button", onClick: contextWindow.close }, "Close")
        )
        : null;

    const handleContextTabChanged = useCallback((payload?: { selectedIndex?: number }) => {
        if (!contextTarget) return;
        const nextIndex = payload?.selectedIndex ?? 0;
        const tab = contextTabs[nextIndex];
        if (!tab) return;
        contextWindow.setActiveTab(contextTarget.type, tab.id);
    }, [contextTabs, contextTarget, contextWindow]);

    const unifiedContextWindowNode = contextTarget
        ? buildContextWindow({
            item: contextTarget,
            tabs: contextTabs,
            activeTab: contextActiveTab,
            onClose: contextWindow.close,
            renderTabBody: (tabId) => renderContextTab(tabId, contextTarget, contextRenderCtx),
            onTabChange: "contextTabChanged",
            footerNode: unifiedContextFooterNode,
            loading: contextWindow.loading,
            error: contextWindow.error
        })
        : null;

    const triggerContextNode = triggerContextTarget
        ? WF.Window(
            {
                Text: "Trigger Context",
                Icon: "bolt",
                Dialog: false,
                Draggable: true,
                Minimize: false,
                Maximize: true,
                Close: true,
                OnClose: closeTriggerContext,
                Style: "position: absolute; left: 220px; top: 96px; width: min(1120px, 97vw); height: min(700px, 90vh);",
                BodyClassName: "trigger-context-window"
            },
            WF.Element("div", { className: "trigger-context-shell" },
                WF.Element("div", { className: "trigger-context-header" },
                    WF.Element("div", { className: "trigger-context-title" }, triggerContextTarget.name ?? triggerContextTarget.label ?? triggerContextTarget.type),
                    WF.Element("div", { className: "trigger-context-sub" }, triggerContextTarget.sourceId
                        ? `Data source: ${triggerContextTarget.sourceId} · ${triggerContextSource?.displayName ?? (triggerContextSourceTypeId ?? "unknown source")}`
                        : "No data source bound to this component.")
                ),
                triggerContextLoading
                    ? WF.Element("div", { className: "trigger-context-note" }, "Loading trigger catalogs...")
                    : triggerContextError
                        ? WF.Element("div", { className: "trigger-context-note" }, `Failed to load catalogs: ${triggerContextError}`)
                        : WF.Element("div", { className: "trigger-context-body" },
                            WF.Element("div", { className: "trigger-context-main" },
                                WF.Element("div", { className: "trigger-context-left" },
                                    WF.Element("div", { className: "trigger-context-grid" },
                                        WF.Element("div", { className: "trigger-context-section" },
                                            WF.Element("div", { className: "trigger-context-section-title" }, "1) When"),
                                            WF.Element("div", { className: "trigger-context-field" },
                                                WF.Element("label", { className: "trigger-context-label" }, "Trigger template"),
                                                WF.Element("select", {
                                                    className: "combobox trigger-context-input",
                                                    value: selectedTriggerTemplate?.templateId ?? "",
                                                    onChange: (event: React.ChangeEvent<HTMLSelectElement>) => setSelectedTriggerTemplateId(event.target.value)
                                                },
                                                ...availableTriggerTemplates.map((template) =>
                                                    WF.Element("option", { key: `trigger-template-${template.templateId}`, value: template.templateId }, template.displayName)
                                                ))
                                            ),
                                            selectedTriggerTemplate
                                                ? WF.Element("div", { className: "trigger-context-note" }, selectedTriggerTemplate.description)
                                                : WF.Element("div", { className: "trigger-context-note" }, "No trigger templates available for this source."),
                                            selectedCondition
                                                ? WF.Element("div", { className: "trigger-context-field" },
                                                    WF.Element("label", { className: "trigger-context-label" }, `${selectedCondition.fieldId} (${selectedCondition.defaultOperator})`),
                                                    WF.Element("input", {
                                                        className: "textbox trigger-context-input",
                                                        type: "text",
                                                        disabled: isOperatorWithoutValue(selectedCondition.defaultOperator),
                                                        value: triggerConditionValue,
                                                        placeholder: selectedCondition.placeholder ?? "",
                                                        onChange: (event: React.ChangeEvent<HTMLInputElement>) => setTriggerConditionValue(event.target.value)
                                                    }),
                                                    selectedConditionField
                                                        ? WF.Element("div", { className: "trigger-context-note" }, `Payload path: ${selectedConditionField.payloadPath}`)
                                                        : null
                                                )
                                                : WF.Element("div", { className: "trigger-context-note" }, "Selected template has no condition input."),
                                            WF.Element("div", { className: "trigger-context-field" },
                                                WF.Element("label", { className: "trigger-context-label" }, "Cooldown (sec)"),
                                                WF.Element("input", {
                                                    className: "textbox trigger-context-input",
                                                    type: "number",
                                                    min: 0,
                                                    max: 120,
                                                    step: 1,
                                                    value: triggerCooldownSec,
                                                    onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
                                                        setTriggerCooldownSec(clampNumber(Number(event.target.value), 0, 120, triggerCooldownSec))
                                                })
                                            )
                                        ),
                                        WF.Element("div", { className: "trigger-context-section" },
                                            WF.Element("div", { className: "trigger-context-section-title" }, "2) Then"),
                                            WF.Element("div", { className: "trigger-context-field" },
                                                WF.Element("label", { className: "trigger-context-label" }, "Selected effect"),
                                                WF.Element("input", {
                                                    className: "textbox trigger-context-input",
                                                    type: "text",
                                                    readOnly: true,
                                                    value: selectedEffectTemplate?.displayName ?? "",
                                                    placeholder: isTriggerConfiguredForEffect
                                                        ? "Pick effect in Effect Browser (right panel)"
                                                        : "Configure trigger first"
                                                })
                                            ),
                                            selectedEffectTemplate
                                                ? WF.Element("div", { className: "trigger-context-note" }, selectedEffectTemplate.description)
                                                : WF.Element("div", { className: "trigger-context-note" }, "No effect templates available."),
                                            !isTriggerConfiguredForEffect
                                                ? WF.Element("div", { className: "trigger-context-note" }, "Complete trigger condition first to enable effects.")
                                                : null,
                                            editableEffectOption
                                                ? WF.Element("div", { className: "trigger-context-field" },
                                                    WF.Element("label", { className: "trigger-context-label" }, editableEffectOption.label),
                                                    WF.Element("input", {
                                                        className: "textbox trigger-context-input",
                                                        type: "text",
                                                        disabled: !isTriggerConfiguredForEffect,
                                                        value: effectPayloadValue,
                                                        placeholder: typeof editableEffectOption.defaultValue === "string"
                                                            ? editableEffectOption.defaultValue
                                                            : "",
                                                        onChange: (event: React.ChangeEvent<HTMLInputElement>) => setEffectPayloadValue(event.target.value)
                                                    })
                                                )
                                                : WF.Element("div", { className: "trigger-context-note" }, "Selected effect does not need extra payload.")
                                        )
                                    ),
                                    WF.Element("div", { className: "trigger-context-section" },
                                        WF.Element("div", { className: "trigger-context-sentence" }, triggerContextSentence),
                                        WF.Element("div", { className: "trigger-context-actions" },
                                            WF.Element("button", {
                                                className: "button",
                                                disabled: triggerContextSaving || !selectedTriggerTemplate || !selectedEffectTemplate || !isTriggerConfiguredForEffect,
                                                onClick: () => void testTriggerContextRule()
                                            }, "Test Rule"),
                                            WF.Element("button", {
                                                className: "button",
                                                disabled: triggerContextSaving || !selectedTriggerTemplate || !selectedEffectTemplate || !isTriggerConfiguredForEffect,
                                                onClick: () => void addTriggerContextRule()
                                            }, triggerContextSaving ? "Saving..." : "Add Rule")
                                        )
                                    )
                                ),
                                WF.Element("div", { className: "trigger-context-right" },
                                    WF.Element("div", { className: "trigger-context-section trigger-context-effect-browser" },
                                        WF.Element("div", { className: "trigger-context-section-title" }, "Effect Browser"),
                                        WF.Element("input", {
                                            className: "textbox trigger-context-input",
                                            type: "text",
                                            value: triggerEffectSearch,
                                            disabled: !isTriggerConfiguredForEffect,
                                            placeholder: isTriggerConfiguredForEffect ? "Search effects..." : "Configure trigger first",
                                            onChange: (event: React.ChangeEvent<HTMLInputElement>) => setTriggerEffectSearch(event.target.value)
                                        }),
                                        !isTriggerConfiguredForEffect
                                            ? WF.Element("div", { className: "trigger-context-note" }, "Effect browser is locked until trigger condition is valid.")
                                            : filteredEffectTemplates.length > 0
                                                ? WF.Element("div", { className: "trigger-context-effect-list" },
                                                    ...filteredEffectTemplates.map((template) =>
                                                        WF.Element("button", {
                                                            key: `trigger-effect-${template.templateId}`,
                                                            className: `trigger-context-effect-item ${selectedEffectTemplate?.templateId === template.templateId ? "is-active" : ""}`.trim(),
                                                            onClick: () => setSelectedEffectTemplateId(template.templateId)
                                                        },
                                                        WF.Element("div", { className: "trigger-context-effect-item-title" }, template.displayName),
                                                        WF.Element("div", { className: "trigger-context-effect-item-meta" }, template.effectFactoryTypeName),
                                                        WF.Element("div", { className: "trigger-context-effect-item-desc" }, template.description ?? "No description.")
                                                        )
                                                    ))
                                                : WF.Element("div", { className: "trigger-context-note" }, "No effects match current search.")
                                    ),
                                    WF.Element("div", { className: "trigger-context-section trigger-context-preview-pane" },
                                        renderTriggerEffectPreview({
                                            header: "Selected Effect Preview",
                                            title: isTriggerConfiguredForEffect
                                                ? (selectedEffectTemplate?.displayName ?? "No effect selected")
                                                : "Trigger not configured",
                                            subtitle: isTriggerConfiguredForEffect && selectedEffectTemplate
                                                ? `${selectedEffectTemplate.effectFactoryTypeName} · ${triggerContextPreview}`
                                                : "Fill required fields in the left panel to unlock effect preview.",
                                            status: isTriggerConfiguredForEffect ? triggerContextStatus : "Effect selection is locked.",
                                            effectKind: triggerPreviewEffectKind,
                                            previewTick: triggerPreviewTick,
                                            overlayNodes: overlayPreviewNodes,
                                            onReplay: isTriggerConfiguredForEffect
                                                ? () => setTriggerPreviewTick((value) => value + 1)
                                                : null,
                                            configuration: isTriggerConfiguredForEffect ? effectConfigurationPreview : {}
                                        })
                                    ),
                                    WF.Element("div", { className: "trigger-context-section" },
                                        WF.Element("div", { className: "trigger-context-section-title" }, "Active Rules"),
                                        triggerContextRules.length > 0
                                            ? WF.Element("div", { className: "trigger-context-rules" },
                                                ...triggerContextRules.map((rule) =>
                                                    WF.Element("div", { key: `trigger-rule-${rule.ruleId}`, className: "trigger-context-rule-row" },
                                                        WF.Element("div", { className: "trigger-context-rule-text" }, `${rule.triggerTemplateName} -> ${rule.effectTemplateName}`),
                                                        WF.Element("button", {
                                                            className: "button",
                                                            disabled: triggerContextSaving,
                                                            onClick: () => void deleteTriggerContextRule(rule)
                                                        }, "Remove")
                                                    )
                                                ))
                                            : WF.Element("div", { className: "trigger-context-note" }, "No active rules for this component.")
                                    )
                                )
                            ),
                            WF.Element("div", { className: "trigger-context-section" },
                                WF.Element("div", { className: "trigger-context-section-title" }, "Event Log"),
                                WF.Element("div", { className: "trigger-context-log" },
                                    ...triggerContextLog.map((entry, index) =>
                                        WF.Element("div", { key: `trigger-log-${index}`, className: "trigger-context-log-row" }, entry)
                                    ))
                            )
                        )
            )
        )
        : null;

    const effectsCatalogNode = windows.showEffectsCatalog && effectsTarget
        ? withDockProps(WF.Window(
            {
                Text: "Effects",
                Icon: "star",
                Dialog: false,
                Draggable: true,
                Minimize: false,
                Maximize: true,
                Close: true,
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

    const dockedNodes = isPreviewMode ? [] : [
        isDocked("properties") ? asDocked(propertiesNode) : null,
        isDocked("layers") ? asDocked(layersToolboxNode) : null,
        isDocked("schedulerOverview") ? asDocked(schedulerOverviewNode) : null,
        isDocked("scheduleSetup") ? asDocked(scheduleSetupNode) : null,
        isDocked("effectsCatalog") ? asDocked(effectsCatalogNode) : null,
        isDocked("dataSourceExplorer") ? asDocked(dataSourceExplorerNode) : null,
        isDocked("textStyleEditor") ? asDocked(textStyleEditorNode) : null,
        isDocked("overlayPreview") ? asDocked(overlayVideoPreviewNode) : null
    ].filter(Boolean);

    const dockPanelNode = isPreviewMode
        ? null
        : buildDockPanelNode({ isDockCollapsed: windows.isDockCollapsed, dockedNodes });
    const floatingNodes = isPreviewMode ? [] : [
        isDocked("properties") ? null : propertiesNode,
        isDocked("layers") ? null : layersToolboxNode,
        isDocked("schedulerOverview") ? null : schedulerOverviewNode,
        isDocked("scheduleSetup") ? null : scheduleSetupNode,
        isDocked("effectsCatalog") ? null : effectsCatalogNode,
        unifiedContextWindowNode,
        triggerContextNode,
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
        isDockPreview: !isPreviewMode && windows.isDockPreview,
        dockPanelNode,
        statusBarNode,
        isPreviewMode
    });

    return {
        formNode,
        loadingOverlayNode,
        autosaveOverlayNode,
        contextHandlers: {
            contextTabChanged: handleContextTabChanged
        },
        // Expose individual nodes if needed for debugging or override
        floatingNodes,
        dockPanelNode
    };
};



