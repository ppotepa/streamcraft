import type React from "react";
import type { FormChild, FormNode } from "../core";
import type { DraggableContainerComponent, UseCanvasScaleHook } from "../core";
import type { EventHandlers } from "../core/events";

export type ControlContext = {
    renderChildren: (children?: FormChild[]) => React.ReactNode;
    DraggableContainer: DraggableContainerComponent;
    useCanvasScale: UseCanvasScaleHook;
    resolveLayoutStyle: (layout?: unknown) => React.CSSProperties | undefined;
    resolveStyle: (props?: Record<string, unknown>) => React.CSSProperties | undefined;
    parseStyleString?: (style: string) => React.CSSProperties;
    eventHandlers?: EventHandlers;
    raiseEvent?: (name: string, args: any) => void;
};

export type ControlRenderer = (node: FormNode, context: ControlContext) => React.ReactNode;
