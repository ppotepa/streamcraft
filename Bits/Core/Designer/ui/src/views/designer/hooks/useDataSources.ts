import { useCallback, useEffect, useMemo, useState } from "react";
import type { ApiResponseMetadata, DataSource, DataSourceCategory, TestResponse } from "../domain/types";
import { buildDataKey, formatCategoryLabel } from "../services/dataSourceService";

export const useDataSources = () => {
    const [sources, setSources] = useState<DataSource[]>([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
    const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string>("");
    const [previews, setPreviews] = useState<Map<string, ApiResponseMetadata>>(new Map());
    const [testResponses, setTestResponses] = useState<Map<string, TestResponse>>(new Map());
    const [liveData, setLiveData] = useState<Map<string, unknown>>(new Map());
    const [virtualState, setVirtualState] = useState<Record<string, unknown>>({});

    const isSystemSource = useCallback((source?: DataSource | null): boolean => {
        if (!source) return false;
        const kind = source.kind ?? "";
        return kind.startsWith("system") || source.id.startsWith("system-");
    }, []);

    const refreshSources = useCallback(async () => {
        const res = await fetch("/designer/sources", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as DataSource[];
        setSources(data || []);
    }, []);

    const ensurePreview = useCallback(
        async (sourceId: string) => {
            if (!sourceId || previews.has(sourceId)) return;
            const source = sources.find((candidate) => candidate.id === sourceId);
            if (isSystemSource(source)) return;
            try {
                const res = await fetch(`/designer/sources/${sourceId}/preview`, { cache: "no-store" });
                if (!res.ok) return;
                const data = (await res.json()) as ApiResponseMetadata;
                setPreviews((prev) => {
                    const next = new Map(prev);
                    next.set(sourceId, data);
                    return next;
                });
            } catch (err) {
                console.warn(`Preview fetch for ${sourceId} failed`, err);
            }
        },
        [isSystemSource, previews, sources]
    );

    const ingestData = useCallback((sourceId: string, endpointPath: string, data: unknown) => {
        const key = buildDataKey(sourceId, endpointPath);
        if (!key) return;
        setVirtualState((prev) => ({ ...prev, [key]: data }));
    }, []);

    const runTest = useCallback(
        async (sourceId: string, endpointPath: string) => {
            if (!sourceId || !endpointPath) return;
            const key = buildDataKey(sourceId, endpointPath);

            try {
                const url = `/designer/sources/${sourceId}/test?endpoint=${encodeURIComponent(endpointPath)}`;
                const res = await fetch(url, { method: "POST", cache: "no-store" });
                if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
                const payload = await res.json();
                if (!payload || typeof payload !== "object") {
                    throw new Error("Invalid response format");
                }
                const testResponse: TestResponse = {
                    success: true,
                    statusCode: 200,
                    data: payload,
                    timestamp: Date.now()
                };
                setTestResponses((prev) => {
                    const next = new Map(prev);
                    next.set(key, testResponse);
                    return next;
                });
                ingestData(sourceId, endpointPath, payload);
            } catch (err) {
                const testResponse: TestResponse = {
                    success: false,
                    statusCode: 0,
                    error: String(err),
                    timestamp: Date.now()
                };
                setTestResponses((prev) => {
                    const next = new Map(prev);
                    next.set(key, testResponse);
                    return next;
                });
            }
        },
        [ingestData]
    );

    const categories = useMemo(() => {
        const categorySet = new Map<string, DataSourceCategory>();
        for (const source of sources) {
            if (source.kind && !categorySet.has(source.kind)) {
                categorySet.set(source.kind, {
                    id: source.kind,
                    name: formatCategoryLabel(source.kind, source.kindLabel),
                    parentId: null
                });
            }
            if (!source.categoryId) continue;
            if (!categorySet.has(source.categoryId)) {
                categorySet.set(source.categoryId, {
                    id: source.categoryId,
                    name: formatCategoryLabel(source.categoryId, source.categoryLabel),
                    parentId: source.kind ?? null
                });
            }
        }
        return Array.from(categorySet.values());
    }, [sources]);

    const topCategories = useMemo(() => {
        const top = categories.filter((cat) => !cat.parentId);
        return top.sort((a, b) => a.id.localeCompare(b.id));
    }, [categories]);

    const categoryChildren = useMemo(() => {
        const childMap = new Map<string, DataSourceCategory[]>();
        categories.forEach((cat) => {
            if (!cat.parentId) return;
            const existing = childMap.get(cat.parentId) ?? [];
            childMap.set(cat.parentId, [...existing, cat]);
        });
        return childMap;
    }, [categories]);

    const collectDescendants = useCallback(
        (rootId: string): string[] => {
            const result: string[] = [];
            const queue = [rootId];
            while (queue.length > 0) {
                const current = queue.shift()!;
                if (!current || result.includes(current)) continue;
                result.push(current);
                const children = categoryChildren.get(current) ?? [];
                children.forEach((child) => {
                    queue.push(child.id);
                });
            }
            return result;
        },
        [categoryChildren]
    );

    const subcategories = useMemo(() => {
        if (!selectedCategoryId) return [];
        const direct = categoryChildren.get(selectedCategoryId) ?? [];
        return direct.sort((a, b) => a.id.localeCompare(b.id));
    }, [categoryChildren, selectedCategoryId]);

    const allowedCategoryIds = useMemo(() => {
        const target = selectedSubcategoryId || selectedCategoryId;
        if (!target) return null;
        return new Set(collectDescendants(target));
    }, [collectDescendants, selectedCategoryId, selectedSubcategoryId]);

    const filteredSources = useMemo(() => {
        if (!selectedCategoryId) return sources;
        if (selectedSubcategoryId) {
            return sources.filter((source) => source.categoryId === selectedSubcategoryId);
        }
        return sources.filter((source) => source.kind === selectedCategoryId);
    }, [selectedCategoryId, selectedSubcategoryId, sources, allowedCategoryIds]);

    return {
        sources,
        selectedCategoryId,
        selectedSubcategoryId,
        previews,
        testResponses,
        liveData,
        virtualState,
        categories,
        topCategories,
        subcategories,
        filteredSources,

        setSelectedCategoryId,
        setSelectedSubcategoryId,
        setLiveData,

        isSystemSource,
        refreshSources,
        ensurePreview,
        runTest,
        ingestData
    };
};
