import { useEffect } from "react";

type HotkeyActions = {
    save: () => void;
    undo: () => void;
    redo: () => void;
    copy: () => void;
    cut: () => void;
    paste: () => void;
    deleteSelection: () => void;
};

const isEditableTarget = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return false;
    const tag = target.tagName.toLowerCase();
    return tag === "input" || tag === "textarea" || tag === "select" || target.isContentEditable;
};

export const usePlaygroundHotkeys = (actions: HotkeyActions) => {
    useEffect(() => {
        const handler = (event: KeyboardEvent) => {
            const key = event.key.toLowerCase();
            const isCmd = event.ctrlKey || event.metaKey;

            if (isEditableTarget(event.target)) {
                return;
            }

            if (key === "delete" || key === "backspace") {
                event.preventDefault();
                actions.deleteSelection();
                return;
            }

            if (isCmd && key === "s") {
                event.preventDefault();
                actions.save();
                return;
            }

            if (isCmd && key === "z") {
                event.preventDefault();
                actions.undo();
                return;
            }

            if (isCmd && key === "y") {
                event.preventDefault();
                actions.redo();
                return;
            }

            if (isCmd && key === "c") {
                event.preventDefault();
                actions.copy();
                return;
            }

            if (isCmd && key === "x") {
                event.preventDefault();
                actions.cut();
                return;
            }

            if (isCmd && key === "v") {
                event.preventDefault();
                actions.paste();
            }
        };

        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [actions]);
};
