import { buildWorkerDetailsDialog } from "./WorkerDetailsDialog.Designer";
import type { WorkerDetailsDialogProps } from "./WorkerDetailsDialog.Designer";

export type { WorkerDetailsDialogProps } from "./WorkerDetailsDialog.Designer";

export const createWorkerDetailsDialog = (props: WorkerDetailsDialogProps) =>
    buildWorkerDetailsDialog(props);
