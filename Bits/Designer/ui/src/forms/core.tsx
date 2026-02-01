import React, { useEffect, useRef } from "react";

export type FormChild = FormNode | string | number | boolean | null | undefined;

export type FormNode = {
    type: string;
    props?: Record<string, unknown>;
    children?: FormChild[];
};

export const node = (type: string, props?: Record<string, unknown>, ...children: FormChild[]): FormNode => ({
    type,
    props,
    children
});

export const element = (tag: keyof JSX.IntrinsicElements, props?: Record<string, unknown>, ...children: FormChild[]): FormNode =>
    node("element", { tag, ...props }, ...children);

export const renderChild = (child: FormChild, key: number) => {
    if (child === null || child === undefined || child === false) return null;
    if (typeof child === "string" || typeof child === "number") return <React.Fragment key={key}>{child}</React.Fragment>;
    if (typeof child === "boolean") return null;
    return <FormRenderer key={key} node={child} />;
};

export const renderChildren = (children?: FormChild[]) => {
    if (!children) return null;
    return children.map((child, index) => renderChild(child, index));
};

type DraggableOptions = {
    enabled?: boolean;
    boundsSelector?: string;
    handleSelector?: string;
};

let windowZIndex = 20;

const useDraggable = (ref: React.RefObject<HTMLElement>, options: DraggableOptions) => {
    useEffect(() => {
        if (!options.enabled) return;
        const element = ref.current;
        if (!element) return;

        const handle = options.handleSelector
            ? (element.querySelector(options.handleSelector) as HTMLElement | null)
            : null;
        const handleTarget = handle ?? element;
        let isDragging = false;
        let startX = 0;
        let startY = 0;
        let startLeft = 0;
        let startTop = 0;

        const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

        const resolveBounds = () => {
            if (options.boundsSelector) {
                return (
                    element.closest(options.boundsSelector) ??
                    (document.querySelector(options.boundsSelector) as HTMLElement | null)
                );
            }
            return (element.offsetParent as HTMLElement | null) ?? document.body;
        };

        const onPointerDown = (event: PointerEvent) => {
            if (event.button !== 0) return;
            isDragging = true;
            const bounds = resolveBounds();
            const boundsRect = bounds?.getBoundingClientRect();
            const elementRect = element.getBoundingClientRect();
            const computed = getComputedStyle(element);
            if (computed.position === "static") {
                element.style.position = "absolute";
            }
            startLeft = Number.isFinite(parseFloat(element.style.left))
                ? parseFloat(element.style.left)
                : boundsRect
                    ? elementRect.left - boundsRect.left
                    : element.offsetLeft;
            startTop = Number.isFinite(parseFloat(element.style.top))
                ? parseFloat(element.style.top)
                : boundsRect
                    ? elementRect.top - boundsRect.top
                    : element.offsetTop;
            startX = event.clientX;
            startY = event.clientY;
            element.style.zIndex = String(++windowZIndex);
            handleTarget.setPointerCapture?.(event.pointerId);
            event.preventDefault();
        };

        const onPointerMove = (event: PointerEvent) => {
            if (!isDragging) return;
            const bounds = resolveBounds();
            const boundsRect = bounds?.getBoundingClientRect();
            const maxLeft = boundsRect ? boundsRect.width - element.offsetWidth : window.innerWidth - element.offsetWidth;
            const maxTop = boundsRect ? boundsRect.height - element.offsetHeight : window.innerHeight - element.offsetHeight;
            const nextLeft = clamp(startLeft + (event.clientX - startX), 0, Math.max(0, maxLeft));
            const nextTop = clamp(startTop + (event.clientY - startY), 0, Math.max(0, maxTop));
            element.style.left = `${nextLeft}px`;
            element.style.top = `${nextTop}px`;
        };

        const onPointerUp = (event: PointerEvent) => {
            if (!isDragging) return;
            isDragging = false;
            handleTarget.releasePointerCapture?.(event.pointerId);
        };

        handleTarget.addEventListener("pointerdown", onPointerDown);
        window.addEventListener("pointermove", onPointerMove);
        window.addEventListener("pointerup", onPointerUp);

        return () => {
            handleTarget.removeEventListener("pointerdown", onPointerDown);
            window.removeEventListener("pointermove", onPointerMove);
            window.removeEventListener("pointerup", onPointerUp);
        };
    }, [ref, options.enabled, options.boundsSelector, options.handleSelector]);
};

type DraggableContainerProps = {
    tag: keyof JSX.IntrinsicElements;
    className?: string;
    draggable?: boolean;
    dragBounds?: string;
    dragHandle?: string;
    props?: Record<string, unknown>;
    children?: React.ReactNode;
};

const DraggableContainer: React.FC<DraggableContainerProps> = ({
    tag,
    className,
    draggable,
    dragBounds,
    dragHandle,
    props,
    children
}) => {
    const ref = useRef<HTMLElement>(null);
    useDraggable(ref, { enabled: draggable, boundsSelector: dragBounds, handleSelector: dragHandle });
    return React.createElement(tag, { ...(props ?? {}), ref, className }, children);
};

