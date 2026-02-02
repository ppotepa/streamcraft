import { Layout, type LayoutPosition } from "./Layout";
import type { FormNode } from "../core";
import type { ControlContext } from "../controls/types";
import { ControlKind } from "../controlKinds";
import { node } from "../core";

/**
 * LayoutCanvas component - free-form canvas with absolute positioning
 */
export class LayoutCanvas extends Layout {
    /**
     * Canvas width
     */
    public width?: number;

    /**
     * Canvas height
     */
    public height?: number;

    /**
     * Whether to show rulers
     */
    public showRulers: boolean = false;

    /**
     * Whether to allow drag-and-drop
     */
    public allowDrag: boolean = true;

    /**
     * Whether to allow resize
     */
    public allowResize: boolean = true;

    /**
     * Mouse down handler
     */
    public onMouseDown?: string;

    /**
     * Mouse move handler
     */
    public onMouseMove?: string;

    /**
     * Mouse up handler
     */
    public onMouseUp?: string;

    /**
     * Wheel handler
     */
    public onWheel?: string;

    constructor(props?: Partial<LayoutCanvas>) {
        super(props);
    }

    public override getDefaults(): Record<string, unknown> {
        return {
            ...super.getDefaults(),
            showRulers: false,
            allowDrag: true,
            allowResize: true
        };
    }

    public render(context: ControlContext): FormNode {
        const props: Record<string, unknown> = {
            gridSize: this.gridSize,
            gridColor: this.gridColor,
            background: this.backgroundColor,
            showGrid: this.showGrid,
            showRulers: this.showRulers,
            allowDrag: this.allowDrag,
            allowResize: this.allowResize,
            onMouseDown: this.onMouseDown,
            onMouseMove: this.onMouseMove,
            onMouseUp: this.onMouseUp,
            onWheel: this.onWheel,
            className: this.className,
            style: this.style
        };

        if (this.width) {
            props.width = this.width;
        }

        if (this.height) {
            props.height = this.height;
        }

        return node(ControlKind.layoutCanvas, props, ...this.children);
    }

    protected calculateLayout(): LayoutPosition[] {
        // LayoutCanvas uses absolute positioning, so no layout calculation needed
        // Each child maintains its own x, y, width, height
        return [];
    }
}

/**
 * Canvas component - drawing/rendering canvas
 */
export class Canvas extends Layout {
    /**
     * Canvas width
     */
    public width?: number;

    /**
     * Canvas height
     */
    public height?: number;

    /**
     * Render handler (for custom drawing)
     */
    public onRender?: string;

    constructor(props?: Partial<Canvas>) {
        super(props);
    }

    public render(context: ControlContext): FormNode {
        const props: Record<string, unknown> = {
            width: this.width,
            height: this.height,
            onRender: this.onRender,
            className: this.className,
            style: this.style
        };

        return node(ControlKind.canvas, props, ...this.children);
    }

    protected calculateLayout(): LayoutPosition[] {
        return [];
    }
}

/**
 * Grid component - grid layout container
 */
export class Grid extends Layout {
    /**
     * Number of rows
     */
    public rows?: number;

    /**
     * Number of columns
     */
    public columns?: number;

    /**
     * Row definitions (heights)
     */
    public rowDefinitions?: GridDefinition[];

    /**
     * Column definitions (widths)
     */
    public columnDefinitions?: GridDefinition[];

    /**
     * Gap between cells
     */
    public gap?: number;

    constructor(props?: Partial<Grid>) {
        super(props);
    }

    public render(context: ControlContext): FormNode {
        const props: Record<string, unknown> = {
            rows: this.rows,
            columns: this.columns,
            rowDefinitions: this.rowDefinitions,
            columnDefinitions: this.columnDefinitions,
            gap: this.gap ?? this.spacing,
            className: this.className,
            style: this.style
        };

        return node(ControlKind.grid, props, ...this.children);
    }

    protected calculateLayout(): LayoutPosition[] {
        // Grid layout calculation would be complex
        // For now, return empty array as grid handles its own layout
        return [];
    }
}

