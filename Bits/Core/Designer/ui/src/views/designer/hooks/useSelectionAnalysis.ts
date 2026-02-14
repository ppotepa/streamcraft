import { useMemo } from "react";
import type { CanvasItem, DataSource, ApiFieldSpec, TestResponse } from "../domain/types";
import { buildDataKey, buildFieldSpecs } from "../services/dataSourceService";

export const useSelectionAnalysis = (
    items: CanvasItem[],
    selectedIds: string[],
    sources: DataSource[],
    liveData: Map<string, any>,
    virtualState: Record<string, any>,
    previews: Map<string, any>,
    testResponses: Map<string, TestResponse>,
    isSystemSource: (source?: DataSource | null) => boolean,
    resolveFieldValue: (sourceId?: string, endpointPath?: string, fieldPath?: string) => any
) => {
    const selectedItem = useMemo(() => items.find((i) => selectedIds.includes(i.id)) || null, [items, selectedIds]);

    const selectedSource = useMemo(() =>
        selectedItem?.sourceId ? sources.find((source) => source.id === selectedItem.sourceId) ?? null : null,
        [selectedItem?.sourceId, sources]
    );

    const selectedEndpoints = useMemo(() =>
        !isSystemSource(selectedSource) ? selectedSource?.endpoints ?? [] : [],
        [isSystemSource, selectedSource]
    );

    const selectedEndpoint = useMemo(() =>
        selectedItem?.endpointPath
            ? selectedEndpoints.find((endpoint) => endpoint.path === selectedItem.endpointPath)
            : null,
        [selectedEndpoints, selectedItem?.endpointPath]
    );

    const selectedPreview = useMemo(() =>
        selectedItem?.sourceId ? previews.get(selectedItem.sourceId) : undefined,
        [previews, selectedItem?.sourceId]
    );

    const previewFields = useMemo(() => selectedPreview?.fields ?? [], [selectedPreview]);
    const endpointFields = useMemo(() => selectedEndpoint?.response?.fields ?? [], [selectedEndpoint]);

    const systemFields = useMemo(() => {
        if (!selectedSource || !isSystemSource(selectedSource)) return [];
        const data = liveData.get(selectedSource.id);
        return buildFieldSpecs(data);
    }, [isSystemSource, liveData, selectedSource]);

    const availableFields = useMemo(() =>
        endpointFields.length > 0 ? endpointFields : systemFields.length > 0 ? systemFields : previewFields,
        [endpointFields, systemFields, previewFields]
    );

    const selectedKey = useMemo(() =>
        selectedItem ? buildDataKey(selectedItem.sourceId, selectedItem.endpointPath) : "",
        [selectedItem]
    );

    const selectedTest = useMemo(() =>
        selectedKey ? testResponses.get(selectedKey) : undefined,
        [selectedKey, testResponses]
    );

    const canBind = useMemo(() =>
        Boolean(selectedItem && (selectedItem.type === "text" || selectedItem.type === "image" || selectedItem.type === "progress")),
        [selectedItem]
    );

    const selectedFieldPath = useMemo(() => selectedItem?.fieldPath ?? "", [selectedItem]);
    const selectedFieldKey = useMemo(() => selectedFieldPath.replace(/^response\./, ""), [selectedFieldPath]);

    const selectedFieldSpec = useMemo(() =>
        selectedFieldKey ? availableFields.find((field: ApiFieldSpec) => field.path === selectedFieldKey) : undefined,
        [availableFields, selectedFieldKey]
    );

    const previewData = useMemo(() =>
        isSystemSource(selectedSource)
            ? (selectedSource ? liveData.get(selectedSource.id) : undefined)
            : selectedKey ? virtualState[selectedKey] : undefined,
        [isSystemSource, selectedSource, liveData, selectedKey, virtualState]
    );

    const selectedResolvedValue = useMemo(() =>
        selectedItem
            ? resolveFieldValue(selectedItem.sourceId, selectedItem.endpointPath, selectedItem.fieldPath)
            : undefined,
        [selectedItem, resolveFieldValue]
    );

    const arrayValueMessage = useMemo(() =>
        Array.isArray(selectedResolvedValue)
            ? "Array value detected. This control renders a single value; first element will be used."
            : "",
        [selectedResolvedValue]
    );

    return {
        selectedItem,
        selectedSource,
        selectedEndpoints,
        selectedEndpoint,
        selectedPreview,
        previewFields,
        endpointFields,
        systemFields,
        availableFields,
        selectedKey,
        selectedTest,
        canBind,
        selectedFieldPath,
        selectedFieldKey,
        selectedFieldSpec,
        previewData,
        selectedResolvedValue,
        arrayValueMessage
    };
};
