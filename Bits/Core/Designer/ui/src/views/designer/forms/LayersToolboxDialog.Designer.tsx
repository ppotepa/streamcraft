import React from "react";
import { WF } from "@streamcraft/forms";

// Unified Color Palette (Win95 aesthetic)
const COLORS = {
    chrome: 'var(--sc-surface)',
    titlebar: 'var(--sc-accent)',
    row: 'var(--sc-surface-alt)',
    rowHover: 'var(--sc-surface-artboard)',
    rowSelected: 'var(--sc-accent-soft)',
    rowBorder: 'var(--sc-border-dark)',
    rowSelectedBorder: 'var(--sc-accent)',
    button: 'var(--sc-surface-alt)',
    inputBg: 'var(--sc-surface-artboard)',
    inputBorder: 'var(--sc-border-dark)',
    text: 'var(--sc-text)',
    textMuted: 'var(--sc-text-muted)',
    divider: 'var(--sc-border-dark)'
};

export interface LayerItem {
    id: string;
    name?: string;
    type: string;
    zIndex: number;
    visible: boolean;
    locked: boolean;
    layerId: string;
}

export interface LayersToolboxDialogProps {
    layers: Array<{ id: string; name: string }>;
    activeLayerId: string;
    onSelectActiveLayer: (id: string) => void;
    onAddLayer: () => void;
    onDeleteLayer: (id: string) => void;
    onLayerCss: (id: string) => void;
    onLayerBlending: (id: string) => void;
    onLayerGroup: (id: string) => void;
    onLayerLock: (id: string) => void;
    items: LayerItem[];
    selectedIds: string[];
    onSelectLayer: (id: string, multiSelect: boolean) => void;
    onToggleVisibility: (id: string) => void;
    onToggleLock: (id: string) => void;
    onReorderLayer: (id: string, newIndex: number) => void;
    onReorderItem: (draggedId: string, targetId: string) => void;
    itemsExpanded: boolean;
    onToggleItemsFold: () => void;
    onClose: () => void;
}

