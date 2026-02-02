import React, { useMemo, useRef, useState } from "react";
import { FormContainer } from "../forms/FormContainer";
import { element, node } from "../forms/core";
import { isDiagnosticsEnabled, setDiagnosticsEnabled } from "../forms";
import { UiText } from "./uiText";
import { ControlKind } from "../forms/controlKinds";

type Contact = {
    id: string;
    fullName: string;
    company: string;
    email: string;
    phone: string;
    address: string;
    tags: string;
    notes: string;
    isActive: boolean;
    updatedAt: string;
};

const initialContacts: Contact[] = [
    {
        id: "c1",
        fullName: "Ava Martinez",
        company: "Northwind Traders",
        email: "ava.martinez@northwind.com",
        phone: "+1 555-0134",
        address: "12 Market Street, Seattle",
        tags: "vip,finance",
        notes: "Prefers email. Quarterly check-ins.",
        isActive: true,
        updatedAt: "12:03"
    },
    {
        id: "c2",
        fullName: "Jonas Reid",
        company: "Contoso",
        email: "jonas.reid@contoso.com",
        phone: "+1 555-0192",
        address: "88 River Road, Austin",
        tags: "engineering",
        notes: "Interested in beta features.",
        isActive: true,
        updatedAt: "11:42"
    },
    {
        id: "c3",
        fullName: "Priya Shah",
        company: "Fabrikam",
        email: "priya.shah@fabrikam.io",
        phone: "",
        address: "200 Lake Ave, Denver",
        tags: "marketing,events",
        notes: "No phone on file.",
        isActive: false,
        updatedAt: "10:18"
    }
];

