import { buildEffectPreviewDialog } from "./EffectPreviewDialog.Designer";
import type { EffectPreviewDialogProps } from "./EffectPreviewDialog.Designer";

export type { EffectPreviewDialogProps } from "./EffectPreviewDialog.Designer";

export const createEffectPreviewDialog = (props: EffectPreviewDialogProps) =>
    buildEffectPreviewDialog(props);