export const buildLayersToolboxDialog = (props: LayersToolboxDialogProps) => {
    // Sort layers by z-index (highest first - top of canvas)
    const sortedItems = [...props.items].sort((a, b) => b.zIndex - a.zIndex);
    const activeLayer = props.layers.find(layer => layer.id === props.activeLayerId);
    const visibleItems = sortedItems.filter(item => item.layerId === props.activeLayerId);

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'text': return 'T';
            case 'image': return '🖼';
            case 'progress': return '▮▮';
            case 'rect': return '▢';
            case 'ellipse': return '○';
            case 'line': return '──';
            case 'polygon': return '⬡';
            default: return '?';
        }
    };

    const getTypeLabel = (type: string) => {
        return type.charAt(0).toUpperCase() + type.slice(1);
    };

    const getLayerName = (layer: LayerItem) => {
        return layer.name || `${getTypeLabel(layer.type)}`;
    };

    return WF.Window(
        {
            Text: "Layers",
            Dialog: true,
            Draggable: true,
            close: false,
            Style: "position: absolute; right: 16px; top: 88px; width: 300px; height: 560px; resize: both; overflow: hidden; min-width: 300px; max-width: 300px; min-height: 300px;"
        },
        WF.Element("div", { className: "canvas-properties", style: `height: 100%; display: flex; flex-direction: column; overflow: hidden; background: ${COLORS.chrome}; color: ${COLORS.text};` },
            // Toolbar
            WF.Element("div", { style: `padding: 8px 12px; background: ${COLORS.chrome}; border-bottom: 1px solid ${COLORS.divider}; display: flex; gap: 12px; align-items: center; flex-shrink: 0;` },
                WF.Element("span", { style: `font-size: 13px; color: ${COLORS.text};` }, "Search:"),
                WF.Element("input", {
                    type: "text",
                    placeholder: "Filter layers",
                    style: `flex: 1; padding: 4px 8px; border: 1px solid ${COLORS.inputBorder}; background: ${COLORS.inputBg}; font-size: 13px;`
                }),
                WF.Element("button", {
                    className: "canvas-properties-button",
                    style: `padding: 4px 12px; background: ${COLORS.button}; border: 1px solid ${COLORS.inputBorder}; font-size: 13px;`,
                    onClick: props.onAddLayer
                }, "New Layer"),
                WF.Element("button", {
                    className: "canvas-properties-button",
                    style: `padding: 4px 12px; background: ${COLORS.button}; border: 1px solid ${COLORS.inputBorder}; font-size: 13px; ${props.layers.length <= 1 ? "opacity: 0.5;" : ""}`,
                    disabled: props.layers.length <= 1,
                    onClick: () => props.onDeleteLayer(props.activeLayerId)
                }, "Delete Layer")
            ),

            // Divider
            WF.Element("div", { style: `height: 1px; background: ${COLORS.divider}; flex-shrink: 0;` }),

            // Layers & Items
            WF.Element("div", { style: "flex: 1; overflow-y: auto; overflow-x: hidden; min-height: 0; background: ${COLORS.chrome}; padding: 8px; display: flex; flex-direction: column; gap: 12px;" },
                // Layer List
                WF.Element("div", { style: `border: 1px solid ${COLORS.rowBorder}; background: ${COLORS.row}; padding: 8px;` },
                    WF.Element("div", { style: `font-size: 12px; font-weight: 600; margin-bottom: 6px; color: ${COLORS.text};` }, "Layers"),
                    ...(props.layers.length > 0
                        ? props.layers.map((layer) => {
                            const isActive = layer.id === props.activeLayerId;
                            return WF.Element(
                                "div",
                                {
                                    key: layer.id,
                                    style: `display: flex; justify-content: space-between; align-items: center; padding: 6px 8px; margin-bottom: 4px; background: ${isActive ? COLORS.rowSelected : COLORS.inputBg}; border: 1px solid ${isActive ? COLORS.rowSelectedBorder : COLORS.rowBorder}; cursor: pointer;`,
                                    onClick: () => props.onSelectActiveLayer(layer.id)
                                },
                                WF.Element("span", { style: `font-size: 12px; color: ${COLORS.text};` }, layer.name),
                                WF.Element("div", { style: "display: flex; gap: 4px;" },
                                    WF.Element("button", {
                                        className: "canvas-properties-button layer-toolbox-button",
                                        style: `width: 32px; height: 32px; padding: 0; font-size: 12px; background: ${COLORS.button}; border: 1px solid ${COLORS.inputBorder};`,
                                        onClick: (e: Event) => {
                                            e.stopPropagation();
                                            props.onLayerCss(layer.id);
                                        }
                                    }, "⚙"),
                                    WF.Element("button", {
                                        className: "canvas-properties-button layer-toolbox-button",
                                        style: `width: 32px; height: 32px; padding: 0; font-size: 12px; background: ${COLORS.button}; border: 1px solid ${COLORS.inputBorder};`,
                                        onClick: (e: Event) => {
                                            e.stopPropagation();
                                            props.onLayerBlending(layer.id);
                                        }
                                    }, "◐"),
                                    WF.Element("button", {
                                        className: "canvas-properties-button layer-toolbox-button",
                                        style: `width: 32px; height: 32px; padding: 0; font-size: 12px; background: ${COLORS.button}; border: 1px solid ${COLORS.inputBorder};`,
                                        onClick: (e: Event) => {
                                            e.stopPropagation();
                                            props.onLayerGroup(layer.id);
                                        }
                                    }, "⌗"),
                                    WF.Element("button", {
                                        className: "canvas-properties-button layer-toolbox-button",
                                        style: `width: 32px; height: 32px; padding: 0; font-size: 12px; background: ${COLORS.button}; border: 1px solid ${COLORS.inputBorder};`,
                                        onClick: (e: Event) => {
                                            e.stopPropagation();
                                            props.onLayerLock(layer.id);
                                        }
                                    }, "🔒")
                                )
                            );
                        })
                        : [WF.Element("div", { style: `padding: 6px; text-align: center; color: ${COLORS.textMuted}; font-size: 12px;` },
                            "No layers available")])
                ),

                // Items List (foldable groupbox)
                WF.Element("div", { style: `border: 1px solid ${COLORS.rowBorder}; background: ${COLORS.row}; padding: 8px;` },
                    WF.Element(
                        "div",
                        {
                            style: `display: flex; justify-content: space-between; align-items: center; padding: 6px 8px; background: ${COLORS.inputBg}; border: 1px solid ${COLORS.rowBorder}; cursor: pointer;`,
                            onClick: props.onToggleItemsFold
                        },
                        WF.Element("div", { style: "display: flex; align-items: center; gap: 6px;" },
                            WF.Element("span", { style: `font-size: 12px; color: ${COLORS.text};` }, "Items"),
                            WF.Element("span", { style: `font-size: 11px; color: ${COLORS.textMuted};` }, props.itemsExpanded ? "▾" : "▸")
                        ),
                        WF.Element("span", { style: `font-size: 11px; color: ${COLORS.textMuted};` },
                            activeLayer ? activeLayer.name : ""
                        )
                    ),
                    props.itemsExpanded
                        ? WF.Element(
                            "div",
                            { style: "padding-top: 8px;" },
                            ...(visibleItems.length > 0
                                ? visibleItems.map((layer) => {
                                    const isSelected = props.selectedIds.includes(layer.id);
                                    const bgColor = isSelected ? COLORS.rowSelected : COLORS.row;
                                    const borderColor = isSelected ? COLORS.rowSelectedBorder : COLORS.rowBorder;

                                    return WF.Element(
                                        "div",
                                        {
                                            key: layer.id,
                                            className: "layer-row",
                                            style: `display: flex; align-items: center; gap: 12px; padding: 10px 12px; margin-bottom: 4px; background: ${bgColor}; border: 1px solid ${borderColor}; cursor: pointer; transition: background 0.15s ease;`,
                                            onClick: () => props.onSelectLayer(layer.id, false),
                                            draggable: true,
                                            onDragStart: (e: DragEvent) => {
                                                e.dataTransfer?.setData("text/plain", layer.id);
                                                e.dataTransfer?.setData("application/x-layer-id", layer.id);
                                                e.dataTransfer && (e.dataTransfer.effectAllowed = "move");
                                            },
                                            onDragOver: (e: DragEvent) => {
                                                e.preventDefault();
                                                e.dataTransfer && (e.dataTransfer.dropEffect = "move");
                                            },
                                            onDrop: (e: DragEvent) => {
                                                e.preventDefault();
                                                const draggedId = e.dataTransfer?.getData("application/x-layer-id") || e.dataTransfer?.getData("text/plain");
                                                if (draggedId && draggedId !== layer.id) {
                                                    props.onReorderItem(draggedId, layer.id);
                                                }
                                            }
                                        },
                                        WF.Element("div", {
                                            style: `width: 16px; height: 16px; border: 1px solid ${COLORS.inputBorder}; background: ${COLORS.inputBg}; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 600;`
                                        }, isSelected ? "✓" : ""),
                                        WF.Element("div", {
                                            style: `width: 28px; height: 28px; border: 1px solid ${COLORS.inputBorder}; background: ${COLORS.inputBg}; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 600;`
                                        }, getTypeIcon(layer.type)),
                                        WF.Element("div", { style: `flex: 1; font-size: 13px; font-weight: ${isSelected ? '600' : 'normal'}; color: ${COLORS.text};` },
                                            getLayerName(layer)
                                        ),
                                        WF.Element("div", { style: `font-size: 11px; color: ${COLORS.textMuted};` },
                                            `(${getTypeLabel(layer.type)})`
                                        ),
                                        WF.Element("div", { style: `font-size: 11px; color: ${COLORS.textMuted}; min-width: 40px; text-align: right;` },
                                            `Z:${layer.zIndex}`
                                        ),
                                        WF.Element("div", {
                                            style: `width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 16px; cursor: pointer;`,
                                            onClick: (e: Event) => {
                                                e.stopPropagation();
                                                props.onToggleVisibility(layer.id);
                                            }
                                        }, layer.visible ? "👁" : "👁‍🗨"),
                                        WF.Element("div", {
                                            style: `width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 16px; cursor: pointer; color: ${layer.locked ? 'var(--sc-error)' : COLORS.text};`,
                                            onClick: (e: Event) => {
                                                e.stopPropagation();
                                                props.onToggleLock(layer.id);
                                            }
                                        }, layer.locked ? "🔒" : "🔓")
                                    );
                                })
                                : [WF.Element("div", { style: `padding: 16px; text-align: center; color: ${COLORS.textMuted}; font-size: 13px;` },
                                    "No items in this layer")])
                        )
                        : null
                )
            ),

            // Footer Divider
            WF.Element("div", { style: `height: 1px; background: ${COLORS.divider}; flex-shrink: 0;` }),

            // Footer Hint
            WF.Element("div", { style: `padding: 12px; background: ${COLORS.chrome}; font-size: 11px; color: ${COLORS.textMuted}; flex-shrink: 0;` },
                `${props.layers.length} layers • ${visibleItems.length} items in active layer`
            ),

            // Action Buttons
            WF.Element("div", { style: `display: flex; justify-content: flex-end; gap: 8px; padding: 8px 12px; border-top: 1px solid ${COLORS.divider}; background: ${COLORS.chrome}; flex-shrink: 0;` },
                WF.Element("button", {
                    className: "canvas-properties-button",
                    onClick: props.onClose
                }, "Close")
            )
        )
    );
};



