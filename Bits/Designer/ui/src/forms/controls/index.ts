import type { ControlRenderer } from "./types";
import { controlRegistry } from "../registry";
import { renderWindow } from "./windowControl";
import { renderMenuBar } from "./menuBarControl";
import { renderMenuItem } from "./menuItemControl";
import { renderMenuItemEntry } from "./menuItemEntryControl";
import { renderToolStrip } from "./toolStripControl";
import { renderToolButton } from "./toolButtonControl";
import { renderDocBar } from "./docBarControl";
import { renderView } from "./viewControl";
import { renderDock } from "./dockControl";
import { renderPanel } from "./panelControl";
import { renderPanelContainer } from "./panelContainerControl";
import { renderGrid } from "./gridControl";
import { renderCanvas } from "./canvasControl";
import { renderStatusBar } from "./statusBarControl";
import { renderElement } from "./elementControl";
import { renderText } from "./textControl";
import { renderLabel } from "./labelControl";
import { renderTextBox } from "./textBoxControl";
import { renderButton } from "./buttonControl";
import { renderCheckBox } from "./checkBoxControl";
import { renderRadioButton } from "./radioButtonControl";
import { renderFlowLayoutPanel } from "./flowLayoutPanelControl";
import { renderTableLayoutPanel } from "./tableLayoutPanelControl";
import { renderGroupBox } from "./groupBoxControl";
import { renderSplitContainer } from "./splitContainerControl";
import { renderComboBox } from "./comboBoxControl";
import { renderListBox } from "./listBoxControl";
import { renderProgressBar } from "./progressBarControl";
import { renderTrackBar } from "./trackBarControl";
import { renderTabControl, renderTabPage } from "./tabControlControl";
import { renderDiagnosticsPanel } from "./diagnosticsPanelControl";
import { renderMessageBox } from "./messageBoxControl";
import { renderLayoutCanvas } from "./layoutCanvasControl";
import { renderToolbox } from "./toolboxControl";
import { renderSwitchButton } from "./switchButtonControl";
import { ControlKind } from "../controlKinds";

export const controlRenderers: Record<string, ControlRenderer> = {
    [ControlKind.window]: renderWindow,
    [ControlKind.menuBar]: renderMenuBar,
    [ControlKind.menuItem]: renderMenuItem,
    [ControlKind.menuItemEntry]: renderMenuItemEntry,
    [ControlKind.toolStrip]: renderToolStrip,
    [ControlKind.toolButton]: renderToolButton,
    [ControlKind.docBar]: renderDocBar,
    [ControlKind.view]: renderView,
    [ControlKind.dock]: renderDock,
    [ControlKind.panel]: renderPanel,
    [ControlKind.panelContainer]: renderPanelContainer,
    [ControlKind.grid]: renderGrid,
    [ControlKind.canvas]: renderCanvas,
    [ControlKind.statusBar]: renderStatusBar,
    [ControlKind.element]: renderElement,
    [ControlKind.text]: renderText,
    [ControlKind.label]: renderLabel,
    [ControlKind.textBox]: renderTextBox,
    [ControlKind.button]: renderButton,
    [ControlKind.checkBox]: renderCheckBox,
    [ControlKind.radioButton]: renderRadioButton,
    [ControlKind.flowLayoutPanel]: renderFlowLayoutPanel,
    [ControlKind.tableLayoutPanel]: renderTableLayoutPanel,
    [ControlKind.groupBox]: renderGroupBox,
    [ControlKind.splitContainer]: renderSplitContainer,
    [ControlKind.comboBox]: renderComboBox,
    [ControlKind.listBox]: renderListBox,
    [ControlKind.progressBar]: renderProgressBar,
    [ControlKind.trackBar]: renderTrackBar,
    [ControlKind.tabControl]: renderTabControl,
    [ControlKind.tabPage]: renderTabPage,
    [ControlKind.diagnosticsPanel]: renderDiagnosticsPanel,
    [ControlKind.messageBox]: renderMessageBox,
    [ControlKind.layoutCanvas]: renderLayoutCanvas,
    [ControlKind.toolbox]: renderToolbox,
    [ControlKind.switchButton]: renderSwitchButton
};

const windowStartPositions = new Set(["manual", "centerscreen", "centerparent", "cascade"]);
const splitOrientations = new Set(["horizontal", "vertical"]);

