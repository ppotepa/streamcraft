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
export { Window, Dialog } from "./Window";
export { Panel, GroupBox, PanelContainer, SplitContainer, TabControl, TabPage } from "./Panel";

// Control components
export { Button, ButtonControl, CheckBox, RadioButton } from "./Button";
export { InputControl, TextBox, Label, ComboBox, ListBox } from "./InputControl";
export type { ComboBoxItem, ListBoxItem } from "./InputControl";

// Indicator components
export { Indicator, ProgressBar, TrackBar, StatusBar, DiagnosticsPanel } from "./Indicator";
export type { StatusBarSegment, DiagnosticEntry } from "./Indicator";

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
