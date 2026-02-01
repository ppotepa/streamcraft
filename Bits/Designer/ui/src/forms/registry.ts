import type { ControlRenderer } from "./controls/types";

export type ControlSchemaValidator = (props: Record<string, unknown>) => string[];

export type ControlDefinition = {
    renderer: ControlRenderer;
    aliases: Set<string>;
    defaults?: Record<string, unknown>;
    validate?: ControlSchemaValidator;
};

const toLowerCamel = (value: string) => value.charAt(0).toLowerCase() + value.slice(1);

export class ControlRegistry {
    private entries = new Map<string, ControlDefinition>();
    private aliasMap = new Map<string, string>();

    register(
        name: string,
        renderer: ControlRenderer,
        options?: { aliases?: string[]; defaults?: Record<string, unknown>; validate?: ControlSchemaValidator }
    ) {
        const key = name.trim();
        const aliases = options?.aliases ?? [];
        const entry: ControlDefinition = {
            renderer,
            aliases: new Set([key, ...aliases]),
            defaults: options?.defaults,
            validate: options?.validate
        };
        this.entries.set(key, entry);
        entry.aliases.forEach((alias) => this.aliasMap.set(alias, key));
    }

    registerMany(definitions: Array<{ name: string; renderer: ControlRenderer; options?: { aliases?: string[]; defaults?: Record<string, unknown>; validate?: ControlSchemaValidator } }>) {
        definitions.forEach((definition) => {
            this.register(definition.name, definition.renderer, definition.options);
        });
    }

    unregister(name: string) {
        const key = this.resolveType(name) ?? name;
        const entry = this.entries.get(key);
        if (!entry) return;
        entry.aliases.forEach((alias) => this.aliasMap.delete(alias));
        this.entries.delete(key);
    }

    getRenderer(type: string): ControlRenderer | undefined {
        return this.getDefinition(type)?.renderer;
    }

    getDefinition(type: string): ControlDefinition | undefined {
        const key = this.resolveType(type);
        if (!key) return undefined;
        return this.entries.get(key);
    }

    has(type: string) {
        return Boolean(this.resolveType(type));
    }

    resolveType(type: string): string | undefined {
        if (this.entries.has(type)) return type;
        const aliased = this.aliasMap.get(type);
        if (aliased) return aliased;
        const camel = toLowerCamel(type);
        if (this.entries.has(camel)) return camel;
        const camelAlias = this.aliasMap.get(camel);
        if (camelAlias) return camelAlias;
        return undefined;
    }

    listTypes() {
        return Array.from(this.entries.keys());
    }
}

export const controlRegistry = new ControlRegistry();