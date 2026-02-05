import { InputControl } from "./InputControl";
import type { FormNode } from "../core";
import type { ControlContext } from "../controls/types";
import { ControlKind } from "../controlKinds";
import { node } from "../core";

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