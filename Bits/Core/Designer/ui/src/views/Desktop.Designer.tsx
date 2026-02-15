import type { FormChild, FormNode } from "@streamcraft/forms/core";
import { WF } from "@streamcraft/forms";

export type DesktopDesignerProps = {
    menuNode: FormNode | null;
    contextBarNode: FormNode | null;
    canvasFormNode: FormNode;
    toolboxNode: FormNode | null;
    floatingNodes: FormChild[];
    isDockPreview: boolean;
    dockPanelNode: FormNode | null;
    statusBarNode: FormNode | null;
    isPreviewMode?: boolean;
};

export const buildDesktopDesigner = (props: DesktopDesignerProps): FormNode => {
    const {
        menuNode,
        contextBarNode,
        canvasFormNode,
        toolboxNode,
        floatingNodes,
        isDockPreview,
        dockPanelNode,
        statusBarNode,
        isPreviewMode = false
    } = props;

    return WF.Form({
        Name: "Playground2",
        ClassName: `playground2-outer-form ${isPreviewMode ? "is-preview-mode" : ""}`.trim(),
        Style: "position: relative; width: 100%; height: 100vh; display: flex; flex-direction: column;",
        Controls: [
            menuNode,
            contextBarNode,
            canvasFormNode,
            toolboxNode,
            ...floatingNodes,
            isDockPreview ? WF.Element("div", { className: "dock-preview" }) : null,
            dockPanelNode,
            statusBarNode
        ]
    });
};

