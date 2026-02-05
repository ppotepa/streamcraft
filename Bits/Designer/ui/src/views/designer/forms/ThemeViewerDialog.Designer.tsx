import { WF } from "../../../../../../libs/forms";

export interface ThemeViewerDialogProps {
    themes: string[];
    selectedIndex?: number;
    onThemeSelect?: string;
    onApply?: string;
    onClose: string;
}

export const buildThemeViewerDialog = (props: ThemeViewerDialogProps) => {
    const selectedIndex = props.selectedIndex ?? 0;

    const previewPanel = WF.Panel({
        Name: "themePreviewPanel",
        Style: "display: grid; gap: 12px; padding: 10px; background: var(--sc-surface-alt); border: 1px solid var(--sc-border-dark);",
        Controls: [
            WF.GroupBox({
                Text: "Common Controls",
                Controls: [
                    WF.Panel({
                        Style: "display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px;",
                        Controls: [
                            WF.Button({ Text: "Button", Style: "width: 100%;" }),
                            WF.TextBox({ Text: "TextBox", Style: "width: 100%;" }),
                            WF.ComboBox({ Items: ["ComboBox", "Option 2", "Option 3"], SelectedIndex: 0 }),
                            WF.ProgressBar({ Value: "65", Maximum: "100" }),
                            WF.CheckBox({ Text: "Checkbox", Checked: true }),
                            WF.RadioButton({ Text: "Radio", Checked: true })
                        ]
                    })
                ]
            }),
            WF.GroupBox({
                Text: "List Preview",
                Controls: [
                    WF.ListBox({
                        Items: ["Item 1", "Item 2", "Item 3", "Item 4"],
                        SelectedIndex: "1",
                        Style: "width: 100%; height: 120px;"
                    })
                ]
            })
        ]
    });

    return WF.Window(
        {
            Name: "ThemeViewerDialog",
            Text: "Theme Viewer",
            ClassName: "theme-viewer-dialog",
            Dialog: true,
            Draggable: true,
            StartPosition: "CenterScreen",
            Style: "width: 760px; height: 520px; z-index: 10000;"
        },
        WF.Panel({
            Name: "themeViewerRoot",
            Style: "display: flex; flex-direction: column; height: 100%;",
            Controls: [
                WF.Panel({
                    Name: "themeViewerContent",
                    Style: "display: flex; gap: 12px; padding: 12px; flex: 1; min-height: 0;",
                    Controls: [
                        WF.Panel({
                            Style: "width: 220px; display: grid; gap: 8px;",
                            Controls: [
                                WF.Label({ Text: "Themes" }),
                                WF.ListBox({
                                    Items: props.themes,
                                    SelectedIndex: String(selectedIndex),
                                    OnChange: props.onThemeSelect ?? "",
                                    Style: "width: 100%; height: 100%; min-height: 320px;"
                                })
                            ]
                        }),
                        WF.Panel({
                            Style: "flex: 1; display: grid; gap: 8px;",
                            Controls: [
                                WF.Label({ Text: "Preview" }),
                                previewPanel
                            ]
                        })
                    ]
                }),
                WF.Panel({
                    Name: "themeViewerButtons",
                    Style: "height: 56px; padding: 10px; display: flex; justify-content: flex-end; align-items: center; gap: 10px; background: var(--sc-surface-alt); border-top: 1px solid var(--sc-border-dark);",
                    Controls: [
                        WF.Button({
                            Text: "Apply",
                            Style: "padding: 6px 20px;",
                            OnClick: props.onApply ?? props.onClose
                        }),
                        WF.Button({
                            Text: "Close",
                            Style: "padding: 6px 20px;",
                            OnClick: props.onClose
                        })
                    ]
                })
            ]
        })
    );
};
