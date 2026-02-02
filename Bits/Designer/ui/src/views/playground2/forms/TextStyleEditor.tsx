import React from "react";
import { node, element } from "../../../forms/core";
import { ControlKind } from "../../../forms/controlKinds";
import { UiText } from "../../uiText";

interface TextStyleEditorProps {
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

export const TextStyleEditor: React.FC<TextStyleEditorProps> = ({ selectedItem, onUpdateItem, onClose }) => {
    if (!selectedItem) return null;

    const updateItem = (updates: any) => onUpdateItem(selectedItem.id, updates);

    return node(
        ControlKind.window,
        {
            title: UiText.playground2.textEditorTitle,
            dialog: true,
            draggable: true,
            onClose: "closeTextStyleEditor",
            style: "position: absolute; right: 320px; top: 52px; width: fit-content; max-width: 420px;",
        },
        element(
            "div",
            { className: "canvas-properties" },
            element(
                "div",
                { className: "canvas-properties-section" },
                element(
                    "div",
                    { className: "canvas-properties-row" },
                    element("label", null, UiText.playground2.labels.shadowX),
                    element("input", {
                        type: "number",
                        min: -20,
                        max: 20,
                        value: selectedItem.textShadowX ?? 0,
                        onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
                            updateItem({ textShadowX: Number(event.target.value) || 0 }),
                    })
                ),
                element(
                    "div",
                    { className: "canvas-properties-row" },
                    element("label", null, UiText.playground2.labels.shadowY),
                    element("input", {
                        type: "number",
                        min: -20,
                        max: 20,
                        value: selectedItem.textShadowY ?? 0,
                        onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
                            updateItem({ textShadowY: Number(event.target.value) || 0 }),
                    })
                ),
                element(
                    "div",
                    { className: "canvas-properties-row" },
                    element("label", null, UiText.playground2.labels.shadowBlur),
                    element("input", {
                        type: "number",
                        min: 0,
                        max: 40,
                        value: selectedItem.textShadowBlur ?? 0,
                        onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
                            updateItem({ textShadowBlur: Math.max(0, Number(event.target.value) || 0) }),
                    })
                ),
                element(
                    "div",
                    { className: "canvas-properties-row" },
                    element("label", null, UiText.playground2.labels.shadowColor),
                    element("input", {
                        type: "color",
                        value: selectedItem.textShadowColor ?? "#000000",
                        onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
                            updateItem({ textShadowColor: event.target.value }),
                    })
                )
            )
        )
    );
};
