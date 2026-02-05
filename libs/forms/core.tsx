import React, { useEffect } from "react";
import "./controls";
import type { ControlContext } from "./controls/types";
import type { EventHandlers } from "./core/events";
import { DraggableContainer } from "./core/drag";
import { resolveLayoutStyle, resolveStyle, parseStyleString } from "./core/style";
import { addDiagnostic } from "./core/diagnostics";
import { controlRegistry } from "./registry";
import { ControlKind } from "./controlKinds";

export type FormChild = FormNode | string | number | boolean | null | undefined;

export type FormNode = {
    type: string;
    props?: Record<string, unknown>;
    children?: FormChild[];
};

export const node = (type: string, props?: Record<string, unknown> | null, ...children: FormChild[]): FormNode => ({
    type,
    props: props ?? undefined,
    children
});

export const element = (tag: keyof JSX.IntrinsicElements, props?: Record<string, unknown> | null, ...children: FormChild[]): FormNode =>
    node(ControlKind.element, { tag, ...(props ?? {}) }, ...children);

export const renderChild = (
    child: FormChild,
    key: number,
    inheritedProps?: Record<string, unknown>
) => {
    if (child === null || child === undefined || child === false) return null;
    if (typeof child === "string" || typeof child === "number") return <React.Fragment key={key}>{child}</React.Fragment>;
    if (typeof child === "boolean") return null;
    const nextNode = inheritedProps
        ? {
            ...child,
            props: {
                ...inheritedProps,
                ...(child.props ?? {})
            }
        }
        : child;
    return <FormRenderer key={key} node={nextNode} />;
};

export const renderChildren = (children?: FormChild[], inheritedProps?: Record<string, unknown>) => {
    if (!children) return null;
    return children.map((child, index) => renderChild(child, index, inheritedProps));
};

const logCore = (message: string, data?: Record<string, unknown>) => {
    if (typeof window === "undefined") return;
    console.log({ __scCore: true, message, data });
};

const logWarning = (message: string, data?: Record<string, unknown>) => {
    logCore(`Warning: ${message}`, data);
    addDiagnostic({ level: "warning", message, data });
};

const CANVAS_WIDTH = 1920;
const CANVAS_HEIGHT = 1080;

export type UseCanvasScaleHook = (ref: React.RefObject<HTMLElement>) => void;

export const useCanvasScale: UseCanvasScaleHook = (ref) => {
    useEffect(() => {
        const element = ref.current;
        if (!element) return;
        const canvasArea = element.querySelector<HTMLElement>(".canvas-area");
        if (!canvasArea) return;

        const updateScale = () => {
            const rect = element.getBoundingClientRect();
            const scale = Math.min(1, rect.width / CANVAS_WIDTH, rect.height / CANVAS_HEIGHT);
            canvasArea.style.setProperty("--canvas-scale", scale.toFixed(3));
        };

        updateScale();
        const observer = new ResizeObserver(updateScale);
        observer.observe(element);
        window.addEventListener("resize", updateScale);

        return () => {
            observer.disconnect();
            window.removeEventListener("resize", updateScale);
        };
    }, [ref]);
};

export { DraggableContainer } from "./core/drag";
export type { DraggableContainerComponent } from "./core/drag";
export { resolveLayoutStyle, resolveStyle, parseStyleString } from "./core/style";
export { getNextWindowZIndex } from "./core/windowManager";

export const FormRenderer: React.FC<{ node: FormNode }> = ({ node }) => {
    const { type, props } = node;

    // Extract context helpers from props if provided by FormContainer
    const eventHandlers = (props?.__eventHandlers as EventHandlers | undefined) ?? {};
    const raiseEvent = (props?.__raiseEvent as ((name: string, args: any) => void) | undefined);

    const inheritedProps = {
        __eventHandlers: eventHandlers,
        __raiseEvent: raiseEvent,
        __bindingData: props?.__bindingData,
        __updateBinding: props?.__updateBinding
    };

    const context: ControlContext = {
        renderChildren: (children) => renderChildren(children, inheritedProps),
        DraggableContainer,
        useCanvasScale,
        resolveLayoutStyle,
        resolveStyle,
        parseStyleString,
        eventHandlers,
        raiseEvent
    };

    const definition = controlRegistry.getDefinition(type);
    if (definition) {
        const mergedProps = definition.defaults ? { ...definition.defaults, ...(props ?? {}) } : props;
        if (definition.validate && mergedProps) {
            const errors = definition.validate(mergedProps);
            if (errors.length > 0) {
                logWarning(`Control '${type}' validation warnings`, { errors, props: mergedProps });
            }
        }
        const nextNode = mergedProps === props ? node : { ...node, props: mergedProps };
        return definition.renderer(nextNode, context);
    }

    logWarning(`Unknown control type '${type}'.`, { props });
    return <>{renderChildren(node.children)}</>;
};
