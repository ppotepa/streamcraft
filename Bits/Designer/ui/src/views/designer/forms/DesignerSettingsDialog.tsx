import { buildDesignerSettingsDialog, type DesignerSettingsDialogProps } from "./DesignerSettingsDialog.Designer";
import type { FormNode } from "../../../../../../libs/forms/core";

export type { DesignerSettingsDialogProps };

export const createDesignerSettingsDialog = (props: DesignerSettingsDialogProps): FormNode => {
    return buildDesignerSettingsDialog(props);
};
