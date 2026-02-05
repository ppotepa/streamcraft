import graphiteUrl from "./themes/theme-graphite.css?url";
import midnightUrl from "./themes/theme-midnight.css?url";
import forestUrl from "./themes/theme-forest.css?url";
import desertUrl from "./themes/theme-desert.css?url";
import grapeUrl from "./themes/theme-grape.css?url";
import oceanUrl from "./themes/theme-ocean.css?url";
import neonUrl from "./themes/theme-neon.css?url";
import monoUrl from "./themes/theme-mono.css?url";
import win98Url from "./themes/theme-win98.css?url";
import nordUrl from "./themes/theme-nord.css?url";
import tokyoNightUrl from "./themes/theme-tokyo-night.css?url";
import solarizedDarkUrl from "./themes/theme-solarized-dark.css?url";
import solarizedLightUrl from "./themes/theme-solarized-light.css?url";

export type ThemeId =
    | "win98"
    | "graphite"
    | "midnight"
    | "forest"
    | "desert"
    | "grape"
    | "ocean"
    | "neon"
    | "mono"
    | "nord"
    | "tokyo-night"
    | "solarized-dark"
    | "solarized-light";

export type ThemeGroup = "classic" | "modern";

export type ThemeDefinition = {
    id: ThemeId;
    label: string;
    group: ThemeGroup;
    url: string;
};

export const themes: ThemeDefinition[] = [
    { id: "win98", label: "Win98 Classic", group: "classic", url: win98Url },
    { id: "graphite", label: "Graphite", group: "classic", url: graphiteUrl },
    { id: "midnight", label: "Midnight", group: "classic", url: midnightUrl },
    { id: "forest", label: "Forest", group: "classic", url: forestUrl },
    { id: "desert", label: "Desert", group: "classic", url: desertUrl },
    { id: "grape", label: "Grape", group: "classic", url: grapeUrl },
    { id: "ocean", label: "Oceanic", group: "classic", url: oceanUrl },
    { id: "neon", label: "Neon", group: "classic", url: neonUrl },
    { id: "mono", label: "Mono", group: "classic", url: monoUrl },
    { id: "nord", label: "Nord", group: "modern", url: nordUrl },
    { id: "tokyo-night", label: "Tokyo Night", group: "modern", url: tokyoNightUrl },
    { id: "solarized-dark", label: "Solarized Dark", group: "modern", url: solarizedDarkUrl },
    { id: "solarized-light", label: "Solarized Light", group: "modern", url: solarizedLightUrl }
];

export const defaultThemeId: ThemeId = "win98";

export const getThemeById = (id?: string | null) => themes.find((theme) => theme.id === id);
