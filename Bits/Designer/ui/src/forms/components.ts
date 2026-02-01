import { FormChild, FormNode, element, node } from "./core";

export const windowView = (title: string, ...children: FormChild[]): FormNode =>
    node("window", { title }, ...children);

export const menuBar = (...items: FormChild[]): FormNode => node("menuBar", undefined, ...items);

export const menuItem = (label: string, ...items: FormChild[]): FormNode =>
    node("menuItem", { label }, ...items.map((item) => (typeof item === "string" ? menuEntry(item) : item)));

export const menuEntry = (label: string): FormNode => node("menuItemEntry", undefined, label);

export const toolStrip = (tiles: FormChild[], options: FormChild[], actions: FormChild[]): FormNode =>
    node("toolStrip", { tiles, options, actions });

export const toolButton = (
    label: string,
    options?: { pressed?: boolean; hasFlyout?: boolean; onClick?: () => void }
): FormNode =>
    node("toolButton", {
        label,
        pressed: options?.pressed,
        hasFlyout: options?.hasFlyout,
        onClick: options?.onClick
    });

export const docBar = (left: FormChild[], right: FormChild[]): FormNode =>
    node("docBar", { left, right });

export const view = (className: string, ...children: FormChild[]): FormNode =>
    node("view", { className }, ...children);

export const dock = (className: string, ...children: FormChild[]): FormNode =>
    node("dock", { className }, ...children);

export const panel = (title: string, ...children: FormChild[]): FormNode =>
    node("panel", { title }, ...children);

export const canvas = (...children: FormChild[]): FormNode => node("canvas", undefined, ...children);

export const statusBar = (segments: string[]): FormNode => node("statusBar", { segments });

export const list = (...items: string[]): FormNode =>
    element(
        "ul",
        { className: "list" },
        ...items.map((item) => element("li", undefined, item))
    );

export const formGrid = (...children: FormChild[]): FormNode => element("div", { className: "form-grid" }, ...children);

export const row = (className: string, ...children: FormChild[]): FormNode =>
    element("div", { className }, ...children);

export const button = (label: string, className?: string, onClick?: () => void): FormNode =>
    element("button", { className: className ?? "button", onClick }, label);

export const label = (text: string): FormNode => element("label", undefined, text);

export const select = (options: string[]): FormNode =>
    element(
        "select",
        undefined,
        ...options.map((option) => element("option", undefined, option))
    );

export const input = (type: string, defaultValue?: string | number, className?: string): FormNode =>
    element("input", { type, defaultValue, className });

export const checkbox = (label: string, checked = false): FormNode =>
    element(
        "label",
        { className: "checkbox" },
        element("input", { type: "checkbox", defaultChecked: checked }),
        label
    );
