import React from "react";
import { FormContainer } from "../../../../libs/forms/FormContainer";
import { WF } from "../../../../libs/forms";
import type { EventHandlers } from "../../../../libs/forms/core/events";
import type { FormChild, FormNode } from "../../../../libs/forms/core";

type Playground2ViewProps = {
    menuNode: FormNode;
    contextBarNode: FormNode;
    canvasFormNode: FormNode;
    toolboxNode: FormNode;
    floatingNodes: FormChild[];
    isDockPreview: boolean;
    dockPanelNode: FormNode;
    statusBarNode: FormNode;
    handlers: EventHandlers;
    loadingOverlayNode: React.ReactNode;
};

export const Playground2View: React.FC<Playground2ViewProps> = ({
    menuNode,
    contextBarNode,
    canvasFormNode,
    toolboxNode,
    floatingNodes,
    isDockPreview,
    dockPanelNode,
    statusBarNode,
    handlers,
    loadingOverlayNode
}) => {
    return (
        <>
            <FormContainer node={WF.Panel(
                { ClassName: "playground2-outer-form", Style: "position: relative; width: 100%; height: 100vh; display: flex; flex-direction: column;" },
                menuNode,
                contextBarNode,
                canvasFormNode,
                toolboxNode,
                ...floatingNodes,
                isDockPreview ? WF.Element("div", { className: "dock-preview" }) : null,
                dockPanelNode,
                statusBarNode
            )} handlers={handlers} />
            {loadingOverlayNode}
        </>
    );
};
