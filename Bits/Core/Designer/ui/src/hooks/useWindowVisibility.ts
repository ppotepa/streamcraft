import { useState, useCallback } from "react";
import type { WindowVisibility } from "../types/dock.types";
import { readDockPrefs } from "../utils/dockPreferences";

export const useWindowVisibility = (): WindowVisibility => {
    const dockPrefs = readDockPrefs();

    const [showLayersToolbox, setShowLayersToolbox] = useState(dockPrefs?.showLayersToolbox ?? true);
    const [showOverlayVideoPreview, setShowOverlayVideoPreview] = useState(dockPrefs?.showOverlayVideoPreview ?? false);
    const [showDataSourceExplorer, setShowDataSourceExplorer] = useState(dockPrefs?.showDataSourceExplorer ?? false);
    const [showTextStyleEditor, setShowTextStyleEditor] = useState(dockPrefs?.showTextStyleEditor ?? false);
    const [showSchedulerOverview, setShowSchedulerOverview] = useState(dockPrefs?.showSchedulerOverview ?? false);
    const [showDesignerSettings, setShowDesignerSettings] = useState(false);
    const [showThemeViewer, setShowThemeViewer] = useState(false);
    const [showScheduleSetup, setShowScheduleSetup] = useState(false);
    const [scheduleTargetId, setScheduleTargetId] = useState<string | null>(null);

    const openScheduleSetup = useCallback((itemId: string) => {
        setScheduleTargetId(itemId);
        setShowScheduleSetup(true);
    }, []);

    const closeScheduleSetup = useCallback(() => {
        setShowScheduleSetup(false);
        setScheduleTargetId(null);
    }, []);

    return {
        showLayersToolbox,
        showOverlayVideoPreview,
        showDataSourceExplorer,
        showTextStyleEditor,
        showSchedulerOverview,
        showDesignerSettings,
        showThemeViewer,
        showScheduleSetup,
        scheduleTargetId,

        setShowLayersToolbox,
        setShowOverlayVideoPreview,
        setShowDataSourceExplorer,
        setShowTextStyleEditor,
        setShowSchedulerOverview,
        setShowDesignerSettings,
        setShowThemeViewer,
        openScheduleSetup,
        closeScheduleSetup
    };
};
