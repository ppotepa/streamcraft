import React from "react";
import { WF } from "../../../../../../libs/forms";
import { UiText } from "../../uiText";

export interface TextStyleEditorProps {
    selectedItem: {
        id: string;
        textShadowX?: number;
        textShadowY?: number;
        textShadowBlur?: number;
        textShadowColor?: string;
    } | null;
    onUpdateItem: (itemId: string, updates: any) => void;
    onClose: () => void;
}

export const buildTextStyleEditor = (props: TextStyleEditorProps) => {
    const selectedItem = props.selectedItem;
    if (!selectedItem) return null;

    const updateItem = (updates: any) => props.onUpdateItem(selectedItem.id, updates);

    return WF.Window(
        {
            Text: UiText.playground2.textEditorTitle,
            Dialog: true,
            Draggable: true,
            OnClose: "closeTextStyleEditor",
            Style: "position: absolute; right: 320px; top: 52px; width: fit-content; max-width: 420px;"
        },
        WF.Element(
            "div",
            { className: "canvas-properties" },
            WF.Element(
                "div",
                { className: "canvas-properties-section" },
                WF.Field(
                    UiText.playground2.labels.shadowX,
                    WF.Number({
                        Value: selectedItem.textShadowX ?? 0,
                        Min: -20,
                        Max: 20,
                        OnChange: (event) => updateItem({ textShadowX: Number(event.target.value) || 0 })
                    })
                ),
                WF.Field(
                    UiText.playground2.labels.shadowY,
                    WF.Number({
                        Value: selectedItem.textShadowY ?? 0,
                        Min: -20,
                        Max: 20,
                        OnChange: (event) => updateItem({ textShadowY: Number(event.target.value) || 0 })
                    })
                ),
                WF.Field(
                    UiText.playground2.labels.shadowBlur,
                    WF.Number({
                        Value: selectedItem.textShadowBlur ?? 0,
                        Min: 0,
                        Max: 40,
                        OnChange: (event) => updateItem({ textShadowBlur: Math.max(0, Number(event.target.value) || 0) })
                    })
                ),
                WF.Field(
                    UiText.playground2.labels.shadowColor,
                    WF.Element("input", {
                        type: "color",
                        value: selectedItem.textShadowColor ?? "#000000",
                        onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
                            updateItem({ textShadowColor: event.target.value })
                    })
                )
            )
        )
    );
};
