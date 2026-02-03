import type React from "react";
import { useCallback } from "react";
import type { CanvasItem } from "../domain/types";
import { applyResize, getDefaultSize } from "../domain/canvasMath";

type TransformRef = React.MutableRefObject<
    | {
        type: "move" | "resize";
        itemId: string;
        handle?: "nw" | "ne" | "sw" | "se";
        startX: number;
        startY: number;
        originX: number;
        originY: number;
        originW: number;
        originH: number;
    }
    | null
>;

type UseCanvasInteractionsArgs = {
    activeTool: string | null;
    setActiveTool: (tool: string | null) => void;
    items: CanvasItem[];
    setItems: React.Dispatch<React.SetStateAction<CanvasItem[]>>;
    selectedIds: string[];
    setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
    selectionBox: { active: boolean; x: number; y: number; width: number; height: number; addMode: boolean };
    setSelectionBox: React.Dispatch<React.SetStateAction<{ active: boolean; x: number; y: number; width: number; height: number; addMode: boolean }>>;
    placementBox: { active: boolean; x: number; y: number; width: number; height: number; type: string | null };
    setPlacementBox: React.Dispatch<React.SetStateAction<{ active: boolean; x: number; y: number; width: number; height: number; type: string | null }>>;
    dragStart: React.MutableRefObject<{ x: number; y: number; canvasRect: DOMRect } | null>;
    placementStart: React.MutableRefObject<{ x: number; y: number; canvasRect: DOMRect } | null>;
    transformRef: TransformRef;
    panRef: React.MutableRefObject<{
        startX: number;
        startY: number;
        scrollLeft: number;
        scrollTop: number;
        container: HTMLDivElement;
    } | null>;
    beginTransformHold: () => void;
    endTransformHold: () => void;
    addItem: (toolType: string, x: number, y: number, width: number, height: number) => void;
};

