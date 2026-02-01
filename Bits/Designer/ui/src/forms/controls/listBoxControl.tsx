import React, { useEffect, useState } from "react";
import { ControlRenderer } from "./types";

export const renderListBox: ControlRenderer = (node, context) => {
    const {
        items = "",
        selectedIndices = "",
        selectedIndex = "",
        selectionMode = "single", // single, multi
        enabled = "true",
        size = "5",
        onChange = "",
        style = ""
    } = node.props;

    // Parse items from comma-separated string or array
    const itemsList = Array.isArray(items)
        ? items
        : items.split(",").map((item: string) => item.trim()).filter(Boolean);

    const parseSelection = () => {
        if (selectedIndices) {
            return selectedIndices
                .split(",")
                .map((i: string) => parseInt(i.trim()))
                .filter((i: number) => !Number.isNaN(i));
        }
        if (selectedIndex !== "") {
            const index = parseInt(selectedIndex);
            return Number.isNaN(index) ? [] : [index];
        }
        return [];
    };

    const [selectedItems, setSelectedItems] = useState<number[]>(parseSelection());
    const isEnabled = enabled === "true" || enabled === true;
    const isMulti = selectionMode === "multi";

    useEffect(() => {
        setSelectedItems(parseSelection());
    }, [selectedIndices, selectedIndex, itemsList.join("|")]);

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const options = e.target.options;
        const selected: number[] = [];

        for (let i = 0; i < options.length; i++) {
            if (options[i].selected) {
                selected.push(i);
            }
        }

        setSelectedItems(selected);

        if (onChange && context.raiseEvent) {
            context.raiseEvent(onChange, {
                selectedIndices: selected,
                selectedItems: selected.map(i => itemsList[i]),
                sender: node
            });
        }
    };

    const combinedStyle = context.resolveStyle?.(node.props) || {};

    return (
        <select
            className="listbox"
            multiple={isMulti}
            size={parseInt(size)}
            value={isMulti ? selectedItems.map(String) : (selectedItems[0]?.toString() || "")}
            onChange={handleChange}
            disabled={!isEnabled}
            style={combinedStyle}
        >
            {itemsList.map((item, index) => (
                <option key={index} value={index}>
                    {item}
                </option>
            ))}
        </select>
    );
};
