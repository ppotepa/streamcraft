import { Component } from "./Component";
import type { FormNode, FormChild } from "../core";
import type { ControlContext } from "../controls/types";
import { ControlKind } from "../controlKinds";
import { node, element } from "../core";

/**
 * Abstract base class for navigation controls
 */
export abstract class Navigation extends Component {
    constructor(props?: Partial<Navigation>) {
        super(props);
    }
}

/**
 * MenuBar component - top-level menu bar
 */
export class MenuBar extends Navigation {
    /**
     * Menu items
     */
    public items: MenuItem[] = [];

    constructor(props?: Partial<MenuBar>) {
        super(props);
    }

    public render(context: ControlContext): FormNode {
        const props: Record<string, unknown> = {
            className: this.className,
            style: this.style
        };

        // Children should be MenuItem components
        return node(ControlKind.menuBar, props, ...this.children);
    }

    /**
     * Add a menu item
     */
    public addItem(item: MenuItem): void {
        this.items.push(item);
        this.addChild(item);
    }

    /**
     * Remove a menu item
     */
    public removeItem(item: MenuItem): void {
        const index = this.items.indexOf(item);
        if (index !== -1) {
            this.items.splice(index, 1);
            this.removeChild(item);
        }
    }
}

/**
 * MenuItem component - menu item with optional submenu
 */
export class MenuItem extends Component {
    /**
     * Menu item label
     */
    public label?: string;

    /**
     * Menu item icon
     */
    public icon?: string;

    /**
     * Keyboard shortcut
     */
    public shortcut?: string;

    /**
     * Whether item is enabled
     */
    public override enabled: boolean = true;

    /**
     * Whether item is checked (for toggle items)
     */
    public checked: boolean = false;

    /**
     * Whether this is a separator
     */
    public separator: boolean = false;

    /**
     * Click event handler name
     */
    public onClick?: string;

    /**
     * Submenu items
     */
    public items: MenuItem[] = [];

    constructor(props?: Partial<MenuItem>) {
        super(props);
    }

    public override getDefaults(): Record<string, unknown> {
        return {
            ...super.getDefaults(),
            enabled: true,
            checked: false,
            separator: false
        };
    }

    public render(context: ControlContext): FormNode {
        if (this.separator) {
            return node(ControlKind.menuItem, { separator: true });
        }

        const props: Record<string, unknown> = {
            label: this.label,
            icon: this.icon,
            shortcut: this.shortcut,
            disabled: !this.enabled,
            checked: this.checked,
            onClick: this.onClick,
            className: this.className,
            style: this.style
        };

        // If has children, they are submenu items
        return node(ControlKind.menuItem, props, ...this.children);
    }

    /**
     * Add submenu item
     */
    public addItem(item: MenuItem): void {
        this.items.push(item);
        this.addChild(item);
    }

    /**
     * Toggle checked state
     */
    public toggle(): void {
        this.checked = !this.checked;
        this.emit("toggle", { checked: this.checked });
    }
}

/**
 * ToolStrip component - toolbar with buttons
 */
export class ToolStrip extends Navigation {
    /**
     * Tool buttons
     */
    public buttons: ToolButton[] = [];

    /**
     * Orientation
     */
    public orientation: "horizontal" | "vertical" = "horizontal";

    /**
     * Whether to show text labels
     */
    public showText: boolean = true;

    /**
     * Button size
     */
    public buttonSize: "small" | "medium" | "large" = "medium";

    constructor(props?: Partial<ToolStrip>) {
        super(props);
    }

    public override getDefaults(): Record<string, unknown> {
        return {
            ...super.getDefaults(),
            orientation: "horizontal",
            showText: true,
            buttonSize: "medium"
        };
    }

    public render(context: ControlContext): FormNode {
        const props: Record<string, unknown> = {
            orientation: this.orientation,
            showText: this.showText,
            buttonSize: this.buttonSize,
            className: this.className,
            style: this.style
        };

        // Children should be ToolButton components
        return node(ControlKind.toolStrip, props, ...this.children);
    }