export const registerDefaultControls = () => {
    Object.entries(controlRenderers).forEach(([name, renderer]) => {
        if (name === "window") {
            controlRegistry.register(name, renderer, {
                defaults: {
                    draggable: true,
                    close: true,
                    minimize: true,
                    maximize: true,
                    startPosition: "manual"
                },
                validate: (props) => {
                    const errors: string[] = [];
                    if (props.startPosition && typeof props.startPosition === "string") {
                        const value = props.startPosition.toLowerCase();
                        if (!windowStartPositions.has(value)) {
                            errors.push(`startPosition '${props.startPosition}' is not supported.`);
                        }
                    }
                    if (props.draggable !== undefined && typeof props.draggable !== "boolean") {
                        errors.push("window draggable must be a boolean.");
                    }
                    if (props.dialog !== undefined && typeof props.dialog !== "boolean") {
                        errors.push("window dialog must be a boolean.");
                    }
                    if (props.close !== undefined && typeof props.close !== "boolean") {
                        errors.push("window close must be a boolean.");
                    }
                    if (props.minimize !== undefined && typeof props.minimize !== "boolean") {
                        errors.push("window minimize must be a boolean.");
                    }
                    if (props.maximize !== undefined && typeof props.maximize !== "boolean") {
                        errors.push("window maximize must be a boolean.");
                    }
                    if (props.startMaximized !== undefined && typeof props.startMaximized !== "boolean") {
                        errors.push("window startMaximized must be a boolean.");
                    }
                    if (props.dragBounds !== undefined && typeof props.dragBounds !== "string") {
                        errors.push("window dragBounds must be a string selector.");
                    }
                    return errors;
                }
            });
            return;
        }

        if (name === "textBox") {
            controlRegistry.register(name, renderer, {
                validate: (props) => {
                    const errors: string[] = [];
                    if (props.multiline) {
                        const rows = props.rows;
                        if (rows !== undefined && (typeof rows !== "number" || rows < 1)) {
                            errors.push("textBox rows must be a positive number when multiline is enabled.");
                        }
                    }
                    return errors;
                }
            });
            return;
        }

        if (name === "button") {
            controlRegistry.register(name, renderer, {
                validate: (props) => {
                    const errors: string[] = [];
                    if (props.default !== undefined && typeof props.default !== "boolean") {
                        errors.push("button default must be a boolean.");
                    }
                    if (props.text !== undefined && typeof props.text !== "string") {
                        errors.push("button text must be a string.");
                    }
                    return errors;
                }
            });
            return;
        }

        if (name === "comboBox" || name === "listBox") {
            controlRegistry.register(name, renderer, {
                validate: (props) => {
                    const errors: string[] = [];
                    if (props.items !== undefined && !Array.isArray(props.items) && typeof props.items !== "string") {
                        errors.push(`${name} items must be an array or comma-delimited string.`);
                    }
                    if (props.selectedIndex !== undefined && typeof props.selectedIndex !== "number" && typeof props.selectedIndex !== "string") {
                        errors.push(`${name} selectedIndex must be a number or numeric string.`);
                    }
                    return errors;
                }
            });
            return;
        }

        if (name === "splitContainer") {
            controlRegistry.register(name, renderer, {
                defaults: {
                    orientation: "horizontal",
                    splitPosition: "50",
                    fixedPanel: "none"
                },
                validate: (props) => {
                    const errors: string[] = [];
                    if (props.orientation && typeof props.orientation === "string") {
                        const value = props.orientation.toLowerCase();
                        if (!splitOrientations.has(value)) {
                            errors.push(`splitContainer orientation '${props.orientation}' is not supported.`);
                        }
                    }
                    if (props.splitterDistance !== undefined && typeof props.splitterDistance !== "number") {
                        errors.push("splitContainer splitterDistance must be a number.");
                    }
                    return errors;
                }
            });
            return;
        }

        if (name === "tabControl") {
            controlRegistry.register(name, renderer, {
                defaults: {
                    selectedIndex: "0"
                },
                validate: (props) => {
                    const errors: string[] = [];
                    if (props.selectedIndex !== undefined && typeof props.selectedIndex !== "number" && typeof props.selectedIndex !== "string") {
                        errors.push("tabControl selectedIndex must be a number or numeric string.");
                    }
                    return errors;
                }
            });
            return;
        }

        if (name === "tableLayoutPanel") {
            controlRegistry.register(name, renderer, {
                defaults: {
                    direction: "horizontal",
                    wrap: true
                },
                validate: (props) => {
                    const errors: string[] = [];
                    if (props.rows !== undefined && typeof props.rows !== "number" && typeof props.rows !== "string") {
                        errors.push("tableLayoutPanel rows must be a number or numeric string.");
                    }
                    if (props.cols !== undefined && typeof props.cols !== "number" && typeof props.cols !== "string") {
                        errors.push("tableLayoutPanel cols must be a number or numeric string.");
                    }
                    return errors;
                }
            });
            return;
        }

        if (name === "statusBar") {
            controlRegistry.register(name, renderer, {
                validate: (props) => {
                    const errors: string[] = [];
                    if (props.segments !== undefined && !Array.isArray(props.segments)) {
                        errors.push("statusBar segments must be an array of strings.");
                    }
                    return errors;
                }
            });
            return;
        }

        if (name === "menuBar" || name === "menuItem" || name === "menuItemEntry") {
            controlRegistry.register(name, renderer, {
                validate: (props) => {
                    const errors: string[] = [];
                    if (props.label !== undefined && typeof props.label !== "string") {
                        errors.push(`${name} label must be a string.`);
                    }
                    return errors;
                }
            });
            return;
        }

        if (name === "toolStrip") {
            controlRegistry.register(name, renderer, {
                validate: (props) => {
                    const errors: string[] = [];
                    if (props.tiles !== undefined && !Array.isArray(props.tiles)) {
                        errors.push("toolStrip tiles must be an array.");
                    }
                    if (props.options !== undefined && !Array.isArray(props.options)) {
                        errors.push("toolStrip options must be an array.");
                    }
                    if (props.actions !== undefined && !Array.isArray(props.actions)) {
                        errors.push("toolStrip actions must be an array.");
                    }
                    return errors;
                }
            });
            return;
        }

        if (name === "progressBar") {
            controlRegistry.register(name, renderer, {
                defaults: {
                    value: 0,
                    max: 100
                },
                validate: (props) => {
                    const errors: string[] = [];
                    if (props.value !== undefined && typeof props.value !== "number") {
                        errors.push("progressBar value must be a number.");
                    }
                    if (props.max !== undefined && typeof props.max !== "number") {
                        errors.push("progressBar max must be a number.");
                    }
                    return errors;
                }
            });
            return;
        }

        if (name === "trackBar") {
            controlRegistry.register(name, renderer, {
                defaults: {
                    min: 0,
                    max: 100,
                    value: 0
                },
                validate: (props) => {
                    const errors: string[] = [];
                    if (props.min !== undefined && typeof props.min !== "number") {
                        errors.push("trackBar min must be a number.");
                    }
                    if (props.max !== undefined && typeof props.max !== "number") {
                        errors.push("trackBar max must be a number.");
                    }
                    if (props.value !== undefined && typeof props.value !== "number") {
                        errors.push("trackBar value must be a number.");
                    }
                    return errors;
                }
            });
            return;
        }

        if (name === "messageBox") {
            controlRegistry.register(name, renderer, {
                defaults: {
                    title: "Message",
                    buttons: "OK",
                    defaultButton: 0,
                    draggable: true
                },
                validate: (props) => {
                    const errors: string[] = [];
                    const mode = typeof props.mode === "string" ? props.mode.toLowerCase() : undefined;
                    const supportedModes = ["alert", "confirm", "yesno", "yesnocancel", "okcancel"];
                    if (mode && !supportedModes.includes(mode)) {
                        errors.push(`messageBox mode '${props.mode}' is not supported.`);
                    }
                    if (props.title !== undefined && typeof props.title !== "string") {
                        errors.push("messageBox title must be a string.");
                    }
                    if (props.message !== undefined && typeof props.message !== "string") {
                        errors.push("messageBox message must be a string.");
                    }
                    if (props.buttons !== undefined && !Array.isArray(props.buttons) && typeof props.buttons !== "string") {
                        errors.push("messageBox buttons must be a string or array.");
                    }
                    if (props.defaultButton !== undefined && typeof props.defaultButton !== "number") {
                        errors.push("messageBox defaultButton must be a number.");
                    }
                    return errors;
                }
            });
            return;
        }

        if (name === "groupBox") {
            controlRegistry.register(name, renderer, {
                validate: (props) => {
                    const errors: string[] = [];
                    if (props.text !== undefined && typeof props.text !== "string") {
                        errors.push("groupBox text must be a string.");
                    }
                    return errors;
                }
            });
            return;
        }

        if (name === "panel") {
            controlRegistry.register(name, renderer, {
                validate: (props) => {
                    const errors: string[] = [];
                    if (props.scroll !== undefined && typeof props.scroll !== "boolean") {
                        errors.push("panel scroll must be a boolean.");
                    }
                    return errors;
                }
            });
            return;
        }

        controlRegistry.register(name, renderer);
    });
};

registerDefaultControls();
