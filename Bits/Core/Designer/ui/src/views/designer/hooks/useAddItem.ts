import { useCallback } from "react";
import type { Layer } from "../types/layer.types";

interface AddItemDeps {
    setStatus: (status: string) => void;
    canvas: {
        addItem: (toolType: string, x: number, y: number, width: number, height: number, activeLayerId: string, layers: Layer[]) => any;
        setActiveTool: (tool: string) => void;
    };
    layerMgmt: {
        activeLayerId: string;
        layers: Layer[];
    };
}

export const useAddItem = ({ setStatus, canvas, layerMgmt }: AddItemDeps) => {
    return useCallback((toolType: string, x: number, y: number, width: number, height: number) => {
        if (toolType === "bind" || toolType === "polygon") {
            setStatus(`${toolType} tool not implemented yet.`);
            return;
        }
        canvas.addItem(toolType, x, y, width, height, layerMgmt.activeLayerId, layerMgmt.layers);
        canvas.setActiveTool("select");
    }, [canvas, layerMgmt, setStatus]);
};