    /**
     * Add a tool button
     */
    public addButton(button: ToolButton): void {
        this.buttons.push(button);
        this.addChild(button);
    }

    /**
     * Remove a tool button
     */
    public removeButton(button: ToolButton): void {
        const index = this.buttons.indexOf(button);
        if (index !== -1) {
            this.buttons.splice(index, 1);
            this.removeChild(button);
        }
    }
}

/**
 * ToolButton component - button in a toolbar
 */
export class ToolButton extends Component {
    /**
     * Button text
     */
    public text?: string;

    /**
     * Button icon
     */
    public icon?: string;

    /**
     * Tooltip text
     */
    public tooltip?: string;

    /**
     * Whether button is enabled
     */
    public override enabled: boolean = true;

    /**
     * Whether button is checked (for toggle buttons)
     */
    public checked: boolean = false;

    /**
     * Button style
     */
    public buttonStyle: "push" | "toggle" | "dropdown" = "push";

    /**
     * Click event handler name
     */
    public onClick?: string;

    constructor(props?: Partial<ToolButton>) {
        super(props);
    }

    public override getDefaults(): Record<string, unknown> {
        return {
            ...super.getDefaults(),
            enabled: true,
            checked: false,
            buttonStyle: "push"
        };
    }

    public render(context: ControlContext): FormNode {
        const props: Record<string, unknown> = {
            text: this.text,
            icon: this.icon,
            tooltip: this.tooltip,
            disabled: !this.enabled,
            checked: this.checked,
            buttonStyle: this.buttonStyle,
            onClick: this.onClick,
            className: this.className,
            style: this.style
        };

        return node(ControlKind.toolButton, props, ...this.children);
    }

    /**
     * Toggle checked state (for toggle buttons)
     */
    public toggle(): void {
        if (this.buttonStyle === "toggle") {
            this.checked = !this.checked;
            this.emit("toggle", { checked: this.checked });
        }
    }
}

/**
 * DocBar component - document/tab bar
 */
export class DocBar extends Navigation {
    /**
     * Document tabs
     */
    public tabs: DocBarTab[] = [];

    /**
     * Selected tab index
     */
    public selectedIndex: number = -1;

    /**
     * Maximum visible tabs before showing dropdown
     */
    public maxVisibleTabs?: number;

    /**
     * Change event handler name
     */
    public onChange?: string;

    constructor(props?: Partial<DocBar>) {
        super(props);
    }

    public override getDefaults(): Record<string, unknown> {
        return {
            ...super.getDefaults(),
            selectedIndex: -1
        };
    }

    public render(context: ControlContext): FormNode {
        const props: Record<string, unknown> = {
            tabs: this.tabs,
            selectedIndex: this.selectedIndex,
            maxVisibleTabs: this.maxVisibleTabs,
            onChange: this.onChange,
            className: this.className,
            style: this.style
        };

        return node(ControlKind.docBar, props, ...this.children);
    }

    /**
     * Add a tab
     */
    public addTab(tab: DocBarTab): void {
        this.tabs.push(tab);
        if (this.selectedIndex === -1) {
            this.selectedIndex = 0;
        }
    }

    /**
     * Remove a tab
     */
    public removeTab(index: number): void {
        if (index >= 0 && index < this.tabs.length) {
            this.tabs.splice(index, 1);
            if (this.selectedIndex === index) {
                this.selectedIndex = this.tabs.length > 0 ? Math.min(index, this.tabs.length - 1) : -1;
            } else if (this.selectedIndex > index) {
                this.selectedIndex--;
            }
        }
    }

    /**
     * Select a tab
     */
    public selectTab(index: number): void {
        if (index >= 0 && index < this.tabs.length) {
            const oldIndex = this.selectedIndex;
            this.selectedIndex = index;
            this.emit("change", { selectedIndex: index, oldIndex });
        }
    }
}

/**
 * DocBar tab
 */
export interface DocBarTab {
    text: string;
    icon?: string;
    closable?: boolean;
    modified?: boolean;
    path?: string;
}
