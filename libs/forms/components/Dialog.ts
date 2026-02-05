import { Window } from "./Window";

/**
 * Dialog component - a modal window
 */
export class Dialog extends Window {
    /**
     * Whether dialog has OK button
     */
    public showOk: boolean = true;

    /**
     * Whether dialog has Cancel button
     */
    public showCancel: boolean = true;

    /**
     * OK button text
     */
    public okText: string = "OK";

    /**
     * Cancel button text
     */
    public cancelText: string = "Cancel";

    /**
     * Result of dialog interaction
     */
    public result?: "ok" | "cancel" | "close";

    constructor(props?: Partial<Dialog>) {
        super(props);
        this.modal = true;
        this.minimizable = false;
        this.maximizable = false;
    }

    public override getDefaults(): Record<string, unknown> {
        return {
            ...super.getDefaults(),
            modal: true,
            minimizable: false,
            maximizable: false,
            showOk: true,
            showCancel: true,
            okText: "OK",
            cancelText: "Cancel"
        };
    }

    /**
     * Handle OK button click
     */
    public ok(): void {
        this.result = "ok";
        this.emit("ok", {});
        this.close();
    }

    /**
     * Handle Cancel button click
     */
    public cancel(): void {
        this.result = "cancel";
        this.emit("cancel", {});
        this.close();
    }
}