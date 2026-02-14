import { useCallback } from "react";

export const useExtensionHandlers = (
    setOpenUiExtensions: React.Dispatch<React.SetStateAction<Set<string>>>,
    applyTextStyleById: (id: string) => void
) => {
    const handleUiExtensionEvent = useCallback((name?: unknown) => {
        if (typeof name !== "string" || !name.startsWith("ui-extension:")) return;
        const parts = name.split(":");
        const groupId = parts[1];
        const action = parts[2];
        if (!groupId || !action) return;
        if (action === "open") {
            setOpenUiExtensions((prev) => {
                const next = new Set(prev);
                next.add(groupId);
                return next;
            });
            return;
        }
        if (action === "close") {
            setOpenUiExtensions((prev) => {
                const next = new Set(prev);
                next.delete(groupId);
                return next;
            });
            return;
        }
        if (action === "apply") {
            const styleId = parts.slice(3).join(":");
            applyTextStyleById(styleId);
        }
    }, [applyTextStyleById, setOpenUiExtensions]);

    return {
        handleUiExtensionEvent
    };
};
