import { Control } from "./Control";
import type { FormNode } from "../core";
import type { ControlContext } from "../controls/types";
import { ControlKind } from "../controlKinds";
import { node, element } from "../core";

/**
 * Abstract base class for text input controls
 */
export abstract class InputControl extends Control {
    /**
     * Maximum length of input
     */
    public maxLength?: number;

    /**
     * Minimum length of input
     */
    public minLength?: number;

    /**
     * Input pattern for validation (regex)
     */
    public pattern?: string;

    /**
     * Whether input is required
     */
    public required: boolean = false;

    /**
     * Autocomplete hint
     */
    public autocomplete?: string;

    constructor(props?: Partial<InputControl>) {
        super(props);
    }

    public override validate(): string[] {
        const errors = super.validate();

        if (this.required && !this.value) {
            errors.push("This field is required");
        }

        if (this.minLength && this.value && String(this.value).length < this.minLength) {
            errors.push(`Minimum length is ${this.minLength} characters`);
        }

        if (this.maxLength && this.value && String(this.value).length > this.maxLength) {
            errors.push(`Maximum length is ${this.maxLength} characters`);
        }

        if (this.pattern && this.value) {
            const regex = new RegExp(this.pattern);
            if (!regex.test(String(this.value))) {
                errors.push("Value does not match required pattern");
            }
        }

        return errors;
    }
}

/**
 * TextBox component - single or multi-line text input
 */
export class TextBox extends InputControl {
    /**
     * Whether this is a multi-line text box
     */
    public multiline: boolean = false;

    /**
     * Number of rows (for multiline)
     */
    public rows?: number;

    /**
     * Text input type
     */
    public inputType: "text" | "password" | "email" | "url" | "tel" | "number" = "text";

    /**
     * Change event handler name
     */
    public onChange?: string;

    /**
     * Input event handler name (real-time)
     */
    public onInput?: string;

    constructor(props?: Partial<TextBox>) {
        super(props);
    }

    public override getDefaults(): Record<string, unknown> {
        return {
            ...super.getDefaults(),
            multiline: false,
            inputType: "text"
        };
    }

    public render(context: ControlContext): FormNode {
        const props: Record<string, unknown> = {
            type: this.inputType,
            value: this.value ?? "",
            placeholder: this.placeholder,
            disabled: !this.enabled,
            readOnly: this.readOnly,
            required: this.required,
            maxLength: this.maxLength,
            minLength: this.minLength,
            pattern: this.pattern,
            autocomplete: this.autocomplete,
            onChange: this.onChange,
            onInput: this.onInput,
            className: this.className,
            style: this.style,
            tabIndex: this.tabIndex
        };

        if (this.multiline && this.rows) {
            props.rows = this.rows;
        }

        return node(ControlKind.textBox, props, ...this.children);
    }
}

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

/**
 * ListBox component - list selection control
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
