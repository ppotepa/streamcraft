import React from "react";
import { element, node } from "../../../forms/core";
import { ControlKind } from "../../../forms/controlKinds";

export interface TextStylesAiPromptDialogProps {
    prompt: string;
    response: string;
    isGenerating: boolean;
    onPromptChange: (value: string) => void;
    onGenerate: () => void;
    onClose: () => void;
}

export const createTextStylesAiPromptDialog = (props: TextStylesAiPromptDialogProps) => {
    return node(
        ControlKind.window,
        {
            title: "Text Styles AI",
            icon: "star",
            dialog: true,
            draggable: true,
            onClose: "closeTextStylesAiPrompt",
            className: "text-styles-window text-styles-ai-window",
            bodyClassName: "text-styles-body",
            style: "position: absolute; left: 160px; top: 120px; width: min(720px, 90vw); height: min(520px, 80vh);"
        },
        element(
            "div",
            { className: "text-styles-ai-shell" },
            element(
                "div",
                { className: "text-styles-ai-header" },
                element("div", { className: "text-styles-ai-title" }, "Describe the text style you want"),
                element("div", { className: "text-styles-ai-sub" }, "Example: “bold neon sci-fi title with cyan glow, condensed font”")
            ),
            element(
                "textarea",
                {
                    className: "textbox text-styles-input text-styles-ai-input",
                    placeholder: "Type a prompt…",
                    value: props.prompt,
                    rows: 5,
                    onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => props.onPromptChange(event.target.value)
                }
            ),
            element(
                "div",
                { className: "text-styles-ai-actions" },
                element(
                    "button",
                    {
                        className: "text-styles-action text-styles-action-primary",
                        onClick: props.onGenerate,
                        disabled: props.isGenerating
                    },
                    props.isGenerating ? "Generating…" : "Generate"
                ),
                element(
                    "button",
                    { className: "text-styles-action", onClick: props.onClose },
                    "Close"
                )
            ),
            element(
                "div",
                { className: "text-styles-ai-output" },
                element("div", { className: "text-styles-section-title" }, "Result (placeholder)"),
                element("div", { className: "text-styles-ai-response" }, props.response)
            )
        )
    );
};
