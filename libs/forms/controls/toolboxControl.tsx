import React from "react";
import type { ControlRenderer } from "./types";
import { renderIcon } from "./iconHelpers";
import { SwitchButtonView } from "./switchButtonControl";

type ToolDefinition = {
    id: string;
    label: string;
    icon?: string;
    description?: string;
};

const parseTools = (tools?: unknown): ToolDefinition[] => {
    if (!tools) return [];
    if (Array.isArray(tools)) {
        return tools.map((tool) => {
            if (typeof tool === "string") {
                return { id: tool, label: tool, icon: tool };
            }
            return tool as ToolDefinition;
        });
    }
    return [];
};

export const renderToolbox: ControlRenderer = ({ props }, { DraggableContainer, resolveStyle, raiseEvent }) => {
    const title = (props?.title as string | undefined) ?? "Toolbox";
    const tools = parseTools(props?.tools);
    const onSelect = props?.onSelect as string | undefined;
    const activeTool = props?.activeTool as string | undefined;
    const style = resolveStyle?.(props) ?? {};

    return (
        <DraggableContainer
            tag="div"
            className="window window-shell toolbox-window"
            draggable={true}
            dragHandle=".title-bar"
            props={{ style }}
        >
            <div className="title-bar">
                <div className="title-bar-text">{title}</div>
                <div className="title-bar-controls">
                    <button aria-label="Close" />
                </div>
            </div>
            <div className="window-body toolbox-body">
                <div className="toolbox-grid">
                    {tools.map((tool) => (
                        <SwitchButtonView
                            key={tool.id}
                            text={tool.label}
                            icon={tool.icon ?? tool.id}
                            checked={tool.id === activeTool}
                            className="toolbox-item"
                            onClick={() => onSelect && raiseEvent?.(onSelect, { tool })}
                        />
                    ))}
                </div>
                {tools.length === 0 ? <div className="toolbox-empty">No tools available.</div> : null}
            </div>
        </DraggableContainer>
    );
};