import React, { useMemo, useRef, useState } from "react";
import { FormContainer } from "../forms/FormContainer";
import { node, element } from "../forms/core";
import { isDiagnosticsEnabled, setDiagnosticsEnabled } from "../forms";

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
    const [status, setStatus] = useState("Ready");
    const [searchText, setSearchText] = useState("");
    const [filterMode, setFilterMode] = useState("All");
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
    const [defaultSort, setDefaultSort] = useState("Name");
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
        statusTimer.current = window.setTimeout(() => setStatus("Ready"), 3500);
    };

    const selectedContact = contacts.find((c) => c.id === selectedId) ?? null;

    const filteredContacts = contacts.filter((c) => {
        if (activeOnly && !c.isActive) return false;
        if (filterMode === "With Email" && !c.email) return false;
        if (filterMode === "With Phone" && !c.phone) return false;
        if (filterMode === "Recently Edited" && c.updatedAt !== "12:03") return false;
        if (searchText.trim().length === 0) return true;
        const haystack = `${c.fullName} ${c.company} ${c.email} ${c.tags}`.toLowerCase();
        return haystack.includes(searchText.toLowerCase());
    });

    const listItems = filteredContacts.map((c) => `${c.fullName} — ${c.company}`);
    const selectedIndex = filteredContacts.findIndex((c) => c.id === selectedId);

    const openEditor = (mode: "new" | "edit") => {
        if (mode === "edit" && !selectedContact) {
            setStatusMessage("Select a contact to edit.");
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
            errors.fullName = "Full name is required (min 2 chars).";
        }
        if (requireEmail && !editorDraft.email) {
            errors.email = "Email is required.";
        }
        if (editorDraft.email && !editorDraft.email.includes("@")) {
            errors.email = "Invalid email format.";
        }
        setEditorErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const saveEditor = () => {
        if (!validateEditor()) return;
        if (editorMode === "new") {
            const newContact: Contact = {
                ...editorDraft,
                id: `c${Date.now()}`,
                updatedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            };
            setContacts((prev) => [newContact, ...prev]);
            setSelectedId(newContact.id);
            setStatusMessage(`Created contact: ${newContact.fullName}`);
        } else if (selectedContact) {
            const updated = {
                ...editorDraft,
                id: selectedContact.id,
                updatedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            };
            setContacts((prev) => prev.map((c) => (c.id === selectedContact.id ? updated : c)));
            setSelectedId(updated.id);
            setStatusMessage(`Updated contact: ${updated.fullName}`);
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
        setStatusMessage(`Deleted contact: ${selectedContact.fullName}`);
        setShowDeleteConfirm(false);
    };

    const handlers = useMemo(
        () => ({
            miFileNew: () => openEditor("new"),
            miFileImport: () => setShowImport(true),
            miFileExit: () => setStatusMessage("Exit requested (demo only)."),
            miEditEdit: () => openEditor("edit"),
            miEditDelete: () => confirmDeleteSelected(),
            miEditFind: () => setStatusMessage("Focus search (demo)."),
            miToolsPreferences: () => setShowPreferences(true),
            miHelpAbout: () => setStatusMessage("Contact Desk v1.0 (demo)."),
            closeMain: () => setStatusMessage("Close requested (demo only)."),
            quickSearch: (args: any) => setSearchText(args?.value ?? ""),
            searchChange: (args: any) => setSearchText(args?.value ?? ""),
            filterChange: (args: any) => setFilterMode(args?.selectedValue ?? "All"),
            toggleActive: (args: any) => setActiveOnly(Boolean(args?.checked)),
            selectContact: (args: any) => {
                const index = args?.selectedIndices?.[0] ?? -1;
                const contact = filteredContacts[index];
                if (contact) {
                    setSelectedId(contact.id);
                }
            },
            openEditorNew: () => openEditor("new"),
            openEditorEdit: () => openEditor("edit"),
            deleteSelected: () => confirmDeleteSelected(),
            callContact: () => setStatusMessage(selectedContact?.phone ? `Calling ${selectedContact.fullName}...` : "No phone on file."),
            emailContact: () => setStatusMessage(selectedContact?.email ? `Email sent to ${selectedContact.fullName}` : "No email on file."),
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
            editorChangeNotes: (args: any) => {
                setEditorDraft((prev) => ({ ...prev, notes: args?.value ?? "" }));
                setEditorDirty(true);
            },
            editorToggleActive: (args: any) => {
                setEditorDraft((prev) => ({ ...prev, isActive: Boolean(args?.checked) }));
                setEditorDirty(true);
            },
            editorSave: () => saveEditor(),
            editorCancel: () => {
                if (editorDirty) {
                    setShowDiscardConfirm(true);
                } else {
                    setShowEditor(false);
                }
            },
            discardChanges: () => {
                setShowDiscardConfirm(false);
                setShowEditor(false);
            },
            keepEditing: () => setShowDiscardConfirm(false),
            deleteFromEditor: () => confirmDeleteSelected(),
            importBrowse: () => setStatusMessage("Browse CSV (demo)."),
            importNow: () => {
                setShowImport(false);
                setStatusMessage("Imported 24 contacts (3 skipped).");
            },
            cancelImport: () => setShowImport(false),
            prefRequireEmail: (args: any) => setRequireEmail(Boolean(args?.checked)),
            prefConfirmDelete: (args: any) => setConfirmDelete(Boolean(args?.checked)),
            prefAutosave: (args: any) => setAutosave(Boolean(args?.checked)),
            prefAutosaveMinutes: (args: any) => setAutosaveMinutes(args?.value ?? "5"),
            prefDefaultSort: (args: any) => setDefaultSort(args?.selectedValue ?? "Name"),
            prefSave: () => {
                setShowPreferences(false);
                setStatusMessage("Preferences saved.");
            },
            toggleDiagnostics: () => {
                setShowDiagnostics((prev) => {
                    const next = !prev;
                    setDiagnosticsEnabled(next);
                    setStatusMessage(next ? "Diagnostics enabled." : "Diagnostics disabled.");
                    return next;
                });
            },
            prefCancel: () => setShowPreferences(false),
            confirmDeleteResult: (args: any) => {
                const result = args?.result as string | undefined;
                setShowDeleteConfirm(false);
                if (result === "OK" || result === "Yes") {
                    deleteSelected();
                }
            }
        }),
        [
            confirmDelete,
            filteredContacts,
            selectedContact,
            editorDirty,
            editorMode,
            editorDraft,
            requireEmail
        ]
    );

    const mainWindow = node(
        "window",
        {
            title: "Contact Desk",
            icon: "info",
            draggable: true,
            startPosition: "centerScreen",
            startMaximized: true,
            onClose: "closeMain",
            style: "width: 1120px; height: 760px;"
        },
        node("menuBar", {},
            node("menuItem", { label: "File" },
                node("menuItemEntry", { onClick: "miFileNew", icon: "new" }, element("span", {}, "New Contact...")),
                node("menuItemEntry", { onClick: "miFileImport", icon: "import" }, element("span", {}, "Import...")),
                node("menuItemEntry", { onClick: "miFileExit", icon: "exit" }, element("span", {}, "Exit"))
            ),
            node("menuItem", { label: "Edit" },
                node("menuItemEntry", { onClick: "miEditEdit", icon: "edit" }, element("span", {}, "Edit Contact...")),
                node("menuItemEntry", { onClick: "miEditDelete", icon: "delete" }, element("span", {}, "Delete Contact")),
                node("menuItemEntry", { onClick: "miEditFind", icon: "search" }, element("span", {}, "Find..."))
            ),
            node("menuItem", { label: "Tools" },
                node("menuItemEntry", { onClick: "miToolsPreferences", icon: "settings" }, element("span", {}, "Preferences...")),
                node("menuItemEntry", { onClick: "toggleDiagnostics", icon: "diagnostics" }, element("span", {}, "Toggle Diagnostics"))
            ),
            node("menuItem", { label: "Help" },
                node("menuItemEntry", { onClick: "miHelpAbout", icon: "info" }, element("span", {}, "About"))
            )
        ),
        element("div", { style: "padding: 10px; background: var(--surface); height: 100%; box-sizing: border-box;" },
            element("div", { style: "display: flex; gap: 8px; align-items: center; margin-bottom: 8px; flex-wrap: wrap;" },
                node("button", { text: "New", icon: "new", onClick: "openEditorNew" }),
                node("button", { text: "Edit", icon: "edit", onClick: "openEditorEdit", enabled: Boolean(selectedContact) }),
                node("button", { text: "Delete", icon: "delete", onClick: "deleteSelected", enabled: Boolean(selectedContact) }),
                element("div", { style: "width: 1px; height: 24px; background: var(--border-dark); margin: " + "0 4px" }),
                node("button", { text: "Import", icon: "import", onClick: "miFileImport" }),
                element("div", { style: "width: 1px; height: 24px; background: var(--border-dark); margin: " + "0 4px" }),
                node("label", { text: "Search:", style: "font-size: 12px;" }),
                node("textBox", { value: searchText, onChange: "quickSearch", style: "width: 240px;" })
            ),
            node("splitContainer", { orientation: "vertical", splitPosition: "55%", style: "height: calc(100% - 96px);" },
                node("groupBox", { text: "Contacts", style: "height: 100%;" },
                    element("div", { style: "display: flex; gap: 8px; flex-direction: column; height: 100%;" },
                        node("textBox", { value: searchText, onChange: "searchChange", placeholder: "Search contacts...", style: "width: 100%;" }),
                        node("comboBox", { items: "All,With Email,With Phone,Recently Edited", selectedIndex: "0", onChange: "filterChange", style: "width: 100%;" }),
                        node("checkBox", { text: "Active only", checked: activeOnly, onChange: "toggleActive" }),
                        node("listBox", {
                            items: listItems,
                            selectionMode: "single",
                            selectedIndex: String(Math.max(selectedIndex, 0)),
                            size: "10",
                            onChange: "selectContact",
                            style: "width: 100%; height: 100%;"
                        })
                    )
                ),
                node("groupBox", { text: "Details", style: "height: 100%;" },
                    element("div", { style: "display: flex; flex-direction: column; height: 100%;" },
                        node("tableLayoutPanel", { rows: "6", cols: "2", style: "width: 100%; gap: 6px;" },
                            node("label", { text: "Name:", style: "font-weight: bold;" }),
                            node("label", { text: selectedContact?.fullName ?? "—" }),
                            node("label", { text: "Company:", style: "font-weight: bold;" }),
                            node("label", { text: selectedContact?.company ?? "—" }),
                            node("label", { text: "Email:", style: "font-weight: bold;" }),
                            node("label", { text: selectedContact?.email ?? "—" }),
                            node("label", { text: "Phone:", style: "font-weight: bold;" }),
                            node("label", { text: selectedContact?.phone ?? "—" }),
                            node("label", { text: "Address:", style: "font-weight: bold;" }),
                            node("label", { text: selectedContact?.address ?? "—" }),
                            node("label", { text: "Notes:", style: "font-weight: bold;" }),
                            node("label", { text: selectedContact?.notes ?? "—" })
                        ),
                        element("div", { style: "margin-top: auto; display: flex; justify-content: flex-end; gap: 8px; padding-top: 10px;" },
                            node("button", { text: "Call", icon: "phone", onClick: "callContact", enabled: Boolean(selectedContact?.phone) }),
                            node("button", { text: "Email", icon: "email", onClick: "emailContact", enabled: Boolean(selectedContact?.email) }),
                            node("button", { text: "Edit...", icon: "edit", onClick: "openEditorEdit", enabled: Boolean(selectedContact) })
                        )
                    )
                )
            ),
            showDiagnostics
                ? node("diagnosticsPanel", { title: "Diagnostics", maxItems: 6, style: "margin-top: 8px; height: 140px;" })
                : null,
            node("statusBar", {
                segments: [
                    `Status: ${status}`,
                    `Count: ${contacts.length}`,
                    `Last saved: ${selectedContact?.updatedAt ?? "—"}`
                ]
            })
        )
    );

    const playgroundNode = element(
        "div",
        { style: "position: relative; min-height: 100vh;" },
        mainWindow,
        showEditor
            ? node("window", { title: editorMode === "new" ? "New Contact" : "Edit Contact", dialog: true, draggable: true, startPosition: "centerParent", onClose: "editorCancel", style: "width: 620px; height: 520px;" },
                node("tabControl", { selectedIndex: "0", style: "width: 100%; height: 100%;" },
                    node("tabPage", { text: "General" },
                        element("div", { style: "display: flex; flex-direction: column; gap: 8px; padding: 12px;" },
                            node("label", { text: "Full Name*", style: "font-weight: bold;" }),
                            node("textBox", { value: editorDraft.fullName, onChange: "editorChangeFullName", style: "width: 100%;" }),
                            editorErrors.fullName ? node("label", { text: editorErrors.fullName, style: "color: red; font-size: 12px;" }) : null,
                            node("label", { text: "Company", style: "font-weight: bold;" }),
                            node("textBox", { value: editorDraft.company, onChange: "editorChangeCompany", style: "width: 100%;" }),
                            node("label", { text: "Email*", style: "font-weight: bold;" }),
                            node("textBox", { value: editorDraft.email, onChange: "editorChangeEmail", style: "width: 100%;" }),
                            editorErrors.email ? node("label", { text: editorErrors.email, style: "color: red; font-size: 12px;" }) : null,
                            node("label", { text: "Phone", style: "font-weight: bold;" }),
                            node("textBox", { value: editorDraft.phone, onChange: "editorChangePhone", style: "width: 100%;" }),
                            node("label", { text: "Tags", style: "font-weight: bold;" }),
                            node("textBox", { value: editorDraft.tags, onChange: "editorChangeTags", style: "width: 100%;" }),
                            node("label", { text: "Address", style: "font-weight: bold;" }),
                            node("textBox", { value: editorDraft.address, onChange: "editorChangeAddress1", style: "width: 100%;" }),
                            node("checkBox", { text: "Active contact", checked: editorDraft.isActive, onChange: "editorToggleActive" })
                        )
                    ),
                    node("tabPage", { text: "Notes" },
                        element("div", { style: "padding: 12px;" },
                            node("textBox", { value: editorDraft.notes, multiline: true, rows: 10, onChange: "editorChangeNotes", style: "width: 100%; height: 280px;" })
                        )
                    )
                ),
                element("div", { style: "display: flex; justify-content: space-between; padding: 10px;" },
                    node("button", { text: "Delete...", onClick: "deleteFromEditor", enabled: editorMode === "edit" }),
                    element("div", { style: "display: flex; gap: 8px;" },
                        node("button", { text: "Cancel", onClick: "editorCancel" }),
                        node("button", { text: "Save", onClick: "editorSave", default: true })
                    )
                )
            )
            : null,
        showImport
            ? node("window", { title: "Import Contacts", dialog: true, draggable: true, startPosition: "centerParent", onClose: "cancelImport", style: "width: 900px; height: 640px;" },
                element("div", { style: "padding: 12px; display: flex; flex-direction: column; gap: 10px; height: 100%;" },
                    element("div", { style: "display: flex; gap: 8px; align-items: center;" },
                        node("label", { text: "Step 1: Choose file", style: "font-weight: bold;" }),
                        node("textBox", { value: "C:/Imports/contacts.csv", style: "width: 360px;" }),
                        node("button", { text: "Browse...", onClick: "importBrowse" })
                    ),
                    element("div", { style: "display: flex; gap: 16px; align-items: center; flex-wrap: wrap;" },
                        node("checkBox", { text: "First row has headers", checked: true }),
                        node("label", { text: "Delimiter:" }),
                        node("comboBox", { items: ",,;,\t", selectedIndex: "0", style: "width: 80px;" }),
                        node("label", { text: "Encoding:" }),
                        node("comboBox", { items: "UTF-8,UTF-16,ASCII", selectedIndex: "0", style: "width: 120px;" })
                    ),
                    node("groupBox", { text: "Preview (first 100 rows)", style: "flex: 1;" },
                        node("listBox", {
                            items: [
                                "Row | FullName | Email | Phone | Company | Status",
                                "1 | Ava Martinez | ava.martinez@northwind.com | +1 555-0134 | Northwind | Valid",
                                "2 | Jonas Reid | jonas.reid@contoso.com | +1 555-0192 | Contoso | Valid",
                                "3 | Priya Shah | priya.shah@fabrikam.io |  | Fabrikam | Duplicate"
                            ],
                            selectionMode: "single",
                            selectedIndex: "0",
                            size: "10",
                            style: "width: 100%; height: 100%;"
                        })
                    ),
                    element("div", { style: "display: flex; justify-content: space-between; align-items: center;" },
                        node("label", { text: "Summary: Valid: 24  Duplicates: 3  Invalid: 2" }),
                        element("div", { style: "display: flex; gap: 8px;" },
                            node("button", { text: "Cancel", onClick: "cancelImport" }),
                            node("button", { text: "Import", onClick: "importNow", default: true })
                        )
                    )
                )
            )
            : null,
        showPreferences
            ? node("window", { title: "Preferences", dialog: true, draggable: true, startPosition: "centerParent", onClose: "prefCancel", style: "width: 560px; height: 480px;" },
                node("tabControl", { selectedIndex: "0", style: "width: 100%; height: 100%;" },
                    node("tabPage", { text: "General" },
                        element("div", { style: "padding: 12px; display: flex; flex-direction: column; gap: 8px;" },
                            node("checkBox", { text: "Require email", checked: requireEmail, onChange: "prefRequireEmail" }),
                            node("checkBox", { text: "Confirm delete", checked: confirmDelete, onChange: "prefConfirmDelete" }),
                            node("checkBox", { text: "Autosave", checked: autosave, onChange: "prefAutosave" }),
                            node("label", { text: "Autosave minutes", style: "font-weight: bold;" }),
                            node("textBox", { value: autosaveMinutes, onChange: "prefAutosaveMinutes", style: "width: 120px;" })
                        )
                    ),
                    node("tabPage", { text: "Data" },
                        element("div", { style: "padding: 12px; display: flex; flex-direction: column; gap: 8px;" },
                            node("checkBox", { text: "Trim whitespace", checked: true }),
                            node("checkBox", { text: "Normalise phone", checked: false }),
                            node("checkBox", { text: "Detect duplicates on save", checked: true })
                        )
                    ),
                    node("tabPage", { text: "UI" },
                        element("div", { style: "padding: 12px; display: flex; flex-direction: column; gap: 8px;" },
                            node("checkBox", { text: "Remember window size", checked: true }),
                            node("label", { text: "Default sort", style: "font-weight: bold;" }),
                            node("comboBox", { items: "Name,Company,Recently Edited", selectedIndex: defaultSort === "Name" ? "0" : "1", onChange: "prefDefaultSort", style: "width: 180px;" })
                        )
                    )
                ),
                element("div", { style: "display: flex; justify-content: flex-end; gap: 8px; padding: 10px;" },
                    node("button", { text: "Cancel", onClick: "prefCancel" }),
                    node("button", { text: "OK", onClick: "prefSave", default: true })
                )
            )
            : null,
        showDeleteConfirm
            ? node("messageBox", {
                title: "Confirm Delete",
                message: `Delete contact \"${selectedContact?.fullName ?? ""}\"? This cannot be undone.`,
                mode: "confirm",
                onResult: "confirmDeleteResult",
                style: "width: 420px;"
            })
            : null,
        showDiscardConfirm
            ? node("window", { title: "Discard changes?", dialog: true, draggable: true, startPosition: "centerParent", onClose: "keepEditing", style: "width: 420px; height: 180px;" },
                element("div", { style: "padding: 14px;" },
                    node("label", { text: "You have unsaved changes. Discard them?", style: "margin-bottom: 12px; display: block;" }),
                    element("div", { style: "display: flex; justify-content: flex-end; gap: 8px;" },
                        node("button", { text: "Keep Editing", onClick: "keepEditing" }),
                        node("button", { text: "Discard", onClick: "discardChanges", default: true })
                    )
                )
            )
            : null
    );

    return <FormContainer node={playgroundNode} handlers={handlers} />;
};
