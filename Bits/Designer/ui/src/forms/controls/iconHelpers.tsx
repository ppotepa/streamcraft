import React from "react";
import { resolveIconDefinition } from "./iconRegistry";

type IconOptions = {
    className?: string;
};

export const renderIcon = (icon?: string, options?: IconOptions) => {
    if (!icon) return null;
    if (icon.startsWith("font:")) {
        return (
            <span className={`tool-icon tool-icon-font ${options?.className ?? ""}`.trim()}>
                {icon.slice("font:".length)}
            </span>
        );
    }
    const resolved = resolveIconDefinition(icon);
    if (resolved?.type === "font") {
        return (
            <span className={`tool-icon tool-icon-font material-symbols-outlined ${options?.className ?? ""}`.trim()}>
                {resolved.value}
            </span>
        );
    }
    if (resolved?.type === "class") {
        return <i className={`bi bi-${resolved.value} ${options?.className ?? ""}`.trim()} />;
    }
    const iconName = resolved?.type === "css" ? resolved.value : icon;
    return (
        <span
            className={`tool-icon ${options?.className ?? ""}`.trim()}
            style={{ backgroundImage: `var(--icon-${iconName})` }}
        />
    );
};