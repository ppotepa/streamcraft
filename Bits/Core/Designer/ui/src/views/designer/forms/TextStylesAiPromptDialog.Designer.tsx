import React from "react";
import { WF } from "@streamcraft/forms";

export interface TextStylesAiPromptDialogProps {
    prompt: string;
    response: string;
    isGenerating: boolean;
    onPromptChange: (value: string) => void;
    onGenerate: () => void;
    onClose: () => void;
}

export const buildTextStylesAiPromptDialog = (props: TextStylesAiPromptDialogProps) => {
    return WF.Window(
        {
            Text: "Text Styles AI",
            Icon: "star",
            Dialog: true,
            Draggable: true,
            OnClose: "closeTextStylesAiPrompt",
            ClassName: "text-styles-window text-styles-ai-window",
            BodyClassName: "text-styles-body",
            Style: "position: absolute; left: 160px; top: 120px; width: min(720px, 90vw); height: min(520px, 80vh);"
        },
        WF.Element(
            "div",
            { className: "text-styles-ai-shell" },
            WF.Element(
                "div",
                { className: "text-styles-ai-header" },
                WF.Element("div", { className: "text-styles-ai-title" }, "Describe the text style you want"),
                WF.Element("div", { className: "text-styles-ai-sub" }, "Example: “bold neon sci-fi title with cyan glow, condensed font”")
            ),
            WF.Element(
                "textarea",
                {
                    className: "textbox text-styles-input text-styles-ai-input",
                    placeholder: "Type a prompt…",
                    value: props.prompt,
                    rows: 5,
                    onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => props.onPromptChange(event.target.value)
                }
            ),
            WF.Element(
                "div",
                { className: "text-styles-ai-actions" },
                WF.Element(
                    "button",
                    {
                        className: "text-styles-action text-styles-action-primary",
                        onClick: props.onGenerate,
                        disabled: props.isGenerating
                    },
                    props.isGenerating ? "Generating…" : "Generate"
                ),
                WF.Element(
                    "button",
                    { className: "text-styles-action", onClick: props.onClose },
                    "Close"
                )
            ),
            WF.Element(
                "div",
                { className: "text-styles-ai-output" },
                WF.Element("div", { className: "text-styles-section-title" }, "Result (placeholder)"),
                WF.Element("div", { className: "text-styles-ai-response" }, props.response)
            )
        )
    );
};

