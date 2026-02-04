import { Indicator } from "./Indicator";
import type { FormNode } from "../core";
import type { ControlContext } from "../controls/types";
import { ControlKind } from "../controlKinds";
import { node } from "../core";

/**
 * ProgressBar component - displays progress/completion
 */
export class ProgressBar extends Indicator {
    /**
     * Current value
     */
    public override value: number = 0;

    /**
     * Minimum value
     */
    public minimum: number = 0;

    /**
     * Maximum value
     */
    public maximum: number = 100;

    /**
     * Progress bar style
     */
    public progressStyle: "continuous" | "blocks" | "marquee" = "continuous";

    /**
     * Whether to show percentage text
     */
    public showText: boolean = false;

    /**
     * Custom text format (e.g., "{0}%", "{0} of {1}")
     */
    public textFormat?: string;

    /**
     * Color of progress bar
     */
    public color?: string;

    constructor(props?: Partial<ProgressBar>) {
        super(props);
    }

    public override getDefaults(): Record<string, unknown> {
        return {
            ...super.getDefaults(),
            value: 0,
            minimum: 0,
            maximum: 100,
            progressStyle: "continuous",
            showText: false
        };
    }

    public render(context: ControlContext): FormNode {
        const props: Record<string, unknown> = {
            value: this.value,
            minimum: this.minimum,
            maximum: this.maximum,
            progressStyle: this.progressStyle,
            showText: this.showText,
            textFormat: this.textFormat,
            color: this.color,
            className: this.className,
            style: this.style
        };

        return node(ControlKind.progressBar, props, ...this.children);
    }

    /**
     * Get progress percentage (0-100)
     */
    public getPercentage(): number {
        const range = this.maximum - this.minimum;
        if (range === 0) return 0;
        return ((this.value - this.minimum) / range) * 100;
    }

    /**
     * Set progress by percentage (0-100)
     */
    public setPercentage(percent: number): void {
        const range = this.maximum - this.minimum;
        this.setValue(this.minimum + (percent / 100) * range);
    }

    /**
     * Increment progress
     */
    public increment(amount: number = 1): void {
        this.setValue(Math.min(this.maximum, this.value + amount));
    }

    public override setValue(newValue: number): void {
        const clampedValue = Math.max(this.minimum, Math.min(this.maximum, newValue));
        const oldValue = this.value;
        this.value = clampedValue;
        this.emit("change", { value: clampedValue, oldValue });
    }
}