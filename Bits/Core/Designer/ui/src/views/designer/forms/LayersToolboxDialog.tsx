import { buildLayersToolboxDialog } from "./LayersToolboxDialog.Designer";
import type { LayersToolboxDialogProps } from "./LayersToolboxDialog.Designer";

export type { LayersToolboxDialogProps } from "./LayersToolboxDialog.Designer";

export const createLayersToolboxDialog = (props: LayersToolboxDialogProps) => buildLayersToolboxDialog(props);
