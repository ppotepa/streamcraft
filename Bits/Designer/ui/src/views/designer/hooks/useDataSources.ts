import { useCallback, useEffect, useMemo, useState } from "react";
import type { ApiResponseMetadata, DataSource, DataSourceCategory, TestResponse } from "../domain/types";
import { buildDataKey } from "../services/dataSourceService";

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
        const map = new Map<string, DataSourceCategory>();
        sources.forEach((source) => {
            if (!source.categories || source.categories.length === 0) return;
            source.categories.forEach((cat) => {
                if (!map.has(cat.id)) {
                    map.set(cat.id, cat);
                }
            });
        });
        return Array.from(map.values());
    }, [sources]);

    const topCategories = useMemo(() => {
        return categories.filter((cat) => !cat.parentId);
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
            const result: string[] = [rootId];
            const queue = [rootId];
            while (queue.length > 0) {
                const current = queue.shift()!;
                const children = categoryChildren.get(current) ?? [];
                children.forEach((child) => {
                    result.push(child.id);
                    queue.push(child.id);
                });
            }
            return result;
        },
        [categoryChildren]
    );

    const subcategories = useMemo(() => {
        if (!selectedCategoryId) return [];
        return categoryChildren.get(selectedCategoryId) ?? [];
    }, [categoryChildren, selectedCategoryId]);

    const allowedCategoryIds = useMemo(() => {
        const target = selectedSubcategoryId || selectedCategoryId;
        if (!target) return null;
        return new Set(collectDescendants(target));
    }, [collectDescendants, selectedCategoryId, selectedSubcategoryId]);

    const filteredSources = useMemo(() => {
        if (!selectedCategoryId && !selectedSubcategoryId) return sources;
        if (!allowedCategoryIds) return sources;
        return sources.filter((source) =>
            source.categories?.some((cat) => allowedCategoryIds.has(cat.id))
        );
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
