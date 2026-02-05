import React, { useMemo, useState } from "react";
import { FormContainer } from "../../../../libs/forms/FormContainer";
import { WF } from "../../../../libs/forms";

export const AllControls: React.FC = () => {
    const [checked, setChecked] = useState(true);
    const [radioValue, setRadioValue] = useState("a");
    const [comboIndex, setComboIndex] = useState(1);
    const [listSelection, setListSelection] = useState<number[]>([1]);
    const [trackValue, setTrackValue] = useState(35);
    const [progressValue, setProgressValue] = useState(45);
    const [showMessage, setShowMessage] = useState(false);

    const handlers = useMemo(
        () => ({
            toggleMessage: () => setShowMessage(true),
            messageResult: () => setShowMessage(false),
            checkChange: (args: any) => setChecked(Boolean(args?.checked)),
            radioChange: (args: any) => setRadioValue(args?.value ?? "a"),
            comboChange: (args: any) => setComboIndex(Number(args?.selectedIndex ?? 0)),
            listChange: (args: any) => setListSelection(Array.isArray(args?.selectedIndices) ? args.selectedIndices : []),
            trackChange: (args: any) => setTrackValue(Number(args?.value ?? 0)),
            progressChange: (args: any) => setProgressValue(Number(args?.value ?? 0))
        }),
        []
    );

    const menuNode = WF.MenuStrip(
        undefined,
        WF.MenuItem(
            { Text: "File" },
            WF.MenuItemEntry({ Text: "New", Icon: "new", OnClick: "toggleMessage" })
        ),
        WF.MenuItem(
            { Text: "Edit" },
            WF.MenuItemEntry({ Text: "Edit", Icon: "edit", OnClick: "toggleMessage" })
        ),
        WF.MenuItem(
            { Text: "Help" },
            WF.MenuItemEntry({ Text: "About", Icon: "info", OnClick: "toggleMessage" })
        )
    );

    const toolStripNode = WF.ToolStrip({
        Tiles: [
            WF.ToolStripButton({ Label: "Select", Icon: "select", Pressed: true }),
            WF.ToolStripButton({ Label: "Draw", Icon: "draw" })
        ],
        Options: [
            WF.SwitchButton({ Text: "Snap", Checked: true })
        ],
        Actions: [
            WF.Button({ Text: "Run", OnClick: "toggleMessage" })
        ]
    });

    const docBarNode = WF.DocBar({
        Left: [
            WF.Element("div", { className: "doc-tab active" }, "Document 1"),
            WF.Element("div", { className: "doc-tab" }, "Document 2")
        ],
        Right: [
            WF.Element("div", { className: "doc-control" }, "⋯")
        ]
    });

    const inputsNode = WF.GroupBox(
        { Text: "Inputs" },
        WF.Element("div", { style: "display: grid; gap: 8px;" },
            WF.Label({ Text: "Label" }),
            WF.TextBox({ Text: "Text box" }),
            WF.Button({ Text: "Button", OnClick: "toggleMessage" }),
            WF.CheckBox({ Text: "CheckBox", Checked: checked, OnChange: "checkChange" }),
            WF.RadioButton({ Text: "Radio A", Group: "sample", Checked: radioValue === "a", OnChange: "radioChange" }),
            WF.RadioButton({ Text: "Radio B", Group: "sample", Checked: radioValue === "b", OnChange: "radioChange" })
        )
    );

    const selectorsNode = WF.GroupBox(
        { Text: "Selectors" },
        WF.Element("div", { style: "display: grid; gap: 8px;" },
            WF.ComboBox({ Items: "Alpha,Beta,Gamma", SelectedIndex: String(comboIndex), OnChange: "comboChange" }),
            WF.ListBox({ Items: "One,Two,Three,Four", SelectedIndices: listSelection.join(","), SelectionMode: "multi", OnChange: "listChange", Style: "height: 120px;" })
        )
    );

    const indicatorsNode = WF.GroupBox(
        { Text: "Indicators" },
        WF.Element("div", { style: "display: grid; gap: 8px;" },
            WF.ProgressBar({ Value: progressValue, Maximum: 100 }),
            WF.TrackBar({ Value: trackValue, Minimum: 0, Maximum: 100, OnChange: "trackChange" })
        )
    );

    const layoutNode = WF.GroupBox(
        { Text: "Layout" },
        WF.SplitContainer(
            { Orientation: "vertical", SplitPosition: "50%", Style: "height: 160px;" },
            WF.Panel({ Text: "Panel A", Style: "height: 100%;" }, WF.Element("div", {}, "Panel content")),
            WF.Panel({ Text: "Panel B", Style: "height: 100%;" }, WF.Element("div", {}, "Panel content"))
        )
    );

    const tabsNode = WF.GroupBox(
        { Text: "Tabs" },
        WF.TabControl(
            { Style: "height: 160px;" },
            WF.TabPage({ Text: "Tab 1" }, WF.Element("div", {}, "Tab content")),
            WF.TabPage({ Text: "Tab 2" }, WF.Element("div", {}, "More content"))
        )
    );

    const diagnosticsNode = WF.DiagnosticsPanel({ Text: "Diagnostics", MaxItems: 5 });

    const messageBoxNode = showMessage
        ? WF.MessageBox({ Title: "Message", Message: "This is a message box.", Mode: "alert", OnResult: "messageResult" })
        : null;

    const viewNode = WF.Element(
        "div",
        { style: "padding: 12px; display: grid; gap: 12px; height: 100%; box-sizing: border-box;" },
        menuNode,
        toolStripNode,
        docBarNode,
        WF.Element("div", { style: "display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px;" },
            inputsNode,
            selectorsNode,
            indicatorsNode,
            tabsNode
        ),
        layoutNode,
        diagnosticsNode
    );

    const showcaseNode = WF.Window(
        {
            Text: "Controls Showcase",
            Draggable: true,
            StartPosition: "centerParent",
            Style: "width: min(1100px, 92vw); height: min(90vh, 900px);"
        },
        WF.Panel({ Style: "height: 100%; overflow: auto;" }, viewNode)
    );

    return (
        <FormContainer
            node={WF.Element("div", { style: "padding: 16px;" }, showcaseNode, messageBoxNode)}
            handlers={handlers}
        />
    );
};
