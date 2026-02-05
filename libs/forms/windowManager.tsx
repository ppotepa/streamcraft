import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type WindowState = {
    id: string;
    title: string;
    minimized: boolean;
    closed: boolean;
    maximized: boolean;
    order: number;
    position?: { left: number; top: number };
    zIndex?: number;
};

type WindowManager = {
    windows: WindowState[];
    registerWindow: (id: string, title: string) => void;
    getWindow: (id: string) => WindowState | undefined;
    setPosition: (id: string, left: number, top: number) => void;
    setZIndex: (id: string, zIndex: number) => void;
    minimize: (id: string) => void;
    restore: (id: string) => void;
    close: (id: string) => void;
    toggleMaximize: (id: string) => void;
};

const STORAGE_KEY = "sc.designer.windowState";

const loadState = () => {
    if (typeof window === "undefined") return {} as Record<string, WindowState>;
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return {} as Record<string, WindowState>;
        const parsed = JSON.parse(raw) as Record<string, WindowState>;
        return parsed ?? {};
    } catch {
        return {} as Record<string, WindowState>;
    }
};

const WindowManagerContext = createContext<WindowManager | null>(null);

export const WindowManagerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [windows, setWindows] = useState<Record<string, WindowState>>(() => loadState());

    useEffect(() => {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(windows));
    }, [windows]);

    const registerWindow = (id: string, title: string) => {
        setWindows((prev) => {
            const existing = prev[id];
            if (existing) {
                if (existing.title === title) return prev;
                return {
                    ...prev,
                    [id]: { ...existing, title }
                };
            }
            const order = Object.keys(prev).length + 1;
            const isMain = id === "main-window";
            return {
                ...prev,
                [id]: {
                    id,
                    title,
                    minimized: false,
                    closed: false,
                    maximized: isMain,
                    order
                }
            };
        });
    };

    const getWindow = (id: string) => windows[id];

    const setPosition = (id: string, left: number, top: number) =>
        setWindows((prev) => ({
            ...prev,
            [id]: { ...prev[id], position: { left, top } }
        }));

    const setZIndex = (id: string, zIndex: number) =>
        setWindows((prev) => ({
            ...prev,
            [id]: { ...prev[id], zIndex }
        }));

    const minimize = (id: string) =>
        setWindows((prev) => ({
            ...prev,
            [id]: { ...prev[id], minimized: true }
        }));

    const restore = (id: string) =>
        setWindows((prev) => ({
            ...prev,
            [id]: { ...prev[id], minimized: false, closed: false }
        }));

    const close = (id: string) =>
        setWindows((prev) => ({
            ...prev,
            [id]: { ...prev[id], closed: true, minimized: false }
        }));

    const toggleMaximize = (id: string) =>
        setWindows((prev) => ({
            ...prev,
            [id]: { ...prev[id], maximized: !prev[id]?.maximized }
        }));

    const value = useMemo<WindowManager>(
        () => ({
            windows: Object.values(windows).sort((a, b) => a.order - b.order),
            registerWindow,
            getWindow,
            setPosition,
            setZIndex,
            minimize,
            restore,
            close,
            toggleMaximize
        }),
        [windows]
    );

    return <WindowManagerContext.Provider value={value}>{children}</WindowManagerContext.Provider>;
};

export const useWindowManager = () => useContext(WindowManagerContext);

export const WindowTaskbar: React.FC = () => {
    const manager = useWindowManager();
    if (!manager) return null;
    const minimized = manager.windows.filter((win) => win.minimized && !win.closed);
    return (
        <div className="taskbar">
            <div className="taskbar-strip">
                {minimized.length === 0 ? (
                    <span className="taskbar-empty">No minimized windows</span>
                ) : (
                    minimized.map((win) => (
                        <button
                            key={win.id}
                            className="taskbar-button button"
                            onClick={() => manager.restore(win.id)}
                        >
                            {win.title}
                        </button>
                    ))
                )}
            </div>
        </div>
    );
};
