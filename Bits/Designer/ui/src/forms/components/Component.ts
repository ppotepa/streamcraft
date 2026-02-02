import type { FormNode, FormChild } from "../core";
import type { ControlContext } from "../controls/types";

/**
 * Base abstract component class that all form components inherit from.
 * Provides common functionality for rendering, validation, event handling, and lifecycle management.
 */
export abstract class Component {
    /**
     * The component's unique identifier (optional)
     */
    public id?: string;

    /**
     * The component's name for reference
     */
    public name?: string;

    /**
     * Whether the component is currently visible
     */
    public visible: boolean = true;

    /**
     * Whether the component is enabled for interaction
     */
    public enabled: boolean = true;

    /**
     * Custom CSS classes to apply
     */
    public className?: string;

    /**
     * Inline style overrides
     */
    public style?: string | Record<string, unknown>;

    /**
     * Child components
     */
    protected children: FormChild[] = [];

    /**
     * Event handlers attached to this component
     */
    protected eventHandlers: Map<string, Function> = new Map();

    constructor(props?: Partial<Component>) {
        if (props) {
            Object.assign(this, props);
        }
    }

    /**
     * Abstract method to render the component as a FormNode
     * Must be implemented by derived classes
     */
    abstract render(context: ControlContext): FormNode;

    /**
     * Validate component properties
     * Override in derived classes for custom validation
     */
    public validate(): string[] {
        const errors: string[] = [];
        return errors;
    }

    /**
     * Get default properties for this component type
     * Override in derived classes
     */
    public getDefaults(): Record<string, unknown> {
        return {
            visible: true,
            enabled: true
        };
    }

    /**
     * Add a child component
     */
    public addChild(child: FormChild | Component): this {
        // If it's a Component instance, we'll render it later when render() is called
        // For now, just store it as-is since children array accepts Component instances
        this.children.push(child as FormChild);
        return this;
    }

    /**
     * Remove a child component
     */
    public removeChild(child: FormChild | Component): this {
        const index = this.children.indexOf(child as FormChild);
        if (index !== -1) {
            this.children.splice(index, 1);
        }
        return this;
    }

    /**
     * Get all children
     */
    public getChildren(): FormChild[] {
        return [...this.children];
    }

    /**
     * Attach an event handler
     */
    public on(eventName: string, handler: Function): this {
        this.eventHandlers.set(eventName, handler);
        return this;
    }

    /**
     * Remove an event handler
     */
    public off(eventName: string): this {
        this.eventHandlers.delete(eventName);
        return this;
    }

    /**
     * Trigger an event
     */
    protected emit(eventName: string, args?: any): void {
        const handler = this.eventHandlers.get(eventName);
        if (handler) {
            handler(args);
        }
    }

    /**
     * Convert component to a plain object for serialization
     */
    public toJSON(): Record<string, unknown> {
        return {
            type: this.constructor.name,
            id: this.id,
            name: this.name,
            visible: this.visible,
            enabled: this.enabled,
            className: this.className,
            style: this.style,
            children: this.children
        };
    }

    /**
     * Create component instance from plain object
     */
    public static fromJSON(data: Record<string, unknown>): Component {
        throw new Error("fromJSON must be implemented by derived classes");
    }

    /**
     * Lifecycle hook: called before first render
     */
    protected onInit(): void {
        // Override in derived classes
    }

    /**
     * Lifecycle hook: called after render
     */
    protected onMount(): void {
        // Override in derived classes
    }

    /**
     * Lifecycle hook: called before component is removed
     */
    protected onUnmount(): void {
        // Override in derived classes
    }

    /**
     * Lifecycle hook: called when properties change
     */
    protected onUpdate(changedProps: Set<string>): void {
        // Override in derived classes
    }
}
