export type TextStylesState = {
    search: string;
    previewText: string;
    customText: string;
    categoryId: string;
    weightFilter: string;
    caseFilter: string;
    shadowFilter: string;
    selectedId: string | null;
    status: string;
    statusTone: "info" | "error" | "success";
    refreshing: boolean;
    fontSource: string;
    favorites: string[];
    hoveredId: string | null;
    page: number;
    syncPreview: boolean;
    aiPromptOpen: boolean;
    aiPrompt: string;
    aiResponse: string;
    aiBusy: boolean;
};

export type TextStyleFilter = {
    search: string;
    categoryId: string;
    weightFilter: string;
    caseFilter: string;
    shadowFilter: string;
};
