import { Control } from "./Control";
import type { FormNode } from "../core";
import type { ControlContext } from "../controls/types";
import { ControlKind } from "../controlKinds";
import { node } from "../core";

/**
 * ComboBox component - dropdown selection control
 */
export class ComboBox extends Control {
    /**
     * Available options
     */
    public items: ComboBoxItem[] = [];

    /**
     * Selected item index
     */
    public selectedIndex: number = -1;

    /**
     * Whether user can type custom values
     */
    public editable: boolean = false;

    /**
     * Change event handler name
     */
    public onChange?: string;

    constructor(props?: Partial<ComboBox>) {
        super(props);
    }

    public override getDefaults(): Record<string, unknown> {
        return {
            ...super.getDefaults(),
            selectedIndex: -1,
            editable: false
        };
    }

    public render(context: ControlContext): FormNode {
        const props: Record<string, unknown> = {
            items: this.items.map((item) => item.text),
            selectedIndex: this.selectedIndex,
            disabled: !this.enabled,
            readOnly: this.readOnly,
            onChange: this.onChange,
            className: this.className,
            style: this.style
        };

        return node(ControlKind.comboBox, props, ...this.children);
    }

    /**
     * Get selected item
     */
    public getSelectedItem(): ComboBoxItem | null {
        if (this.selectedIndex >= 0 && this.selectedIndex < this.items.length) {
            return this.items[this.selectedIndex];
        }
        return null;
    }

    /**
     * Set selected item by index
     */
    public setSelectedIndex(index: number): void {
        if (index >= -1 && index < this.items.length) {
            const oldIndex = this.selectedIndex;
            this.selectedIndex = index;
            this.emit("change", { selectedIndex: index, oldIndex });
        }
    }

    /**
     * Add an item
     */
    public addItem(item: ComboBoxItem): void {
        this.items.push(item);
    }

    /**
     * Remove an item
     */
    public removeItem(index: number): void {
        if (index >= 0 && index < this.items.length) {
            this.items.splice(index, 1);
            if (this.selectedIndex === index) {
                this.selectedIndex = -1;
            } else if (this.selectedIndex > index) {
                this.selectedIndex--;
            }
        }
    }

    public override getValue(): any {
        const selected = this.getSelectedItem();
        return selected?.value ?? selected?.text ?? null;
    }

    public override setValue(newValue: any): void {
        const index = this.items.findIndex((item) => item.value === newValue || item.text === newValue);
        this.setSelectedIndex(index);
    }
}

/**
 * ComboBox item
 */
export interface ComboBoxItem {
    text: string;
    value?: any;
    icon?: string;
}