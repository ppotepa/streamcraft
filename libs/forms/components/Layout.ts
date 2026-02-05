import { Container } from "./Container";
import type { FormNode, FormChild } from "../core";
import type { ControlContext } from "../controls/types";

/**
 * Abstract base class for layout components that arrange child components.
 * Provides common functionality for positioning, spacing, and alignment.
 */
export abstract class Layout extends Container {
    /**
     * Horizontal alignment of children: start, center, end, stretch
     */
    public horizontalAlignment: "start" | "center" | "end" | "stretch" = "start";

    /**
     * Vertical alignment of children: start, center, end, stretch
     */
    public verticalAlignment: "start" | "center" | "end" | "stretch" = "start";

    /**
     * Direction of layout: horizontal, vertical
     */
    public direction: "horizontal" | "vertical" = "horizontal";

    /**
     * Spacing between child elements in pixels
     */
    public spacing?: number;

    /**
     * Whether children should wrap to new lines
     */
    public wrap: boolean = false;

    /**
     * Grid size for snapping (if applicable)
     */
    public gridSize?: number;

    /**
     * Whether to show grid lines
     */
    public showGrid: boolean = false;

    /**
     * Grid line color
     */
    public gridColor?: string;

    /**
     * Whether layout is responsive
     */
    public responsive: boolean = false;

    /**
     * Breakpoints for responsive layout
     */
    public breakpoints?: {
        small?: number;
        medium?: number;
        large?: number;
    };

    constructor(props?: Partial<Layout>) {
        super(props);
    }

    public override getDefaults(): Record<string, unknown> {
        return {
            ...super.getDefaults(),
            horizontalAlignment: "start",
            verticalAlignment: "start",
            direction: "horizontal",
            wrap: false,
            showGrid: false,
            responsive: false
        };
    }

    /**
     * Calculate layout positions for children
     * Override in derived classes for custom layout algorithms
     */
    protected abstract calculateLayout(): LayoutPosition[];

    /**
     * Get layout container style
     */
    protected getLayoutStyle(): Record<string, unknown> {
        const style: Record<string, unknown> = {
            ...this.getContainerStyle(),
            display: "flex",
            flexDirection: this.direction === "vertical" ? "column" : "row"
        };

        if (this.wrap) {
            style.flexWrap = "wrap";
        }

        if (this.spacing) {
            style.gap = `${this.spacing}px`;
        }

        // Horizontal alignment
        switch (this.horizontalAlignment) {
            case "center":
                style.justifyContent = "center";
                break;
            case "end":
                style.justifyContent = "flex-end";
                break;
            case "stretch":
                style.justifyContent = "stretch";
                break;
            default:
                style.justifyContent = "flex-start";
        }

        // Vertical alignment
        switch (this.verticalAlignment) {
            case "center":
                style.alignItems = "center";
                break;
            case "end":
                style.alignItems = "flex-end";
                break;
            case "stretch":
                style.alignItems = "stretch";
                break;
            default:
                style.alignItems = "flex-start";
        }

        return style;
    }

    /**
     * Snap value to grid if grid is enabled
     */
    protected snapToGrid(value: number): number {
        if (!this.gridSize) return value;
        return Math.round(value / this.gridSize) * this.gridSize;
    }
}

/**
 * Layout position information for a child element
 */
export interface LayoutPosition {
    child: FormChild;
    x: number;
    y: number;
    width: number;
    height: number;
}
