export type ThemeId =
    | "classic"
    | "material";

export type ThemeGroup = "classic" | "modern";

export type ThemeDefinition = {
    id: ThemeId;
    label: string;
    group: ThemeGroup;
};

export const themes: ThemeDefinition[] = [
    { id: "classic", label: "Classic (Win98)", group: "classic" },
    { id: "material", label: "Modern (Material UI)", group: "modern" }
];

export const defaultThemeId: ThemeId = "classic";

export const getThemeById = (id?: string | null) => themes.find((theme) => theme.id === id);
