import { ButtonControl } from "./ButtonControl";
import type { FormNode } from "../core";
import type { ControlContext } from "../controls/types";
import { ControlKind } from "../controlKinds";
import { node, element } from "../core";

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