export const Playground: React.FC = () => {
    const [contacts, setContacts] = useState<Contact[]>(initialContacts);
    const [selectedId, setSelectedId] = useState<string>(initialContacts[0]?.id ?? "");
    const [status, setStatus] = useState<string>(UiText.playground.statuses.ready);
    const [searchText, setSearchText] = useState("");
    const [filterMode, setFilterMode] = useState<string>(UiText.playground.filters.all);
    const [activeOnly, setActiveOnly] = useState(false);
    const [showEditor, setShowEditor] = useState(false);
    const [editorMode, setEditorMode] = useState<"new" | "edit">("new");
    const [showImport, setShowImport] = useState(false);
    const [showPreferences, setShowPreferences] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
    const [requireEmail, setRequireEmail] = useState(true);
    const [confirmDelete, setConfirmDelete] = useState(true);
    const [autosave, setAutosave] = useState(true);
    const [autosaveMinutes, setAutosaveMinutes] = useState("5");
    const [defaultSort, setDefaultSort] = useState(UiText.playground.options.defaultSortDefault);
    const [showDiagnostics, setShowDiagnostics] = useState(() => isDiagnosticsEnabled());
    const [editorDraft, setEditorDraft] = useState<Contact>({
        id: "",
        fullName: "",
        company: "",
        email: "",
        phone: "",
        address: "",
        tags: "",
        notes: "",
        isActive: true,
        updatedAt: ""
    });
    const [editorErrors, setEditorErrors] = useState<Record<string, string>>({});
    const [editorDirty, setEditorDirty] = useState(false);

    const statusTimer = useRef<number | null>(null);

    const setStatusMessage = (message: string) => {
        setStatus(message);
        if (statusTimer.current) {
            window.clearTimeout(statusTimer.current);
        }
        statusTimer.current = window.setTimeout(() => setStatus(UiText.playground.statuses.ready), 3500);
    };

    const selectedContact = contacts.find((c) => c.id === selectedId) ?? null;

    const filteredContacts = contacts.filter((c) => {
        if (activeOnly && !c.isActive) return false;
        if (filterMode === UiText.playground.filters.withEmail && !c.email) return false;
        if (filterMode === UiText.playground.filters.withPhone && !c.phone) return false;
        if (filterMode === UiText.playground.filters.recentlyEdited && c.updatedAt !== UiText.playground.filters.recentlyEditedTimestamp) return false;
        if (searchText.trim().length === 0) return true;
        const haystack = `${c.fullName} ${c.company} ${c.email} ${c.tags}`.toLowerCase();
        return haystack.includes(searchText.toLowerCase());
    });

    const listItems = filteredContacts.map((c) => `${c.fullName}${UiText.playground.separators.nameCompany}${c.company}`);
    const selectedIndex = filteredContacts.findIndex((c) => c.id === selectedId);

    const openEditor = (mode: "new" | "edit") => {
        if (mode === "edit" && !selectedContact) {
            setStatusMessage(UiText.playground.statusMessages.selectContactToEdit);
            return;
        }
        setEditorMode(mode);
        const base = mode === "edit" && selectedContact ? selectedContact : {
            id: "",
            fullName: "",
            company: "",
            email: "",
            phone: "",
            address: "",
            tags: "",
            notes: "",
            isActive: true,
            updatedAt: ""
        };
        setEditorDraft({ ...base });
        setEditorErrors({});
        setEditorDirty(false);
        setShowEditor(true);
    };

    const validateEditor = () => {
        const errors: Record<string, string> = {};
        if (!editorDraft.fullName || editorDraft.fullName.trim().length < 2) {
            errors.fullName = UiText.playground.validation.fullNameRequired;
        }
        if (requireEmail && !editorDraft.email) {
            errors.email = UiText.playground.validation.emailRequired;
        }
        if (editorDraft.email && !editorDraft.email.includes("@")) {
            errors.email = UiText.playground.validation.invalidEmail;
        }
        setEditorErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const saveEditor = () => {
        if (!validateEditor()) return;
        const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        if (editorMode === "new") {
            const newContact: Contact = {
                ...editorDraft,
                id: `c${Date.now()}`,
                updatedAt: now
            };
            setContacts((prev) => [newContact, ...prev]);
            setSelectedId(newContact.id);
            setStatusMessage(UiText.playground.statusMessages.createdContact.replace("{name}", newContact.fullName));
        } else if (selectedContact) {
            const updated: Contact = {
                ...editorDraft,
                id: selectedContact.id,
                updatedAt: now
            };
            setContacts((prev) => prev.map((c) => (c.id === selectedContact.id ? updated : c)));
            setSelectedId(updated.id);
            setStatusMessage(UiText.playground.statusMessages.updatedContact.replace("{name}", updated.fullName));
        }
        setShowEditor(false);
        setEditorDirty(false);
    };

    const confirmDeleteSelected = () => {
        if (!selectedContact) return;
        if (confirmDelete) {
            setShowDeleteConfirm(true);
            return;
        }
        deleteSelected();
    };

    const deleteSelected = () => {
        if (!selectedContact) return;
        setContacts((prev) => prev.filter((c) => c.id !== selectedContact.id));
        const remaining = contacts.filter((c) => c.id !== selectedContact.id);
        setSelectedId(remaining[0]?.id ?? "");
        setShowDeleteConfirm(false);
    };

    const handlers = useMemo(
        () => ({
            miFileNew: () => openEditor("new"),
            miFileImport: () => setShowImport(true),
            miFileExit: () => setStatusMessage(UiText.playground.statusMessages.exitRequested),
            miEditEdit: () => openEditor("edit"),
            miEditDelete: () => confirmDeleteSelected(),
            miEditFind: () => setStatusMessage(UiText.playground.statusMessages.focusSearch),
            miToolsPreferences: () => setShowPreferences(true),
            miHelpAbout: () => setStatusMessage(UiText.playground.statusMessages.about),
            closeMain: () => setStatusMessage(UiText.playground.statusMessages.closeRequested),
            quickSearch: (args: any) => setSearchText(args?.value ?? ""),
            searchChange: (args: any) => setSearchText(args?.value ?? ""),
            filterChange: (args: any) => setFilterMode(args?.selectedValue ?? UiText.playground.filters.all),
            toggleActive: (args: any) => setActiveOnly(Boolean(args?.checked)),
            selectContact: (args: any) => {
                const index = args?.selectedIndices?.[0] ?? -1;
                const contact = filteredContacts[index];
                if (contact) setSelectedId(contact.id);
            },
            openEditorNew: () => openEditor("new"),
            openEditorEdit: () => openEditor("edit"),
            deleteSelected: () => confirmDeleteSelected(),
            callContact: () => {
                const message = selectedContact?.phone
                    ? UiText.playground.statusMessages.calling.replace("{name}", selectedContact.fullName)
                    : UiText.playground.statusMessages.noPhone;
                setStatusMessage(message);
            },
            emailContact: () => {
                const message = selectedContact?.email
                    ? UiText.playground.statusMessages.emailSent.replace("{name}", selectedContact.fullName)
                    : UiText.playground.statusMessages.noEmail;
                setStatusMessage(message);
            },
            editorChangeFullName: (args: any) => {
                setEditorDraft((prev) => ({ ...prev, fullName: args?.value ?? "" }));
                setEditorDirty(true);
            },
            editorChangeCompany: (args: any) => {
                setEditorDraft((prev) => ({ ...prev, company: args?.value ?? "" }));
                setEditorDirty(true);
            },
            editorChangeEmail: (args: any) => {
                setEditorDraft((prev) => ({ ...prev, email: args?.value ?? "" }));
                setEditorDirty(true);
            },
            editorChangePhone: (args: any) => {
                setEditorDraft((prev) => ({ ...prev, phone: args?.value ?? "" }));
                setEditorDirty(true);
            },
            editorChangeTags: (args: any) => {
                setEditorDraft((prev) => ({ ...prev, tags: args?.value ?? "" }));
                setEditorDirty(true);
            },
            editorChangeAddress1: (args: any) => {
                setEditorDraft((prev) => ({ ...prev, address: args?.value ?? "" }));
                setEditorDirty(true);
            },
            editorToggleActive: (args: any) => {
                setEditorDraft((prev) => ({ ...prev, isActive: Boolean(args?.checked) }));
                setEditorDirty(true);
            },
            editorChangeNotes: (args: any) => {
                setEditorDraft((prev) => ({ ...prev, notes: args?.value ?? "" }));
                setEditorDirty(true);
            },
            editorCancel: () => {
                if (editorDirty) {
                    setShowDiscardConfirm(true);
                    return;
                }
                setShowEditor(false);
            },
            deleteFromEditor: () => confirmDeleteSelected(),
            editorSave: () => saveEditor(),
            keepEditing: () => setShowDiscardConfirm(false),
            discardChanges: () => {
                setShowDiscardConfirm(false);
                setShowEditor(false);
            },
            cancelImport: () => setShowImport(false),
            importNow: () => {
                setShowImport(false);
                setStatusMessage(UiText.playground.statusMessages.imported);
            },
            importBrowse: () => setStatusMessage(UiText.playground.statusMessages.browseImport),
            prefCancel: () => setShowPreferences(false),
            prefSave: () => {
                setShowPreferences(false);
                setStatusMessage(UiText.playground.statusMessages.preferencesSaved);
            },
            prefRequireEmail: (args: any) => setRequireEmail(Boolean(args?.checked)),
            prefConfirmDelete: (args: any) => setConfirmDelete(Boolean(args?.checked)),
            prefAutosave: (args: any) => setAutosave(Boolean(args?.checked)),
            prefAutosaveMinutes: (args: any) => setAutosaveMinutes(String(args?.value ?? "")),
            prefDefaultSort: (args: any) => setDefaultSort(args?.selectedValue ?? UiText.playground.options.defaultSortDefault),
            toggleDiagnostics: () => {
                const next = !showDiagnostics;
                setShowDiagnostics(next);
                setDiagnosticsEnabled(next);
                setStatusMessage(next ? UiText.playground.statusMessages.diagnosticsEnabled : UiText.playground.statusMessages.diagnosticsDisabled);
            },
            confirmDeleteResult: (args: any) => {
                const normalized = String(args?.result ?? "").toLowerCase();
                if (normalized === "ok" || normalized === "yes") {
                    deleteSelected();
                }
                setShowDeleteConfirm(false);
            }
        }),
        [
            confirmDelete,
            contacts,
            defaultSort,
            editorDirty,
            filteredContacts,
            requireEmail,
            selectedContact,
            showDiagnostics
        ]
    );

    const mainWindow = node(
        ControlKind.window,
        {
            title: UiText.playground.windowTitle,
            icon: "info",
            draggable: true,
            startPosition: "centerScreen",
            onClose: "closeMain",
            style: "width: 1120px; height: 760px;"
        },
        node(ControlKind.menuBar, {},
            node(ControlKind.menuItem, { label: UiText.playground.menu.file },
                node(ControlKind.menuItemEntry, { onClick: "miFileNew", icon: "new" }, element("span", {}, UiText.playground.menu.newContact)),
                node(ControlKind.menuItemEntry, { onClick: "miFileImport", icon: "import" }, element("span", {}, UiText.playground.menu.import)),
                node(ControlKind.menuItemEntry, { onClick: "miFileExit", icon: "exit" }, element("span", {}, UiText.playground.menu.exit))
            ),
            node(ControlKind.menuItem, { label: UiText.playground.menu.edit },
                node(ControlKind.menuItemEntry, { onClick: "miEditEdit", icon: "edit" }, element("span", {}, UiText.playground.menu.editContact)),
                node(ControlKind.menuItemEntry, { onClick: "miEditDelete", icon: "delete" }, element("span", {}, UiText.playground.menu.deleteContact)),
                node(ControlKind.menuItemEntry, { onClick: "miEditFind", icon: "search" }, element("span", {}, UiText.playground.menu.find))
            ),
            node(ControlKind.menuItem, { label: UiText.playground.menu.tools },
                node(ControlKind.menuItemEntry, { onClick: "miToolsPreferences", icon: "settings" }, element("span", {}, UiText.playground.menu.preferences)),
                node(ControlKind.menuItemEntry, { onClick: "toggleDiagnostics", icon: "diagnostics" }, element("span", {}, UiText.playground.menu.diagnostics))
            ),
            node(ControlKind.menuItem, { label: UiText.playground.menu.help },
                node(ControlKind.menuItemEntry, { onClick: "miHelpAbout", icon: "info" }, element("span", {}, UiText.playground.menu.about))
            )
        ),
        element("div", { style: "padding: 10px; background: var(--surface); height: 100%; box-sizing: border-box;" },
            element("div", { style: "display: flex; gap: 8px; align-items: center; margin-bottom: 8px; flex-wrap: wrap;" },
                node(ControlKind.button, { text: UiText.playground.buttons.new, icon: "new", onClick: "openEditorNew" }),
                node(ControlKind.button, { text: UiText.playground.buttons.edit, icon: "edit", onClick: "openEditorEdit", enabled: Boolean(selectedContact) }),
                node(ControlKind.button, { text: UiText.playground.buttons.delete, icon: "delete", onClick: "deleteSelected", enabled: Boolean(selectedContact) }),
                element("div", { style: "width: 1px; height: 24px; background: var(--border-dark); margin: " + "0 4px" }),
                node(ControlKind.button, { text: UiText.playground.buttons.import, icon: "import", onClick: "miFileImport" }),
                element("div", { style: "width: 1px; height: 24px; background: var(--border-dark); margin: " + "0 4px" }),
                node(ControlKind.label, { text: UiText.playground.labels.search, style: "font-size: 12px;" }),
                node(ControlKind.textBox, { value: searchText, onChange: "quickSearch", style: "width: 240px;" })
            ),
            node(ControlKind.splitContainer, { orientation: "vertical", splitPosition: "55%", style: "height: calc(100% - 96px);" },
                node(ControlKind.groupBox, { text: UiText.playground.labels.contacts, style: "height: 100%;" },
                    element("div", { style: "display: flex; gap: 8px; flex-direction: column; height: 100%;" },
                        node(ControlKind.textBox, { value: searchText, onChange: "searchChange", placeholder: UiText.playground.placeholders.searchContacts, style: "width: 100%;" }),
                        node(ControlKind.comboBox, { items: UiText.playground.options.searchFilterItems.join(","), selectedIndex: "0", onChange: "filterChange", style: "width: 100%;" }),
                        node(ControlKind.checkBox, { text: UiText.playground.checkboxes.activeOnly, checked: activeOnly, onChange: "toggleActive" }),
                        node(ControlKind.listBox, {
                            items: listItems,
                            selectionMode: "single",
                            selectedIndex: String(Math.max(selectedIndex, 0)),
                            size: "10",
                            onChange: "selectContact",
                            style: "width: 100%; height: 100%;"
                        })
                    )
                ),
                node(ControlKind.groupBox, { text: UiText.playground.labels.details, style: "height: 100%;" },
                    element("div", { style: "display: flex; flex-direction: column; height: 100%;" },
                        node(ControlKind.tableLayoutPanel, { rows: "6", cols: "2", style: "width: 100%; gap: 6px;" },
                            node(ControlKind.label, { text: UiText.playground.labels.name, style: "font-weight: bold;" }),
                            node(ControlKind.label, { text: selectedContact?.fullName ?? UiText.playground.placeholders.emptyValue }),
                            node(ControlKind.label, { text: UiText.playground.labels.company, style: "font-weight: bold;" }),
                            node(ControlKind.label, { text: selectedContact?.company ?? UiText.playground.placeholders.emptyValue }),
                            node(ControlKind.label, { text: UiText.playground.labels.email, style: "font-weight: bold;" }),
                            node(ControlKind.label, { text: selectedContact?.email ?? UiText.playground.placeholders.emptyValue }),
                            node(ControlKind.label, { text: UiText.playground.labels.phone, style: "font-weight: bold;" }),
                            node(ControlKind.label, { text: selectedContact?.phone ?? UiText.playground.placeholders.emptyValue }),
                            node(ControlKind.label, { text: UiText.playground.labels.address, style: "font-weight: bold;" }),
                            node(ControlKind.label, { text: selectedContact?.address ?? UiText.playground.placeholders.emptyValue }),
                            node(ControlKind.label, { text: UiText.playground.labels.notes, style: "font-weight: bold;" }),
                            node(ControlKind.label, { text: selectedContact?.notes ?? UiText.playground.placeholders.emptyValue })
                        ),
                        element("div", { style: "margin-top: auto; display: flex; justify-content: flex-end; gap: 8px; padding-top: 10px;" },
                            node(ControlKind.button, { text: UiText.playground.buttons.call, icon: "phone", onClick: "callContact", enabled: Boolean(selectedContact?.phone) }),
                            node(ControlKind.button, { text: UiText.playground.buttons.email, icon: "email", onClick: "emailContact", enabled: Boolean(selectedContact?.email) }),
                            node(ControlKind.button, { text: UiText.playground.buttons.editEllipsis, icon: "edit", onClick: "openEditorEdit", enabled: Boolean(selectedContact) })
                        )
                    )
                )
            ),
            showDiagnostics
                ? node(ControlKind.diagnosticsPanel, { title: UiText.playground.titles.diagnostics, maxItems: 6, style: "margin-top: 8px; height: 140px;" })
                : null,
            node(ControlKind.statusBar, {
                segments: [
                    `${UiText.playground.labels.statusPrefix} ${status}`,
                    `${UiText.playground.labels.countPrefix} ${contacts.length}`,
                    `${UiText.playground.labels.lastSavedPrefix} ${selectedContact?.updatedAt ?? UiText.playground.placeholders.emptyValue}`
                ]
            })
        )
    );

    const playgroundNode = element(
        "div",
        { style: "position: relative; min-height: 100vh;" },
        mainWindow,
        showEditor
            ? node(ControlKind.window, { title: editorMode === "new" ? UiText.playground.dialogs.editorNew : UiText.playground.dialogs.editorEdit, dialog: true, draggable: true, startPosition: "centerParent", onClose: "editorCancel", style: "width: 620px; height: 520px;" },
                node(ControlKind.tabControl, { selectedIndex: "0", style: "width: 100%; height: 100%;" },
                    node(ControlKind.tabPage, { text: UiText.playground.tabs.general },
                        element("div", { style: "display: flex; flex-direction: column; gap: 8px; padding: 12px;" },
                            node(ControlKind.label, { text: UiText.playground.labels.fullNameRequired, style: "font-weight: bold;" }),
                            node(ControlKind.textBox, { value: editorDraft.fullName, onChange: "editorChangeFullName", style: "width: 100%;" }),
                            editorErrors.fullName ? node(ControlKind.label, { text: editorErrors.fullName, style: "color: red; font-size: 12px;" }) : null,
                            node(ControlKind.label, { text: UiText.playground.labels.company, style: "font-weight: bold;" }),
                            node(ControlKind.textBox, { value: editorDraft.company, onChange: "editorChangeCompany", style: "width: 100%;" }),
                            node(ControlKind.label, { text: UiText.playground.labels.emailRequired, style: "font-weight: bold;" }),
                            node(ControlKind.textBox, { value: editorDraft.email, onChange: "editorChangeEmail", style: "width: 100%;" }),
                            editorErrors.email ? node(ControlKind.label, { text: editorErrors.email, style: "color: red; font-size: 12px;" }) : null,
                            node(ControlKind.label, { text: UiText.playground.labels.phone, style: "font-weight: bold;" }),
                            node(ControlKind.textBox, { value: editorDraft.phone, onChange: "editorChangePhone", style: "width: 100%;" }),
                            node(ControlKind.label, { text: UiText.playground.labels.tags, style: "font-weight: bold;" }),
                            node(ControlKind.textBox, { value: editorDraft.tags, onChange: "editorChangeTags", style: "width: 100%;" }),
                            node(ControlKind.label, { text: UiText.playground.labels.address, style: "font-weight: bold;" }),
                            node(ControlKind.textBox, { value: editorDraft.address, onChange: "editorChangeAddress1", style: "width: 100%;" }),
                            node(ControlKind.checkBox, { text: UiText.playground.checkboxes.activeContact, checked: editorDraft.isActive, onChange: "editorToggleActive" })
                        )
                    ),
                    node(ControlKind.tabPage, { text: UiText.playground.tabs.notes },
                        element("div", { style: "padding: 12px;" },
                            node(ControlKind.textBox, { value: editorDraft.notes, multiline: true, rows: 10, onChange: "editorChangeNotes", style: "width: 100%; height: 280px;" })
                        )
                    )
                ),
                element("div", { style: "display: flex; justify-content: space-between; padding: 10px;" },
                    node(ControlKind.button, { text: UiText.playground.buttons.deleteEllipsis, onClick: "deleteFromEditor", enabled: editorMode === "edit" }),
                    element("div", { style: "display: flex; gap: 8px;" },
                        node(ControlKind.button, { text: UiText.playground.buttons.cancel, onClick: "editorCancel" }),
                        node(ControlKind.button, { text: UiText.playground.buttons.save, onClick: "editorSave", default: true })
                    )
                )
            )
            : null,
        showImport
            ? node(ControlKind.window, { title: UiText.playground.dialogs.import, dialog: true, draggable: true, startPosition: "centerParent", onClose: "cancelImport", style: "width: 900px; height: 640px;" },
                element("div", { style: "padding: 12px; display: flex; flex-direction: column; gap: 10px; height: 100%;" },
                    element("div", { style: "display: flex; gap: 8px; align-items: center;" },
                        node(ControlKind.label, { text: UiText.playground.labels.step1, style: "font-weight: bold;" }),
                        node(ControlKind.textBox, { value: UiText.playground.placeholders.importPath, style: "width: 360px;" }),
                        node(ControlKind.button, { text: UiText.playground.buttons.browse, onClick: "importBrowse" })
                    ),
                    element("div", { style: "display: flex; gap: 16px; align-items: center; flex-wrap: wrap;" },
                        node(ControlKind.checkBox, { text: UiText.playground.checkboxes.firstRowHeaders, checked: true }),
                        node(ControlKind.label, { text: UiText.playground.labels.delimiter }),
                        node(ControlKind.comboBox, { items: UiText.playground.options.delimiterItems, selectedIndex: "0", style: "width: 80px;" }),
                        node(ControlKind.label, { text: UiText.playground.labels.encoding }),
                        node(ControlKind.comboBox, { items: UiText.playground.options.encodingItems, selectedIndex: "0", style: "width: 120px;" })
                    ),
                    node(ControlKind.groupBox, { text: UiText.playground.labels.preview, style: "flex: 1;" },
                        node(ControlKind.listBox, {
                            items: UiText.playground.previews.importRows,
                            selectionMode: "single",
                            selectedIndex: "0",
                            size: "10",
                            style: "width: 100%; height: 100%;"
                        })
                    ),
                    element("div", { style: "display: flex; justify-content: space-between; align-items: center;" },
                        node(ControlKind.label, { text: UiText.playground.labels.summary }),
                        element("div", { style: "display: flex; gap: 8px;" },
                            node(ControlKind.button, { text: UiText.playground.buttons.cancel, onClick: "cancelImport" }),
                            node(ControlKind.button, { text: UiText.playground.buttons.importNow, onClick: "importNow", default: true })
                        )
                    )
                )
            )
            : null,
        showPreferences
            ? node(ControlKind.window, { title: UiText.playground.dialogs.preferences, dialog: true, draggable: true, startPosition: "centerParent", onClose: "prefCancel", style: "width: 560px; height: 480px;" },
                node(ControlKind.tabControl, { selectedIndex: "0", style: "width: 100%; height: 100%;" },
                    node(ControlKind.tabPage, { text: UiText.playground.tabs.general },
                        element("div", { style: "padding: 12px; display: flex; flex-direction: column; gap: 8px;" },
                            node(ControlKind.checkBox, { text: UiText.playground.checkboxes.requireEmail, checked: requireEmail, onChange: "prefRequireEmail" }),
                            node(ControlKind.checkBox, { text: UiText.playground.checkboxes.confirmDelete, checked: confirmDelete, onChange: "prefConfirmDelete" }),
                            node(ControlKind.checkBox, { text: UiText.playground.checkboxes.autosave, checked: autosave, onChange: "prefAutosave" }),
                            node(ControlKind.label, { text: UiText.playground.labels.autosaveMinutes, style: "font-weight: bold;" }),
                            node(ControlKind.textBox, { value: autosaveMinutes, onChange: "prefAutosaveMinutes", style: "width: 120px;" })
                        )
                    ),
                    node(ControlKind.tabPage, { text: UiText.playground.tabs.data },
                        element("div", { style: "padding: 12px; display: flex; flex-direction: column; gap: 8px;" },
                            node(ControlKind.checkBox, { text: UiText.playground.checkboxes.trimWhitespace, checked: true }),
                            node(ControlKind.checkBox, { text: UiText.playground.checkboxes.normalisePhone, checked: false }),
                            node(ControlKind.checkBox, { text: UiText.playground.checkboxes.detectDuplicates, checked: true })
                        )
                    ),
                    node(ControlKind.tabPage, { text: UiText.playground.tabs.ui },
                        element("div", { style: "padding: 12px; display: flex; flex-direction: column; gap: 8px;" },
                            node(ControlKind.checkBox, { text: UiText.playground.checkboxes.rememberWindowSize, checked: true }),
                            node(ControlKind.label, { text: UiText.playground.labels.defaultSort, style: "font-weight: bold;" }),
                            node(ControlKind.comboBox, { items: UiText.playground.options.defaultSortItems, selectedIndex: defaultSort === UiText.playground.options.defaultSortDefault ? "0" : "1", onChange: "prefDefaultSort", style: "width: 180px;" })
                        )
                    )
                ),
                element("div", { style: "display: flex; justify-content: flex-end; gap: 8px; padding: 10px;" },
                    node(ControlKind.button, { text: UiText.playground.buttons.cancel, onClick: "prefCancel" }),
                    node(ControlKind.button, { text: UiText.playground.buttons.ok, onClick: "prefSave", default: true })
                )
            )
            : null,
        showDeleteConfirm
            ? node(ControlKind.messageBox, {
                title: UiText.playground.confirmations.confirmDeleteTitle,
                message: UiText.playground.confirmations.confirmDeleteMessage.replace("{name}", selectedContact?.fullName ?? ""),
                mode: "confirm",
                onResult: "confirmDeleteResult",
                style: "width: 420px;"
            })
            : null,
        showDiscardConfirm
            ? node(ControlKind.window, { title: UiText.playground.dialogs.discard, dialog: true, draggable: true, startPosition: "centerParent", onClose: "keepEditing", style: "width: 420px; height: 180px;" },
                element("div", { style: "padding: 14px;" },
                    node(ControlKind.label, { text: UiText.playground.confirmations.discard, style: "margin-bottom: 12px; display: block;" }),
                    element("div", { style: "display: flex; justify-content: flex-end; gap: 8px;" },
                        node(ControlKind.button, { text: UiText.playground.buttons.keepEditing, onClick: "keepEditing" }),
                        node(ControlKind.button, { text: UiText.playground.buttons.discard, onClick: "discardChanges", default: true })
                    )
                )
            )
            : null
    );

    return <FormContainer node={playgroundNode} handlers={handlers} />;
};
