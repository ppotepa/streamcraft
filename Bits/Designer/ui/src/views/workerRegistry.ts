import { schedulerLogsDB, ExecutionLog as DBExecutionLog } from './schedulerLogsDB';

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

export type ExecutionLog = {
    id: string;
    workerId: string;
    timestamp: number;
    status: 'success' | 'failed' | 'running';
    duration: number;
    message: string;
    request?: {
        method: string;
        url: string;
        headers?: Record<string, string>;
        body?: any;
    };
    response?: {
        statusCode?: number;
        statusText?: string;
        headers?: Record<string, string>;
        body?: any;
        error?: string;
    };
};

export type WorkerStats = {
    lastExecutionTime?: number;
    totalExecutions: number;
    successCount: number;
    errorCount: number;
    successRate: number;
    isExecuting: boolean;
    lastExecutionHadError: boolean;
    status: 'idle' | 'running' | 'queued';
    queuePosition?: number;
};

type RegistryListener = () => void;

const entries = new Map<string, WorkerRegistration>();
const stats = new Map<string, WorkerStats>();
const logs = new Map<string, ExecutionLog[]>(); // workerId -> logs array
const listeners = new Set<RegistryListener>();
const MAX_LOGS_PER_WORKER = 500; // Keep last 500 logs per worker

const notify = () => {
    listeners.forEach((listener) => listener());
};

export const workerRegistry = {
    register(worker: WorkerRegistration) {
        entries.set(worker.id, worker);
        if (!stats.has(worker.id)) {
            stats.set(worker.id, {
                totalExecutions: 0,
                successCount: 0,
                errorCount: 0,
                successRate: 0,
                isExecuting: false,
                lastExecutionHadError: false
            });
        }
        notify();
    },
    unregister(workerId: string) {
        if (entries.delete(workerId)) {
            stats.delete(workerId);
            notify();
        }
    },
    setWorkers(workers: WorkerRegistration[]) {
        entries.clear();
        workers.forEach((worker) => {
            entries.set(worker.id, worker);
            if (!stats.has(worker.id)) {
                stats.set(worker.id, {
                    totalExecutions: 0,
                    successCount: 0,
                    errorCount: 0,
                    successRate: 0,
                    lastExecutionHadError: false,
                    isExecuting: false,
                    status: 'idle'
                });
            }
        });
        notify();
    },
    getWorkers() {
        return Array.from(entries.values()).sort((a, b) => a.label.localeCompare(b.label));
    },
    getStats(workerId: string): WorkerStats | undefined {
        return stats.get(workerId);
    },
    setExecuting(workerId: string, isExecuting: boolean) {
        const current = stats.get(workerId);
        if (current) {
            current.isExecuting = isExecuting;
            // Don't notify - this is a stats change, not a worker list change
        }
    },
    setStatus(workerId: string, status: 'idle' | 'running' | 'queued', queuePosition?: number) {
        const current = stats.get(workerId);
        if (current) {
            current.status = status;
            current.queuePosition = queuePosition;
        }
    },
    getQueuePosition(workerId: string): number | undefined {
        return stats.get(workerId)?.queuePosition;
    },
    recordExecution(workerId: string, success: boolean) {
        const current = stats.get(workerId) || {
            totalExecutions: 0,
            successCount: 0,
            errorCount: 0,
            successRate: 0,
            lastExecutionHadError: false,
            status: 'idle' as const
        };

        const updated: WorkerStats = {
            lastExecutionTime: Date.now(),
            totalExecutions: current.totalExecutions + 1,
            successCount: current.successCount + (success ? 1 : 0),
            errorCount: current.errorCount + (success ? 0 : 1),
            successRate: 0,
            isExecuting: false,
            lastExecutionHadError: !success
        };

        updated.successRate = updated.totalExecutions > 0
            ? (updated.successCount / updated.totalExecutions) * 100
            : 0;

        stats.set(workerId, updated);
        notify();
    },
    subscribe(listener: RegistryListener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
    },
    addLog(log: ExecutionLog) {
        const workerLogs = logs.get(log.workerId) || [];
        workerLogs.unshift(log); // Add to beginning (newest first)

        // Keep only MAX_LOGS_PER_WORKER
        if (workerLogs.length > MAX_LOGS_PER_WORKER) {
            workerLogs.splice(MAX_LOGS_PER_WORKER);
        }

        logs.set(log.workerId, workerLogs);

        // Persist to IndexedDB
        const dbLog: DBExecutionLog = {
            ...log,
            timestamp: new Date(log.timestamp)
        };
        schedulerLogsDB.addLog(dbLog).catch(err => {
            console.error('Failed to persist log to IndexedDB:', err);
        });
    },
    async getLogs(workerId: string, filter?: {
        status?: 'success' | 'failed' | 'running';
        timeRange?: number; // milliseconds from now
        limit?: number;
    }): Promise<ExecutionLog[]> {
        // Get logs from IndexedDB
        const dbLogs = await schedulerLogsDB.getLogs(workerId, filter ? {
            status: filter.status === 'success' ? 'success' : filter.status === 'failed' ? 'error' : filter.status,
            startDate: filter.timeRange ? new Date(Date.now() - filter.timeRange) : undefined
        } : undefined);

        // Convert to ExecutionLog format
        let workerLogs: ExecutionLog[] = dbLogs.map(log => ({
            ...log,
            timestamp: log.timestamp.getTime(),
            status: log.status === 'error' ? 'failed' : log.status
        }));

        if (filter?.limit) {
            workerLogs = workerLogs.slice(0, filter.limit);
        }

        return workerLogs;
    },
    async clearLogs(workerId?: string): Promise<void> {
        if (workerId) {
            logs.delete(workerId);
        } else {
            logs.clear();
        }

        // Clear from IndexedDB
        await schedulerLogsDB.clearLogs(workerId);
    },
    async getLogStats(workerId: string, timeRange?: number): Promise<{
        total: number;
        successCount: number;
        failedCount: number;
        runningCount: number;
        successRate: number;
        avgDuration: number;
    }> {
        return await schedulerLogsDB.getLogStats(workerId);
    }
};