/**
 * Grid definition for row or column
 */
export interface GridDefinition {
    size: number | "auto" | "*";
    minSize?: number;
    maxSize?: number;
}

/**
 * FlowLayoutPanel component - flowing layout that wraps
 */
export class FlowLayoutPanel extends Layout {
    /**
     * Flow direction
     */
    public flowDirection: "leftToRight" | "rightToLeft" | "topToBottom" | "bottomToTop" = "leftToRight";

    /**
     * Whether to wrap content
     */
    public override wrap: boolean = true;

    constructor(props?: Partial<FlowLayoutPanel>) {
        super(props);
        this.wrap = true;
    }

    public override getDefaults(): Record<string, unknown> {
        return {
            ...super.getDefaults(),
            flowDirection: "leftToRight",
            wrap: true
        };
    }

    public render(context: ControlContext): FormNode {
        const props: Record<string, unknown> = {
            flowDirection: this.flowDirection,
            wrap: this.wrap,
            spacing: this.spacing,
            className: this.className,
            style: this.style
        };

        return node(ControlKind.flowLayoutPanel, props, ...this.children);
    }

    protected calculateLayout(): LayoutPosition[] {
        // FlowLayoutPanel handles its own layout via CSS flexbox
        return [];
    }
}

/**
 * TableLayoutPanel component - table-based layout
 */
export class TableLayoutPanel extends Layout {
    /**
     * Number of rows
     */
    public rowCount: number = 1;

    /**
     * Number of columns
     */
    public columnCount: number = 1;

    /**
     * Row styles
     */
    public rowStyles?: TableStyle[];

    /**
     * Column styles
     */
    public columnStyles?: TableStyle[];

    /**
     * Cell padding
     */
    public cellPadding?: number;

    /**
     * Cell border width
     */
    public cellBorderWidth?: number;

    constructor(props?: Partial<TableLayoutPanel>) {
        super(props);
    }

    public override getDefaults(): Record<string, unknown> {
        return {
            ...super.getDefaults(),
            rowCount: 1,
            columnCount: 1
        };
    }

    public render(context: ControlContext): FormNode {
        const props: Record<string, unknown> = {
            rowCount: this.rowCount,
            columnCount: this.columnCount,
            rowStyles: this.rowStyles,
            columnStyles: this.columnStyles,
            cellPadding: this.cellPadding,
            cellBorderWidth: this.cellBorderWidth,
            className: this.className,
            style: this.style
        };

        return node(ControlKind.tableLayoutPanel, props, ...this.children);
    }

    protected calculateLayout(): LayoutPosition[] {
        // TableLayoutPanel handles its own layout via CSS grid
        return [];
    }
}

/**
 * Table style for row or column
 */
export interface TableStyle {
    sizeType: "absolute" | "percent" | "autoSize";
    size?: number;
}

/**
 * View component - general purpose view container
 */
export class View extends Layout {
    /**
     * View title
     */
    public title?: string;

    constructor(props?: Partial<View>) {
        super(props);
    }

    public render(context: ControlContext): FormNode {
        const props: Record<string, unknown> = {
            title: this.title,
            className: this.className,
            style: this.style
        };

        return node(ControlKind.view, props, ...this.children);
    }

    protected calculateLayout(): LayoutPosition[] {
        return [];
    }
}

/**
 * Dock component - docking container
 */
export class Dock extends Layout {
    /**
     * Dock fill mode
     */
    public fill: "none" | "fill" = "fill";

    constructor(props?: Partial<Dock>) {
        super(props);
    }

    public override getDefaults(): Record<string, unknown> {
        return {
            ...super.getDefaults(),
            fill: "fill"
        };
    }

    public render(context: ControlContext): FormNode {
        const props: Record<string, unknown> = {
            fill: this.fill,
            className: this.className,
            style: this.style
        };

        return node(ControlKind.dock, props, ...this.children);
    }

    protected calculateLayout(): LayoutPosition[] {
        return [];
    }
}
