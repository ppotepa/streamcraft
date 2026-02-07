/**
 * UI Extension types
 */

import type { FormNode } from "@streamcraft/forms/core";

export type DesignerUiExtension = {
    id: string;
    group?: string;
    title?: string;
    targets?: string[];
    order?: number;
    form?: FormNode | FormNode[] | null;
    data?: Record<string, any>;
};

export type GoogleFontFamily = {
    family: string;
    category: string;
    variants: string[];
    subsets: string[];
    version?: string;
    lastModified?: string;
    popularityRank?: number;
    files?: Record<string, string>;
};
