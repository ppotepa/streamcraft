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

export const controlRenderers: Record<string, ControlRenderer> = {
    window: renderWindow,
    menuBar: renderMenuBar,
    menuItem: renderMenuItem,
    menuItemEntry: renderMenuItemEntry,
    toolStrip: renderToolStrip,
    toolButton: renderToolButton,
    docBar: renderDocBar,
    view: renderView,
    dock: renderDock,
    panel: renderPanel,
    panelContainer: renderPanelContainer,
    grid: renderGrid,
    canvas: renderCanvas,
    statusBar: renderStatusBar,
    element: renderElement,
    text: renderText,
    label: renderLabel,
    textBox: renderTextBox,
    button: renderButton,
    checkBox: renderCheckBox,
    radioButton: renderRadioButton,
    flowLayoutPanel: renderFlowLayoutPanel,
    tableLayoutPanel: renderTableLayoutPanel,
    groupBox: renderGroupBox,
    splitContainer: renderSplitContainer,
    comboBox: renderComboBox,
    listBox: renderListBox,
    progressBar: renderProgressBar,
    trackBar: renderTrackBar,
    tabControl: renderTabControl,
    tabPage: renderTabPage,
    diagnosticsPanel: renderDiagnosticsPanel
};

const windowStartPositions = new Set(["manual", "centerscreen", "centerparent", "cascade"]);
const splitOrientations = new Set(["horizontal", "vertical"]);

export const registerDefaultControls = () => {
    Object.entries(controlRenderers).forEach(([name, renderer]) => {
        if (name === "window") {
            controlRegistry.register(name, renderer, {
                validate: (props) => {
                    const errors: string[] = [];
                    if (props.startPosition && typeof props.startPosition === "string") {
                        const value = props.startPosition.toLowerCase();
                        if (!windowStartPositions.has(value)) {
                            errors.push(`startPosition '${props.startPosition}' is not supported.`);
                        }
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
