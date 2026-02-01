import React, { useMemo, useState } from "react";
import type { ControlRenderer } from "./types";
import { getNextWindowZIndex } from "../core/windowManager";
import { renderIcon } from "./iconHelpers";

const parseButtons = (value?: string | string[]) => {
    if (Array.isArray(value)) return value;
    if (!value) return ["OK"];
    if (value.toLowerCase() === "okcancel") return ["OK", "Cancel"];
    if (value.toLowerCase() === "yesno") return ["Yes", "No"];
    if (value.toLowerCase() === "yesnocancel") return ["Yes", "No", "Cancel"];
    return value.split(",").map((item) => item.trim()).filter(Boolean);
};

const resolveButtons = (mode?: string, buttons?: string | string[]) => {
    if (mode) {
        switch (mode.toLowerCase()) {
            case "alert":
                return ["OK"];
            case "confirm":
                return ["OK", "Cancel"];
            case "yesno":
                return ["Yes", "No"];
            case "yesnocancel":
                return ["Yes", "No", "Cancel"];
            case "okcancel":
                return ["OK", "Cancel"];
            default:
                return parseButtons(buttons);
        }
    }
    return parseButtons(buttons);
};

export const renderMessageBox: ControlRenderer = ({ props }, { DraggableContainer, resolveStyle, raiseEvent }) => {
    const title = (props?.title as string | undefined) ?? "Message";
    const message = (props?.message as string | undefined) ?? "";
    const mode = props?.mode as string | undefined;
    const buttons = resolveButtons(mode, props?.buttons as string | string[] | undefined);
    const defaultIndex = (props?.defaultButton as number | undefined) ?? 0;
    const onResult = props?.onResult as string | undefined;
    const iconProp = props?.icon as string | undefined;
    const draggable = (props?.draggable as boolean | undefined) ?? true;
    const resolvedStyle = resolveStyle?.(props) ?? {};
    const [zIndex] = useState(() => getNextWindowZIndex());
    const style = useMemo<React.CSSProperties>(() => {
        const hasLeft = resolvedStyle.left !== undefined;
        const hasTop = resolvedStyle.top !== undefined;
        const hasTransform = (resolvedStyle as React.CSSProperties).transform !== undefined;
        return {
            position: resolvedStyle.position ?? "fixed",
            left: hasLeft ? resolvedStyle.left : "50%",
            top: hasTop ? resolvedStyle.top : "50%",
            transform: hasTransform ? (resolvedStyle as React.CSSProperties).transform : "translate(-50%, -50%)",
            zIndex,
            ...resolvedStyle
        } as React.CSSProperties;
    }, [resolvedStyle, zIndex]);

    const fallbackIcon = mode
        ? mode.toLowerCase() === "alert"
            ? "font:warning"
            : mode.toLowerCase() === "confirm"
                ? "font:help"
                : undefined
        : undefined;
    const icon = iconProp ?? fallbackIcon;

    return (
        <DraggableContainer
            tag="div"
            className="window window-shell message-box"
            draggable={draggable}
            dragHandle=".title-bar"
            props={{ style }}
        >
            <div className="title-bar">
                <div className="title-bar-text">{title}</div>
                <div className="title-bar-controls">
                    <button aria-label="Close" onClick={() => onResult && raiseEvent?.(onResult, { result: "Close" })} />
                </div>
            </div>
            <div className="window-body message-box-body">
                <div className="message-box-content">
                    {icon ? <span className="message-box-icon">{renderIcon(icon, { className: "message-box-icon-asset" })}</span> : null}
                    <div className="message-box-text">{message}</div>
                </div>
                <div className="message-box-actions">
                    {buttons.map((label, index) => (
                        <button
                            key={`${label}-${index}`}
                            className={`button${index === defaultIndex ? " button-default" : ""}`}
                            onClick={() => onResult && raiseEvent?.(onResult, { result: label })}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>
        </DraggableContainer>
    );
};