/**
 * Examples demonstrating the use of the component class hierarchy
 */

import {
    Window,
    Dialog,
    Panel,
    GroupBox,
    TabControl,
    TabPage,
    Button,
    CheckBox,
    RadioButton,
    TextBox,
    Label,
    ComboBox,
    ListBox,
    ProgressBar,
    TrackBar,
    MenuBar,
    MenuItem,
    ToolStrip,
    ToolButton,
    StatusBar,
    SplitContainer,
    FlowLayoutPanel,
    Grid,
    MessageBox,
    SwitchButton,
    Toolbox,
} from "./index";
import type { ControlContext } from "../controls/types";

/**
 * Example 1: Simple Settings Dialog
 */
export function createSettingsDialog(): Dialog {
    const dialog = new Dialog({
        title: "Settings",
        size: { width: 500, height: 400 },
        closable: true,
        okText: "Save",
        cancelText: "Cancel",
    });

    // Create tab control
    const tabs = new TabControl({
        selectedIndex: 0,
        alignment: "top",
    });

    // General tab
    const generalTab = new TabPage({
        text: "General",
    });

    const nameLabel = new Label({
        text: "User Name:",
        fontWeight: "bold",
    });

    const nameInput = new TextBox({
        placeholder: "Enter your name",
        maxLength: 50,
    });

    const enableNotifications = new CheckBox({
        label: "Enable notifications",
        checked: true,
    });

    generalTab.addChild(nameLabel);
    generalTab.addChild(nameInput);
    generalTab.addChild(enableNotifications);
    tabs.addPage(generalTab);

    // Appearance tab
    const appearanceTab = new TabPage({
        text: "Appearance",
    });

    const themeLabel = new Label({
        text: "Theme:",
    });

    const themeCombo = new ComboBox({
        items: [
            { text: "Light", value: "light" },
            { text: "Dark", value: "dark" },
            { text: "System", value: "system" },
        ],
        selectedIndex: 0,
    });

    appearanceTab.addChild(themeLabel);
    appearanceTab.addChild(themeCombo);
    tabs.addPage(appearanceTab);

    dialog.addChild(tabs);

    // Set up event handlers
    dialog.on("ok", () => {
        console.log("Settings saved");
        console.log("Name:", nameInput.getValue());
        console.log("Notifications:", enableNotifications.getValue());
        console.log("Theme:", themeCombo.getValue());
    });

    return dialog;
}

/**
 * Example 2: Application Main Window
 */
export function createMainWindow(): Window {
    const window = new Window({
        title: "StreamCraft Designer",
        draggable: true,
        closable: true,
        minimizable: true,
        maximizable: true,
        size: { width: 1280, height: 720 },
    });

    // Menu bar
    const menuBar = new MenuBar();

    const fileMenu = new MenuItem({ label: "File" });
    fileMenu.addItem(new MenuItem({ label: "New", shortcut: "Ctrl+N", onClick: "handleNew" }));
    fileMenu.addItem(new MenuItem({ label: "Open", shortcut: "Ctrl+O", onClick: "handleOpen" }));
    fileMenu.addItem(new MenuItem({ label: "Save", shortcut: "Ctrl+S", onClick: "handleSave" }));
    fileMenu.addItem(new MenuItem({ separator: true }));
    fileMenu.addItem(new MenuItem({ label: "Exit", onClick: "handleExit" }));

    const editMenu = new MenuItem({ label: "Edit" });
    editMenu.addItem(new MenuItem({ label: "Undo", shortcut: "Ctrl+Z", onClick: "handleUndo" }));
    editMenu.addItem(new MenuItem({ label: "Redo", shortcut: "Ctrl+Y", onClick: "handleRedo" }));

    menuBar.addItem(fileMenu);
    menuBar.addItem(editMenu);

    window.addChild(menuBar);

    // Tool strip
    const toolStrip = new ToolStrip({
        orientation: "horizontal",
        showText: false,
        buttonSize: "medium",
    });

    toolStrip.addButton(new ToolButton({ icon: "save", tooltip: "Save", onClick: "handleSave" }));
    toolStrip.addButton(new ToolButton({ icon: "undo", tooltip: "Undo", onClick: "handleUndo" }));
    toolStrip.addButton(new ToolButton({ icon: "redo", tooltip: "Redo", onClick: "handleRedo" }));

    window.addChild(toolStrip);

    // Split container for main area
    const splitContainer = new SplitContainer({
        orientation: "horizontal",
        splitterPosition: 20,
        panel1MinSize: 150,
    });

    // Toolbox on left
    const toolbox = new Toolbox({
        title: "Toolbox",
        tools: ["Select", "Text", "Button", "Image", "Panel"],
    });

    splitContainer.addChild(toolbox);

    // Properties panel on right
    const propertiesPanel = new Panel({
        title: "Properties",
        border: true,
    });

    splitContainer.addChild(propertiesPanel);

    window.addChild(splitContainer);

    // Status bar
    const statusBar = new StatusBar({
        showGrip: true,
    });

    statusBar.addSegment({ text: "Ready", width: "auto" });
    statusBar.addSegment({ text: "Line 1, Col 1", width: 150, align: "right" });

    window.addChild(statusBar);

    return window;
}

/**
 * Example 3: Progress Dialog
 */
