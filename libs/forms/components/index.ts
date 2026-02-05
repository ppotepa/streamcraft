/**
 * Component class hierarchy for StreamCraft forms system
 * 
 * Architecture:
 * - Component: Base abstract class for all components
 * - Container: Abstract class for components that contain other components
 * - Control: Abstract class for interactive input controls
 * - Layout: Abstract class for layout/positioning components
 * 
 * All components from designer mockups are implemented with proper separation of concerns.
 */

// Base classes
export { Component } from "./Component";
export { Container } from "./Container";
export { Control } from "./Control";
export { Layout } from "./Layout";

// Container components
export { Window } from "./Window";
export { Dialog } from "./Dialog";
export { Panel, GroupBox, PanelContainer, SplitContainer, TabControl, TabPage } from "./Panel";

// Control components
export { Button } from "./Button";
export { ButtonControl } from "./ButtonControl";
export { CheckBox } from "./CheckBox";
export { RadioButton } from "./RadioButton";
export { InputControl } from "./InputControl";
export { TextBox } from "./TextBox";
export { Label } from "./Label";
export { ComboBox } from "./ComboBox";
export type { ComboBoxItem } from "./ComboBox";
export { ListBox } from "./ListBox";
export type { ListBoxItem } from "./ListBox";

// Indicator components
export { Indicator } from "./Indicator";
export { ProgressBar } from "./ProgressBar";
export { TrackBar } from "./TrackBar";
export { StatusBar } from "./StatusBar";
export type { StatusBarSegment } from "./StatusBar";
export { DiagnosticsPanel } from "./DiagnosticsPanel";
export type { DiagnosticEntry } from "./DiagnosticsPanel";

// Navigation components
export { Navigation, MenuBar, MenuItem, ToolStrip, ToolButton, DocBar } from "./Navigation";
export type { DocBarTab } from "./Navigation";

// Layout components
export { LayoutCanvas, Canvas, Grid, FlowLayoutPanel, TableLayoutPanel, View, Dock } from "./LayoutComponents";
export type { GridDefinition, TableStyle } from "./LayoutComponents";

// Special components
export { Toolbox, MessageBox, SwitchButton } from "./Toolbox";
export type { MessageBoxButtons, MessageBoxResult } from "./Toolbox";

// Types
export type { ValidationRule, ValidationResult } from "./Control";
export type { LayoutPosition } from "./Layout";
