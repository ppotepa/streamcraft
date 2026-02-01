import { FormChild, FormNode } from "./core";
import { controlRegistry } from "./registry";

const coerceValue = (value: string) => {
    const trimmed = value.trim();
    if (trimmed === "true") return true;
    if (trimmed === "false") return false;
    if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
        try {
            return JSON.parse(trimmed) as unknown;
        } catch {
            return value;
        }
    }
    if (!Number.isNaN(Number(trimmed)) && trimmed !== "") return Number(trimmed);
    return value;
};

const attributesToProps = (element: Element) => {
    const props: Record<string, unknown> = {};
    for (const attr of Array.from(element.attributes)) {
        const key = attr.name === "class" ? "className" : attr.name;
        props[key] = coerceValue(attr.value);
    }
    return props;
};

const isHtmlTag = (tagName: string) => /^[a-z][a-z0-9-]*$/.test(tagName);

const buildNode = (element: Element, templates: Map<string, FormNode>): FormNode | FormChild => {
    const resolvedType = controlRegistry.resolveType(element.tagName);
    const typeKey = resolvedType ?? (isHtmlTag(element.tagName) ? "element" : element.tagName.charAt(0).toLowerCase() + element.tagName.slice(1));

    if (typeKey === "text") {
        return element.textContent ?? "";
    }

    if (element.tagName === "Use") {
        const templateId = element.getAttribute("template") ?? "";
        const template = templates.get(templateId);
        if (!template) {
            return { type: "view", props: { className: "missing-template" }, children: [`Missing template: ${templateId}`] };
        }
        const overrideProps = attributesToProps(element);
        delete overrideProps.template;

        const extraChildren = Array.from(element.children)
            .map((child) => buildNode(child, templates))
            .filter((child) => child !== null && child !== undefined);

        return {
            type: template.type,
            props: { ...(template.props ?? {}), ...overrideProps },
            children: [...(template.children ?? []), ...extraChildren]
        };
    }

    const props = attributesToProps(element);
    if (typeKey === "element") {
        const tag = element.getAttribute("tag") ?? (isHtmlTag(element.tagName) ? element.tagName : "div");
        props.tag = tag;
    }

    const children: FormChild[] = [];
    for (const node of Array.from(element.childNodes)) {
        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent?.trim();
            if (text) {
                children.push(text);
            }
            continue;
        }
        if (node.nodeType === Node.ELEMENT_NODE) {
            const childElement = node as Element;
            const built = buildNode(childElement, templates);
            if (built !== null && built !== undefined) {
                children.push(built);
            }
        }
    }

    return {
        type: typeKey,
        props,
        children
    };
};

const collectTemplates = (root: Element) => {
    const templates = new Map<string, FormNode>();
    const templateNodes = Array.from(root.getElementsByTagName("Template"));

    templateNodes.forEach((templateNode) => {
        const id = templateNode.getAttribute("id");
        if (!id) return;

        const firstElement = Array.from(templateNode.children).find((child) => child.nodeType === Node.ELEMENT_NODE) as
            | Element
            | undefined;
        if (!firstElement) return;

        const built = buildNode(firstElement, templates);
        if (typeof built === "object" && built !== null && "type" in built) {
            templates.set(id, built as FormNode);
        }
    });

    return templates;
};

export const xmlToFormNode = (xml: string): FormNode => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, "application/xml");
    const root = doc.documentElement;

    const parseError = doc.getElementsByTagName("parsererror");
    if (parseError.length > 0) {
        throw new Error("Invalid XML view document.");
    }

    const templates = collectTemplates(root);
    const rootElement = Array.from(root.children).find((child) => child.tagName !== "Template");
    if (!rootElement) {
        throw new Error("XML view must contain a root control.");
    }

    const result = buildNode(rootElement, templates);
    if (typeof result === "object" && result !== null && "type" in result) {
        return result as FormNode;
    }

    throw new Error("Unable to build view tree from XML.");
};
