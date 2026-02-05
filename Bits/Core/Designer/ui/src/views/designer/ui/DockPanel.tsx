import { WF } from "@streamcraft/forms";

type DockPanelProps = {
    isDockCollapsed: boolean;
    dockedNodes: any[];
};

export const buildDockPanelNode = ({ isDockCollapsed, dockedNodes }: DockPanelProps) =>
    WF.Element(
        "div",
        {
            className: isDockCollapsed ? "dock-panel dock-panel-collapsed" : "dock-panel"
        },
        WF.Button({
            Icon: isDockCollapsed ? "chevronLeft" : "chevronRight",
            OnClick: "toggleDockPanel",
            ClassName: "dock-toggle"
        }),
        ...(isDockCollapsed ? [] : dockedNodes)
    );

