import type { FormNode } from "@streamcraft/forms/core";
import { WF } from "@streamcraft/forms";

export type MainDesignerProps = {
    menuNode: FormNode;
    contextBarNode: FormNode;
    canvasFormNode: FormNode;
    toolboxNode: FormNode;
    isDockPreview: boolean;
    dockPanelNode: FormNode;
    statusBarNode: FormNode;
};

export const buildMainDesigner = (props: MainDesignerProps): FormNode => {
    const {
        menuNode,
        contextBarNode,
        canvasFormNode,
        toolboxNode,
        isDockPreview,
        dockPanelNode,
        statusBarNode
    } = props;

    return WF.Form({
        Name: "MainForm",
        ClassName: "playground2-outer-form",
        Style: "position: relative; width: 100%; height: 100vh; display: flex; flex-direction: column;",
        Controls: [
            menuNode,
            contextBarNode,
            canvasFormNode,
            toolboxNode,
            isDockPreview ? WF.Element("div", { className: "dock-preview" }) : null,
            dockPanelNode,
            statusBarNode
        ]
    });
};

