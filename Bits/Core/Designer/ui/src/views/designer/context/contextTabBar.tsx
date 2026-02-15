import { WF } from "@streamcraft/forms";

export type ContextTabBarEntry<TTabId extends string> = {
    id: TTabId;
    title: string;
    disabled?: boolean;
};

type BuildContextTabBarArgs<TTabId extends string> = {
    tabs: ContextTabBarEntry<TTabId>[];
    activeTab: TTabId;
    onSelect: (tabId: TTabId) => void;
    className?: string;
    tabClassName?: string;
    style?: string;
    idPrefix?: string;
};

export const buildContextTabBar = <TTabId extends string>({
    tabs,
    activeTab,
    onSelect,
    className = "context-tab-bar",
    tabClassName = "context-tab-item",
    style,
    idPrefix = "context"
}: BuildContextTabBarArgs<TTabId>) =>
    WF.Element(
        "menu",
        { role: "tablist", className, style },
        ...tabs.map((tab) =>
            WF.Element(
                "li",
                {
                    key: `context-tab-${tab.id}`,
                    role: "tab",
                    id: `${idPrefix}-tab-${tab.id}`,
                    "aria-controls": `${idPrefix}-panel-${tab.id}`,
                    "aria-selected": activeTab === tab.id ? "true" : "false",
                    "aria-disabled": tab.disabled ? "true" : "false",
                    className: `${tabClassName} ${activeTab === tab.id ? "is-active" : ""}`.trim(),
                    onClick: () => {
                        if (tab.disabled) return;
                        onSelect(tab.id);
                    }
                },
                tab.title
            )
        )
    );
