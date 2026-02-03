import { element, node } from "../../../forms/core";
import { ControlKind } from "../../../forms/controlKinds";

type StatusBarProps = {
    status: string;
    saveError: string | null;
    lastSavedUtc: Date | null;
    overlayName: string;
    isSaving: boolean;
    isDirty: boolean;
    canvasScale: number;
};

export const buildStatusBarNode = ({
    status,
    saveError,
    lastSavedUtc,
    overlayName,
    isSaving,
    isDirty,
    canvasScale
}: StatusBarProps) =>
    element(
        "div",
        { className: "status-bar designer-status-bar" },
        element("p", { className: "status-bar-field designer-status-cell" }, saveError ? "Save failed" : status),
        element(
            "p",
            { className: "status-bar-field designer-status-cell" },
            lastSavedUtc ? `Last saved: ${lastSavedUtc.toLocaleTimeString()}` : "Last saved: --"
        ),
        element(
            "p",
            { className: "status-bar-field designer-status-cell" },
            overlayName ? `Overlay: ${overlayName}` : "Overlay: Draft"
        ),
        element(
            "p",
            { className: "status-bar-field designer-status-cell", style: "display: flex; align-items: center; gap: 4px;" },
            node(ControlKind.button, { icon: "zoomOut", onClick: "zoomOut", style: "min-width: 20px; height: 18px; padding: 0 4px;" }),
            element("span", {}, `${Math.round(canvasScale * 100)}%`),
            node(ControlKind.button, { icon: "restore", onClick: "zoomReset", style: "min-width: 20px; height: 18px; padding: 0 4px;" }),
            node(ControlKind.button, { icon: "zoomIn", onClick: "zoomIn", style: "min-width: 20px; height: 18px; padding: 0 4px;" })
        ),
        element(
            "p",
            { className: "status-bar-field designer-status-cell designer-status-cell-right" },
            isSaving ? "Saving…" : isDirty ? "Unsaved changes" : "All changes saved",
            isSaving ? element("span", { className: "designer-status-spinner" }, "●") : null
        )
    );
