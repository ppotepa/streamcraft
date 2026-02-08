/**
 * Hook for managing window/panel visibility state
 */

import { useState, useCallback } from "react";
import { useDockPreferences } from "./useDockPreferences";

export const useWindowVisibility = () => {
    const dockPrefs = useDockPreferences();
    const [showScheduleSetup, setShowScheduleSetup] = useState(false);
    const [showDesignerSettings, setShowDesignerSettings] = useState(false);

    const [scheduleTargetId, setScheduleTargetId] = useState<string | null>(null);

    const openScheduleSetup = useCallback((targetId: string) => {
        setScheduleTargetId(targetId);
        setShowScheduleSetup(true);
    }, []);

    const closeScheduleSetup = useCallback(() => {
        setShowScheduleSetup(false);
        setScheduleTargetId(null);
    }, []);

    return {
        // Visibility state (Persistent)
        showLayersToolbox: dockPrefs.showLayersToolbox,
        showOverlayVideoPreview: dockPrefs.showOverlayVideoPreview,
        showDataSourceExplorer: dockPrefs.showDataSourceExplorer,
        showTextStyleEditor: dockPrefs.showTextStyleEditor,
        showSchedulerOverview: dockPrefs.showSchedulerOverview,
        isDockCollapsed: dockPrefs.isDockCollapsed,
        dockedWindows: dockPrefs.dockedWindows,
        isDockPreview: dockPrefs.isDockPreview,

        // Visibility state (Transient)
        showScheduleSetup,
        showDesignerSettings,
        scheduleTargetId,

        // Setters
        setShowLayersToolbox: dockPrefs.setShowLayersToolbox,
        setShowOverlayVideoPreview: dockPrefs.setShowOverlayVideoPreview,
        setShowDataSourceExplorer: dockPrefs.setShowDataSourceExplorer,
        setShowTextStyleEditor: dockPrefs.setShowTextStyleEditor,
        setShowSchedulerOverview: dockPrefs.setShowSchedulerOverview,
        setIsDockCollapsed: dockPrefs.setIsDockCollapsed,
        setDockedWindows: dockPrefs.setDockedWindows,
        setIsDockPreview: dockPrefs.setIsDockPreview,

        setShowScheduleSetup,
        setShowDesignerSettings,
        setScheduleTargetId,

        // Operations
        openScheduleSetup,
        closeScheduleSetup,
        isDocked: dockPrefs.isDocked
    };
};
