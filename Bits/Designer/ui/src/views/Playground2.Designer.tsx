import type { FormChild, FormNode } from "../../../../libs/forms/core";
import { WF } from "../../../../libs/forms";

export type Playground2DesignerProps = {
    menuNode: FormNode;
    contextBarNode: FormNode;
    canvasFormNode: FormNode;
    toolboxNode: FormNode;
    floatingNodes: FormChild[];
    isDockPreview: boolean;
    dockPanelNode: FormNode;
    statusBarNode: FormNode;
};

export const buildPlayground2Designer = (props: Playground2DesignerProps): FormNode => {
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
        Name: "Playground2",
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
