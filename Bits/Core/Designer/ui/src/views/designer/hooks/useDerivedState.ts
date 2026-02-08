import { useMemo } from "react";
import type { CanvasItem } from "../domain/types";
import type { FormNode } from "@streamcraft/forms/core";
import type { DesignerUiExtension } from "../types/extension.types";

export const useDerivedState = (
    items: CanvasItem[],
    hasBindingForItem: (item: CanvasItem | null) => boolean,
    getExtensionsForTarget: (target: string) => DesignerUiExtension[],
    normalizeExtensionNodes: (form: any) => FormNode[]
) => {
    const textEffectsExtensions = useMemo(
        () => getExtensionsForTarget("text.properties.effects")
            .flatMap((extension) => normalizeExtensionNodes(extension.form)),
        [getExtensionsForTarget, normalizeExtensionNodes]
    );

    const dialogExtensions = useMemo(
        () => getExtensionsForTarget("designer.dialogs"),
        [getExtensionsForTarget]
    );

    const schedulerItems = useMemo(
        () => items.filter((item) => hasBindingForItem(item)),
        [hasBindingForItem, items]
    );

    return {
        textEffectsExtensions,
        dialogExtensions,
        schedulerItems
    };
};
