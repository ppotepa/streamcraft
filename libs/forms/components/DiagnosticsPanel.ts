import { Indicator } from "./Indicator";
import type { FormNode } from "../core";
import type { ControlContext } from "../controls/types";
import { ControlKind } from "../controlKinds";
import { node } from "../core";

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