// IndexedDB storage for scheduler execution logs

export interface ExecutionLog {
    id: string;
    workerId: string;
    timestamp: Date;
    status: 'success' | 'error' | 'running';
    duration?: number;
    message?: string;
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
}

const DB_NAME = 'StreamCraftScheduler';
const DB_VERSION = 1;
const STORE_NAME = 'executionLogs';
const MAX_LOGS = 10000;
const MAX_AGE_DAYS = 30;

class SchedulerLogsDB {
    private db: IDBDatabase | null = null;
    private initPromise: Promise<void> | null = null;

    async init(): Promise<void> {
        if (this.db) return;
        if (this.initPromise) return this.initPromise;

        this.initPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                console.error('IndexedDB error:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                    store.createIndex('workerId', 'workerId', { unique: false });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                    store.createIndex('workerIdTimestamp', ['workerId', 'timestamp'], { unique: false });
                }
            };
        });

        return this.initPromise;
    }

    async addLog(log: ExecutionLog): Promise<void> {
        try {
            await this.init();
            if (!this.db) return;

            const transaction = this.db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            
            // Store the log
            store.add({
                ...log,
                timestamp: log.timestamp.getTime() // Store as number for indexing
            });

            await new Promise<void>((resolve, reject) => {
                transaction.oncomplete = () => resolve();
                transaction.onerror = () => reject(transaction.error);
            });

            // Cleanup old logs asynchronously
            this.cleanup().catch(console.error);
        } catch (error) {
            console.error('Failed to add log to IndexedDB:', error);
        }
    }

    async getLogs(workerId?: string, filter?: {
        status?: string;
        startDate?: Date;
        endDate?: Date;
    }): Promise<ExecutionLog[]> {
        try {
            await this.init();
            if (!this.db) return [];

            const transaction = this.db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);

            let request: IDBRequest;
            
            if (workerId) {
                const index = store.index('workerIdTimestamp');
                request = index.getAll(IDBKeyRange.bound(
                    [workerId, 0],
                    [workerId, Date.now()]
                ));
            } else {
                request = store.getAll();
            }

            const results = await new Promise<any[]>((resolve, reject) => {
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });

            // Convert timestamps back to Date objects and apply filters
            let logs = results.map(log => ({
                ...log,
                timestamp: new Date(log.timestamp)
            }));

            if (filter) {
                if (filter.status) {
                    logs = logs.filter(log => log.status === filter.status);
                }
                if (filter.startDate) {
                    logs = logs.filter(log => log.timestamp >= filter.startDate!);
                }
                if (filter.endDate) {
                    logs = logs.filter(log => log.timestamp <= filter.endDate!);
                }
            }

            // Sort by timestamp descending (newest first)
            logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

            return logs;
        } catch (error) {
            console.error('Failed to get logs from IndexedDB:', error);
            return [];
        }
    }

    async clearLogs(workerId?: string): Promise<void> {
        try {
            await this.init();
            if (!this.db) return;

            const transaction = this.db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);

            if (workerId) {
                const index = store.index('workerId');
                const request = index.openCursor(IDBKeyRange.only(workerId));
                
                request.onsuccess = (event) => {
                    const cursor = (event.target as IDBRequest).result;
                    if (cursor) {
                        cursor.delete();
                        cursor.continue();
                    }
                };
            } else {
                store.clear();
            }

            await new Promise<void>((resolve, reject) => {
                transaction.oncomplete = () => resolve();
                transaction.onerror = () => reject(transaction.error);
            });
        } catch (error) {
            console.error('Failed to clear logs from IndexedDB:', error);
        }
    }

    async getLogStats(workerId?: string): Promise<{
        total: number;
        success: number;
        error: number;
        running: number;
        avgDuration: number;
    }> {
        const logs = await this.getLogs(workerId);
        
        const stats = {
            total: logs.length,
            success: logs.filter(l => l.status === 'success').length,
            error: logs.filter(l => l.status === 'error').length,
            running: logs.filter(l => l.status === 'running').length,
            avgDuration: 0
        };

        const completedLogs = logs.filter(l => l.duration !== undefined);
        if (completedLogs.length > 0) {
            const totalDuration = completedLogs.reduce((sum, l) => sum + (l.duration || 0), 0);
            stats.avgDuration = Math.round(totalDuration / completedLogs.length);
        }

        return stats;
    }

    private async cleanup(): Promise<void> {
        try {
            await this.init();
            if (!this.db) return;

            const transaction = this.db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);

            // Get total count
            const countRequest = store.count();
            const count = await new Promise<number>((resolve, reject) => {
                countRequest.onsuccess = () => resolve(countRequest.result);
                countRequest.onerror = () => reject(countRequest.error);
            });

            // If over max, delete oldest logs
            if (count > MAX_LOGS) {
                const index = store.index('timestamp');
                const request = index.openCursor(null, 'next'); // oldest first
                let deleted = 0;
                const toDelete = count - MAX_LOGS;

                request.onsuccess = (event) => {
                    const cursor = (event.target as IDBRequest).result;
                    if (cursor && deleted < toDelete) {
                        cursor.delete();
                        deleted++;
                        cursor.continue();
                    }
                };
            }

            // Delete logs older than MAX_AGE_DAYS
            const cutoffTime = Date.now() - (MAX_AGE_DAYS * 24 * 60 * 60 * 1000);
            const index = store.index('timestamp');
            const range = IDBKeyRange.upperBound(cutoffTime);
            const request = index.openCursor(range);

            request.onsuccess = (event) => {
                const cursor = (event.target as IDBRequest).result;
                if (cursor) {
                    cursor.delete();
                    cursor.continue();
                }
            };

            await new Promise<void>((resolve, reject) => {
                transaction.oncomplete = () => resolve();
                transaction.onerror = () => reject(transaction.error);
            });
        } catch (error) {
            console.error('Failed to cleanup IndexedDB:', error);
        }
    }
}

export const schedulerLogsDB = new SchedulerLogsDB();
