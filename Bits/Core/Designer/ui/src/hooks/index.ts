export { useCanvasState } from "./useCanvasState";
export { useLayerManagement } from "./useLayerManagement";
export { useThemeManagement } from "./useThemeManagement";
export { useWindowVisibility } from "./useWindowVisibility";
export { useExtensions } from "./useExtensions";
export { useItemOperations } from "./useItemOperations";
export { useImagePreloading } from "./useImagePreloading";

// Re-export types
export type { CanvasState } from "../types/canvas.types";
export type { LayerState, Layer } from "../types/layer.types";
export type { ThemeState, ThemeMode } from "../types/theme.types";
export type { WindowVisibility, DockState, DockPrefs } from "../types/dock.types";
export type { ExtensionState, DesignerUiExtension, GoogleFontFamily } from "../types/extension.types";
export type { LoadingState, LoadingActions } from "../types/loading.types";
