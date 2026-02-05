import { Indicator } from "./Indicator";
import type { FormNode } from "../core";
import type { ControlContext } from "../controls/types";
import { ControlKind } from "../controlKinds";
import { node } from "../core";

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