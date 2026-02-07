/**
 * Hook for managing window/panel visibility state
 */

import { useState, useCallback } from "react";
import type { WindowVisibility } from "../types/dock.types";

export const useWindowVisibility = (initialState?: Partial<WindowVisibility>) => {
    const [showLayersToolbox, setShowLayersToolbox] = useState(initialState?.showLayersToolbox ?? true);
    const [showOverlayVideoPreview, setShowOverlayVideoPreview] = useState(
        initialState?.showOverlayVideoPreview ?? false
    );
    const [showDataSourceExplorer, setShowDataSourceExplorer] = useState(
        initialState?.showDataSourceExplorer ?? false
    );
    const [showTextStyleEditor, setShowTextStyleEditor] = useState(initialState?.showTextStyleEditor ?? false);
    const [showSchedulerOverview, setShowSchedulerOverview] = useState(initialState?.showSchedulerOverview ?? false);
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
        // Visibility state
        showLayersToolbox,
        showOverlayVideoPreview,
        showDataSourceExplorer,
        showTextStyleEditor,
        showSchedulerOverview,
        showScheduleSetup,
        showDesignerSettings,
        scheduleTargetId,

        // Setters
        setShowLayersToolbox,
        setShowOverlayVideoPreview,
        setShowDataSourceExplorer,
        setShowTextStyleEditor,
        setShowSchedulerOverview,
        setShowScheduleSetup,
        setShowDesignerSettings,

        // Operations
        openScheduleSetup,
        closeScheduleSetup
    };
};
