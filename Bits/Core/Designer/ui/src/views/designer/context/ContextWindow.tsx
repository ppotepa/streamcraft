import type { FormNode } from "@streamcraft/forms/core";
import { WF } from "@streamcraft/forms";
import type { CanvasItem } from "../domain/types";
import type { ContextTabDefinition, ContextTabId } from "./adapterTypes";

type ContextWindowProps = {
    item: CanvasItem;
    tabs: ContextTabDefinition[];
    activeTab: ContextTabId;
    onClose: () => void;
    renderTabBody: (tabId: ContextTabId) => FormNode;
    onTabChange?: string;
    footerNode?: FormNode | null;
    loading?: boolean;
    error?: string | null;
};

export const buildContextWindow = ({
    item,
    tabs,
    activeTab,
    onClose,
    renderTabBody,
    onTabChange,
    footerNode,
    loading = false,
    error = null
}: ContextWindowProps): FormNode => {
    const selectedIndex = Math.max(0, tabs.findIndex((tab) => tab.id === activeTab));
    const tabControl = WF.TabControl(
        {
            Name: `context-tabs-${item.id}`,
            Style: "width: 100%; flex: 1; min-height: 0;",
            SelectedIndex: selectedIndex,
            OnSelectedIndexChanged: onTabChange ?? ""
        },
        ...tabs.map((tab) =>
            WF.TabPage(
                { Text: tab.title },
                WF.Panel({
                    Name: `context-tab-${item.id}-${tab.id}`,
                    Style: "padding: 12px; overflow: auto; display: grid; gap: 10px;",
                    Controls: [
                        WF.GroupBox({
                            Text: "Settings",
                            Controls: [
                                loading
                                    ? WF.Element("div", { className: "context-window-note" }, "Loading...")
                                    : error
                                        ? WF.Element("div", { className: "context-window-note" }, error)
                                        : renderTabBody(tab.id)
                            ]
                        })
                    ]
                })
            )
        )
    );

    return (
    WF.Window(
        {
            Text: "Context",
            Icon: "properties",
            Dialog: false,
            Draggable: true,
            Minimize: false,
            Maximize: true,
            Close: true,
            OnClose: onClose,
            Style: "position: absolute; left: 240px; top: 96px; width: min(860px, 96vw); height: min(700px, 90vh);",
            BodyClassName: "context-window-shell"
        },
        WF.Panel({
            Name: "contextWindowRoot",
            ClassName: "context-window-root",
            Style: "padding: 8px; height: 100%; display: flex; flex-direction: column; gap: 8px;",
            Controls: [
                WF.GroupBox({
                    Text: "Selection",
                    Controls: [
                        WF.Element("div", { className: "context-window-header" },
                            WF.Element("div", { className: "context-window-title" }, item.name ?? item.label ?? item.type),
                            WF.Element("div", { className: "context-window-subtitle" }, `Type: ${item.type}${item.sourceId ? ` · Source: ${item.sourceId}` : ""}`)
                        )
                    ]
                }),
                tabControl,
                footerNode ?? WF.Element("div", { className: "context-window-footer" },
                    WF.Element("button", { className: "button", onClick: onClose }, "Close")
                )
            ]
        })
    )
    );
};
