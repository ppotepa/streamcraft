export const DOCK_STORAGE_KEY = "sc:designer:dockLayout:v1";

export type DockPrefs = {
    version: 1;
    isDockCollapsed: boolean;
    dockedWindows: string[];
    showLayersToolbox: boolean;
    showOverlayVideoPreview: boolean;
    showDataSourceExplorer: boolean;
    showTextStyleEditor: boolean;
    showSchedulerOverview: boolean;
};

export type DockState = {
    isDockCollapsed: boolean;
    dockedWindows: string[];
    isDockPreview: boolean;

    setIsDockCollapsed: (collapsed: boolean) => void;
    setDockedWindows: (windows: string[]) => void;
    setIsDockPreview: (preview: boolean) => void;
};

export type WindowVisibility = {
    showLayersToolbox: boolean;
    showOverlayVideoPreview: boolean;
    showDataSourceExplorer: boolean;
    showTextStyleEditor: boolean;
    showSchedulerOverview: boolean;
    showDesignerSettings: boolean;
    showThemeViewer: boolean;
    showScheduleSetup: boolean;
    scheduleTargetId: string | null;

    setShowLayersToolbox: (show: boolean) => void;
    setShowOverlayVideoPreview: (show: boolean) => void;
    setShowDataSourceExplorer: (show: boolean) => void;
    setShowTextStyleEditor: (show: boolean) => void;
    setShowSchedulerOverview: (show: boolean) => void;
    setShowDesignerSettings: (show: boolean) => void;
    setShowThemeViewer: (show: boolean) => void;
    openScheduleSetup: (itemId: string) => void;
    closeScheduleSetup: () => void;
};
