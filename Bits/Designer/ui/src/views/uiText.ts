export const UiText = {
    playground2: {
        statusIdle: "Select a tool to start.",
        toolboxTitle: "Tools",
        propertiesTitle: "Properties",
        menu: {
            file: "File",
            edit: "Edit",
            tools: "Tools",
            help: "Help",
            workers: "Workers"
        },
        tools: {
            select: { id: "select", label: "Select", icon: "select" },
            text: { id: "text", label: "Text", icon: "text" },
            image: { id: "image", label: "Image", icon: "image" },
            rect: { id: "rect", label: "Rectangle", icon: "rect" },
            ellipse: { id: "ellipse", label: "Ellipse", icon: "ellipse" },
            line: { id: "line", label: "Line", icon: "line" },
            polygon: { id: "polygon", label: "Polygon", icon: "polygon" },
            bind: { id: "bind", label: "Bind", icon: "bind" }
        },
        sections: {
            basic: "Basic",
            binding: "Data Binding",
            worker: "Background Worker",
            events: "Events",
            text: "Text"
        },
        explorerTitle: "Data Source Explorer",
        labels: {
            type: "Type",
            x: "X",
            y: "Y",
            w: "W",
            h: "H",
            text: "Text",
            imageUrl: "Image URL",
            fill: "Fill",
            stroke: "Stroke",
            thickness: "Thickness",
            category: "Category",
            subcategory: "Subcategory",
            source: "Source",
            endpoint: "Endpoint",
            field: "Field",
            fieldPath: "Field path",
            bindingSummary: "Binding",
            bindTo: "Bind to",
            path: "Path",
            preview: "Preview",
            example: "Example",
            explorer: "Explorer",
            format: "Format",
            fetch: "Fetch",
            value: "Value",
            status: "Status",
            font: "Font",
            size: "Size",
            weight: "Weight",
            style: "Style",
            color: "Colour",
            transform: "Transform",
            letterSpacing: "Spacing",
            effects: "Effects",
            shadowX: "Shadow X",
            shadowY: "Shadow Y",
            shadowBlur: "Shadow blur",
            shadowColor: "Shadow colour"
            ,
            workerSetup: "Worker",
            autoRefresh: "Auto-refresh",
            enabled: "Enabled",
            trigger: "Trigger",
            interval: "Interval (ms)",
            debounce: "Debounce (ms)",
            retryCount: "Retry count",
            backoff: "Backoff (ms)",
            timeout: "Timeout (ms)",
            cacheTtl: "Cache TTL (ms)",
            staleWhileRevalidate: "Stale while revalidate",
            onError: "On error",
            workerLog: "Log activity"
        },
        options: {
            select: "-- select --",
            formatText: "Text",
            formatUppercase: "Uppercase",
            formatJson: "JSON",
            fonts: ["Segoe UI", "Arial", "Verdana", "Georgia", "Times New Roman", "Courier New"],
            weights: ["normal", "600", "700", "800"],
            styles: ["normal", "italic"],
            transforms: ["none", "uppercase", "lowercase"],
            workerTriggers: [
                { value: "interval", label: "Interval" },
                { value: "onLoad", label: "On load" },
                { value: "onVisible", label: "On visible" }
            ],
            workerErrors: [
                { value: "ignore", label: "Ignore" },
                { value: "fallback", label: "Fallback" },
                { value: "notify", label: "Notify" }
            ]
        },
        buttons: {
            clear: "Clear",
            test: "Test",
            effects: "Effects...",
            setupWorker: "Setup Worker",
            moreOptions: "More options",
            triggers: "⚡ Triggers",
            openExplorer: "Open Explorer",
            bind: "Bind",
            start: "Start",
            stop: "Stop",
            close: "Close"
        },
        placeholders: {
            fieldPath: "response.data.title"
        },
        empty: {
            noBinding: "No binding settings for this control.",
            noPreview: "No preview data yet. Run a test to fetch data.",
            noTest: "Not tested yet.",
            noWorker: "No background worker configured.",
            noActiveWorkers: "No active workers."
        },
        eventSample: "data[0].value == 10  |  DonationObtained",
        textEditorTitle: "Text Effects",
        workerSetupTitle: "Background Worker",
        workerDetailsTitle: "Worker Details",
        workersViewTitle: "Active Workers",
        triggersTitle: "Trigger Rules"
    },
    playground: {
        windowTitle: "Contact Desk",
        menu: {
            file: "File",
            edit: "Edit",
            tools: "Tools",
            help: "Help",
            newContact: "New Contact...",
            import: "Import...",
            exit: "Exit",
            editContact: "Edit Contact...",
            deleteContact: "Delete Contact",
            find: "Find...",
            preferences: "Preferences...",
            diagnostics: "Toggle Diagnostics",
            about: "About"
        },
        buttons: {
            new: "New",
            edit: "Edit",
            delete: "Delete",
            import: "Import",
            call: "Call",
            email: "Email",
            editEllipsis: "Edit...",
            cancel: "Cancel",
            save: "Save",
            deleteEllipsis: "Delete...",
            keepEditing: "Keep Editing",
            discard: "Discard",
            browse: "Browse...",
            importNow: "Import",
            ok: "OK"
        },
        placeholders: {
            searchContacts: "Search contacts...",
            emptyValue: "—",
            importPath: "C:/Imports/contacts.csv"
        },
        checkboxes: {
            activeOnly: "Active only",
            activeContact: "Active contact",
            firstRowHeaders: "First row has headers",
            requireEmail: "Require email",
            confirmDelete: "Confirm delete",
            autosave: "Autosave",
            trimWhitespace: "Trim whitespace",
            normalisePhone: "Normalise phone",
            detectDuplicates: "Detect duplicates on save",
            rememberWindowSize: "Remember window size"
        },
        options: {
            searchFilterItems: ["All", "With Email", "With Phone", "Recently Edited"],
            delimiterItems: ",,;,\t",
            encodingItems: "UTF-8,UTF-16,ASCII",
            defaultSortItems: "Name,Company,Recently Edited",
            defaultSortDefault: "Name"
        },
        filters: {
            all: "All",
            withEmail: "With Email",
            withPhone: "With Phone",
            recentlyEdited: "Recently Edited",
            recentlyEditedTimestamp: "12:03"
        },
        separators: {
            nameCompany: " — "
        },
        titles: {
            diagnostics: "Diagnostics"
        },
        previews: {
            importRows: [
                "Row | FullName | Email | Phone | Company | Status",
                "1 | Ava Martinez | ava.martinez@northwind.com | +1 555-0134 | Northwind | Valid",
                "2 | Jonas Reid | jonas.reid@contoso.com | +1 555-0192 | Contoso | Valid",
                "3 | Priya Shah | priya.shah@fabrikam.io |  | Fabrikam | Duplicate"
            ]
        },
        labels: {
            search: "Search:",
            contacts: "Contacts",
            details: "Details",
            name: "Name:",
            company: "Company:",
            email: "Email:",
            phone: "Phone:",
            address: "Address:",
            notes: "Notes:",
            fullNameRequired: "Full Name*",
            emailRequired: "Email*",
            tags: "Tags",
            autosaveMinutes: "Autosave minutes",
            defaultSort: "Default sort",
            step1: "Step 1: Choose file",
            delimiter: "Delimiter:",
            encoding: "Encoding:",
            preview: "Preview (first 100 rows)",
            summary: "Summary: Valid: 24  Duplicates: 3  Invalid: 2",
            statusPrefix: "Status:",
            countPrefix: "Count:",
            lastSavedPrefix: "Last saved:"
        },
        tabs: {
            general: "General",
            notes: "Notes",
            data: "Data",
            ui: "UI"
        },
        dialogs: {
            editorNew: "New Contact",
            editorEdit: "Edit Contact",
            import: "Import Contacts",
            preferences: "Preferences",
            discard: "Discard changes?"
        },
        confirmations: {
            discard: "You have unsaved changes. Discard them?",
            confirmDeleteTitle: "Confirm Delete",
            confirmDeleteMessage: "Delete contact \"{name}\"? This cannot be undone."
        },
        validation: {
            fullNameRequired: "Full name is required (min 2 chars).",
            emailRequired: "Email is required.",
            invalidEmail: "Invalid email format."
        },
        statusMessages: {
            selectContactToEdit: "Select a contact to edit.",
            createdContact: "Created contact: {name}",
            updatedContact: "Updated contact: {name}",
            calling: "Calling {name}...",
            noPhone: "No phone on file.",
            emailSent: "Email sent to {name}.",
            noEmail: "No email on file.",
            browseImport: "Browse CSV (demo).",
            imported: "Imported 24 contacts (3 skipped).",
            preferencesSaved: "Preferences saved.",
            diagnosticsEnabled: "Diagnostics enabled.",
            diagnosticsDisabled: "Diagnostics disabled.",
            exitRequested: "Exit requested (demo only).",
            focusSearch: "Focus search (demo).",
            about: "Contact Desk v1.0 (demo).",
            closeRequested: "Close requested (demo only)."
        },
        statuses: {
            ready: "Ready"
        }
    }
} as const;
