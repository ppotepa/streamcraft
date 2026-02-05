import React, { useMemo, useRef, useState } from "react";
import { FormContainer } from "../../../../libs/forms/FormContainer";
import { isDiagnosticsEnabled, setDiagnosticsEnabled } from "../../../../libs/forms";
import { UiText } from "../uiText";
import { buildPlaygroundDesigner } from "./Playground.Designer";
import type { Contact } from "./types";

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

    const playgroundNode = buildPlaygroundDesigner({
        contactsCount: contacts.length,
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
    });

    return <FormContainer node={playgroundNode} handlers={handlers} />;
};
