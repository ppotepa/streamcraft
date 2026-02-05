import { Component } from "./Component";
import type { FormNode } from "../core";
import type { ControlContext } from "../controls/types";
import { ControlKind } from "../controlKinds";
import { node } from "../core";

/**
 * Toolbox component - tool palette for designers
 */
export class Toolbox extends Component {
    /**
     * Toolbox title
     */
    public title?: string;

    /**
     * Available tools
     */
    public tools: string[] = [];

    /**
     * Currently active tool
     */
    public activeTool?: string;

    /**
     * Tool selection handler
     */
    public onSelect?: string;

    constructor(props?: Partial<Toolbox>) {
        super(props);
    }

    public render(context: ControlContext): FormNode {
        const props: Record<string, unknown> = {
            title: this.title,
            tools: this.tools,
            activeTool: this.activeTool,
            onSelect: this.onSelect,
            className: this.className,
            style: this.style
        };

        return node(ControlKind.toolbox, props, ...this.children);
    }

    /**
     * Select a tool
     */
    public selectTool(tool: string): void {
        if (this.tools.includes(tool)) {
            const oldTool = this.activeTool;
            this.activeTool = tool;
            this.emit("select", { tool, oldTool });
        }
    }

    /**
     * Add a tool
     */
    public addTool(tool: string): void {
        if (!this.tools.includes(tool)) {
            this.tools.push(tool);
        }
    }

    /**
     * Remove a tool
     */
    public removeTool(tool: string): void {
        const index = this.tools.indexOf(tool);
        if (index !== -1) {
            this.tools.splice(index, 1);
            if (this.activeTool === tool) {
                this.activeTool = undefined;
            }
        }
    }

    /**
     * Clear active tool selection
     */
    public clearSelection(): void {
        this.activeTool = undefined;
        this.emit("select", { tool: undefined });
    }
}

/**
 * MessageBox component - dialog for displaying messages
 */
export class MessageBox extends Component {
    /**
     * Message title
     */
    public title?: string;

    /**
     * Message text
     */
    public message?: string;

    /**
     * Message type
     */
    public messageType: "info" | "warning" | "error" | "question" = "info";

    /**
     * Buttons to show
     */
    public buttons: MessageBoxButtons = "ok";

    /**
     * Default button
     */
    public defaultButton?: "ok" | "cancel" | "yes" | "no";

    /**
     * Result of user interaction
     */
    public result?: "ok" | "cancel" | "yes" | "no";

    constructor(props?: Partial<MessageBox>) {
        super(props);
    }

    public override getDefaults(): Record<string, unknown> {
        return {
            ...super.getDefaults(),
            messageType: "info",
            buttons: "ok"
        };
    }

    public render(context: ControlContext): FormNode {
        const props: Record<string, unknown> = {
            title: this.title,
            message: this.message,
            messageType: this.messageType,
            buttons: this.buttons,
            defaultButton: this.defaultButton,
            className: this.className,
            style: this.style
        };

        return node(ControlKind.messageBox, props, ...this.children);
    }

    /**
     * Show the message box
     */
    public show(): Promise<MessageBoxResult> {
        return new Promise((resolve) => {
            this.on("close", (args: any) => {
                this.result = args.result;
                resolve(args.result);
            });
        });
    }
}

/**
 * MessageBox button configuration
 */
export type MessageBoxButtons = "ok" | "okCancel" | "yesNo" | "yesNoCancel";

/**
 * MessageBox result
 */
export type MessageBoxResult = "ok" | "cancel" | "yes" | "no";

/**
 * SwitchButton component - toggle switch control
 */
export class SwitchButton extends Component {
    /**
     * Whether the switch is on
     */
    public checked: boolean = false;

    /**
     * Label text
     */
    public label?: string;

    /**
     * Label position
     */
    public labelPosition: "left" | "right" = "right";

    /**
     * Whether switch is enabled
     */
    public override enabled: boolean = true;

    /**
     * Change event handler name
     */
    public onChange?: string;

    constructor(props?: Partial<SwitchButton>) {
        super(props);
    }

    public override getDefaults(): Record<string, unknown> {
        return {
            ...super.getDefaults(),
            checked: false,
            labelPosition: "right",
            enabled: true
        };
    }

    public render(context: ControlContext): FormNode {
        const props: Record<string, unknown> = {
            checked: this.checked,
            label: this.label,
            labelPosition: this.labelPosition,
            disabled: !this.enabled,
            onChange: this.onChange,
            className: this.className,
            style: this.style
        };

        return node(ControlKind.switchButton, props, ...this.children);
    }

    /**
     * Toggle switch state
     */
    public toggle(): void {
        if (this.enabled) {
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
}
