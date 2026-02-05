import { Control } from "./Control";

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