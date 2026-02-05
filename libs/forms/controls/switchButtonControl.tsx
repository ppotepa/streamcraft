import React from "react";
import type { ControlRenderer } from "./types";
import { renderIcon } from "./iconHelpers";

type SwitchButtonViewProps = {
    text?: string;
    icon?: string;
    checked?: boolean;
    enabled?: boolean;
    className?: string;
    style?: React.CSSProperties;
    onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
};

export const SwitchButtonView: React.FC<SwitchButtonViewProps> = ({
    text,
    icon,
    checked = false,
    enabled = true,
    className,
    style,
    onClick
}) => {
    const iconNode = renderIcon(icon);
    const buttonClass = `button switch-button ${checked ? "is-checked" : ""} ${className ?? ""}`.trim();

    return (
        <button
            type="button"
            className={buttonClass}
            style={style}
            disabled={!enabled}
            aria-pressed={checked}
            onClick={onClick}
        >
            <span className="sc-icon-inline">
                {iconNode}
                {text ? <span className="sc-icon-text">{text}</span> : null}
            </span>
        </button>
    );
};

export const renderSwitchButton: ControlRenderer = ({ props, children }, { renderChildren, resolveStyle, raiseEvent }) => {
    const text = props?.text as string | undefined;
    const icon = props?.icon as string | undefined;
    const checked = (props?.checked as boolean | undefined) ?? false;
    const enabled = (props?.enabled as boolean | undefined) ?? true;
    const className = (props?.className as string | undefined) ?? "";
    const style = resolveStyle(props);
    const onToggle = props?.onToggle as string | undefined;

    const content = text ?? renderChildren(children);

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        if (!enabled) return;
        if (onToggle && raiseEvent) {
            raiseEvent(onToggle, { checked: !checked, event });
        }
    };

    return (
        <SwitchButtonView
            text={typeof content === "string" ? content : text}
            icon={icon}
            checked={checked}
            enabled={enabled}
            className={className}
            style={style}
            onClick={handleClick}
        />
    );
};