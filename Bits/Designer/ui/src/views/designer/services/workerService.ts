import type { MutableRefObject } from "react";
import type { WorkerRegistration } from "../workerRegistry";

type SchedulerArgs = {
    workers: WorkerRegistration[];
    isTransforming: boolean;
    transformHoldUntil: MutableRefObject<number>;
    runTest: (sourceId: string, endpointPath: string) => Promise<any>;
    workerRegistry: {
        setStatus: (id: string, status: "idle" | "running" | "queued", queuePosition?: number) => void;
        setExecuting: (id: string, executing: boolean) => void;
    };
};

export const startWorkerScheduler = ({ workers, isTransforming, transformHoldUntil, runTest, workerRegistry }: SchedulerArgs) => {
    const scheduler = {
        maxConcurrent: 3,
        running: new Set<string>(),
        queue: [] as WorkerRegistration[],
        lastExecution: new Map<string, number>(),

        shouldExecuteNow(worker: WorkerRegistration): boolean {
            const lastTime = this.lastExecution.get(worker.id) || 0;
            const intervalMs = Math.max(worker.intervalMs ?? 5000, 250);
            return Date.now() - lastTime >= intervalMs;
        },

        async executeWorker(worker: WorkerRegistration) {
            if (this.running.size >= this.maxConcurrent) {
                if (!this.queue.includes(worker)) {
                    this.queue.push(worker);
                    this.updateQueuePositions();
                }
                return;
            }

            this.running.add(worker.id);
            workerRegistry.setStatus(worker.id, "running");
            const startTime = Date.now();
            this.lastExecution.set(worker.id, startTime);

            const logId = `${worker.id}-${startTime}`;
            let logEntry: any = {
                id: logId,
                workerId: worker.id,
                timestamp: startTime,
                status: "running" as const,
                duration: 0,
                message: "Executing...",
                request: {
                    method: "GET",
                    url: worker.endpointPath
                }
            };

            try {
                workerRegistry.setExecuting(worker.id, true);
                const result = await runTest(worker.sourceId, worker.endpointPath);
                const duration = Date.now() - startTime;
                const success = result?.success ?? false;

                const responseBody = result?.data ?? result?.response;
                logEntry = {
                    ...logEntry,
                    status: success ? "success" : "error",
                    duration,
                    response: responseBody,
                    message: success ? "Executed successfully" : (result?.error ?? "Execution failed")
                };
            } catch (error: any) {
                logEntry = {
                    ...logEntry,
                    status: "error",
                    duration: Date.now() - startTime,
                    message: error?.message ?? "Execution failed",
                    error: error?.toString?.() ?? String(error)
                };
            } finally {
                workerRegistry.setExecuting(worker.id, false);
                workerRegistry.setStatus(worker.id, "idle");
                this.running.delete(worker.id);
            }
        },

        processQueue() {
            while (this.queue.length > 0 && this.running.size < this.maxConcurrent) {
                const worker = this.queue.shift();
                if (worker) {
                    void this.executeWorker(worker);
                }
            }
            this.updateQueuePositions();
        },

        updateQueuePositions() {
            this.queue.forEach((worker, index) => {
                workerRegistry.setStatus(worker.id, "queued", index + 1);
            });
        }
    };

    const tick = setInterval(() => {
        if (isTransforming || Date.now() < transformHoldUntil.current) return;

        workers.forEach(worker => {
            if (!worker.sourceId || !worker.endpointPath) return;

            if (worker.trigger === "onLoad" || worker.trigger === "onVisible") {
                if (!scheduler.lastExecution.has(worker.id)) {
                    void scheduler.executeWorker(worker);
                }
                return;
            }

            if (scheduler.shouldExecuteNow(worker)) {
                void scheduler.executeWorker(worker);
            }
        });
    }, 250);

    return () => clearInterval(tick);
};
