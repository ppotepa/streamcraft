import { FormNode } from "./core";

export type JsonViewNode = {
    type: string;
    props?: Record<string, unknown>;
    children?: Array<JsonViewNode | string | number | boolean | null>;
};

export const jsonToFormNode = (node: JsonViewNode): FormNode => {
    const children = node.children?.map((child) => {
        if (child === null || child === undefined) return null;
        if (typeof child === "string" || typeof child === "number" || typeof child === "boolean") return child;
        if (typeof child === "object") return jsonToFormNode(child);
        return null;
    });

    return {
        type: node.type,
        props: node.props,
        children
    };
};
