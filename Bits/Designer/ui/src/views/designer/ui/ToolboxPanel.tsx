import { WF } from "../../../../libs/forms";
import { UiText } from "../../uiText";

export const buildToolboxNode = (tools: any[], activeTool: string | null) =>
    WF.Toolbox({
        Title: UiText.playground2.toolboxTitle,
        tools,
        onSelect: "toolboxSelect",
        activeTool,
        Style: "position: absolute; left: 16px; top: 52px; width: 220px;"
    });
