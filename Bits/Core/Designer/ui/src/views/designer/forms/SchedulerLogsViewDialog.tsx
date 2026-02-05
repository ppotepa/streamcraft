import { buildSchedulerLogsViewDialog } from "./SchedulerLogsViewDialog.Designer";
import type { SchedulerLogsViewDialogProps } from "./SchedulerLogsViewDialog.Designer";

export type { SchedulerLogsViewDialogProps } from "./SchedulerLogsViewDialog.Designer";

export const createSchedulerLogsViewDialog = (props: SchedulerLogsViewDialogProps) =>
    buildSchedulerLogsViewDialog(props);
