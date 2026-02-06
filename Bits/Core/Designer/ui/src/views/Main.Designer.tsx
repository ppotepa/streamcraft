import type { FormChild, FormNode } from "@streamcraft/forms/core";
import { WF } from "@streamcraft/forms";

export type MainDesignerProps = {
    menuNode: FormNode;
    contextBarNode: FormNode;
    canvasFormNode: FormNode;
    toolboxNode: FormNode;
    floatingNodes: FormChild[];
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
        floatingNodes,
        isDockPreview,
        dockPanelNode,
        statusBarNode
    } = props;

    return WF.Form({
        Name: "Main",
        ClassName: "playground2-outer-form",
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

