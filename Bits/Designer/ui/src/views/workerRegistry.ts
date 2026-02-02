export type WorkerRegistration = {
    id: string;
    label: string;
    type: string;
    sourceId: string;
    endpointPath: string;
    fieldPath: string;
    trigger?: "interval" | "onLoad" | "onVisible";
    intervalMs?: number;
    debounceMs?: number;
    retryCount?: number;
    backoffMs?: number;
    timeoutMs?: number;
    cacheTtlMs?: number;
    staleWhileRevalidate?: boolean;
    onError?: "ignore" | "fallback" | "notify";
    log?: boolean;
};

type RegistryListener = () => void;

const entries = new Map<string, WorkerRegistration>();
const listeners = new Set<RegistryListener>();

const notify = () => {
    listeners.forEach((listener) => listener());
};

export const workerRegistry = {
    register(worker: WorkerRegistration) {
        entries.set(worker.id, worker);
        notify();
    },
    unregister(workerId: string) {
        if (entries.delete(workerId)) {
            notify();
        }
    },
    setWorkers(workers: WorkerRegistration[]) {
        entries.clear();
        workers.forEach((worker) => entries.set(worker.id, worker));
        notify();
    },
    getWorkers() {
        return Array.from(entries.values()).sort((a, b) => a.label.localeCompare(b.label));
    },
    subscribe(listener: RegistryListener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
    }
};
