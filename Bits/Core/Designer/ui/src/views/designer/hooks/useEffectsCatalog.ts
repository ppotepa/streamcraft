import { useCallback, useEffect, useMemo, useState } from "react";
import type { EffectsCatalogEntry, EventEffectOption, EventEffectType } from "../types/effects.types";
import { fetchEventEffectTypes, upsertEventEffect } from "../services/effectsService";

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

const cloneValue = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(cloneValue);
    if (isObjectRecord(value)) {
        const result: Record<string, unknown> = {};
        Object.entries(value).forEach(([key, entry]) => {
            result[key] = cloneValue(entry);
        });
        return result;
    }
    return value;
};

const mergeRecords = (left: Record<string, unknown>, right: Record<string, unknown>): Record<string, unknown> => {
    const next: Record<string, unknown> = { ...left };
    Object.entries(right).forEach(([key, value]) => {
        if (isObjectRecord(value) && isObjectRecord(next[key])) {
            next[key] = mergeRecords(next[key] as Record<string, unknown>, value);
            return;
        }
        next[key] = cloneValue(value);
    });
    return next;
};

const pathOrKey = (option: EventEffectOption) => (option.path && option.path.trim().length > 0 ? option.path : option.key);

const setAtPath = (target: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> => {
    const keys = path.split(".").map((part) => part.trim()).filter(Boolean);
    if (keys.length === 0) return target;

    const next = cloneValue(target) as Record<string, unknown>;
    let cursor: Record<string, unknown> = next;
    for (let index = 0; index < keys.length - 1; index += 1) {
        const key = keys[index];
        const existing = cursor[key];
        if (!isObjectRecord(existing)) {
            cursor[key] = {};
        }
        cursor = cursor[key] as Record<string, unknown>;
    }
    cursor[keys[keys.length - 1]] = value;
    return next;
};

const getAtPath = (target: Record<string, unknown>, path: string): unknown => {
    const keys = path.split(".").map((part) => part.trim()).filter(Boolean);
    let current: unknown = target;
    for (const key of keys) {
        if (!isObjectRecord(current) || !(key in current)) return undefined;
        current = current[key];
    }
    return current;
};

const sanitizeSegment = (value: string) =>
    value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9:._-]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");

const buildBaseConfig = (options: EventEffectOption[]): Record<string, unknown> => {
    let config: Record<string, unknown> = {};
    options.forEach((option) => {
        if (typeof option.defaultValue === "undefined") return;
        config = setAtPath(config, pathOrKey(option), cloneValue(option.defaultValue));
    });
    return config;
};

const buildCatalogEntries = (effectTypes: EventEffectType[]): EffectsCatalogEntry[] => {
    return effectTypes.flatMap((effectType) => {
        const options = Array.isArray(effectType.options) ? effectType.options : [];
        const presets = Array.isArray(effectType.presets) ? effectType.presets : [];
        const baseConfig = buildBaseConfig(options);
        const optionsByKey = new Map(options.map((entry) => [entry.key, entry]));

        if (presets.length === 0) {
            return [{
                catalogId: effectType.typeName,
                typeName: effectType.typeName,
                name: effectType.displayName,
                category: effectType.category || "General",
                description: effectType.description,
                options,
                initialConfig: baseConfig
            }];
        }

        return presets.map((preset) => {
            const presetDefaults = isObjectRecord(preset.defaultOptions) ? preset.defaultOptions : {};
            const selectedOptions = Array.isArray(preset.optionKeys) && preset.optionKeys.length > 0
                ? preset.optionKeys
                    .map((key) => optionsByKey.get(key))
                    .filter((value): value is EventEffectOption => Boolean(value))
                : options;

            return {
                catalogId: `${effectType.typeName}:${preset.id}`,
                typeName: effectType.typeName,
                presetId: preset.id,
                name: preset.name,
                category: preset.category || effectType.category || "General",
                description: preset.description ?? effectType.description,
                options: selectedOptions,
                initialConfig: mergeRecords(baseConfig, presetDefaults)
            };
        });
    });
};

const collectCategories = (entries: EffectsCatalogEntry[]) => {
    const values = Array.from(new Set(entries.map((entry) => entry.category).filter(Boolean)));
    values.sort((a, b) => a.localeCompare(b));
    return ["All", ...values];
};

