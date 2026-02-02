import { Container } from "./Container";
import type { FormNode } from "../core";
import type { ControlContext } from "../controls/types";
import { ControlKind } from "../controlKinds";
import { node } from "../core";

/**
 * Panel component - basic container with optional title and controls
 */
export class Panel extends Container {
    /**
     * Panel title
     */
    public title?: string;

    /**
     * Whether panel can be closed
     */
    public closable: boolean = false;

    /**
     * Whether panel can be minimized
     */
    public minimizable: boolean = false;

    /**
     * Whether panel can be maximized
     */
    public maximizable: boolean = false;

    /**
     * Whether panel can be dragged
     */
    public draggable: boolean = false;

    /**
     * Panel dock position
     */
    public dock?: "top" | "bottom" | "left" | "right" | "fill";

    /**
     * Close event handler name
     */
    public onClose?: string;

    constructor(props?: Partial<Panel>) {
        super(props);
    }

    public override getDefaults(): Record<string, unknown> {
        return {
            ...super.getDefaults(),
            closable: false,
            minimizable: false,
            maximizable: false,
            draggable: false
        };
    }

    public render(context: ControlContext): FormNode {
        const props: Record<string, unknown> = {
            title: this.title,
            close: this.closable,
            minimize: this.minimizable,
            maximize: this.maximizable,
            draggable: this.draggable,
            dock: this.dock,
            onClose: this.onClose,
            className: this.className,
            style: this.style
        };

        return node(ControlKind.panel, props, ...this.children);
    }
}

/**
 * GroupBox component - container with border and title
 */
export class GroupBox extends Container {
    /**
     * GroupBox title/legend
     */
    public title?: string;

    constructor(props?: Partial<GroupBox>) {
        super(props);
        this.border = true;
    }

    public override getDefaults(): Record<string, unknown> {
        return {
            ...super.getDefaults(),
            border: true
        };
    }

    public render(context: ControlContext): FormNode {
        const props: Record<string, unknown> = {
            title: this.title,
            className: this.className,
            style: this.style
        };

        return node(ControlKind.groupBox, props, ...this.children);
    }
}

/**
 * PanelContainer component - container for dockable panels
 */
export class PanelContainer extends Container {
    /**
     * Layout orientation
     */
    public orientation: "horizontal" | "vertical" = "horizontal";

    /**
     * Whether panels can be resized
     */
    public resizable: boolean = true;

    constructor(props?: Partial<PanelContainer>) {
        super(props);
    }

    public override getDefaults(): Record<string, unknown> {
        return {
            ...super.getDefaults(),
            orientation: "horizontal",
            resizable: true
        };
    }

    public render(context: ControlContext): FormNode {
        const props: Record<string, unknown> = {
            orientation: this.orientation,
            resizable: this.resizable,
            className: this.className,
            style: this.style
        };

        return node(ControlKind.panelContainer, props, ...this.children);
    }
}

/**
 * SplitContainer component - two-pane container with resizable splitter
 */
export class SplitContainer extends Container {
    /**
     * Orientation of split
     */
    public orientation: "horizontal" | "vertical" = "horizontal";

    /**
     * Splitter position (percentage 0-100)
     */
    public splitterPosition: number = 50;

    /**
     * Minimum size for panel 1
     */
    public panel1MinSize?: number;

    /**
     * Minimum size for panel 2
     */
    public panel2MinSize?: number;

    /**
     * Whether splitter can be moved
     */
    public fixedPanel?: "panel1" | "panel2" | "none";

    constructor(props?: Partial<SplitContainer>) {
        super(props);
    }

    public override getDefaults(): Record<string, unknown> {
        return {
            ...super.getDefaults(),
            orientation: "horizontal",
            splitterPosition: 50,
            fixedPanel: "none"
        };
    }

    public render(context: ControlContext): FormNode {
        const props: Record<string, unknown> = {
            orientation: this.orientation,
            splitterPosition: this.splitterPosition,
            panel1MinSize: this.panel1MinSize,
            panel2MinSize: this.panel2MinSize,
            fixedPanel: this.fixedPanel,
            className: this.className,
            style: this.style
        };

        return node(ControlKind.splitContainer, props, ...this.children);
    }

    /**
     * Set splitter position
     */
    public setSplitterPosition(position: number): void {
        this.splitterPosition = Math.max(0, Math.min(100, position));
        this.emit("splitterMoved", { position: this.splitterPosition });
    }
}

/**
 * TabControl component - tabbed container
 */
export class TabControl extends Container {
    /**
     * Tab pages
     */
    public pages: TabPage[] = [];

    /**
     * Selected tab index
     */
    public selectedIndex: number = 0;

    /**
     * Tab alignment
     */
    public alignment: "top" | "bottom" | "left" | "right" = "top";

    /**
     * Whether tabs can span multiple rows
     */
    public multirows: boolean = false;

    /**
     * Change event handler name
     */
    public onChange?: string;

    constructor(props?: Partial<TabControl>) {
        super(props);
    }

    public override getDefaults(): Record<string, unknown> {
        return {
            ...super.getDefaults(),
            selectedIndex: 0,
            alignment: "top",
            multirows: false
        };
    }

    public render(context: ControlContext): FormNode {
        const props: Record<string, unknown> = {
            selectedIndex: this.selectedIndex,
            alignment: this.alignment,
            multirows: this.multirows,
            onChange: this.onChange,
            className: this.className,
            style: this.style
        };

        // Children should be TabPage components
        return node(ControlKind.tabControl, props, ...this.children);
    }

    /**
     * Get selected tab page
     */
    public getSelectedPage(): TabPage | null {
        if (this.selectedIndex >= 0 && this.selectedIndex < this.pages.length) {
            return this.pages[this.selectedIndex];
        }
        return null;
    }

    /**
     * Select tab by index
     */
    public selectTab(index: number): void {
        if (index >= 0 && index < this.pages.length) {
            const oldIndex = this.selectedIndex;
            this.selectedIndex = index;
            this.emit("change", { selectedIndex: index, oldIndex });
        }
    }

    /**
     * Add a tab page
     */
    public addPage(page: TabPage): void {
        this.pages.push(page);
        this.addChild(page);
    }

    /**
     * Remove a tab page
     */
    public removePage(index: number): void {
        if (index >= 0 && index < this.pages.length) {
            const page = this.pages[index];
            this.pages.splice(index, 1);
            this.removeChild(page);

            if (this.selectedIndex === index && this.pages.length > 0) {
                this.selectedIndex = Math.min(index, this.pages.length - 1);
            }
        }
    }
}

/**
 * TabPage component - individual tab within TabControl
 */
export class TabPage extends Container {
    /**
     * Tab text/title
     */
    public text?: string;

    /**
     * Tab icon
     */
    public icon?: string;

    /**
     * Tooltip for tab
     */
    public tooltip?: string;

    /**
     * Whether tab can be closed
     */
    public closable: boolean = false;

    constructor(props?: Partial<TabPage>) {
        super(props);
    }

    public override getDefaults(): Record<string, unknown> {
        return {
            ...super.getDefaults(),
            closable: false
        };
    }

    public render(context: ControlContext): FormNode {
        const props: Record<string, unknown> = {
            text: this.text,
            icon: this.icon,
            tooltip: this.tooltip,
            closable: this.closable,
            className: this.className,
            style: this.style
        };

        return node(ControlKind.tabPage, props, ...this.children);
    }
}
