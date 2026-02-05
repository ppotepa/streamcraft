import { buildTextStylesAiPromptDialog } from "./TextStylesAiPromptDialog.Designer";
import type { TextStylesAiPromptDialogProps } from "./TextStylesAiPromptDialog.Designer";

export type { TextStylesAiPromptDialogProps } from "./TextStylesAiPromptDialog.Designer";

export const createTextStylesAiPromptDialog = (props: TextStylesAiPromptDialogProps) =>
    buildTextStylesAiPromptDialog(props);
