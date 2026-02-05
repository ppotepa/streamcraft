import React, { useEffect, useRef } from "react";
import { bringWindowToFront, getNextWindowZIndex } from "./windowManager";

type DraggableOptions = {
    enabled?: boolean;
    boundsSelector?: string;
    handleSelector?: string;
    onDragEnd?: (payload: { left: number; top: number }) => void;
    onDragMove?: (payload: { left: number; top: number }) => void;
    onDragStart?: (payload: { left: number; top: number; zIndex?: number }) => void;
};

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
        let rafId: number | null = null;

        const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

        const resolveBounds = () => {
            if (options.boundsSelector) {
                return (
                    element.closest(options.boundsSelector) ??
                    (document.querySelector(options.boundsSelector) as HTMLElement | null)
                );
            }
            return document.body;
        };

        const onPointerDown = (event: PointerEvent) => {
            if (event.button !== 0) return;
            const target = event.target as HTMLElement | null;
            if (target && target.closest(".title-bar-controls")) {
                return;
            }
            isDragging = true;
            const bounds = resolveBounds();
            const boundsRect = bounds?.getBoundingClientRect();
            const elementRect = element.getBoundingClientRect();
            const computed = getComputedStyle(element);
            if (computed.position === "static") {
                element.style.position = "absolute";
            }

            const hasTransform = (element.style.transform ?? "").includes("translate");
            if (hasTransform) {
                startLeft = boundsRect ? elementRect.left - boundsRect.left : elementRect.left;
                startTop = boundsRect ? elementRect.top - boundsRect.top : elementRect.top;
                element.style.transform = "";
                element.style.left = `${startLeft}px`;
                element.style.top = `${startTop}px`;
            } else {
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
            }

            startX = event.clientX;
            startY = event.clientY;
            const zIndex = getNextWindowZIndex();
            element.style.zIndex = String(zIndex);
            options.onDragStart?.({ left: startLeft, top: startTop, zIndex });
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
            if (options.onDragMove) {
                if (rafId) cancelAnimationFrame(rafId);
                rafId = requestAnimationFrame(() => {
                    options.onDragMove?.({ left: nextLeft, top: nextTop });
                    rafId = null;
                });
            }
        };

        const onPointerUp = (event: PointerEvent) => {
            if (!isDragging) return;
            isDragging = false;
            if (options.onDragEnd) {
                const nextLeft = Number.isFinite(parseFloat(element.style.left)) ? parseFloat(element.style.left) : 0;
                const nextTop = Number.isFinite(parseFloat(element.style.top)) ? parseFloat(element.style.top) : 0;
                options.onDragEnd({ left: nextLeft, top: nextTop });
            }
            if (rafId) {
                cancelAnimationFrame(rafId);
                rafId = null;
            }
            handleTarget.releasePointerCapture?.(event.pointerId);
        };

        const bringToFront = () => bringWindowToFront(element);

        element.addEventListener("pointerdown", bringToFront);
        handleTarget.addEventListener("pointerdown", onPointerDown);
        window.addEventListener("pointermove", onPointerMove);
        window.addEventListener("pointerup", onPointerUp);

        return () => {
            element.removeEventListener("pointerdown", bringToFront);
            handleTarget.removeEventListener("pointerdown", onPointerDown);
            window.removeEventListener("pointermove", onPointerMove);
            window.removeEventListener("pointerup", onPointerUp);
        };
    }, [ref, options.enabled, options.boundsSelector, options.handleSelector]);
};

export type DraggableContainerProps = {
    tag: keyof JSX.IntrinsicElements;
    className?: string;
    draggable?: boolean;
    dragBounds?: string;
    dragHandle?: string;
    props?: Record<string, unknown>;
    onDragEnd?: (payload: { left: number; top: number }) => void;
    onDragMove?: (payload: { left: number; top: number }) => void;
    onDragStart?: (payload: { left: number; top: number; zIndex?: number }) => void;
    children?: React.ReactNode;
};

export type DraggableContainerComponent = React.FC<DraggableContainerProps>;

export const DraggableContainer: DraggableContainerComponent = ({
    tag,
    className,
    draggable,
    dragBounds,
    dragHandle,
    props,
    onDragEnd,
    onDragMove,
    onDragStart,
    children
}) => {
    const ref = useRef<HTMLElement>(null);
    useDraggable(ref, {
        enabled: draggable,
        boundsSelector: dragBounds,
        handleSelector: dragHandle,
        onDragEnd,
        onDragMove,
        onDragStart
    });
    return React.createElement(tag, { ...(props ?? {}), ref, className }, children);
};