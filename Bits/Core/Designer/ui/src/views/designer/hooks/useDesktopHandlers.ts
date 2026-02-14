import { useMemo } from "react";
import { themes } from "../../../themeRegistry";
import { loadSettings } from "../../../themeService";
import type { CanvasItem } from "../types/canvas.types";
import type { ThemeMode } from "../types/theme.types";

interface DesktopHandlersDeps {
    canvas: {
        setActiveTool: (tool: string) => void;
        setCanvasScale: (fn: (prev: number) => number) => void;
        selectedItem: CanvasItem | null;
    };
    windows: {
        setShowLayersToolbox: (show: boolean) => void;
        setShowSchedulerOverview: (show: boolean) => void;
        setShowOverlayVideoPreview: (show: boolean) => void;
        setShowDesignerSettings: (show: boolean) => void;
        setShowThemeViewer: (show: boolean) => void;
        setShowTextStyleEditor: (show: boolean) => void;
        setShowDataSourceExplorer: (show: boolean) => void;
        setShowScheduleSetup: (show: boolean) => void;
        setShowEffectsCatalog: (show: boolean) => void;
    };
    theme: {
        setThemeSelection: (index: number) => void;
        setThemeModeSelection: (mode: ThemeMode) => void;
        themeSelection: number;
        setThemeAiPrompt: (prompt: string) => void;
        refreshAiStatus: () => Promise<void>;
        applyThemeByIndex: (index: number) => void;
        applyThemeModeByIndex: (index: number) => void;
        handleAiThemeGenerate: () => Promise<void>;
        handleAiThemeApply: () => void;
        handleAiThemeClear: () => void;
    };
    extensions: {
        setTextStylesAiPromptOpen: (open: boolean) => void;
        handleUiExtensionEvent: (name?: unknown) => void;
    };
    dock: {
        setIsDockCollapsed: (fn: (prev: boolean) => boolean) => void;
        handleDockDragStart: any;
        handleDockDragMove: any;
        handleDockDragEnd: any;
        handleDockUndock: any;
    };
    scheduling: {
        setScheduleTargetId: (id: string | null) => void;
        setEffectsTargetId: (id: string | null) => void;
        setScheduleEpoch: (epoch: number) => void;
        setScheduleRuns: (runs: Map<string, number>) => void;
        scheduleEpochRef: React.MutableRefObject<number>;
        scheduleTickRef: React.MutableRefObject<Map<string, { intervalMs: number; tick: number }>>;
    };
    actions: {
        handleNewLayout: () => void;
        handleManualSave: () => void;
        undo: () => void;
        redo: () => void;
        clearOverlayVideoCache: () => void;
    };
    refs: {
        autosaveProjectIdRef: React.MutableRefObject<string>;
    };
    utils: {
        hasBindingForItem: (item?: CanvasItem | null) => boolean;
    };
}

