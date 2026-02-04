import { Control } from "./Control";
import type { FormNode } from "../core";
import type { ControlContext } from "../controls/types";
import { ControlKind } from "../controlKinds";
import { node } from "../core";

/**
 * ListBox component - multi-select list control
 */
export class ListBox extends Control {
    /**
     * Available items
     */
    public items: ListBoxItem[] = [];

    /**
     * Selected item indices (for multi-select)
     */
    public selectedIndices: number[] = [];

    /**
     * Whether multiple items can be selected
     */
    public multiSelect: boolean = false;

    /**
     * Number of visible rows
     */
    public visibleRows?: number;

    /**
     * Change event handler name
     */
    public onChange?: string;

    constructor(props?: Partial<ListBox>) {
        super(props);
    }

    public override getDefaults(): Record<string, unknown> {
        return {
            ...super.getDefaults(),
            multiSelect: false
        };
    }

    public render(context: ControlContext): FormNode {
        const props: Record<string, unknown> = {
            items: this.items.map((item) => item.text),
            selectedIndices: this.selectedIndices,
            multiSelect: this.multiSelect,
            disabled: !this.enabled,
            onChange: this.onChange,
            className: this.className,
            style: this.style
        };

        if (this.visibleRows) {
            props.size = this.visibleRows;
        }

        return node(ControlKind.listBox, props, ...this.children);
    }

    /**
     * Get selected items
     */
    public getSelectedItems(): ListBoxItem[] {
        return this.selectedIndices
            .filter((index) => index >= 0 && index < this.items.length)
            .map((index) => this.items[index]);
    }

    /**
     * Select an item by index
     */
    public selectItem(index: number, add: boolean = false): void {
        if (index < 0 || index >= this.items.length) return;

        if (!this.multiSelect || !add) {
            this.selectedIndices = [index];
        } else {
            if (!this.selectedIndices.includes(index)) {
                this.selectedIndices.push(index);
            }
        }

        this.emit("change", { selectedIndices: [...this.selectedIndices] });
    }

    /**
     * Deselect an item by index
     */
    public deselectItem(index: number): void {
        const pos = this.selectedIndices.indexOf(index);
        if (pos !== -1) {
            this.selectedIndices.splice(pos, 1);
            this.emit("change", { selectedIndices: [...this.selectedIndices] });
        }
    }

    /**
     * Clear all selections
     */
    public clearSelection(): void {
        this.selectedIndices = [];
        this.emit("change", { selectedIndices: [] });
    }

    public override getValue(): any {
        if (this.multiSelect) {
            return this.getSelectedItems().map((item) => item.value ?? item.text);
        } else {
            const items = this.getSelectedItems();
            return items.length > 0 ? (items[0].value ?? items[0].text) : null;
        }
    }
}

/**
 * ListBox item
 */
export interface ListBoxItem {
    text: string;
    value?: any;
    icon?: string;
}