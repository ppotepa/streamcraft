import { useCallback } from "react";

export const useDockingInteractions = (
    isDockCollapsed: boolean,
    setIsDockPreview: (show: boolean) => void,
    setDockedWindows: React.Dispatch<React.SetStateAction<string[]>>
) => {
    const handleDockDragStart = useCallback(() => {
        setIsDockPreview(false);
    }, [setIsDockPreview]);

    const handleDockDragMove = useCallback((args: any) => {
        if (isDockCollapsed) {
            setIsDockPreview(false);
            return;
        }
        const container = document.querySelector(".playground2-outer-form") as HTMLElement | null;
        const containerWidth = container?.clientWidth ?? window.innerWidth;
        const dockWidth = 320;
        const left = Number(args?.left ?? 0);
        const threshold = Math.max(0, containerWidth - dockWidth - 40);
        setIsDockPreview(left >= threshold);
    }, [isDockCollapsed, setIsDockPreview]);

    const handleDockDragEnd = useCallback((args: any) => {
        const dockId = args?.sender?.dockId as string | undefined;
        if (!dockId || isDockCollapsed) return;
        const container = document.querySelector(".playground2-outer-form") as HTMLElement | null;
        const containerWidth = container?.clientWidth ?? window.innerWidth;
        const dockWidth = 320;
        const left = Number(args?.left ?? 0);
        const threshold = Math.max(0, containerWidth - dockWidth - 40);
        if (left >= threshold) {
            setDockedWindows((prev) => (prev.includes(dockId) ? prev : [...prev, dockId]));
        }
        setIsDockPreview(false);
    }, [isDockCollapsed, setDockedWindows, setIsDockPreview]);

    const handleDockUndock = useCallback((args: any) => {
        const dockId = args?.sender?.dockId as string | undefined;
        if (!dockId) return;
        setDockedWindows((prev) => prev.filter((id) => id !== dockId));
    }, [setDockedWindows]);

    const withDockProps = useCallback((dialogNode: any, dockId: string) => {
        if (!dialogNode) return null;
        return {
            ...dialogNode,
            props: {
                ...(dialogNode.props ?? {}),
                dockId,
                dragBounds: ".playground2-outer-form",
                onDragStart: "dockDragStart",
                onDragMove: "dockDragMove",
                onDragEnd: "dockDragEnd"
            }
        } as typeof dialogNode;
    }, []);

    return {
        handleDockDragStart,
        handleDockDragMove,
        handleDockDragEnd,
        handleDockUndock,
        withDockProps
    };
};
