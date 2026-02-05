# Component Class Hierarchy

This directory contains the class-based component architecture for the StreamCraft forms system.

## Architecture Overview

All components from the designer mockups are now implemented:

```
Component (Abstract Base)
│
├── Container (Abstract) - Components that contain other components
│   ├── Window - Draggable, resizable windows
│   │   └── Dialog - Modal dialogs with OK/Cancel
│   ├── Panel - Basic container with optional title
│   ├── GroupBox - Container with border and legend
│   ├── PanelContainer - Container for dockable panels
│   ├── SplitContainer - Two-pane resizable container
│   └── TabControl - Tabbed container
│       └── TabPage - Individual tab in TabControl
│
├── Control (Abstract) - Interactive input controls
│   ├── InputControl (Abstract) - Text-based inputs
│   │   ├── TextBox - Single/multi-line text input
│   │   ├── ComboBox - Dropdown selection
│   │   └── ListBox - List selection (single/multi)
│   ├── ButtonControl (Abstract) - Toggle controls
│   │   ├── CheckBox - Checkbox control
│   │   └── RadioButton - Radio button control
│   ├── Button - Clickable button
│   ├── Label - Non-interactive text display
│   └── TrackBar - Slider control
│
├── Layout (Abstract) - Layout/positioning components
│   ├── LayoutCanvas - Free-form absolute positioning
│   ├── Canvas - Drawing/rendering canvas
│   ├── Grid - Grid layout container
│   ├── FlowLayoutPanel - Flowing layout with wrap
│   ├── TableLayoutPanel - Table-based layout
│   ├── View - General purpose view container
│   └── Dock - Docking container
│
├── Navigation (Abstract) - Navigation controls
│   ├── MenuBar - Top-level menu bar
│   │   └── MenuItem - Menu item with optional submenu
│   ├── ToolStrip - Toolbar with buttons
│   │   └── ToolButton - Button in toolbar
│   └── DocBar - Document/tab bar
│
├── Indicator (Abstract) - Non-interactive displays
│   ├── ProgressBar - Progress/completion display
│   ├── TrackBar - Slider control (also in Control)
│   ├── StatusBar - Status information bar
│   └── DiagnosticsPanel - Diagnostics/logs display
│
└── Special Components
    ├── Toolbox - Tool palette for designers
    ├── MessageBox - Message dialog
    └── SwitchButton - Toggle switch control
```

## Base Classes

### Component
The root abstract class providing:
- Rendering (`render()` method)
- Event handling (`on()`, `off()`, `emit()`)
- Lifecycle hooks (`onInit()`, `onMount()`, `onUnmount()`, `onUpdate()`)
- Serialization (`toJSON()`, `fromJSON()`)
- Child management (`addChild()`, `removeChild()`)
- Validation (`validate()`)
- Common properties (id, name, visible, enabled, className, style)

### Container
Extends Component, adds:
- Layout properties (padding, border, scrolling)
- Size constraints (minWidth, maxWidth, minHeight, maxHeight)
- Collapse functionality
- Container-specific styling
- Child filtering and rendering

### Control
Extends Component, adds:
- Value management (`getValue()`, `setValue()`)
- Focus handling (`focus()`, `blur()`)
- Validation rules and errors
- Data binding support
- Read-only and touched states
- Tab navigation

### Layout
Extends Container, adds:
- Alignment properties (horizontal, vertical)
- Direction and spacing
- Grid snapping
- Responsive layout
- Layout calculation algorithm

## Usage Example

```typescript
import { Window, Button, CheckBox } from "./components";

// Create a window programmatically
const window = new Window({
    title: "Settings",
    draggable: true,
    closable: true,
    size: { width: 400, height: 300 }
});

// Add a checkbox
const checkbox = new CheckBox({
    label: "Enable notifications",
    checked: true
});

checkbox.on("change", (args) => {
    console.log("Checkbox changed:", args.checked);
});

window.addChild(checkbox);

// Add a button
const button = new Button({
    text: "Save",
    variant: "primary",
    onClick: "handleSave"
});

window.addChild(button);

// Render to FormNode
const formNode = window.render(context);
```

## Design Principles

1. **Separation of Concerns**: Each class has a single, well-defined responsibility
2. **Inheritance**: Common functionality in base classes, specific behavior in derived classes
3. **Composition**: Components can contain other components
4. **Type Safety**: Full TypeScript support with proper typing
5. **Event-Driven**: Components communicate via events
6. **Lifecycle Management**: Proper initialization, mounting, and cleanup
7. **Validation**: Built-in validation framework
8. **Serialization**: Components can be serialized to/from JSON

## Benefits

- **Maintainability**: Clear separation makes code easier to understand and modify
- **Reusability**: Base classes provide common functionality
- **Extensibility**: Easy to add new component types
- **Type Safety**: Strong typing catches errors at compile time
- **Testability**: Each class can be tested independently
- **Documentation**: Self-documenting through class hierarchy

## Implemented Components

All 38+ control types from the designer mockups are now fully implemented:

**Containers**: Window, Dialog, Panel, GroupBox, PanelContainer, SplitContainer, TabControl, TabPage

**Inputs**: TextBox, ComboBox, ListBox, CheckBox, RadioButton, Button, TrackBar, Label

**Layouts**: LayoutCanvas, Canvas, Grid, FlowLayoutPanel, TableLayoutPanel, View, Dock

**Navigation**: MenuBar, MenuItem, ToolStrip, ToolButton, DocBar

**Indicators**: ProgressBar, StatusBar, DiagnosticsPanel

**Special**: Toolbox, MessageBox, SwitchButton
