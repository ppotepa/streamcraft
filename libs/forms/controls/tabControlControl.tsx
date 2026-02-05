import React, { useState } from "react";
import { ControlRenderer } from "./types";

export const renderTabControl: ControlRenderer = (node, context) => {
    const props = (node.props ?? {}) as Record<string, any>;
    const {
        selectedIndex = "0",
        onSelectedIndexChanged = "",
        style = "",
        multirows = false
    } = props;

    // Find all TabPage children
    const tabPages = (node.children || []).filter((child: any) => child?.type === "tabPage");

    const [activeTab, setActiveTab] = useState(parseInt(selectedIndex) || 0);

    const handleTabClick = (index: number) => {
        setActiveTab(index);

        if (onSelectedIndexChanged && context.raiseEvent) {
            context.raiseEvent(onSelectedIndexChanged, {
                selectedIndex: index,
                sender: node
            });
        }
    };

    const combinedStyle = context.resolveStyle?.(props) || {};
    if (style) {
        Object.assign(combinedStyle, context.parseStyleString?.(style) || {});
    }

    return (
        <div className="tab-control" style={combinedStyle}>
            <menu role="tablist" className={multirows ? "multirows" : undefined}>
                {tabPages.map((tab: any, index: number) => (
                    <li
                        key={index}
                        role="tab"
                        aria-selected={index === activeTab ? "true" : "false"}
                        className={`tab-control-tab ${index === activeTab ? "tab-active" : ""}`}
                        onClick={() => handleTabClick(index)}
                    >
                        {tab.props.text || `Tab ${index + 1}`}
                    </li>
                ))}
            </menu>
            <div className="tab-control-content">
                {tabPages[activeTab] && context.renderChildren([tabPages[activeTab]])}
            </div>
        </div>
    );
};

export const renderTabPage: ControlRenderer = (node, context) => {
    const props = (node.props ?? {}) as Record<string, any>;
    const { style = "" } = props;

    const combinedStyle = context.resolveStyle?.(props) || {};
    if (style) {
        Object.assign(combinedStyle, context.parseStyleString?.(style) || {});
    }

    return (
        <div className="tab-page" style={combinedStyle}>
            {context.renderChildren(node.children)}
        </div>
    );
};
