import { Control } from "./Control";
import type { FormNode } from "../core";
import type { ControlContext } from "../controls/types";
import { ControlKind } from "../controlKinds";
import { node } from "../core";

/**
 * TrackBar component - slider control
 */
export class TrackBar extends Control {
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
     * Step increment
     */
    public step: number = 1;

    /**
     * Tick frequency (0 = no ticks)
     */
    public tickFrequency: number = 0;

    /**
     * Orientation
     */
    public orientation: "horizontal" | "vertical" = "horizontal";

    /**
     * Whether to show value label
     */
    public showValue: boolean = false;

    /**
     * Change event handler name
     */
    public onChange?: string;

    constructor(props?: Partial<TrackBar>) {
        super(props);
    }

    public override getDefaults(): Record<string, unknown> {
        return {
            ...super.getDefaults(),
            value: 0,
            minimum: 0,
            maximum: 100,
            step: 1,
            tickFrequency: 0,
            orientation: "horizontal",
            showValue: false
        };
    }

    public render(context: ControlContext): FormNode {
        const props: Record<string, unknown> = {
            value: this.value,
            minimum: this.minimum,
            maximum: this.maximum,
            step: this.step,
            tickFrequency: this.tickFrequency,
            orientation: this.orientation,
            showValue: this.showValue,
            disabled: !this.enabled,
            onChange: this.onChange,
            className: this.className,
            style: this.style
        };

        return node(ControlKind.trackBar, props, ...this.children);
    }

    public override setValue(newValue: number): void {
        // Snap to step
        const steppedValue = Math.round((newValue - this.minimum) / this.step) * this.step + this.minimum;
        const clampedValue = Math.max(this.minimum, Math.min(this.maximum, steppedValue));
        const oldValue = this.value;
        this.value = clampedValue;
        this.emit("change", { value: clampedValue, oldValue });
    }
}