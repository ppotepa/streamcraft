import { Container } from "./Container";
import type { FormNode } from "../core";
import type { ControlContext } from "../controls/types";
import { ControlKind } from "../controlKinds";
import { node } from "../core";

/**
 * Window component - a top-level draggable, resizable container.
 */
export class Window extends Container {
    /**
     * Window title displayed in title bar
     */
    public title?: string;

    /**
     * Whether the window can be dragged
     */
    public draggable: boolean = true;

    /**
     * Whether the window can be closed
     */
    public closable: boolean = true;

    /**
     * Whether the window can be minimized
     */
    public minimizable: boolean = true;

    /**
     * Whether the window can be maximized
     */
    public maximizable: boolean = true;

    /**
     * Whether the window is currently minimized
     */
    public minimized: boolean = false;

    /**
     * Whether the window is currently maximized
     */
    public maximized: boolean = false;

    /**
     * Window position
     */
    public position?: { x: number; y: number };

    /**
     * Window size
     */
    public size?: { width: number; height: number };

    /**
     * Whether this is a modal dialog
     */
    public modal: boolean = false;

    /**
     * Z-index for window stacking
     */
    public zIndex?: number;

    /**
     * Close event handler name
     */
    public onClose?: string;

    constructor(props?: Partial<Window>) {
        super(props);
    }

    public override getDefaults(): Record<string, unknown> {
        return {
            ...super.getDefaults(),
            draggable: true,
            closable: true,
            minimizable: true,
            maximizable: true,
            minimized: false,
            maximized: false,
            modal: false
        };
    }

    public render(context: ControlContext): FormNode {
        const props: Record<string, unknown> = {
            title: this.title,
            draggable: this.draggable,
            close: this.closable,
            minimize: this.minimizable,
            maximize: this.maximizable,
            dialog: this.modal,
            className: this.className,
            style: this.style,
            onClose: this.onClose
        };

        if (this.position) {
            // Position will be handled by style
        }

        if (this.size) {
            // Size will be handled by style
        }

        return node(ControlKind.window, props, ...this.children);
    }

    /**
     * Close the window
     */
    public close(): void {
        if (this.closable) {
            this.emit("close", {});
        }
    }

    /**
     * Minimize the window
     */
    public minimize(): void {
        if (this.minimizable) {
            this.minimized = true;
            this.maximized = false;
            this.emit("minimize", {});
        }
    }

    /**
     * Maximize the window
     */
    public maximize(): void {
        if (this.maximizable) {
            this.maximized = true;
            this.minimized = false;
            this.emit("maximize", {});
        }
    }

    /**
     * Restore the window to normal size
     */
    public restore(): void {
        this.minimized = false;
        this.maximized = false;
        this.emit("restore", {});
    }

    /**
     * Bring window to front
     */
    public bringToFront(): void {
        this.emit("bringToFront", {});
    }
}
