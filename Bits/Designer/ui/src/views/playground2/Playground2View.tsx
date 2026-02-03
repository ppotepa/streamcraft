import React from "react";
import { FormContainer } from "../../forms/FormContainer";
import { element, node } from "../../forms/core";
import { ControlKind } from "../../forms/controlKinds";
import type { EventHandlers } from "../../forms/core/events";
import type { FormChild, FormNode } from "../../forms/core";

type Playground2ViewProps = {
    menuNode: FormNode;
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
            <FormContainer node={node(
                ControlKind.panel,
                { className: "playground2-outer-form", style: "position: relative; width: 100%; height: 100vh; display: flex; flex-direction: column;" },
                menuNode,
                canvasFormNode,
                toolboxNode,
                ...floatingNodes,
                isDockPreview ? element("div", { className: "dock-preview" }) : null,
                dockPanelNode,
                statusBarNode
            )} handlers={handlers} />
            {loadingOverlayNode}
        </>
    );
};
