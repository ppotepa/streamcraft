import React, { useEffect, useState } from "react";
import { ControlRenderer } from "./types";

export const renderComboBox: ControlRenderer = (node, context) => {
    const {
        items = "",
        selectedIndex = "0",
        selectedValue = "",
        value = "",
        dropDownStyle = "dropDown", // dropDown, dropDownList, simple
        enabled = "true",
        onChange = "",
        style = ""
    } = node.props;

    // Parse items from comma-separated string or array
    const itemsList = Array.isArray(items)
        ? items
        : items.split(",").map((item: string) => item.trim()).filter(Boolean);

    // Determine initial selection
    const resolveIndex = () => {
        if (selectedValue) {
            return itemsList.indexOf(selectedValue);
        }
        if (value) {
            return itemsList.indexOf(value);
        }
        const index = parseInt(selectedIndex);
        return Number.isNaN(index) ? 0 : index;
    };

    const [currentIndex, setCurrentIndex] = useState(() => {
        const resolved = resolveIndex();
        return resolved >= 0 ? resolved : 0;
    });
    const isEnabled = enabled === "true" || enabled === true;
    const isDropDownList = dropDownStyle === "dropDownList";

    useEffect(() => {
        const resolved = resolveIndex();
        setCurrentIndex(resolved >= 0 ? resolved : 0);
    }, [selectedIndex, selectedValue, value, itemsList.join("|")]);

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newIndex = parseInt(e.target.value);
        setCurrentIndex(newIndex);

        if (onChange && context.raiseEvent) {
            context.raiseEvent(onChange, {
                selectedIndex: newIndex,
                selectedValue: itemsList[newIndex],
                sender: node
            });
        }
    };

    const combinedStyle = context.resolveStyle?.(node.props) || {};

    return (
        <select
            className="combobox"
            value={currentIndex}
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
