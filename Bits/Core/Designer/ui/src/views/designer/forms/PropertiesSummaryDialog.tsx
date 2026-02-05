import { buildPropertiesSummaryDialog } from "./PropertiesSummaryDialog.Designer";
import type { PropertiesSummaryDialogProps, PropertiesSummaryTextDetails } from "./PropertiesSummaryDialog.Designer";

export type { PropertiesSummaryDialogProps, PropertiesSummaryTextDetails } from "./PropertiesSummaryDialog.Designer";

export const createPropertiesSummaryDialog = (props: PropertiesSummaryDialogProps) =>
    buildPropertiesSummaryDialog(props);
