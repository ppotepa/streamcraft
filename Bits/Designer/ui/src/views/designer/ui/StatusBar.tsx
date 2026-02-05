import { WF } from "../../../../libs/forms";

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
    WF.Element(
        "div",
        { className: "status-bar designer-status-bar" },
        WF.Element("p", { className: "status-bar-field designer-status-cell" }, saveError ? "Save failed" : status),
        WF.Element(
            "p",
            { className: "status-bar-field designer-status-cell" },
            lastSavedUtc ? `Last saved: ${lastSavedUtc.toLocaleTimeString()}` : "Last saved: --"
        ),
        WF.Element(
            "p",
            { className: "status-bar-field designer-status-cell" },
            overlayName ? `Overlay: ${overlayName}` : "Overlay: Draft"
        ),
        WF.Element(
            "p",
            { className: "status-bar-field designer-status-cell", style: "display: flex; align-items: center; gap: 4px;" },
            WF.Button({ Icon: "zoomOut", OnClick: "zoomOut", Style: "min-width: 20px; height: 18px; padding: 0 4px;" }),
            WF.Element("span", {}, `${Math.round(canvasScale * 100)}%`),
            WF.Button({ Icon: "restore", OnClick: "zoomReset", Style: "min-width: 20px; height: 18px; padding: 0 4px;" }),
            WF.Button({ Icon: "zoomIn", OnClick: "zoomIn", Style: "min-width: 20px; height: 18px; padding: 0 4px;" })
        ),
        WF.Element(
            "p",
            { className: "status-bar-field designer-status-cell designer-status-cell-right" },
            isSaving ? "Saving…" : isDirty ? "Unsaved changes" : "All changes saved",
            isSaving ? WF.Element("span", { className: "designer-status-spinner" }, "●") : null
        )
    );
