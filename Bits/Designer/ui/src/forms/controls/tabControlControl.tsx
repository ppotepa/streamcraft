import React, { useState } from "react";
import { ControlRenderer } from "./types";

export const renderTabControl: ControlRenderer = (node, context) => {
    const {
        selectedIndex = "0",
        onSelectedIndexChanged = "",
        style = ""
    } = node.props;

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

    const combinedStyle = context.resolveStyle?.(node.props) || {};
    if (style) {
        Object.assign(combinedStyle, context.parseStyleString?.(style) || {});
    }

    return (
        <div className="tab-control" style={combinedStyle}>
            <div className="tab-control-header">
                {tabPages.map((tab: any, index: number) => (
                    <button
                        key={index}
                        className={`tab-control-tab ${index === activeTab ? "tab-active" : ""}`}
                        onClick={() => handleTabClick(index)}
                    >
                        {tab.props.text || `Tab ${index + 1}`}
                    </button>
                ))}
            </div>
            <div className="tab-control-content">
                {tabPages[activeTab] && context.renderChildren([tabPages[activeTab]])}
            </div>
        </div>
    );
};

export const renderTabPage: ControlRenderer = (node, context) => {
    const { style = "" } = node.props;

    const combinedStyle = context.resolveStyle?.(node.props) || {};
    if (style) {
        Object.assign(combinedStyle, context.parseStyleString?.(style) || {});
    }

    return (
        <div className="tab-page" style={combinedStyle}>
            {context.renderChildren(node.children)}
        </div>
    );
};
