import { Component } from "./Component";
import type { ControlContext } from "../controls/types";

/**
 * Abstract base class for interactive control components.
 * Provides common functionality for user input, focus, validation, and data binding.
 */
export abstract class Control extends Component {
    /**
     * Whether the control currently has focus
     */
    public focused: boolean = false;

    /**
     * Tab order index for keyboard navigation
     */
    public tabIndex?: number;

    /**
     * Whether the control is read-only
     */
    public readOnly: boolean = false;

    /**
     * Placeholder text for empty controls
     */
    public placeholder?: string;

    /**
     * Tooltip text shown on hover
     */
    public tooltip?: string;

    /**
     * Data binding path for two-way binding
     */
    public binding?: string;

    /**
     * Current value of the control
     */
    protected value?: any;

    /**
     * Validation rules
     */
    protected validationRules: ValidationRule[] = [];

    /**
     * Validation error messages
     */
    protected validationErrors: string[] = [];

    /**
     * Whether the control has been touched/interacted with
     */
    public touched: boolean = false;

    /**
     * Whether the control's value is valid
     */
    public isValid: boolean = true;

    constructor(props?: Partial<Control>) {
        super(props);
    }

    public override getDefaults(): Record<string, unknown> {
        return {
            ...super.getDefaults(),
            focused: false,
            readOnly: false,
            touched: false,
            isValid: true
        };
    }

    /**
     * Get the current value
     */
    public getValue(): any {
        return this.value;
    }

    /**
     * Set the value and trigger validation
     */
    public setValue(newValue: any): void {
        const oldValue = this.value;
        this.value = newValue;
        this.touched = true;

        this.validateValue();

        this.emit("change", { value: newValue, oldValue });
    }

    /**
     * Add a validation rule
     */
    public addValidationRule(rule: ValidationRule): this {
        this.validationRules.push(rule);
        return this;
    }

    /**
     * Validate the current value against all rules
     */
    public validateValue(): boolean {
        this.validationErrors = [];

        for (const rule of this.validationRules) {
            const result = rule.validate(this.value);
            if (!result.valid) {
                this.validationErrors.push(result.message ?? "Validation failed");
            }
        }

        this.isValid = this.validationErrors.length === 0;
        this.emit("validation", { valid: this.isValid, errors: this.validationErrors });

        return this.isValid;
    }

    /**
     * Get validation errors
     */
    public getValidationErrors(): string[] {
        return [...this.validationErrors];
    }

    /**
     * Focus the control
     */
    public focus(): void {
        this.focused = true;
        this.emit("focus", {});
    }

    /**
     * Blur (unfocus) the control
     */
    public blur(): void {
        this.focused = false;
        this.touched = true;
        this.emit("blur", {});
    }

    /**
     * Reset the control to its initial state
     */
    public reset(): void {
        this.value = undefined;
        this.touched = false;
        this.isValid = true;
        this.validationErrors = [];
        this.emit("reset", {});
    }

    /**
     * Get control style with focus and validation states
     */
    protected getControlStyle(): Record<string, unknown> {
        const style: Record<string, unknown> = {};

        if (this.focused) {
            style.outline = "2px solid #0078d4";
        }

        if (!this.isValid && this.touched) {
            style.borderColor = "#d13438";
        }

        if (this.readOnly) {
            style.cursor = "not-allowed";
            style.opacity = "0.6";
        }

        return style;
    }
}

/**
 * Validation rule interface
 */
export interface ValidationRule {
    name: string;
    validate: (value: any) => ValidationResult;
}

/**
 * Validation result
 */
export interface ValidationResult {
    valid: boolean;
    message?: string;
}
