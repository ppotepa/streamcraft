import { useEffect, useState } from "react";
import type { DockPrefs } from "../types/designer.types";
import { readDockPrefs, writeDockPrefs } from "../services/dockPrefsService";

export const useDockPreferences = () => {
    const [isDockCollapsed, setIsDockCollapsed] = useState(false);
    const [dockedWindows, setDockedWindows] = useState<string[]>([]);
    const [showLayersToolbox, setShowLayersToolbox] = useState(true);
    const [showOverlayVideoPreview, setShowOverlayVideoPreview] = useState(false);
    const [showDataSourceExplorer, setShowDataSourceExplorer] = useState(false);
    const [showTextStyleEditor, setShowTextStyleEditor] = useState(false);
    const [showSchedulerOverview, setShowSchedulerOverview] = useState(false);
    const [isDockPreview, setIsDockPreview] = useState(false);

    // Initialize from storage
    useEffect(() => {
        const prefs = readDockPrefs();
        if (!prefs) return;

        setIsDockCollapsed(prefs.isDockCollapsed);
        setDockedWindows(prefs.dockedWindows);
        setShowLayersToolbox(prefs.showLayersToolbox);
        setShowOverlayVideoPreview(prefs.showOverlayVideoPreview);
        setShowDataSourceExplorer(prefs.showDataSourceExplorer);
        setShowTextStyleEditor(prefs.showTextStyleEditor);
        setShowSchedulerOverview(prefs.showSchedulerOverview);
    }, []);

    // Persist to storage
    useEffect(() => {
        const prefs: DockPrefs = {
            version: 1,
            isDockCollapsed,
            dockedWindows,
            showLayersToolbox,
            showOverlayVideoPreview,
            showDataSourceExplorer,
            showTextStyleEditor,
            showSchedulerOverview
        };
        writeDockPrefs(prefs);
    }, [
        isDockCollapsed,
        dockedWindows,
        showLayersToolbox,
        showOverlayVideoPreview,
        showDataSourceExplorer,
        showTextStyleEditor,
        showSchedulerOverview
    ]);

    const isDocked = (dockId: string): boolean => {
        return dockedWindows.includes(dockId);
    };

    return {
        isDockCollapsed,
        setIsDockCollapsed,
        dockedWindows,
        setDockedWindows,
        showLayersToolbox,
        setShowLayersToolbox,
        showOverlayVideoPreview,
        setShowOverlayVideoPreview,
        showDataSourceExplorer,
        setShowDataSourceExplorer,
        showTextStyleEditor,
        setShowTextStyleEditor,
        showSchedulerOverview,
        setShowSchedulerOverview,
        isDockPreview,
        setIsDockPreview,
        isDocked
    };
};
