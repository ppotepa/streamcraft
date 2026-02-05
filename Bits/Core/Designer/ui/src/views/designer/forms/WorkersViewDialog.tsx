import { buildWorkersViewDialog } from "./WorkersViewDialog.Designer";
import type { WorkersViewDialogProps } from "./WorkersViewDialog.Designer";

export type { WorkersViewDialogProps } from "./WorkersViewDialog.Designer";

export const createWorkersViewDialog = (props: WorkersViewDialogProps) => buildWorkersViewDialog(props);