export const FormRenderer: React.FC<{ node: FormNode }> = ({ node }) => {
    const { type, props, children } = node;

    switch (type) {
        case "window": {
            const title = props?.title as string | undefined;
            const draggable = props?.draggable as boolean | undefined;
            const dragBounds = props?.dragBounds as string | undefined;
            const dragHandle = props?.dragHandle as string | undefined;
            return (
                <DraggableContainer
                    tag="div"
                    className="window window-shell"
                    draggable={draggable}
                    dragBounds={dragBounds}
                    dragHandle={dragHandle ?? ".title-bar"}
                >
                    <div className="title-bar">
                        <div className="title-bar-text">{title}</div>
                        <div className="title-bar-controls">
                            <button aria-label="Minimize" />
                            <button aria-label="Maximize" />
                            <button aria-label="Close" />
                        </div>
                    </div>
                    <div className="window-body designer-body">{renderChildren(children)}</div>
                </DraggableContainer>
            );
        }
        case "menuBar": {
            return <nav className="menu-bar">{renderChildren(children)}</nav>;
        }
        case "menuItem": {
            const label = props?.label as string | undefined;
            return (
                <div className="menu-item">
                    {label}
                    {children && children.length > 0 ? <div className="menu-dropdown">{renderChildren(children)}</div> : null}
                </div>
            );
        }
        case "menuItemEntry": {
            return <div className="menu-dropdown-item">{renderChildren(children)}</div>;
        }
        case "toolStrip": {
            return (
                <section className="tool-strip">
                    <div className="tool-tiles">{renderChildren(props?.tiles as FormChild[])}</div>
                    <div className="tool-options">{renderChildren(props?.options as FormChild[])}</div>
                    <div className="tool-actions">{renderChildren(props?.actions as FormChild[])}</div>
                </section>
            );
        }
        case "toolButton": {
            const label = props?.label as string | undefined;
            const pressed = props?.pressed as boolean | undefined;
            const hasFlyout = props?.hasFlyout as boolean | undefined;
            const onClick = props?.onClick as (() => void) | undefined;
            return (
                <button className={`tool-tile button ${pressed ? "active" : ""}`} onClick={onClick}>
                    <span>{label}</span>
                    {hasFlyout ? <span className="tool-flyout">▼</span> : null}
                </button>
            );
        }
        case "docBar": {
            return (
                <section className="doc-bar">
                    <div className="doc-tabs">{renderChildren(props?.left as FormChild[])}</div>
                    <div className="doc-controls">{renderChildren(props?.right as FormChild[])}</div>
                </section>
            );
        }
        case "view": {
            const className = (props?.className as string | undefined) ?? "";
            const draggable = props?.draggable as boolean | undefined;
            const dragBounds = props?.dragBounds as string | undefined;
            const dragHandle = props?.dragHandle as string | undefined;
            return (
                <DraggableContainer
                    tag="section"
                    className={`view ${className}`.trim()}
                    draggable={draggable}
                    dragBounds={dragBounds}
                    dragHandle={dragHandle}
                >
                    {renderChildren(children)}
                </DraggableContainer>
            );
        }
        case "dock": {
            const className = (props?.className as string | undefined) ?? "";
            const draggable = props?.draggable as boolean | undefined;
            const dragBounds = props?.dragBounds as string | undefined;
            const dragHandle = props?.dragHandle as string | undefined;
            return (
                <DraggableContainer
                    tag="aside"
                    className={`dock ${className}`.trim()}
                    draggable={draggable}
                    dragBounds={dragBounds}
                    dragHandle={dragHandle}
                >
                    {renderChildren(children)}
                </DraggableContainer>
            );
        }
        case "panel": {
            const title = props?.title as string | undefined;
            const className = (props?.className as string | undefined) ?? "";
            const draggable = props?.draggable as boolean | undefined;
            const dragBounds = props?.dragBounds as string | undefined;
            const dragHandle = props?.dragHandle as string | undefined;
            if (!title) {
                return (
                    <DraggableContainer
                        tag="div"
                        className={`panel ${className}`.trim()}
                        draggable={draggable}
                        dragBounds={dragBounds}
                        dragHandle={dragHandle}
                    >
                        {renderChildren(children)}
                    </DraggableContainer>
                );
            }
            return (
                <DraggableContainer
                    tag="div"
                    className={`window panel ${className}`.trim()}
                    draggable={draggable}
                    dragBounds={dragBounds}
                    dragHandle={dragHandle ?? ".title-bar"}
                >
                    <div className="title-bar">
                        <div className="title-bar-text">{title}</div>
                        <div className="title-bar-controls">
                            <button aria-label="Minimize" />
                        </div>
                    </div>
                    <div className="window-body">{renderChildren(children)}</div>
                </DraggableContainer>
            );
        }
        case "canvas": {
            return <main className="canvas-center">{renderChildren(children)}</main>;
        }
        case "statusBar": {
            const segments = (props?.segments as string[]) ?? [];
            return (
                <footer className="status-bar">
                    {segments.map((segment, index) => (
                        <div key={index} className="status-bar-field">
                            {segment}
                        </div>
                    ))}
                </footer>
            );
        }
        case "element": {
            const tag = props?.tag as keyof JSX.IntrinsicElements | undefined;
            const { tag: _, ...rest } = props ?? {};
            const safeTag = typeof tag === "string" && tag.length > 0 ? tag : "div";
            const voidTags = new Set([
                "area",
                "base",
                "br",
                "col",
                "embed",
                "hr",
                "img",
                "input",
                "link",
                "meta",
                "param",
                "source",
                "track",
                "wbr"
            ]);
            if (voidTags.has(safeTag)) {
                return React.createElement(safeTag, rest);
            }
            return React.createElement(safeTag, rest, renderChildren(children));
        }
        default:
            return <>{renderChildren(children)}</>;
    }
};
