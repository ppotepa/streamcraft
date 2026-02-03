import { node } from "../../../forms/core";
import { ControlKind } from "../../../forms/controlKinds";
import { UiText } from "../../uiText";

export const buildToolboxNode = (tools: any[], activeTool: string | null) =>
    node(ControlKind.toolbox, {
        title: UiText.playground2.toolboxTitle,
        tools,
        onSelect: "toolboxSelect",
        activeTool,
        style: "position: absolute; left: 16px; top: 52px; width: 220px;"
    });