const createFallbackEntries = (): EffectsCatalogEntry[] => {
    const fallbackType: EventEffectType = {
        typeName: "core.overlay",
        displayName: "Overlay Action",
        category: "Visual",
        description: "Fallback local presets used when effect type API is unavailable.",
        options: [
            { key: "route", label: "Route", valueType: "string", path: "route", required: true, defaultValue: "overlay" },
            { key: "command", label: "Command", valueType: "string", path: "command", required: true, defaultValue: "confetti" },
            {
                key: "intensity",
                label: "Intensity",
                valueType: "select",
                path: "data.intensity",
                required: false,
                defaultValue: "medium",
                choices: [
                    { value: "low", label: "Low" },
                    { value: "medium", label: "Medium" },
                    { value: "high", label: "High" }
                ]
            },
            { key: "durationMs", label: "Duration (ms)", valueType: "number", path: "data.durationMs", required: false, defaultValue: 2200 },
            { key: "text", label: "Caption Text", valueType: "string", path: "data.text", required: false, defaultValue: "Huge donation incoming!" },
            {
                key: "position",
                label: "Position",
                valueType: "select",
                path: "data.position",
                required: false,
                defaultValue: "bottom",
                choices: [
                    { value: "top", label: "Top" },
                    { value: "center", label: "Center" },
                    { value: "bottom", label: "Bottom" }
                ]
            },
            { key: "toneHz", label: "Tone (Hz)", valueType: "number", path: "data.toneHz", required: false, defaultValue: 880 },
            { key: "volume", label: "Volume (0-1)", valueType: "number", path: "data.volume", required: false, defaultValue: 0.25 },
            { key: "color", label: "Color", valueType: "color", path: "data.color", required: false, defaultValue: "#ffffff" },
            { key: "label", label: "Label", valueType: "string", path: "data.label", required: false, defaultValue: "NEW!" }
        ],
        presets: [
            { id: "confetti", name: "Confetti Burst", category: "Visual", optionKeys: ["intensity", "durationMs"], defaultOptions: { command: "confetti", data: { intensity: "medium", durationMs: 2200 } } },
            { id: "caption", name: "Show Caption", category: "Text", optionKeys: ["text", "position", "durationMs"], defaultOptions: { command: "caption", data: { text: "Huge donation incoming!", position: "bottom", durationMs: 2000 } } },
            { id: "sound", name: "Play Sound", category: "Audio", optionKeys: ["toneHz", "volume", "durationMs"], defaultOptions: { command: "sound", data: { toneHz: 880, volume: 0.25, durationMs: 650 } } },
            { id: "flash", name: "Screen Flash", category: "Visual", optionKeys: ["color", "durationMs"], defaultOptions: { command: "flash", data: { color: "#ffffff", durationMs: 650 } } },
            { id: "badge", name: "Badge Pop", category: "Attention", optionKeys: ["label", "color", "durationMs"], defaultOptions: { command: "badge", data: { label: "NEW!", color: "#ffd95a", durationMs: 1200 } } }
        ]
    };

    return buildCatalogEntries([fallbackType]);
};

