import { Component } from "./Component";
import type { FormNode, FormChild } from "../core";
import type { ControlContext } from "../controls/types";

/**
 * Abstract base class for container components that can hold other components.
 * Provides common functionality for layout, padding, scrolling, and child management.
 */
export abstract class Container extends Component {
    /**
     * Padding around the container content
     */
    public padding?: number | string;

    /**
     * Whether the container has a border
     */
    public border: boolean = false;

    /**
     * Border color
     */
    public borderColor?: string;

    /**
     * Border width in pixels
     */
    public borderWidth?: number;

    /**
     * Whether the container content can scroll
     */
    public scrollable: boolean = false;

    /**
     * Scroll behavior: auto, horizontal, vertical, both
     */
    public scrollBehavior: "auto" | "horizontal" | "vertical" | "both" = "auto";

    /**
     * Background color
     */
    public backgroundColor?: string;

    /**
     * Whether the container can be collapsed
     */
    public collapsible: boolean = false;

    /**
     * Current collapsed state
     */
    public collapsed: boolean = false;

    /**
     * Minimum width in pixels
     */
    public minWidth?: number;

    /**
     * Minimum height in pixels
     */
    public minHeight?: number;

    /**
     * Maximum width in pixels
     */
    public maxWidth?: number;

    /**
     * Maximum height in pixels
     */
    public maxHeight?: number;

    constructor(props?: Partial<Container>) {
        super(props);
    }

    public override getDefaults(): Record<string, unknown> {
        return {
            ...super.getDefaults(),
            border: false,
            scrollable: false,
            scrollBehavior: "auto",
            collapsible: false,
            collapsed: false
        };
    }

    public override validate(): string[] {
        const errors = super.validate();

        if (this.minWidth && this.maxWidth && this.minWidth > this.maxWidth) {
            errors.push("minWidth cannot be greater than maxWidth");
        }

        if (this.minHeight && this.maxHeight && this.minHeight > this.maxHeight) {
            errors.push("minHeight cannot be greater than maxHeight");
        }

        return errors;
    }

    /**
     * Toggle collapsed state
     */
    public toggleCollapsed(): void {
        if (this.collapsible) {
            this.collapsed = !this.collapsed;
            this.emit("collapse", { collapsed: this.collapsed });
        }
    }

    /**
     * Get container style properties
     */
    protected getContainerStyle(): Record<string, unknown> {
        const style: Record<string, unknown> = {};

        if (this.padding) {
            style.padding = typeof this.padding === "number" ? `${this.padding}px` : this.padding;
        }

        if (this.border) {
            style.border = `${this.borderWidth ?? 1}px solid ${this.borderColor ?? "#ccc"}`;
        }

        if (this.backgroundColor) {
            style.backgroundColor = this.backgroundColor;
        }

        if (this.scrollable) {
            if (this.scrollBehavior === "horizontal") {
                style.overflowX = "auto";
                style.overflowY = "hidden";
            } else if (this.scrollBehavior === "vertical") {
                style.overflowX = "hidden";
                style.overflowY = "auto";
            } else if (this.scrollBehavior === "both") {
                style.overflow = "auto";
            } else {
                style.overflow = "auto";
            }
        }

        if (this.minWidth) {
            style.minWidth = `${this.minWidth}px`;
        }

        if (this.minHeight) {
            style.minHeight = `${this.minHeight}px`;
        }

        if (this.maxWidth) {
            style.maxWidth = `${this.maxWidth}px`;
        }

        if (this.maxHeight) {
            style.maxHeight = `${this.maxHeight}px`;
        }

        return style;
    }

    /**
     * Render children with optional filtering
     */
    protected renderChildren(context: ControlContext, filter?: (child: FormChild) => boolean): FormChild[] {
        let childrenToRender = this.children;

        if (filter) {
            childrenToRender = childrenToRender.filter(filter);
        }

        // Convert Component instances to FormNodes
        return childrenToRender.map((child) => {
            if (child && typeof child === 'object' && 'render' in child && typeof child.render === 'function') {
                return (child as any).render(context);
            }
            return child;
        });
    }
}
