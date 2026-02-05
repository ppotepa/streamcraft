import React from "react";
import { FormContainer } from "../forms/FormContainer";
import { WF } from "../forms/winforms";

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

    const formNode = WF.Window(
        {
            Text: "Test Form - WinForms Controls",
            Draggable: true,
            Style: "width: 400px; height: 500px; left: 50px; top: 50px;"
        },
        WF.Panel(
            { Style: "padding: 20px;" },
            WF.Label({
                Text: "Username:",
                Style: "display: block; margin-bottom: 5px; font-weight: bold;"
            }),
            WF.TextBox({
                Text: "",
                PlaceholderText: "Enter your username",
                OnChange: "textChange",
                Style: "width: 100%; margin-bottom: 15px;"
            }),
            WF.Label({
                Text: "Password:",
                Style: "display: block; margin-bottom: 5px; font-weight: bold;"
            }),
            WF.TextBox({
                Text: "",
                PlaceholderText: "Enter your password",
                Password: true,
                OnChange: "textChange",
                Style: "width: 100%; margin-bottom: 15px;"
            }),
            WF.CheckBox({
                Text: "Remember me",
                Checked: false,
                OnChange: "checkChange",
                Style: "display: block; margin-bottom: 15px;"
            }),
            WF.Label({
                Text: "Account Type:",
                Style: "display: block; margin-bottom: 5px; font-weight: bold;"
            }),
            WF.RadioButton({
                Text: "Standard User",
                Group: "accountType",
                Checked: true,
                OnChange: "radioChange",
                Style: "display: block; margin-bottom: 5px;"
            }),
            WF.RadioButton({
                Text: "Administrator",
                Group: "accountType",
                Checked: false,
                OnChange: "radioChange",
                Style: "display: block; margin-bottom: 15px;"
            }),
            WF.Label({
                Text: "Notes:",
                Style: "display: block; margin-bottom: 5px; font-weight: bold;"
            }),
            WF.TextBox({
                Text: "",
                Multiline: true,
                Rows: 4,
                PlaceholderText: "Enter any notes here...",
                OnChange: "textChange",
                Style: "width: 100%; margin-bottom: 15px;"
            }),
            WF.Element("div", { style: "display: flex; gap: 10px; justify-content: flex-end;" },
                WF.Button({
                    Text: "OK",
                    OnClick: "buttonClick",
                    Default: true
                }),
                WF.Button({
                    Text: "Cancel",
                    OnClick: "buttonClick"
                })
            )
        )
    );

    return <FormContainer node={formNode} handlers={handlers} />;
};