export const useDesktopHandlers = ({
    canvas,
    windows,
    theme,
    extensions,
    dock,
    scheduling,
    actions,
    refs,
    utils
}: DesktopHandlersDeps) => {
    return useMemo(
        () => ({
            toolboxSelect: (args: any) => {
                const tool = args?.tool;
                if (tool?.id) {
                    canvas.setActiveTool(tool.id);
                }
            },
            newOverlay: () => actions.handleNewLayout(),
            saveOverlay: () => void actions.handleManualSave(),
            undoAction: () => actions.undo(),
            redoAction: () => actions.redo(),
            openLayersToolbox: () => windows.setShowLayersToolbox(true),
            openSchedulerOverview: () => windows.setShowSchedulerOverview(true),
            openOverlayVideoPreview: () => windows.setShowOverlayVideoPreview(true),
            openDesignerSettings: () => windows.setShowDesignerSettings(true),
            openThemeViewer: () => {
                const settings = loadSettings();
                const index = themes.findIndex((t) => t.id === settings.themeId);
                theme.setThemeSelection(index >= 0 ? index : 0);
                theme.setThemeModeSelection(settings.themeMode);
                void theme.refreshAiStatus();
                windows.setShowThemeViewer(true);
            },
            openLivePreview: () => {
                const projectId = refs.autosaveProjectIdRef.current;
                const url = `/designer/preview/${encodeURIComponent(projectId)}`;
                window.open(url, "LivePreview", "width=1280,height=800,menubar=no,toolbar=no,location=no,status=no");
            },
            toggleDockPanel: () => dock.setIsDockCollapsed((prev) => !prev),
            zoomIn: () => canvas.setCanvasScale((prev) => Math.min(3, Math.round((prev + 0.1) * 100) / 100)),
            zoomOut: () => canvas.setCanvasScale((prev) => Math.max(0.1, Math.round((prev - 0.1) * 100) / 100)),
            zoomReset: () => canvas.setCanvasScale(() => 1),
            dockDragStart: dock.handleDockDragStart,
            dockDragMove: dock.handleDockDragMove,
            dockDragEnd: dock.handleDockDragEnd,
            dockUndock: dock.handleDockUndock,
            closeTextStyleEditor: () => windows.setShowTextStyleEditor(false),
            closeTextStylesAiPrompt: () => extensions.setTextStylesAiPromptOpen(false),
            closeDataSourceExplorer: () => windows.setShowDataSourceExplorer(false),
            closeOverlayVideoPreview: () => windows.setShowOverlayVideoPreview(false),
            closeDesignerSettings: () => windows.setShowDesignerSettings(false),
            closeThemeViewer: () => windows.setShowThemeViewer(false),
            clearOverlayVideoCache: () => void actions.clearOverlayVideoCache(),
            changeTheme: (args: any) => {
                const index = typeof args?.selectedIndex === "number" ? args.selectedIndex : Number(args?.selectedIndex);
                if (!Number.isFinite(index)) return;
                theme.applyThemeByIndex(index);
            },
            changeThemeMode: (args: any) => {
                const index = typeof args?.selectedIndex === "number" ? args.selectedIndex : Number(args?.selectedIndex);
                if (!Number.isFinite(index)) return;
                theme.applyThemeModeByIndex(index);
            },
            selectTheme: (args: any) => {
                const selected = Array.isArray(args?.selectedIndices) ? args.selectedIndices[0] : undefined;
                const index = typeof selected === "number" ? selected : Number(args?.selectedIndex);
                if (!Number.isFinite(index)) return;
                theme.applyThemeByIndex(index);
            },
            applyThemeSelection: () => theme.applyThemeByIndex(theme.themeSelection),
            aiThemePromptChange: (args: any) => theme.setThemeAiPrompt(String(args?.value ?? "")),
            aiThemeGenerate: () => void theme.handleAiThemeGenerate(),
            aiThemeApply: () => theme.handleAiThemeApply(),
            aiThemeClear: () => theme.handleAiThemeClear(),
            aiThemeRefresh: () => void theme.refreshAiStatus(),
            openScheduleSetup: () => {
                if (!canvas.selectedItem || !utils.hasBindingForItem(canvas.selectedItem)) return;
                scheduling.setScheduleTargetId(canvas.selectedItem.id);
                windows.setShowScheduleSetup(true);
            },
            closeScheduleSetup: () => {
                windows.setShowScheduleSetup(false);
                scheduling.setScheduleTargetId(null);
            },
            openEffectsCatalog: () => {
                if (!canvas.selectedItem) return;
                scheduling.setEffectsTargetId(canvas.selectedItem.id);
                windows.setShowEffectsCatalog(true);
            },
            closeEffectsCatalog: () => {
                windows.setShowEffectsCatalog(false);
                scheduling.setEffectsTargetId(null);
            },
            closeSchedulerOverview: () => windows.setShowSchedulerOverview(false),
            resetScheduleTimers: () => {
                const now = Date.now();
                scheduling.scheduleEpochRef.current = now;
                scheduling.scheduleTickRef.current.clear();
                scheduling.setScheduleEpoch(now);
                scheduling.setScheduleRuns(new Map());
            },
            "*": (args: any) => {
                const eventName = typeof args === "string"
                    ? args
                    : typeof args?.name === "string"
                        ? args.name
                        : undefined;
                extensions.handleUiExtensionEvent(eventName);
            }
        }),
        [
            actions,
            canvas,
            dock,
            extensions,
            refs,
            scheduling,
            theme,
            utils,
            windows
        ]
    );
};
