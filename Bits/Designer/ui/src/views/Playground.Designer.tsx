import type { FormChild, FormNode } from "../forms/core";
import { WF } from "../forms/winforms";
import { UiText } from "./uiText";
import type { Contact } from "./playground/types";

export type PlaygroundDesignerProps = {
    contactsCount: number;
    searchText: string;
    activeOnly: boolean;
    listItems: string[];
    selectedIndex: number;
    selectedContact: Contact | null;
    status: string;
    showDiagnostics: boolean;
    showEditor: boolean;
    editorMode: "new" | "edit";
    editorDraft: Contact;
    editorErrors: Record<string, string>;
    showImport: boolean;
    showPreferences: boolean;
    showDeleteConfirm: boolean;
    showDiscardConfirm: boolean;
    requireEmail: boolean;
    confirmDelete: boolean;
    autosave: boolean;
    autosaveMinutes: string;
    defaultSort: string;
};

export const buildPlaygroundDesigner = (props: PlaygroundDesignerProps): FormNode => {
    const {
        contactsCount,
        searchText,
        activeOnly,
        listItems,
        selectedIndex,
        selectedContact,
        status,
        showDiagnostics,
        showEditor,
        editorMode,
        editorDraft,
        editorErrors,
        showImport,
        showPreferences,
        showDeleteConfirm,
        showDiscardConfirm,
        requireEmail,
        confirmDelete,
        autosave,
        autosaveMinutes,
        defaultSort
    } = props;

    const mainWindow = WF.Window(
        {
            Text: UiText.playground.windowTitle,
            Icon: "info",
            Draggable: true,
            StartPosition: "centerScreen",
            OnClose: "closeMain",
            Style: "width: 1120px; height: 760px;"
        },
        WF.MenuStrip({
            Items: [
                WF.MenuItem(
                    { Text: UiText.playground.menu.file },
                    WF.MenuItemEntry({ Text: UiText.playground.menu.newContact, OnClick: "miFileNew", Icon: "new" }),
                    WF.MenuItemEntry({ Text: UiText.playground.menu.import, OnClick: "miFileImport", Icon: "import" }),
                    WF.MenuItemEntry({ Text: UiText.playground.menu.exit, OnClick: "miFileExit", Icon: "exit" })
                ),
                WF.MenuItem(
                    { Text: UiText.playground.menu.edit },
                    WF.MenuItemEntry({ Text: UiText.playground.menu.editContact, OnClick: "miEditEdit", Icon: "edit" }),
                    WF.MenuItemEntry({ Text: UiText.playground.menu.deleteContact, OnClick: "miEditDelete", Icon: "delete" }),
                    WF.MenuItemEntry({ Text: UiText.playground.menu.find, OnClick: "miEditFind", Icon: "search" })
                ),
                WF.MenuItem(
                    { Text: UiText.playground.menu.tools },
                    WF.MenuItemEntry({ Text: UiText.playground.menu.preferences, OnClick: "miToolsPreferences", Icon: "settings" }),
                    WF.MenuItemEntry({ Text: UiText.playground.menu.diagnostics, OnClick: "toggleDiagnostics", Icon: "diagnostics" })
                ),
                WF.MenuItem(
                    { Text: UiText.playground.menu.help },
                    WF.MenuItemEntry({ Text: UiText.playground.menu.about, OnClick: "miHelpAbout", Icon: "info" })
                )
            ]
        }),
        WF.Element(
            "div",
            { style: "padding: 10px; background: var(--surface); height: 100%; box-sizing: border-box;" },
            WF.Element(
                "div",
                { style: "display: flex; gap: 8px; align-items: center; margin-bottom: 8px; flex-wrap: wrap;" },
                WF.Button({ Text: UiText.playground.buttons.new, Icon: "new", OnClick: "openEditorNew" }),
                WF.Button({ Text: UiText.playground.buttons.edit, Icon: "edit", OnClick: "openEditorEdit", Enabled: Boolean(selectedContact) }),
                WF.Button({ Text: UiText.playground.buttons.delete, Icon: "delete", OnClick: "deleteSelected", Enabled: Boolean(selectedContact) }),
                WF.Element("div", { style: "width: 1px; height: 24px; background: var(--border-dark); margin: 0 4px;" }),
                WF.Button({ Text: UiText.playground.buttons.import, Icon: "import", OnClick: "miFileImport" }),
                WF.Element("div", { style: "width: 1px; height: 24px; background: var(--border-dark); margin: 0 4px;" }),
                WF.Label({ Text: UiText.playground.labels.search, Style: "font-size: 12px;" }),
                WF.Text({ Value: searchText, OnChange: "quickSearch", Style: "width: 240px;" })
            ),
            WF.SplitContainer(
                { Orientation: "vertical", SplitPosition: "55%", Style: "height: calc(100% - 96px);" },
                WF.GroupBox(
                    { Text: UiText.playground.labels.contacts, Style: "height: 100%;" },
                    WF.Element(
                        "div",
                        { style: "display: flex; gap: 8px; flex-direction: column; height: 100%;" },
                        WF.Text({ Value: searchText, OnChange: "searchChange", PlaceholderText: UiText.playground.placeholders.searchContacts, Style: "width: 100%;" }),
                        WF.ComboBox({ Items: UiText.playground.options.searchFilterItems, SelectedIndex: "0", OnChange: "filterChange", Style: "width: 100%;" }),
                        WF.CheckBox({ Text: UiText.playground.checkboxes.activeOnly, Checked: activeOnly, OnChange: "toggleActive" }),
                        WF.ListBox({
                            Items: listItems,
                            SelectionMode: "single",
                            SelectedIndex: String(Math.max(selectedIndex, 0)),
                            OnChange: "selectContact",
                            Style: "width: 100%; height: 100%;"
                        })
                    )
                ),
                WF.GroupBox(
                    { Text: UiText.playground.labels.details, Style: "height: 100%;" },
                    WF.Element(
                        "div",
                        { style: "display: flex; flex-direction: column; height: 100%;" },
                        WF.TableLayoutPanel(
                            { Rows: "6", Cols: "2", Style: "width: 100%; gap: 6px;" },
                            WF.Label({ Text: UiText.playground.labels.name, Style: "font-weight: bold;" }),
                            WF.Label({ Text: selectedContact?.fullName ?? UiText.playground.placeholders.emptyValue }),
                            WF.Label({ Text: UiText.playground.labels.company, Style: "font-weight: bold;" }),
                            WF.Label({ Text: selectedContact?.company ?? UiText.playground.placeholders.emptyValue }),
                            WF.Label({ Text: UiText.playground.labels.email, Style: "font-weight: bold;" }),
                            WF.Label({ Text: selectedContact?.email ?? UiText.playground.placeholders.emptyValue }),
                            WF.Label({ Text: UiText.playground.labels.phone, Style: "font-weight: bold;" }),
                            WF.Label({ Text: selectedContact?.phone ?? UiText.playground.placeholders.emptyValue }),
                            WF.Label({ Text: UiText.playground.labels.address, Style: "font-weight: bold;" }),
                            WF.Label({ Text: selectedContact?.address ?? UiText.playground.placeholders.emptyValue }),
                            WF.Label({ Text: UiText.playground.labels.notes, Style: "font-weight: bold;" }),
                            WF.Label({ Text: selectedContact?.notes ?? UiText.playground.placeholders.emptyValue })
                        ),
                        WF.Element(
                            "div",
                            { style: "margin-top: auto; display: flex; justify-content: flex-end; gap: 8px; padding-top: 10px;" },
                            WF.Button({ Text: UiText.playground.buttons.call, Icon: "phone", OnClick: "callContact", Enabled: Boolean(selectedContact?.phone) }),
                            WF.Button({ Text: UiText.playground.buttons.email, Icon: "email", OnClick: "emailContact", Enabled: Boolean(selectedContact?.email) }),
                            WF.Button({ Text: UiText.playground.buttons.editEllipsis, Icon: "edit", OnClick: "openEditorEdit", Enabled: Boolean(selectedContact) })
                        )
                    )
                )
            ),
            showDiagnostics
                ? WF.DiagnosticsPanel({ Text: UiText.playground.titles.diagnostics, maxItems: 6, Style: "margin-top: 8px; height: 140px;" })
                : null,
            WF.StatusStrip({
                Segments: [
                    `${UiText.playground.labels.statusPrefix} ${status}`,
                    `${UiText.playground.labels.countPrefix} ${contactsCount}`,
                    `${UiText.playground.labels.lastSavedPrefix} ${selectedContact?.updatedAt ?? UiText.playground.placeholders.emptyValue}`
                ]
            })
        )
    );

    const overlayNodes: FormChild[] = [
        showEditor
            ? WF.Window(
                {
                    Text: editorMode === "new" ? UiText.playground.dialogs.editorNew : UiText.playground.dialogs.editorEdit,
                    Dialog: true,
                    Draggable: true,
                    StartPosition: "centerParent",
                    OnClose: "editorCancel",
                    Style: "width: 620px; height: 520px;"
                },
                WF.TabControl(
                    { SelectedIndex: "0", Style: "width: 100%; height: 100%;" },
                    WF.TabPage(
                        { Text: UiText.playground.tabs.general },
                        WF.Element(
                            "div",
                            { style: "display: flex; flex-direction: column; gap: 8px; padding: 12px;" },
                            WF.Label({ Text: UiText.playground.labels.fullNameRequired, Style: "font-weight: bold;" }),
                            WF.TextBox({ Text: editorDraft.fullName, OnChange: "editorChangeFullName", Style: "width: 100%;" }),
                            editorErrors.fullName ? WF.Label({ Text: editorErrors.fullName, Style: "color: red; font-size: 12px;" }) : null,
                            WF.Label({ Text: UiText.playground.labels.company, Style: "font-weight: bold;" }),
                            WF.TextBox({ Text: editorDraft.company, OnChange: "editorChangeCompany", Style: "width: 100%;" }),
                            WF.Label({ Text: UiText.playground.labels.emailRequired, Style: "font-weight: bold;" }),
                            WF.TextBox({ Text: editorDraft.email, OnChange: "editorChangeEmail", Style: "width: 100%;" }),
                            editorErrors.email ? WF.Label({ Text: editorErrors.email, Style: "color: red; font-size: 12px;" }) : null,
                            WF.Label({ Text: UiText.playground.labels.phone, Style: "font-weight: bold;" }),
                            WF.TextBox({ Text: editorDraft.phone, OnChange: "editorChangePhone", Style: "width: 100%;" }),
                            WF.Label({ Text: UiText.playground.labels.tags, Style: "font-weight: bold;" }),
                            WF.TextBox({ Text: editorDraft.tags, OnChange: "editorChangeTags", Style: "width: 100%;" }),
                            WF.Label({ Text: UiText.playground.labels.address, Style: "font-weight: bold;" }),
                            WF.TextBox({ Text: editorDraft.address, OnChange: "editorChangeAddress1", Style: "width: 100%;" }),
                            WF.CheckBox({ Text: UiText.playground.checkboxes.activeContact, Checked: editorDraft.isActive, OnChange: "editorToggleActive" })
                        )
                    ),
                    WF.TabPage(
                        { Text: UiText.playground.tabs.notes },
                        WF.Element(
                            "div",
                            { style: "padding: 12px;" },
                            WF.TextBox({ Text: editorDraft.notes, Multiline: true, Rows: 10, OnChange: "editorChangeNotes", Style: "width: 100%; height: 280px;" })
                        )
                    )
                ),
                WF.Element(
                    "div",
                    { style: "display: flex; justify-content: space-between; padding: 10px;" },
                    WF.Button({ Text: UiText.playground.buttons.deleteEllipsis, OnClick: "deleteFromEditor", Enabled: editorMode === "edit" }),
                    WF.Element(
                        "div",
                        { style: "display: flex; gap: 8px;" },
                        WF.Button({ Text: UiText.playground.buttons.cancel, OnClick: "editorCancel" }),
                        WF.Button({ Text: UiText.playground.buttons.save, OnClick: "editorSave", Default: true })
                    )
                )
            )
            : null,
        showImport
            ? WF.Window(
                {
                    Text: UiText.playground.dialogs.import,
                    Dialog: true,
                    Draggable: true,
                    StartPosition: "centerParent",
                    OnClose: "cancelImport",
                    Style: "width: 900px; height: 640px;"
                },
                WF.Element(
                    "div",
                    { style: "padding: 12px; display: flex; flex-direction: column; gap: 10px; height: 100%;" },
                    WF.Element(
                        "div",
                        { style: "display: flex; gap: 8px; align-items: center;" },
                        WF.Label({ Text: UiText.playground.labels.step1, Style: "font-weight: bold;" }),
                        WF.TextBox({ Text: UiText.playground.placeholders.importPath, Style: "width: 360px;" }),
                        WF.Button({ Text: UiText.playground.buttons.browse, OnClick: "importBrowse" })
                    ),
                    WF.Element(
                        "div",
                        { style: "display: flex; gap: 16px; align-items: center; flex-wrap: wrap;" },
                        WF.CheckBox({ Text: UiText.playground.checkboxes.firstRowHeaders, Checked: true }),
                        WF.Label({ Text: UiText.playground.labels.delimiter }),
                        WF.ComboBox({ Items: UiText.playground.options.delimiterItems, SelectedIndex: "0", Style: "width: 80px;" }),
                        WF.Label({ Text: UiText.playground.labels.encoding }),
                        WF.ComboBox({ Items: UiText.playground.options.encodingItems, SelectedIndex: "0", Style: "width: 120px;" })
                    ),
                    WF.GroupBox(
                        { Text: UiText.playground.labels.preview, Style: "flex: 1;" },
                        WF.ListBox({
                            Items: UiText.playground.previews.importRows,
                            SelectionMode: "single",
                            SelectedIndex: "0",
                            Style: "width: 100%; height: 100%;"
                        })
                    ),
                    WF.Element(
                        "div",
                        { style: "display: flex; justify-content: space-between; align-items: center;" },
                        WF.Label({ Text: UiText.playground.labels.summary }),
                        WF.Element(
                            "div",
                            { style: "display: flex; gap: 8px;" },
                            WF.Button({ Text: UiText.playground.buttons.cancel, OnClick: "cancelImport" }),
                            WF.Button({ Text: UiText.playground.buttons.importNow, OnClick: "importNow", Default: true })
                        )
                    )
                )
            )
            : null,
        showPreferences
            ? WF.Window(
                {
                    Text: UiText.playground.dialogs.preferences,
                    Dialog: true,
                    Draggable: true,
                    StartPosition: "centerParent",
                    OnClose: "prefCancel",
                    Style: "width: 560px; height: 480px;"
                },
                WF.TabControl(
                    { SelectedIndex: "0", Style: "width: 100%; height: 100%;" },
                    WF.TabPage(
                        { Text: UiText.playground.tabs.general },
                        WF.Element(
                            "div",
                            { style: "padding: 12px; display: flex; flex-direction: column; gap: 8px;" },
                            WF.CheckBox({ Text: UiText.playground.checkboxes.requireEmail, Checked: requireEmail, OnChange: "prefRequireEmail" }),
                            WF.CheckBox({ Text: UiText.playground.checkboxes.confirmDelete, Checked: confirmDelete, OnChange: "prefConfirmDelete" }),
                            WF.CheckBox({ Text: UiText.playground.checkboxes.autosave, Checked: autosave, OnChange: "prefAutosave" }),
                            WF.Label({ Text: UiText.playground.labels.autosaveMinutes, Style: "font-weight: bold;" }),
                            WF.TextBox({ Text: autosaveMinutes, OnChange: "prefAutosaveMinutes", Style: "width: 120px;" })
                        )
                    ),
                    WF.TabPage(
                        { Text: UiText.playground.tabs.data },
                        WF.Element(
                            "div",
                            { style: "padding: 12px; display: flex; flex-direction: column; gap: 8px;" },
                            WF.CheckBox({ Text: UiText.playground.checkboxes.trimWhitespace, Checked: true }),
                            WF.CheckBox({ Text: UiText.playground.checkboxes.normalisePhone, Checked: false }),
                            WF.CheckBox({ Text: UiText.playground.checkboxes.detectDuplicates, Checked: true })
                        )
                    ),
                    WF.TabPage(
                        { Text: UiText.playground.tabs.ui },
                        WF.Element(
                            "div",
                            { style: "padding: 12px; display: flex; flex-direction: column; gap: 8px;" },
                            WF.CheckBox({ Text: UiText.playground.checkboxes.rememberWindowSize, Checked: true }),
                            WF.Label({ Text: UiText.playground.labels.defaultSort, Style: "font-weight: bold;" }),
                            WF.ComboBox({
                                Items: UiText.playground.options.defaultSortItems,
                                SelectedIndex: defaultSort === UiText.playground.options.defaultSortDefault ? "0" : "1",
                                OnChange: "prefDefaultSort",
                                Style: "width: 180px;"
                            })
                        )
                    )
                ),
                WF.Element(
                    "div",
                    { style: "display: flex; justify-content: flex-end; gap: 8px; padding: 10px;" },
                    WF.Button({ Text: UiText.playground.buttons.cancel, OnClick: "prefCancel" }),
                    WF.Button({ Text: UiText.playground.buttons.ok, OnClick: "prefSave", Default: true })
                )
            )
            : null,
        showDeleteConfirm
            ? WF.MessageBox({
                Title: UiText.playground.confirmations.confirmDeleteTitle,
                Message: UiText.playground.confirmations.confirmDeleteMessage.replace("{name}", selectedContact?.fullName ?? ""),
                Mode: "confirm",
                OnResult: "confirmDeleteResult",
                Style: "width: 420px;"
            })
            : null,
        showDiscardConfirm
            ? WF.Window(
                {
                    Text: UiText.playground.dialogs.discard,
                    Dialog: true,
                    Draggable: true,
                    StartPosition: "centerParent",
                    OnClose: "keepEditing",
                    Style: "width: 420px; height: 180px;"
                },
                WF.Element(
                    "div",
                    { style: "padding: 14px;" },
                    WF.Label({ Text: UiText.playground.confirmations.discard, Style: "margin-bottom: 12px; display: block;" }),
                    WF.Element(
                        "div",
                        { style: "display: flex; justify-content: flex-end; gap: 8px;" },
                        WF.Button({ Text: UiText.playground.buttons.keepEditing, OnClick: "keepEditing" }),
                        WF.Button({ Text: UiText.playground.buttons.discard, OnClick: "discardChanges", Default: true })
                    )
                )
            )
            : null
    ];

    return WF.Element(
        "div",
        { style: "position: relative; min-height: 100vh;" },
        mainWindow,
        ...overlayNodes
    );
};
