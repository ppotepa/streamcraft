export type DiagnosticLevel = "info" | "warning" | "error";

export type DiagnosticEntry = {
    level: DiagnosticLevel;
    message: string;
    data?: Record<string, unknown>;
    timestamp: string;
};

type DiagnosticListener = (entries: DiagnosticEntry[]) => void;

const MAX_ENTRIES = 200;
const entries: DiagnosticEntry[] = [];
const listeners = new Set<DiagnosticListener>();

const notify = () => {
    const snapshot = [...entries];
    listeners.forEach((listener) => listener(snapshot));
};

export const addDiagnostic = (entry: Omit<DiagnosticEntry, "timestamp">) => {
    entries.push({ ...entry, timestamp: new Date().toISOString() });
    if (entries.length > MAX_ENTRIES) {
        entries.splice(0, entries.length - MAX_ENTRIES);
    }
    notify();
};

export const getDiagnostics = () => [...entries];

export const clearDiagnostics = () => {
    entries.length = 0;
    notify();
};

export const subscribeDiagnostics = (listener: DiagnosticListener) => {
    listeners.add(listener);
    listener([...entries]);
    return () => listeners.delete(listener);
};