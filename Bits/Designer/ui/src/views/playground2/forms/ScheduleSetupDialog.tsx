import { buildScheduleSetupDialog } from "./ScheduleSetupDialog.Designer";
import type { ScheduleSetupDialogProps } from "./ScheduleSetupDialog.Designer";

export type { ScheduleSetupDialogProps } from "./ScheduleSetupDialog.Designer";

export const createScheduleSetupDialog = (props: ScheduleSetupDialogProps) =>
    buildScheduleSetupDialog(props);
