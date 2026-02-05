import { buildThemeViewerDialog, type ThemeViewerDialogProps } from "./ThemeViewerDialog.Designer";
import type { FormNode } from "@streamcraft/forms/core";

export type { ThemeViewerDialogProps };

export const createThemeViewerDialog = (props: ThemeViewerDialogProps): FormNode => {
    return buildThemeViewerDialog(props);
};

