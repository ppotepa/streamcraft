import { WF } from "@streamcraft/forms";
import { UiText } from "../../uiText";

export interface PropertiesSummaryTextDetails {
    fontFamily: string;
    fontSize: string;
    fontWeight: string;
    fontStyle: string;
    textTransform: string;
    textColor: string;
    letterSpacing: string;
    shadow: string;
}

export interface PropertiesSummaryDialogProps {
    canBind: boolean;
    bindingSummary: string;
    fieldPath?: string | null;
    textDetails?: PropertiesSummaryTextDetails | null;
}

export const buildPropertiesSummaryDialog = (props: PropertiesSummaryDialogProps) => {
    const textDetails = props.textDetails ?? null;

    return WF.Window(
        {
            Text: UiText.playground2.propertiesTitle,
            Dialog: true,
            close: false,
            minimize: false,
            maximize: false,
            Draggable: true,
            Style: "position: absolute; right: 16px; top: 52px; width: fit-content; max-width: 300px;"
        },
        WF.Element(
            "div",
            { className: "properties-container" },
            WF.Element(
                "div",
                { className: "canvas-properties" },
                WF.TabControl(
                    { Style: "width: 100%;", MultiRows: true },
                    WF.TabPage(
                        { Text: "Info" },
                        WF.Element(
                            "div",
                            { className: "canvas-properties-section" },
                            props.canBind
                                ? WF.Field(
                                    UiText.playground2.labels.bindingSummary,
                                    WF.Element("div", { className: "canvas-properties-readonly" }, props.bindingSummary)
                                )
                                : WF.Element("div", { className: "canvas-properties-empty" }, UiText.playground2.empty.noBinding),
                            props.canBind
                                ? WF.Field(
                                    UiText.playground2.labels.path,
                                    WF.Element("div", { className: "canvas-properties-readonly" }, props.fieldPath ?? UiText.playground2.options.select)
                                )
                                : null
                        )
                    ),
                    WF.TabPage(
                        { Text: "Properties" },
                        WF.Element(
                            "div",
                            { className: "canvas-properties-section" },
                            textDetails
                                ? WF.Element(
                                    "div",
                                    { className: "canvas-properties-section" },
                                    WF.Field(
                                        "Font",
                                        WF.Element("div", { className: "canvas-properties-readonly" }, textDetails.fontFamily)
                                    ),
                                    WF.Field(
                                        "Size",
                                        WF.Element("div", { className: "canvas-properties-readonly" }, textDetails.fontSize)
                                    ),
                                    WF.Field(
                                        "Weight",
                                        WF.Element("div", { className: "canvas-properties-readonly" }, textDetails.fontWeight)
                                    ),
                                    WF.Field(
                                        "Style",
                                        WF.Element("div", { className: "canvas-properties-readonly" }, textDetails.fontStyle)
                                    ),
                                    WF.Field(
                                        "Case",
                                        WF.Element("div", { className: "canvas-properties-readonly" }, textDetails.textTransform)
                                    ),
                                    WF.Field(
                                        "Color",
                                        WF.Element("div", { className: "canvas-properties-readonly" }, textDetails.textColor)
                                    ),
                                    WF.Field(
                                        "Spacing",
                                        WF.Element("div", { className: "canvas-properties-readonly" }, textDetails.letterSpacing)
                                    ),
                                    WF.Field(
                                        "Shadow",
                                        WF.Element("div", { className: "canvas-properties-readonly" }, textDetails.shadow)
                                    )
                                )
                                : WF.Element("div", { className: "canvas-properties-empty" }, "No style details for this control.")
                        )
                    )
                )
            )
        )
    );
};