export const useCanvasInteractions = (args: UseCanvasInteractionsArgs) => {
    const beginMove = useCallback((itemId: string, event: React.MouseEvent<HTMLDivElement>) => {
        if (args.activeTool !== "select") return;
        const item = args.items.find((candidate) => candidate.id === itemId);
        if (!item) return;
        args.beginTransformHold();
        args.transformRef.current = {
            type: "move",
            itemId,
            startX: event.clientX,
            startY: event.clientY,
            originX: item.x,
            originY: item.y,
            originW: item.width,
            originH: item.height
        };
    }, [args]);

    const beginResize = useCallback((itemId: string, handle: "nw" | "ne" | "sw" | "se") => (event: React.MouseEvent<HTMLDivElement>) => {
        if (args.activeTool !== "select") return;
        event.stopPropagation();
        const item = args.items.find((candidate) => candidate.id === itemId);
        if (!item) return;
        args.beginTransformHold();
        args.transformRef.current = {
            type: "resize",
            itemId,
            handle,
            startX: event.clientX,
            startY: event.clientY,
            originX: item.x,
            originY: item.y,
            originW: item.width,
            originH: item.height
        };
        args.setSelectedIds((prev) => (prev.includes(itemId) ? prev : [itemId]));
    }, [args]);

    const handleCanvasMouseDown = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
        if (event.button !== 0) return;
        const target = event.currentTarget;
        const rect = target.getBoundingClientRect();
        const x = Math.round(event.clientX - rect.left);
        const y = Math.round(event.clientY - rect.top);

        if (!args.activeTool) {
            args.setActiveTool("select");
        }

        const effectiveTool = args.activeTool ?? "select";
        const isPanMode = effectiveTool === "hand" || (effectiveTool === "select" && event.ctrlKey);
        if (isPanMode) {
            const container = event.currentTarget.closest(".playground2-canvas-form") as HTMLDivElement | null;
            if (container) {
                args.panRef.current = {
                    startX: event.clientX,
                    startY: event.clientY,
                    scrollLeft: container.scrollLeft,
                    scrollTop: container.scrollTop,
                    container
                };
            }
            return;
        }
        if (effectiveTool === "select") {
            args.dragStart.current = { x, y, canvasRect: rect };
            args.setSelectionBox({ active: true, x, y, width: 0, height: 0, addMode: event.shiftKey });
            args.setPlacementBox({ active: false, x: 0, y: 0, width: 0, height: 0, type: null });
            if (!event.shiftKey) {
                args.setSelectedIds([]);
            }
            return;
        }

        args.placementStart.current = { x, y, canvasRect: rect };
        args.setPlacementBox({ active: true, x, y, width: 0, height: 0, type: effectiveTool });
    }, [args]);

    const handleCanvasMouseMove = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
        if (args.panRef.current) {
            const pan = args.panRef.current;
            const dx = event.clientX - pan.startX;
            const dy = event.clientY - pan.startY;
            pan.container.scrollLeft = pan.scrollLeft - dx;
            pan.container.scrollTop = pan.scrollTop - dy;
            return;
        }
        if (args.transformRef.current) {
            const transform = args.transformRef.current;
            const dx = event.clientX - transform.startX;
            const dy = event.clientY - transform.startY;
            args.setItems((prev) =>
                prev.map((item) => {
                    if (item.id !== transform.itemId) return item;
                    if (transform.type === "move") {
                        return {
                            ...item,
                            x: transform.originX + dx,
                            y: transform.originY + dy
                        };
                    }
                    const resized = applyResize(
                        {
                            ...item,
                            x: transform.originX,
                            y: transform.originY,
                            width: transform.originW,
                            height: transform.originH
                        },
                        dx,
                        dy,
                        transform.handle ?? "se"
                    );
                    return { ...item, ...resized };
                })
            );
            return;
        }
        if (args.selectionBox.active && args.dragStart.current) {
            const rect = args.dragStart.current.canvasRect;
            const x = Math.round(event.clientX - rect.left);
            const y = Math.round(event.clientY - rect.top);
            const startX = args.dragStart.current.x;
            const startY = args.dragStart.current.y;
            const boxX = Math.min(startX, x);
            const boxY = Math.min(startY, y);
            const width = Math.abs(x - startX);
            const height = Math.abs(y - startY);
            args.setSelectionBox((prev) => ({ ...prev, x: boxX, y: boxY, width, height }));
            return;
        }
        if (args.placementBox.active && args.placementStart.current) {
            const rect = args.placementStart.current.canvasRect;
            const x = Math.round(event.clientX - rect.left);
            const y = Math.round(event.clientY - rect.top);
            const startX = args.placementStart.current.x;
            const startY = args.placementStart.current.y;
            const boxX = Math.min(startX, x);
            const boxY = Math.min(startY, y);
            const width = Math.abs(x - startX);
            const height = Math.abs(y - startY);
            args.setPlacementBox((prev) => ({ ...prev, x: boxX, y: boxY, width, height }));
        }
    }, [args]);

    const handleCanvasMouseUp = useCallback(() => {
        if (args.panRef.current) {
            args.panRef.current = null;
            return;
        }
        if (args.transformRef.current) {
            args.transformRef.current = null;
            args.endTransformHold();
            return;
        }
        if (args.selectionBox.active) {
            const box = args.selectionBox;
            const nextSelected = args.items.filter((item) => {
                const itemRect = {
                    left: item.x,
                    top: item.y,
                    right: item.x + item.width,
                    bottom: item.y + item.height
                };
                const boxRect = {
                    left: box.x,
                    top: box.y,
                    right: box.x + box.width,
                    bottom: box.y + box.height
                };
                return !(itemRect.right < boxRect.left || itemRect.left > boxRect.right || itemRect.bottom < boxRect.top || itemRect.top > boxRect.bottom);
            });
            const nextIds = nextSelected.map((item) => item.id);
            args.setSelectedIds((prev) => (box.addMode ? Array.from(new Set([...prev, ...nextIds])) : nextIds));
            args.setSelectionBox({ active: false, x: 0, y: 0, width: 0, height: 0, addMode: false });
            args.dragStart.current = null;
            return;
        }

        if (args.placementBox.active) {
            const box = args.placementBox;
            const toolType = box.type ?? args.activeTool;
            if (toolType) {
                const defaultSize = getDefaultSize(toolType);
                const width = box.width < 4 ? defaultSize.width : box.width;
                const height = box.height < 4 ? defaultSize.height : box.height;
                args.addItem(toolType, box.x, box.y, width, toolType === "line" ? Math.max(2, height) : height);
            }
            args.setPlacementBox({ active: false, x: 0, y: 0, width: 0, height: 0, type: null });
            args.placementStart.current = null;
        }
    }, [args]);

    const handleItemMouseDown = useCallback((itemId: string) => (event: React.MouseEvent<HTMLDivElement>) => {
        if (args.activeTool !== "select") {
            args.setActiveTool("select");
        }
        event.stopPropagation();
        args.setSelectedIds((prev) => {
            if (event.shiftKey) {
                return prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId];
            }
            return [itemId];
        });
        beginMove(itemId, event);
    }, [args, beginMove]);

    return {
        beginResize,
        handleCanvasMouseDown,
        handleCanvasMouseMove,
        handleCanvasMouseUp,
        handleItemMouseDown
    };
};
