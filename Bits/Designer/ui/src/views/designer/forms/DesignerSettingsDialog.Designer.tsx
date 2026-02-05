import { WF } from "@streamcraft/forms";

export interface DesignerSettingsDialogProps {
    onClose: string;
    onApply?: string;
    onConfirm?: string;
    activeTab?: number;
    themeOptions: string[];
    themeSelectedIndex?: number;
    onThemeChange?: string;
    themeModeOptions: string[];
    themeModeIndex?: number;
    onThemeModeChange?: string;
    onOpenThemeViewer?: string;
}

export const buildDesignerSettingsDialog = (props: DesignerSettingsDialogProps) => {
    const activeTab = props.activeTab ?? 0;

    const themeSelectedIndex = props.themeSelectedIndex ?? 0;
    const themeModeIndex = props.themeModeIndex ?? 0;
    const tabPages = [
        WF.TabPage({
            Text: "General",
            Controls: [
                WF.Panel({
                Name: "generalTab",
                Style: "padding: 20px;",
                Controls: [
                    WF.GroupBox({
                        Text: "Appearance",
                        Style: "margin-bottom: 16px;",
                        Controls: [
                            WF.Label({ Text: "Theme:", Style: "margin-top: 6px;" }),
                            WF.ComboBox({
                                Name: "themeCombo",
                                Items: props.themeOptions,
                                SelectedIndex: themeSelectedIndex,
                                OnChange: props.onThemeChange ?? ""
                            }),
                            WF.Label({ Text: "Mode:", Style: "margin-top: 10px;" }),
                            WF.ComboBox({
                                Name: "themeModeCombo",
                                Items: props.themeModeOptions,
                                SelectedIndex: themeModeIndex,
                                OnChange: props.onThemeModeChange ?? ""
                            }),
                            WF.Button({
                                Text: "Browse themes...",
                                Style: "margin-top: 8px; padding: 6px 12px;",
                                OnClick: props.onOpenThemeViewer ?? ""
                            }),
                            WF.CheckBox({ Text: "Show status bar", Checked: true, Style: "margin-top: 10px;" }),
                            WF.CheckBox({ Text: "Show context bar", Checked: true, Style: "margin-top: 6px;" })
                        ]
                    }),
                    WF.GroupBox({
                        Text: "Autosave & Recovery",
                        Style: "margin-bottom: 16px;",
                        Controls: [
                            WF.CheckBox({ Text: "Enable autosave", Checked: true, Style: "margin-top: 6px;" }),
                            WF.Label({ Text: "Autosave interval (seconds):", Style: "margin-top: 8px;" }),
                            WF.TextBox({ Text: "5", Style: "width: 100px;" }),
                            WF.CheckBox({ Text: "Show autosave overlay", Checked: true, Style: "margin-top: 10px;" })
                        ]
                    }),
                    WF.GroupBox({
                        Text: "Workspace",
                        Controls: [
                            WF.CheckBox({ Text: "Remember docking layout", Checked: true, Style: "margin-top: 6px;" }),
                            WF.CheckBox({ Text: "Restore last workspace on startup", Checked: true, Style: "margin-top: 6px;" }),
                            WF.Button({ Text: "Reset layout to defaults", Style: "margin-top: 10px; padding: 6px 12px;" })
                        ]
                    })
                ]
            })
            ]
        }),
        WF.TabPage({
            Text: "Grid & Snap",
            Controls: [
                WF.Panel({
                Name: "gridTab",
                Style: "padding: 20px;",
                Controls: [
                    WF.Label({ Text: "Grid & Snap Settings", Style: "font-size: 16px; font-weight: bold; margin-bottom: 15px;" }),
                    WF.CheckBox({ Text: "Show grid", Checked: true }),
                    WF.CheckBox({ Text: "Snap to grid", Checked: true, Style: "margin-top: 10px;" }),
                    WF.Label({ Text: "Grid size (pixels):", Style: "margin-top: 15px;" }),
                    WF.TextBox({ Text: "10", Style: "width: 100px;" }),
                    WF.Label({ Text: "Grid color:", Style: "margin-top: 15px;" }),
                    WF.TextBox({ Text: "#333333", Style: "width: 100px;" })
                ]
            })
            ]
        }),
        WF.TabPage({
            Text: "Canvas",
            Controls: [
                WF.Panel({
                Name: "canvasTab",
                Style: "padding: 20px;",
                Controls: [
                    WF.Label({ Text: "Canvas Settings", Style: "font-size: 16px; font-weight: bold; margin-bottom: 15px;" }),
                    WF.Label({ Text: "Default canvas width:", Style: "margin-top: 10px;" }),
                    WF.TextBox({ Text: "1920", Style: "width: 100px;" }),
                    WF.Label({ Text: "Default canvas height:", Style: "margin-top: 10px;" }),
                    WF.TextBox({ Text: "1080", Style: "width: 100px;" }),
                    WF.CheckBox({ Text: "Show rulers", Checked: true, Style: "margin-top: 15px;" }),
                    WF.CheckBox({ Text: "Show guides", Checked: true, Style: "margin-top: 10px;" })
                ]
            })
            ]
        }),
        WF.TabPage({
            Text: "Toolbox",
            Controls: [
                WF.Panel({
                Name: "toolboxTab",
                Style: "padding: 20px;",
                Controls: [
                    WF.Label({ Text: "Toolbox Settings", Style: "font-size: 16px; font-weight: bold; margin-bottom: 15px;" }),
                    WF.Label({ Text: "Toolbox position:", Style: "margin-top: 10px;" }),
                    WF.ComboBox({ Name: "toolboxPosition", Items: ["Left", "Right", "Top", "Bottom"], SelectedIndex: 0 }),
                    WF.CheckBox({ Text: "Auto-hide toolbox", Checked: false, Style: "margin-top: 15px;" }),
                    WF.Label({ Text: "Icon size:", Style: "margin-top: 15px;" }),
                    WF.ComboBox({ Name: "iconSize", Items: ["Small", "Medium", "Large"], SelectedIndex: 1 })
                ]
            })
            ]
        }),
        WF.TabPage({
            Text: "Properties",
            Controls: [
                WF.Panel({
                Name: "propertiesTab",
                Style: "padding: 20px;",
                Controls: [
                    WF.Label({ Text: "Properties Panel Settings", Style: "font-size: 16px; font-weight: bold; margin-bottom: 15px;" }),
                    WF.CheckBox({ Text: "Show categories", Checked: true }),
                    WF.CheckBox({ Text: "Sort alphabetically", Checked: false, Style: "margin-top: 10px;" }),
                    WF.CheckBox({ Text: "Show read-only properties", Checked: true, Style: "margin-top: 10px;" }),
                    WF.Label({ Text: "Property name width:", Style: "margin-top: 15px;" }),
                    WF.TextBox({ Text: "150", Style: "width: 100px;" })
                ]
            })
            ]
        })
    ];

    const tabControl = WF.TabControl(
        {
            Name: "settingsTabs",
            Style: "width: 100%; flex: 1; min-height: 0;",
            SelectedIndex: activeTab
        },
        ...tabPages
    );

    const buttonPanel = WF.Panel({
        Name: "buttonPanel",
        Style: "height: 52px; padding: 8px 12px; display: flex; justify-content: flex-end; align-items: center; gap: 10px; background: var(--sc-surface-alt); border-top: 1px solid var(--sc-border-dark);",
        Controls: [
            WF.Button({
                Text: "OK",
                Name: "okButton",
                Style: "padding: 6px 20px;",
                OnClick: props.onConfirm ?? props.onClose
            }),
            WF.Button({
                Text: "Cancel",
                Name: "cancelButton",
                Style: "padding: 6px 20px;",
                OnClick: props.onClose
            }),
            WF.Button({
                Text: "Apply",
                Name: "applyButton",
                Style: "padding: 6px 20px;",
                OnClick: props.onApply ?? props.onClose
            })
        ]
    });

    return WF.Window(
        {
            Name: "DesignerSettingsDialog",
            Text: "Designer Settings",
            ClassName: "designer-settings-dialog",
            Dialog: true,
            Draggable: true,
            StartPosition: "CenterScreen",
            OnClose: props.onClose,
            BodyClassName: "designer-settings-body",
            Style: "width: 760px; height: 560px; z-index: 10000;"
        },
        WF.Panel({
            Name: "settingsRoot",
            Style: "padding: 8px; height: 100%; display: flex; flex-direction: column; gap: 8px;",
            Controls: [tabControl, buttonPanel]
        })
    );
};


