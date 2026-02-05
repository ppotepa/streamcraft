import { WF } from "@streamcraft/forms";

export interface ThemeViewerDialogProps {
    themes: string[];
    selectedIndex?: number;
    onThemeSelect?: string;
    modeOptions: string[];
    modeSelectedIndex?: number;
    onModeChange?: string;
    onApply?: string;
    onClose: string;
    aiPrompt?: string;
    aiResponse?: string;
    aiStatus?: string;
    aiIsBusy?: boolean;
    aiThemeName?: string;
    aiThemeDescription?: string;
    aiOnPromptChange?: string;
    aiOnGenerate?: string;
    aiOnApply?: string;
    aiOnClear?: string;
    aiOnRefreshStatus?: string;
}

export const buildThemeViewerDialog = (props: ThemeViewerDialogProps) => {
    const selectedIndex = props.selectedIndex ?? 0;
    const modeSelectedIndex = props.modeSelectedIndex ?? 0;
    const aiPrompt = props.aiPrompt ?? "";
    const aiResponse = props.aiResponse ?? "";
    const aiStatus = props.aiStatus ?? "AI status: not checked.";
    const aiThemeName = props.aiThemeName ?? "None";
    const aiThemeDescription = props.aiThemeDescription ?? "";
    const aiBusy = props.aiIsBusy ?? false;

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

    const themesTab = WF.Panel({
        Name: "themeViewerContent",
        Style: "display: flex; gap: 12px; padding: 12px; flex: 1; min-height: 0;",
        Controls: [
            WF.Panel({
                Style: "width: 220px; display: grid; gap: 8px;",
                Controls: [
                    WF.Label({ Text: "Themes" }),
                    WF.Label({ Text: "Mode" }),
                    WF.ComboBox({
                        Items: props.modeOptions,
                        SelectedIndex: modeSelectedIndex,
                        OnChange: props.onModeChange ?? ""
                    }),
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
    });

    const aiTab = WF.Panel({
        Name: "themeAiPanel",
        Style: "display: grid; gap: 12px; padding: 12px; height: 100%;",
        Controls: [
            WF.GroupBox({
                Text: "AI Theme Generator (Experimental)",
                Controls: [
                    WF.Panel({
                        Style: "display: grid; gap: 6px;",
                        Controls: [
                            WF.Label({ Text: aiStatus }),
                            WF.Label({ Text: `Active theme: ${aiThemeName}` }),
                            aiThemeDescription
                                ? WF.Label({ Text: aiThemeDescription, Style: "font-size: 12px; color: var(--sc-text-muted);" })
                                : null
                        ]
                    })
                ]
            }),
            WF.GroupBox({
                Text: "Prompt",
                Controls: [
                    WF.TextBox({
                        Text: aiPrompt,
                        Multiline: true,
                        Rows: 5,
                        Style: "width: 100%;",
                        OnChange: props.aiOnPromptChange ?? ""
                    })
                ]
            }),
            WF.Panel({
                Style: "display: flex; flex-wrap: wrap; gap: 8px;",
                Controls: [
                    WF.Button({
                        Text: aiBusy ? "Generating..." : "Generate",
                        OnClick: props.aiOnGenerate ?? "",
                        Enabled: !aiBusy
                    }),
                    WF.Button({
                        Text: "Apply AI Theme",
                        OnClick: props.aiOnApply ?? ""
                    }),
                    WF.Button({
                        Text: "Clear AI Theme",
                        OnClick: props.aiOnClear ?? ""
                    }),
                    WF.Button({
                        Text: "Refresh Status",
                        OnClick: props.aiOnRefreshStatus ?? ""
                    })
                ]
            }),
            WF.GroupBox({
                Text: "Output",
                Controls: [
                    WF.TextBox({
                        Text: aiResponse,
                        Multiline: true,
                        Rows: 9,
                        ReadOnly: true,
                        Style: "width: 100%;"
                    })
                ]
            })
        ]
    });

    const tabControl = WF.TabControl(
        { Style: "width: 100%; flex: 1; min-height: 0;" },
        WF.TabPage({ Text: "Themes" }, themesTab),
        WF.TabPage({ Text: "AI Themes (Experimental)" }, aiTab)
    );

    return WF.Window(
        {
            Name: "ThemeViewerDialog",
            Text: "Theme Viewer",
            ClassName: "theme-viewer-dialog",
            Dialog: true,
            Draggable: true,
            StartPosition: "CenterScreen",
            OnClose: props.onClose,
            Style: "width: 760px; height: 520px; z-index: 10000;"
        },
        WF.Panel({
            Name: "themeViewerRoot",
            Style: "display: flex; flex-direction: column; height: 100%;",
            Controls: [
                tabControl,
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

