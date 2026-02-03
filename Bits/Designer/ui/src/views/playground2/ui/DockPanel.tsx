import { element, node } from "../../../forms/core";
import { ControlKind } from "../../../forms/controlKinds";

type DockPanelProps = {
    isDockCollapsed: boolean;
    dockedNodes: any[];
};

export const buildDockPanelNode = ({ isDockCollapsed, dockedNodes }: DockPanelProps) =>
    element(
        "div",
        {
            className: isDockCollapsed ? "dock-panel dock-panel-collapsed" : "dock-panel"
        },
        node(ControlKind.button, {
            icon: isDockCollapsed ? "chevronLeft" : "chevronRight",
            onClick: "toggleDockPanel",
            className: "dock-toggle"
        }),
        ...(isDockCollapsed ? [] : dockedNodes)
    );
