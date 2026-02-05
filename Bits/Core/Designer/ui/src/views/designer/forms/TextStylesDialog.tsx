import { buildTextStylesDialog } from "./TextStylesDialog.Designer";
import type { TextStylesDialogProps } from "./TextStylesDialog.Designer";

export type { TextStylesDialogProps, TextStyleCatalogEntry, TextStylesCategory } from "./TextStylesDialog.Designer";

export const createTextStylesDialog = (props: TextStylesDialogProps) => buildTextStylesDialog(props);
