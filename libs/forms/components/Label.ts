import { Control } from "./Control";
import type { FormNode } from "../core";
import type { ControlContext } from "../controls/types";
import { ControlKind } from "../controlKinds";
import { node } from "../core";

/**
 * Label component - non-interactive text display
 */
export class Label extends Control {
    /**
     * Label text
     */
    public text?: string;

    /**
     * Text alignment
     */
    public textAlign: "left" | "center" | "right" = "left";

    /**
     * Whether to wrap text
     */
    public wrap: boolean = true;

    /**
     * Font size
     */
    public fontSize?: number;

    /**
     * Font weight
     */
    public fontWeight?: "normal" | "bold" | "lighter" | "bolder";

    /**
     * Text color
     */
    public color?: string;

    constructor(props?: Partial<Label>) {
        super(props);
        this.enabled = true; // Labels are always "enabled" but not interactive
    }

    public override getDefaults(): Record<string, unknown> {
        return {
            ...super.getDefaults(),
            textAlign: "left",
            wrap: true
        };
    }

    public render(context: ControlContext): FormNode {
        const style: Record<string, unknown> = {};

        if (this.textAlign) {
            style.textAlign = this.textAlign;
        }

        if (this.fontSize) {
            style.fontSize = `${this.fontSize}px`;
        }

        if (this.fontWeight) {
            style.fontWeight = this.fontWeight;
        }

        if (this.color) {
            style.color = this.color;
        }

        if (!this.wrap) {
            style.whiteSpace = "nowrap";
            style.overflow = "hidden";
            style.textOverflow = "ellipsis";
        }

        const props: Record<string, unknown> = {
            className: this.className,
            style: typeof this.style === 'object' ? { ...style, ...(this.style as Record<string, unknown>) } : (this.style ?? style)
        };

        return node(ControlKind.label, props, this.text ?? "", ...this.children);
    }
}