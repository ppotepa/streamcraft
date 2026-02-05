import { buildTextStyleEditor } from "./TextStyleEditor.Designer";
import type { TextStyleEditorProps } from "./TextStyleEditor.Designer";

export type { TextStyleEditorProps } from "./TextStyleEditor.Designer";

export const TextStyleEditor = (props: TextStyleEditorProps) => buildTextStyleEditor(props);
