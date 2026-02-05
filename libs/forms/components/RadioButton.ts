import { ButtonControl } from "./ButtonControl";
import type { FormNode } from "../core";
import type { ControlContext } from "../controls/types";
import { ControlKind } from "../controlKinds";
import { node, element } from "../core";

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