export function createProgressDialog(): Dialog {
    const dialog = new Dialog({
        title: "Processing...",
        size: { width: 400, height: 150 },
        closable: false,
        showCancel: true,
        cancelText: "Cancel",
    });

    const progressLabel = new Label({
        text: "Processing files...",
        textAlign: "center",
    });

    const progressBar = new ProgressBar({
        minimum: 0,
        maximum: 100,
        value: 0,
        progressStyle: "continuous",
        showText: true,
    });

    const detailsLabel = new Label({
        text: "0 of 100 files processed",
        textAlign: "center",
        fontSize: 12,
    });

    dialog.addChild(progressLabel);
    dialog.addChild(progressBar);
    dialog.addChild(detailsLabel);

    // Simulate progress
    let progress = 0;
    const interval = setInterval(() => {
        progress += 5;
        progressBar.setValue(progress);
        detailsLabel.text = `${progress} of 100 files processed`;

        if (progress >= 100) {
            clearInterval(interval);
            dialog.close();
        }
    }, 100);

    dialog.on("cancel", () => {
        clearInterval(interval);
        console.log("Operation cancelled");
    });

    return dialog;
}

/**
 * Example 4: Form with Validation
 */
export function createRegistrationForm(): Panel {
    const panel = new Panel({
        title: "User Registration",
        border: true,
        padding: 16,
    });

    const groupBox = new GroupBox({
        title: "Personal Information",
    });

    // Name field
    const nameLabel = new Label({ text: "Full Name:" });
    const nameInput = new TextBox({
        placeholder: "John Doe",
        required: true,
        minLength: 3,
    });

    nameInput.addValidationRule({
        name: "nameFormat",
        validate: (value) => {
            if (!value || value.trim().split(" ").length < 2) {
                return { valid: false, message: "Please enter first and last name" };
            }
            return { valid: true };
        },
    });

    // Email field
    const emailLabel = new Label({ text: "Email:" });
    const emailInput = new TextBox({
        inputType: "email",
        placeholder: "john@example.com",
        required: true,
    });

    emailInput.addValidationRule({
        name: "emailFormat",
        validate: (value) => {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                return { valid: false, message: "Please enter a valid email address" };
            }
            return { valid: true };
        },
    });

    // Age field
    const ageLabel = new Label({ text: "Age:" });
    const ageTrackBar = new TrackBar({
        minimum: 18,
        maximum: 100,
        value: 25,
        showValue: true,
    });

    // Preferences
    const notificationsCheck = new CheckBox({
        label: "Receive email notifications",
        checked: true,
    });

    const termsCheck = new CheckBox({
        label: "I agree to the terms and conditions",
        checked: false,
    });

    // Submit button
    const submitButton = new Button({
        text: "Register",
        variant: "primary",
        fullWidth: true,
        onClick: "handleSubmit",
    });

    groupBox.addChild(nameLabel);
    groupBox.addChild(nameInput);
    groupBox.addChild(emailLabel);
    groupBox.addChild(emailInput);
    groupBox.addChild(ageLabel);
    groupBox.addChild(ageTrackBar);
    groupBox.addChild(notificationsCheck);
    groupBox.addChild(termsCheck);

    panel.addChild(groupBox);
    panel.addChild(submitButton);

    // Validation on submit
    submitButton.on("click", () => {
        const nameValid = nameInput.validateValue();
        const emailValid = emailInput.validateValue();
        const termsAccepted = termsCheck.checked;

        if (!nameValid) {
            console.log("Name errors:", nameInput.getValidationErrors());
        }

        if (!emailValid) {
            console.log("Email errors:", emailInput.getValidationErrors());
        }

        if (!termsAccepted) {
            console.log("Please accept terms and conditions");
        }

        if (nameValid && emailValid && termsAccepted) {
            console.log("Registration successful!");
            console.log({
                name: nameInput.getValue(),
                email: emailInput.getValue(),
                age: ageTrackBar.getValue(),
                notifications: notificationsCheck.getValue(),
            });
        }
    });

    return panel;
}

/**
 * Example 5: Data List View
 */
export function createDataListView(): Panel {
    const panel = new Panel({
        title: "User List",
        border: true,
    });

    const listBox = new ListBox({
        multiSelect: false,
        visibleRows: 10,
    });

    // Add sample data
    const users = [
        { text: "Alice Johnson", value: { id: 1, role: "Admin" } },
        { text: "Bob Smith", value: { id: 2, role: "User" } },
        { text: "Carol White", value: { id: 3, role: "User" } },
        { text: "David Brown", value: { id: 4, role: "Moderator" } },
        { text: "Eve Davis", value: { id: 5, role: "User" } },
    ];

    listBox.items = users;

    // Details panel
    const detailsPanel = new Panel({
        title: "Details",
        border: true,
    });

    const nameLabel = new Label({ text: "Name: -", fontWeight: "bold" });
    const roleLabel = new Label({ text: "Role: -" });

    detailsPanel.addChild(nameLabel);
    detailsPanel.addChild(roleLabel);

    // Handle selection change
    listBox.on("change", (args: any) => {
        const selected = listBox.getSelectedItems()[0];
        if (selected) {
            nameLabel.text = `Name: ${selected.text}`;
            roleLabel.text = `Role: ${selected.value.role}`;
        }
    });

    panel.addChild(listBox);
    panel.addChild(detailsPanel);

    return panel;
}

/**
 * Example 6: Render component to FormNode
 * 
 * This shows how the class-based components integrate with the existing FormNode system
 */
export function renderExample(context: ControlContext) {
    // Create a component programmatically
    const dialog = createSettingsDialog();

    // Render to FormNode for the existing renderer
    const formNode = dialog.render(context);

    // The FormNode can now be used with FormRenderer
    return formNode;
}
