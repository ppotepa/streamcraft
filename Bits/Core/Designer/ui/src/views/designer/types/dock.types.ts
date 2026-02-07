/**
 * Dock and window management types
 */

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
};

export type WindowVisibility = {
    showLayersToolbox: boolean;
    showOverlayVideoPreview: boolean;
    showDataSourceExplorer: boolean;
    showTextStyleEditor: boolean;
    showSchedulerOverview: boolean;
    showScheduleSetup: boolean;
    showDesignerSettings: boolean;
    showThemeViewer: boolean;
};