export const useEffectsCatalog = (enabled: boolean) => {
    const [effectTypes, setEffectTypes] = useState<EventEffectType[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingError, setLoadingError] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [category, setCategory] = useState("All");
    const [selectedCatalogId, setSelectedCatalogId] = useState<string | null>(null);
    const [configsByCatalogId, setConfigsByCatalogId] = useState<Record<string, Record<string, unknown>>>({});
    const [status, setStatus] = useState("Select an effect and run preview.");
    const [previewTick, setPreviewTick] = useState(0);
    const [isSaving, setIsSaving] = useState(false);

    const refreshTypes = useCallback(async () => {
        setLoading(true);
        setLoadingError(null);
        try {
            const types = await fetchEventEffectTypes();
            setEffectTypes(types);
            if (types.length === 0) {
                setLoadingError("No effect types were returned by the engine.");
            }
        } catch (error) {
            setLoadingError(String(error));
            setEffectTypes([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!enabled) return;
        void refreshTypes();
    }, [enabled, refreshTypes]);

    const entries = useMemo(() => {
        const loaded = buildCatalogEntries(effectTypes);
        if (loaded.length > 0) return loaded;
        return createFallbackEntries();
    }, [effectTypes]);

    useEffect(() => {
        if (entries.length === 0) {
            setSelectedCatalogId(null);
            return;
        }
        if (!selectedCatalogId || !entries.some((entry) => entry.catalogId === selectedCatalogId)) {
            setSelectedCatalogId(entries[0].catalogId);
        }
    }, [entries, selectedCatalogId]);

    useEffect(() => {
        setConfigsByCatalogId((previous) => {
            const next: Record<string, Record<string, unknown>> = {};
            entries.forEach((entry) => {
                const existing = previous[entry.catalogId];
                next[entry.catalogId] = existing ? existing : cloneValue(entry.initialConfig) as Record<string, unknown>;
            });
            return next;
        });
    }, [entries]);

    const categories = useMemo(() => collectCategories(entries), [entries]);

    useEffect(() => {
        if (!categories.includes(category)) {
            setCategory("All");
        }
    }, [categories, category]);

    const filteredEntries = useMemo(() => {
        const q = search.trim().toLowerCase();
        return entries.filter((entry) => {
            if (category !== "All" && entry.category !== category) return false;
            if (!q) return true;
            const haystack = `${entry.name} ${entry.description ?? ""} ${entry.typeName} ${entry.category}`.toLowerCase();
            return haystack.includes(q);
        });
    }, [entries, search, category]);

    const selectedEntry = useMemo(() => {
        if (!selectedCatalogId) return null;
        return entries.find((entry) => entry.catalogId === selectedCatalogId) ?? null;
    }, [entries, selectedCatalogId]);

    const selectedConfig = useMemo(() => {
        if (!selectedEntry) return null;
        return configsByCatalogId[selectedEntry.catalogId] ?? selectedEntry.initialConfig;
    }, [configsByCatalogId, selectedEntry]);

    const readOptionValue = useCallback((option: EventEffectOption): unknown => {
        if (!selectedConfig) return undefined;
        return getAtPath(selectedConfig, pathOrKey(option));
    }, [selectedConfig]);

    const selectEffect = useCallback((catalogId: string) => {
        setSelectedCatalogId(catalogId);
        setStatus(`Selected ${catalogId}.`);
    }, []);

    const updateSelectedOption = useCallback((option: EventEffectOption, value: unknown) => {
        if (!selectedEntry) return;
        const path = pathOrKey(option);
        setConfigsByCatalogId((previous) => {
            const current = previous[selectedEntry.catalogId] ?? selectedEntry.initialConfig;
            const updated = setAtPath(current, path, value);
            return {
                ...previous,
                [selectedEntry.catalogId]: updated
            };
        });
    }, [selectedEntry]);

    const runPreview = useCallback(() => {
        setPreviewTick((previous) => previous + 1);
        if (selectedEntry) {
            setStatus(`Previewing ${selectedEntry.name}.`);
        }
    }, [selectedEntry]);

    const saveSelectedEffect = useCallback(async (targetId: string | null, targetLabel: string | null) => {
        if (!selectedEntry || !selectedConfig) return;
        setIsSaving(true);
        try {
            const effectId = `designer:${sanitizeSegment(targetId ?? "overlay")}:${sanitizeSegment(selectedEntry.catalogId)}`;
            await upsertEventEffect({
                id: effectId,
                typeName: selectedEntry.typeName,
                description: targetLabel ? `${selectedEntry.name} for ${targetLabel}` : selectedEntry.name,
                configurationJson: JSON.stringify(selectedConfig),
                enabled: true
            });
            setStatus(`Saved effect ${selectedEntry.name} (${effectId}).`);
        } catch (error) {
            setStatus(`Save failed: ${String(error)}`);
        } finally {
            setIsSaving(false);
        }
    }, [selectedConfig, selectedEntry]);

    return {
        loading,
        loadingError,
        search,
        setSearch,
        category,
        setCategory,
        categories,
        entries: filteredEntries,
        selectedEntry,
        selectedConfig,
        status,
        previewTick,
        isSaving,
        refreshTypes,
        readOptionValue,
        selectEffect,
        updateSelectedOption,
        runPreview,
        saveSelectedEffect
    };
};
