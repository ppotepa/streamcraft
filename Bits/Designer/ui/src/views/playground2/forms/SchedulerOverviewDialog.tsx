import { buildSchedulerOverviewDialog } from "./SchedulerOverviewDialog.Designer";
import type { SchedulerOverviewDialogProps, SchedulerOverviewItem } from "./SchedulerOverviewDialog.Designer";

export type { SchedulerOverviewDialogProps, SchedulerOverviewItem } from "./SchedulerOverviewDialog.Designer";

export const createSchedulerOverviewDialog = (props: SchedulerOverviewDialogProps) =>
    buildSchedulerOverviewDialog(props);
