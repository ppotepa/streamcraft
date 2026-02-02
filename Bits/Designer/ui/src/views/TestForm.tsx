import React from "react";
import { FormContainer } from "../forms/FormContainer";
import { node, element } from "../forms/core";
import { ControlKind } from "../forms/controlKinds";

export const TestForm: React.FC = () => {
    const handlers = {
        buttonClick: (args: any) => {
            console.log("Button clicked!", args);
            alert("Button was clicked!");
        },
        textChange: (args: any) => {
            console.log("Text changed:", args.value);
        },
        checkChange: (args: any) => {
            console.log("Checkbox changed:", args.checked);
        },
        radioChange: (args: any) => {
            console.log("Radio changed:", args);
        }
    };

    const formNode = node(
        ControlKind.window,
        {
            title: "Test Form - WinForms Controls",
            draggable: true,
            style: "width: 400px; height: 500px; left: 50px; top: 50px;"
        },
        node(ControlKind.panel, { style: "padding: 20px;" },
            // Label
            node(ControlKind.label, {
                text: "Username:",
                style: "display: block; margin-bottom: 5px; font-weight: bold;"
            }),

            // TextBox
            node(ControlKind.textBox, {
                value: "",
                placeholder: "Enter your username",
                onChange: "textChange",
                style: "width: 100%; margin-bottom: 15px;"
            }),

            // Label
            node(ControlKind.label, {
                text: "Password:",
                style: "display: block; margin-bottom: 5px; font-weight: bold;"
            }),

            // Password TextBox
            node(ControlKind.textBox, {
                value: "",
                placeholder: "Enter your password",
                password: true,
                onChange: "textChange",
                style: "width: 100%; margin-bottom: 15px;"
            }),

            // CheckBox
            node(ControlKind.checkBox, {
                text: "Remember me",
                checked: false,
                onChange: "checkChange",
                style: "display: block; margin-bottom: 15px;"
            }),

            // RadioButton group
            node(ControlKind.label, {
                text: "Account Type:",
                style: "display: block; margin-bottom: 5px; font-weight: bold;"
            }),
            node(ControlKind.radioButton, {
                text: "Standard User",
                group: "accountType",
                checked: true,
                onChange: "radioChange",
                style: "display: block; margin-bottom: 5px;"
            }),
            node(ControlKind.radioButton, {
                text: "Administrator",
                group: "accountType",
                checked: false,
                onChange: "radioChange",
                style: "display: block; margin-bottom: 15px;"
            }),

            // Multiline TextBox
            node(ControlKind.label, {
                text: "Notes:",
                style: "display: block; margin-bottom: 5px; font-weight: bold;"
            }),
            node(ControlKind.textBox, {
                value: "",
                multiline: true,
                rows: 4,
                placeholder: "Enter any notes here...",
                onChange: "textChange",
                style: "width: 100%; margin-bottom: 15px;"
            }),

            // Buttons
            element("div", { style: "display: flex; gap: 10px; justify-content: flex-end;" },
                node(ControlKind.button, {
                    text: "OK",
                    onClick: "buttonClick",
                    default: true
                }),
                node(ControlKind.button, {
                    text: "Cancel",
                    onClick: "buttonClick"
                })
            )
        )
    );

    return <FormContainer node={formNode} handlers={handlers} />;
};
