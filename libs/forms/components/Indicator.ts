import { Control } from "./Control";
import type { FormNode } from "../core";
import type { ControlContext } from "../controls/types";
import { ControlKind } from "../controlKinds";
import { node } from "../core";

/**
 * Abstract base class for indicator controls (non-interactive displays)
 */
export abstract class Indicator extends Control {
    constructor(props?: Partial<Indicator>) {
        super(props);
        this.enabled = true; // Indicators are always "enabled"
    }
}

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

/**
 * StatusBar component - displays status information
 */
export class StatusBar extends Indicator {
    /**
     * Status segments
     */
    public segments: StatusBarSegment[] = [];

    /**
     * Whether to show resize grip
     */
    public showGrip: boolean = true;

    constructor(props?: Partial<StatusBar>) {
        super(props);
    }

    public override getDefaults(): Record<string, unknown> {
        return {
            ...super.getDefaults(),
            showGrip: true
        };
    }

    public render(context: ControlContext): FormNode {
        const props: Record<string, unknown> = {
            segments: this.segments.map((seg) => seg.text),
            showGrip: this.showGrip,
            className: this.className,
            style: this.style
        };

        return node(ControlKind.statusBar, props, ...this.children);
    }

    /**
     * Add a segment
     */
    public addSegment(segment: StatusBarSegment): void {
        this.segments.push(segment);
    }

    /**
     * Update a segment by index
     */
    public updateSegment(index: number, text: string): void {
        if (index >= 0 && index < this.segments.length) {
            this.segments[index].text = text;
        }
    }

    /**
     * Clear all segments
     */
    public clearSegments(): void {
        this.segments = [];
    }
}

/**
 * Status bar segment
 */
export interface StatusBarSegment {
    text: string;
    width?: number | "auto";
    align?: "left" | "center" | "right";
    icon?: string;
}

/**
 * DiagnosticsPanel component - displays diagnostics/logs
 */
export class DiagnosticsPanel extends Indicator {
    /**
     * Diagnostic entries
     */
    public entries: DiagnosticEntry[] = [];

    /**
     * Maximum number of entries to keep
     */
    public maxEntries?: number;

    /**
     * Whether to auto-scroll to new entries
     */
    public autoScroll: boolean = true;

    /**
     * Filter by level
     */
    public filterLevel?: "error" | "warning" | "info" | "debug";

    constructor(props?: Partial<DiagnosticsPanel>) {
        super(props);
    }

    public override getDefaults(): Record<string, unknown> {
        return {
            ...super.getDefaults(),
            autoScroll: true
        };
    }

    public render(context: ControlContext): FormNode {
        const filteredEntries = this.filterLevel
            ? this.entries.filter((entry) => entry.level === this.filterLevel)
            : this.entries;

        const props: Record<string, unknown> = {
            entries: filteredEntries,
            autoScroll: this.autoScroll,
            className: this.className,
            style: this.style
        };

        return node(ControlKind.diagnosticsPanel, props, ...this.children);
    }

    /**
     * Add a diagnostic entry
     */
    public addEntry(entry: DiagnosticEntry): void {
        this.entries.push(entry);

        if (this.maxEntries && this.entries.length > this.maxEntries) {
            this.entries.shift();
        }

        this.emit("entryAdded", { entry });
    }

    /**
     * Clear all entries
     */
    public clearEntries(): void {
        this.entries = [];
        this.emit("cleared", {});
    }

    /**
     * Get entries by level
     */
    public getEntriesByLevel(level: DiagnosticEntry["level"]): DiagnosticEntry[] {
        return this.entries.filter((entry) => entry.level === level);
    }
}

/**
 * Diagnostic entry
 */
export interface DiagnosticEntry {
    level: "error" | "warning" | "info" | "debug";
    message: string;
    timestamp?: Date;
    source?: string;
    data?: any;
}
