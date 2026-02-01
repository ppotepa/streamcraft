import React from "react";
import { FormContainer } from "../forms/FormContainer";
import { node, element } from "../forms/core";

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
        "window",
        {
            title: "Test Form - WinForms Controls",
            draggable: true,
            style: "width: 400px; height: 500px; left: 50px; top: 50px;"
        },
        node("panel", { style: "padding: 20px;" },
            // Label
            node("label", {
                text: "Username:",
                style: "display: block; margin-bottom: 5px; font-weight: bold;"
            }),

            // TextBox
            node("textBox", {
                value: "",
                placeholder: "Enter your username",
                onChange: "textChange",
                style: "width: 100%; margin-bottom: 15px;"
            }),

            // Label
            node("label", {
                text: "Password:",
                style: "display: block; margin-bottom: 5px; font-weight: bold;"
            }),

            // Password TextBox
            node("textBox", {
                value: "",
                placeholder: "Enter your password",
                password: true,
                onChange: "textChange",
                style: "width: 100%; margin-bottom: 15px;"
            }),

            // CheckBox
            node("checkBox", {
                text: "Remember me",
                checked: false,
                onChange: "checkChange",
                style: "display: block; margin-bottom: 15px;"
            }),

            // RadioButton group
            node("label", {
                text: "Account Type:",
                style: "display: block; margin-bottom: 5px; font-weight: bold;"
            }),
            node("radioButton", {
                text: "Standard User",
                group: "accountType",
                checked: true,
                onChange: "radioChange",
                style: "display: block; margin-bottom: 5px;"
            }),
            node("radioButton", {
                text: "Administrator",
                group: "accountType",
                checked: false,
                onChange: "radioChange",
                style: "display: block; margin-bottom: 15px;"
            }),

            // Multiline TextBox
            node("label", {
                text: "Notes:",
                style: "display: block; margin-bottom: 5px; font-weight: bold;"
            }),
            node("textBox", {
                value: "",
                multiline: true,
                rows: 4,
                placeholder: "Enter any notes here...",
                onChange: "textChange",
                style: "width: 100%; margin-bottom: 15px;"
            }),

            // Buttons
            element("div", { style: "display: flex; gap: 10px; justify-content: flex-end;" },
                node("button", {
                    text: "OK",
                    onClick: "buttonClick",
                    default: true
                }),
                node("button", {
                    text: "Cancel",
                    onClick: "buttonClick"
                })
            )
        )
    );

    return <FormContainer node={formNode} handlers={handlers} />;
};
