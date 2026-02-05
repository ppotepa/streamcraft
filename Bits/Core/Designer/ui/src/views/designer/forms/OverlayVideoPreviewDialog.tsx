import { buildOverlayVideoPreviewDialog } from "./OverlayVideoPreviewDialog.Designer";
import type { OverlayVideoPreviewDialogProps } from "./OverlayVideoPreviewDialog.Designer";

export type { OverlayVideoPreviewDialogProps, OverlayVideoItem } from "./OverlayVideoPreviewDialog.Designer";

export const createOverlayVideoPreviewDialog = (props: OverlayVideoPreviewDialogProps) =>
    buildOverlayVideoPreviewDialog(props);
