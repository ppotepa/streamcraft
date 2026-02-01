import { FormChild, FormNode } from "./core";

const toLowerCamel = (value: string) => value.charAt(0).toLowerCase() + value.slice(1);

const controlMap: Record<string, string> = {
    Window: "window",
    MenuBar: "menuBar",
    MenuItem: "menuItem",
    ToolStrip: "toolStrip",
    ToolButton: "toolButton",
    StatusBar: "statusBar",
    StatusSegment: "statusSegment",
    View: "view",
    Panel: "panel",
    Dock: "dock",
    Canvas: "canvas",
    Element: "element",
    Text: "text"
};

const coerceValue = (value: string) => {
    if (value === "true") return true;
    if (value === "false") return false;
    if (!Number.isNaN(Number(value)) && value.trim() !== "") return Number(value);
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
    const mapped = controlMap[element.tagName];
    const typeKey = mapped ?? (isHtmlTag(element.tagName) ? "element" : toLowerCamel(element.tagName));

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
