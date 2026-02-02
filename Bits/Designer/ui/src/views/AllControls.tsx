import React, { useMemo, useState } from "react";
import { FormContainer } from "../forms/FormContainer";
import { element, node } from "../forms/core";
import { ControlKind } from "../forms/controlKinds";

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

    const menuNode = node(
        ControlKind.menuBar,
        {},
        node(ControlKind.menuItem, { label: "File" },
            node(ControlKind.menuItemEntry, { onClick: "toggleMessage", icon: "new" }, element("span", {}, "New"))
        ),
        node(ControlKind.menuItem, { label: "Edit" },
            node(ControlKind.menuItemEntry, { onClick: "toggleMessage", icon: "edit" }, element("span", {}, "Edit"))
        ),
        node(ControlKind.menuItem, { label: "Help" },
            node(ControlKind.menuItemEntry, { onClick: "toggleMessage", icon: "info" }, element("span", {}, "About"))
        )
    );

    const toolStripNode = node(ControlKind.toolStrip, {
        tiles: [
            node(ControlKind.toolButton, { label: "Select", icon: "select", pressed: true }),
            node(ControlKind.toolButton, { label: "Draw", icon: "draw" })
        ],
        options: [
            node(ControlKind.switchButton, { text: "Snap", pressed: true })
        ],
        actions: [
            node(ControlKind.button, { text: "Run", onClick: "toggleMessage" })
        ]
    });

    const docBarNode = node(ControlKind.docBar, {
        left: [
            element("div", { className: "doc-tab active" }, "Document 1"),
            element("div", { className: "doc-tab" }, "Document 2")
        ],
        right: [
            element("div", { className: "doc-control" }, "⋯")
        ]
    });

    const inputsNode = node(
        ControlKind.groupBox,
        { text: "Inputs" },
        element("div", { style: "display: grid; gap: 8px;" },
            node(ControlKind.label, { text: "Label" }),
            node(ControlKind.textBox, { value: "Text box" }),
            node(ControlKind.button, { text: "Button", onClick: "toggleMessage" }),
            node(ControlKind.checkBox, { text: "CheckBox", checked, onChange: "checkChange" }),
            node(ControlKind.radioButton, { text: "Radio A", value: "a", group: "sample", checked: radioValue === "a", onChange: "radioChange" }),
            node(ControlKind.radioButton, { text: "Radio B", value: "b", group: "sample", checked: radioValue === "b", onChange: "radioChange" })
        )
    );

    const selectorsNode = node(
        ControlKind.groupBox,
        { text: "Selectors" },
        element("div", { style: "display: grid; gap: 8px;" },
            node(ControlKind.comboBox, { items: "Alpha,Beta,Gamma", selectedIndex: String(comboIndex), onChange: "comboChange" }),
            node(ControlKind.listBox, { items: "One,Two,Three,Four", selectedIndices: listSelection.join(","), selectionMode: "multi", size: "4", onChange: "listChange" })
        )
    );

    const indicatorsNode = node(
        ControlKind.groupBox,
        { text: "Indicators" },
        element("div", { style: "display: grid; gap: 8px;" },
            node(ControlKind.progressBar, { value: progressValue, max: 100 }),
            node(ControlKind.trackBar, { value: trackValue, min: 0, max: 100, onChange: "trackChange" })
        )
    );

    const layoutNode = node(
        ControlKind.groupBox,
        { text: "Layout" },
        node(ControlKind.splitContainer, { orientation: "vertical", splitPosition: "50%", style: "height: 160px;" },
            node(ControlKind.panel, { title: "Panel A", style: "height: 100%;" }, element("div", {}, "Panel content")),
            node(ControlKind.panel, { title: "Panel B", style: "height: 100%;" }, element("div", {}, "Panel content"))
        )
    );

    const tabsNode = node(
        ControlKind.groupBox,
        { text: "Tabs" },
        node(ControlKind.tabControl, { style: "height: 160px;" },
            node(ControlKind.tabPage, { title: "Tab 1" }, element("div", {}, "Tab content")),
            node(ControlKind.tabPage, { title: "Tab 2" }, element("div", {}, "More content"))
        )
    );

    const diagnosticsNode = node(ControlKind.diagnosticsPanel, { title: "Diagnostics", maxItems: 5 });

    const messageBoxNode = showMessage
        ? node(ControlKind.messageBox, { title: "Message", message: "This is a message box.", mode: "alert", onResult: "messageResult" })
        : null;

    const viewNode = element(
        "div",
        { style: "padding: 12px; display: grid; gap: 12px; height: 100%; box-sizing: border-box;" },
        menuNode,
        toolStripNode,
        docBarNode,
        element("div", { style: "display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px;" },
            inputsNode,
            selectorsNode,
            indicatorsNode,
            tabsNode
        ),
        layoutNode,
        diagnosticsNode
    );

    const showcaseNode = node(
        ControlKind.window,
        {
            title: "Controls Showcase",
            draggable: true,
            startPosition: "centerParent",
            style: "width: min(1100px, 92vw); height: min(90vh, 900px);"
        },
        node(ControlKind.panel, { style: "height: 100%; overflow: auto;" }, viewNode)
    );

    return (
        <FormContainer
            node={element("div", { style: "padding: 16px;" }, showcaseNode, messageBoxNode)}
            handlers={handlers}
        />
    );
};
