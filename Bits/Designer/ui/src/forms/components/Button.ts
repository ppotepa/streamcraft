import { Control } from "./Control";
import type { FormNode } from "../core";
import type { ControlContext } from "../controls/types";
import { ControlKind } from "../controlKinds";
import { node, element } from "../core";

/**
 * Button component - clickable button control
 */
export class Button extends Control {
    /**
     * Button text/label
     */
    public text?: string;

    /**
     * Button icon (if any)
     */
    public icon?: string;

    /**
     * Icon position: left, right
     */
    public iconPosition: "left" | "right" = "left";

    /**
     * Button variant/style
     */
    public variant: "default" | "primary" | "secondary" | "danger" | "success" = "default";

    /**
     * Button size
     */
    public size: "small" | "medium" | "large" = "medium";

    /**
     * Whether button fills available width
     */
    public fullWidth: boolean = false;

    /**
     * Click event handler name
     */
    public onClick?: string;

    constructor(props?: Partial<Button>) {
        super(props);
    }

    public override getDefaults(): Record<string, unknown> {
        return {
            ...super.getDefaults(),
            iconPosition: "left",
            variant: "default",
            size: "medium",
            fullWidth: false
        };
    }

    public render(context: ControlContext): FormNode {
        const classNames = ["button", `button-${this.variant}`, `button-${this.size}`];

        if (this.fullWidth) {
            classNames.push("button-full-width");
        }

        if (this.className) {
            classNames.push(this.className);
        }

        const props: Record<string, unknown> = {
            className: classNames.join(" "),
            disabled: !this.enabled,
            onClick: this.onClick,
            style: this.style
        };

        const content: (FormNode | string)[] = [];

        if (this.icon && this.iconPosition === "left") {
            content.push(element("span", { className: "button-icon button-icon-left" }, this.icon));
        }

        if (this.text) {
            content.push(element("span", { className: "button-text" }, this.text));
        }

        if (this.icon && this.iconPosition === "right") {
            content.push(element("span", { className: "button-icon button-icon-right" }, this.icon));
        }

        return node(ControlKind.button, props, ...content, ...this.children);
    }

    /**
     * Programmatically click the button
     */
    public click(): void {
        if (this.enabled && !this.readOnly) {
            this.emit("click", {});
        }
    }
}

/**
 * ButtonControl - Abstract base for button-like controls (checkboxes, radio buttons)
 */
export abstract class ButtonControl extends Control {
    /**
     * Label text
     */
    public label?: string;

    /**
     * Whether the control is checked
     */
    public checked: boolean = false;

    constructor(props?: Partial<ButtonControl>) {
        super(props);
    }

    public override getDefaults(): Record<string, unknown> {
        return {
            ...super.getDefaults(),
            checked: false
        };
    }

    /**
     * Toggle checked state
     */
    public toggle(): void {
        if (this.enabled && !this.readOnly) {
            this.setChecked(!this.checked);
        }
    }

    /**
     * Set checked state
     */
    public setChecked(value: boolean): void {
        const oldValue = this.checked;
        this.checked = value;
        this.emit("change", { checked: value, oldChecked: oldValue });
    }

    public override getValue(): boolean {
        return this.checked;
    }

    public override setValue(newValue: any): void {
        this.setChecked(Boolean(newValue));
    }
}

/**
 * CheckBox component
 */
export class CheckBox extends ButtonControl {
    /**
     * Change event handler name
     */
    public onChange?: string;

    constructor(props?: Partial<CheckBox>) {
        super(props);
    }

    public render(context: ControlContext): FormNode {
        const props: Record<string, unknown> = {
            checked: this.checked,
            disabled: !this.enabled,
            onChange: this.onChange,
            className: this.className,
            style: this.style
        };

        return node(
            ControlKind.checkBox,
            props,
            this.label ? element("span", { className: "checkbox-label" }, this.label) : null,
            ...this.children
        );
    }
}

/**
 * RadioButton component
 */
export class RadioButton extends ButtonControl {
    /**
     * Radio button group name (for mutual exclusivity)
     */
    public group?: string;

    /**
     * Value when this radio is selected
     */
    public radioValue?: any;

    /**
     * Change event handler name
     */
    public onChange?: string;

    constructor(props?: Partial<RadioButton>) {
        super(props);
    }

    public render(context: ControlContext): FormNode {
        const props: Record<string, unknown> = {
            checked: this.checked,
            disabled: !this.enabled,
            group: this.group,
            value: this.radioValue,
            onChange: this.onChange,
            className: this.className,
            style: this.style
        };

        return node(
            ControlKind.radioButton,
            props,
            this.label ? element("span", { className: "radio-label" }, this.label) : null,
            ...this.children
        );
    }
}
