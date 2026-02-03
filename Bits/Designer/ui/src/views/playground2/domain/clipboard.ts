import type { CanvasItem } from "./types";

export type ClipboardState = {
    items: CanvasItem[];
    offset: number;
};

export const copyToClipboard = (items: CanvasItem[], selectedIds: string[]): ClipboardState | null => {
    if (selectedIds.length === 0) return null;
    const selected = items.filter((item) => selectedIds.includes(item.id));
    if (selected.length === 0) return null;
    return { items: selected.map((item) => ({ ...item })), offset: 0 };
};

export const pasteFromClipboard = (
    clipboard: ClipboardState,
    items: CanvasItem[],
    getNextName: (toolType: string) => string
) => {
    const offsetStep = 12;
    const offset = offsetStep * (clipboard.offset + 1);
    const maxZIndex = items.length > 0 ? Math.max(...items.map((item) => item.zIndex ?? 1)) : 0;
    const now = Date.now();

    const pasted = clipboard.items.map((item, index) => {
        const id = `item-${now}-${Math.floor(Math.random() * 100000)}-${index}`;
        const name = getNextName(item.type);
        const next = {
            ...item,
            id,
            name,
            x: item.x + offset,
            y: item.y + offset,
            zIndex: maxZIndex + index + 1
        } as CanvasItem;
        if (next.type === "text") {
            (next as CanvasItem & { label?: string }).label = name;
        }
        return next;
    });

    return {
        items: [...items, ...pasted],
        selectedIds: pasted.map((item) => item.id),
        nextClipboard: { ...clipboard, offset: clipboard.offset + 1 }
    };
};
