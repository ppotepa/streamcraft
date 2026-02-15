import type React from "react";
import { element, node, type FormChild, type FormNode } from "../core";
import { ControlKind } from "../controlKinds";

export type Point = { X: number; Y: number };
export type Size = { Width: number; Height: number };

export type DockStyle = "Top" | "Bottom" | "Left" | "Right" | "Fill" | "None";

export type WinFormsFont = {
    Family?: string;
    Size?: number;
    Weight?: string | number;
    Style?: string;
};

export type WinFormsBaseProps = {
    Name?: string;
    Text?: string;
    Location?: Point;
    Size?: Size;
    Dock?: DockStyle;
    Anchor?: string | string[];
    Visible?: boolean;
    Enabled?: boolean;
    Padding?: number | string;
    Margin?: number | string;
    BackColor?: string;
    ForeColor?: string;
    Font?: WinFormsFont;
    ClassName?: string;
    Style?: React.CSSProperties | string;
    Layout?: Record<string, unknown> | string;
    TabIndex?: number;
};

export type WinFormsProps = WinFormsBaseProps & Record<string, unknown>;

const toCssLength = (value?: number | string): string | undefined => {
    if (value === undefined || value === null) return undefined;
    if (typeof value === "number") return `${value}px`;
    return value;
};

const normalizeAnchor = (value: string | string[]): string => {
    if (Array.isArray(value)) {
        return value.map((entry) => entry.toLowerCase()).join(", ");
    }
    return value
        .split(/[,\s|]+/g)
        .map((entry) => entry.trim())
        .filter(Boolean)
        .map((entry) => entry.toLowerCase())
        .join(", ");
};

const styleObjectToString = (style: React.CSSProperties | undefined): string => {
    if (!style) return "";
    return Object.entries(style)
        .filter(([, value]) => value !== undefined && value !== null)
        .map(([key, value]) => {
            const kebab = key.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
            return `${kebab}: ${String(value)}`;
        })
        .join("; ");
};

const mergeStyles = (
    base: React.CSSProperties | string | undefined,
    additions: React.CSSProperties | undefined
): string | undefined => {
    const additionsString = styleObjectToString(additions);
    if (!base && !additionsString) return undefined;
    if (typeof base === "string") {
        if (!additionsString) return base;
        return `${additionsString}; ${base}`.trim();
    }
    const baseString = styleObjectToString(base);
    if (!additionsString) return baseString || undefined;
    if (!baseString) return additionsString || undefined;
    return `${additionsString}; ${baseString}`.trim();
};

const flattenChildren = (value: unknown): FormChild[] => {
    if (value === null || value === undefined) return [];
    if (Array.isArray(value)) {
        return value.flatMap((entry) => flattenChildren(entry));
    }
    return [value as FormChild];
};

const splitChildren = <T extends WinFormsProps>(
    props: T | undefined,
    keys: string[]
): { props: WinFormsProps; children: FormChild[] } => {
    if (!props) return { props: {}, children: [] };
    const raw = props as Record<string, unknown>;
    let childSource: unknown;
    keys.forEach((key) => {
        if (raw[key] !== undefined) childSource = raw[key];
    });
    const rest: Record<string, unknown> = { ...raw };
    keys.forEach((key) => {
        delete rest[key];
    });
    return { props: rest, children: flattenChildren(childSource) };
};

const mapCommonProps = (
    props: WinFormsProps,
    options?: { textProp?: string | null }
): Record<string, unknown> => {
    const {
        Name,
        Text,
        Location,
        Size,
        Dock,
        Anchor,
        Visible,
        Enabled,
        Padding,
        Margin,
        BackColor,
        ForeColor,
        Font,
        ClassName,
        Style,
        Layout,
        TabIndex,
        ...rest
    } = props;

    const mapped: Record<string, unknown> = { ...rest };

    if (Name) mapped.name = Name;
    if (Enabled !== undefined) mapped.enabled = Enabled;
    if (ClassName) mapped.className = ClassName;
    if (TabIndex !== undefined) mapped.tabIndex = TabIndex;
    if (Layout !== undefined) mapped.layout = Layout;

    if (Dock && Dock !== "None") {
        mapped.dock = Dock.toLowerCase();
    }
    if (Anchor) {
        mapped.anchor = normalizeAnchor(Anchor);
    }

    const additions: React.CSSProperties = {};
    if (Location) {
        additions.left = toCssLength(Location.X);
        additions.top = toCssLength(Location.Y);
        additions.position = "absolute";
    }
    if (Size) {
        additions.width = toCssLength(Size.Width);
        additions.height = toCssLength(Size.Height);
        additions.position = additions.position ?? "absolute";
    }
    if (Padding !== undefined) additions.padding = toCssLength(Padding);
    if (Margin !== undefined) additions.margin = toCssLength(Margin);
    if (BackColor) additions.backgroundColor = BackColor;
    if (ForeColor) additions.color = ForeColor;
    if (Font) {
        if (Font.Family) additions.fontFamily = Font.Family;
        if (Font.Size !== undefined) additions.fontSize = toCssLength(Font.Size);
        if (Font.Weight !== undefined) additions.fontWeight = Font.Weight as React.CSSProperties["fontWeight"];
        if (Font.Style) additions.fontStyle = Font.Style as React.CSSProperties["fontStyle"];
    }
    if (Visible === false) {
        additions.display = "none";
    }

    const mergedStyle = mergeStyles(Style, additions);
    if (mergedStyle) mapped.style = mergedStyle;

    const textProp = options?.textProp ?? "text";
    if (textProp && Text !== undefined) {
        mapped[textProp] = Text;
    }

    return mapped;
};

const buildControl = (
    type: string,
    props: WinFormsProps | undefined,
    childKeys: string[],
    options?: { textProp?: string | null },
    ...children: FormChild[]
): FormNode => {
    const { props: stripped, children: fromProps } = splitChildren(props, childKeys);
    const mapped = mapCommonProps(stripped, options);
    return node(type, mapped, ...children, ...fromProps);
};

export const Form = (props?: WinFormsProps, ...children: FormChild[]): FormNode =>
    buildControl(ControlKind.panel, props, ["Controls", "Children"], { textProp: null }, ...children);

export const Panel = (props?: WinFormsProps, ...children: FormChild[]): FormNode =>
    buildControl(ControlKind.panel, props, ["Controls", "Children"], { textProp: "title" }, ...children);

export const PanelContainer = (props?: WinFormsProps, ...children: FormChild[]): FormNode =>
    buildControl(ControlKind.panelContainer, props, ["Controls", "Children"], { textProp: null }, ...children);

export const GroupBox = (props?: WinFormsProps, ...children: FormChild[]): FormNode =>
    buildControl(ControlKind.groupBox, props, ["Controls", "Children"], undefined, ...children);

export const SplitContainer = (props?: WinFormsProps, ...children: FormChild[]): FormNode =>
    (() => {
        const { Orientation, SplitPosition, ...rest } = props ?? {};
        const mapped = mapCommonProps(rest, { textProp: null });
        if (Orientation !== undefined) mapped.orientation = Orientation;
        if (SplitPosition !== undefined) mapped.splitPosition = SplitPosition;
        return node(ControlKind.splitContainer, mapped, ...children);
    })();

export const FlowLayoutPanel = (props?: WinFormsProps, ...children: FormChild[]): FormNode =>
    (() => {
        const { Direction, Wrap, ...rest } = props ?? {};
        const mapped = mapCommonProps(rest, { textProp: null });
        if (Direction !== undefined) mapped.direction = Direction;
        if (Wrap !== undefined) mapped.wrap = Wrap;
        return node(ControlKind.flowLayoutPanel, mapped, ...children);
    })();

export const TableLayoutPanel = (props?: WinFormsProps, ...children: FormChild[]): FormNode =>
    (() => {
        const { Rows, Cols, ...rest } = props ?? {};
        const mapped = mapCommonProps(rest, { textProp: null });
        if (Rows !== undefined) mapped.rows = Rows;
        if (Cols !== undefined) mapped.cols = Cols;
        return node(ControlKind.tableLayoutPanel, mapped, ...children);
    })();

export const TabControl = (props?: WinFormsProps, ...children: FormChild[]): FormNode => {
    const { Pages, TabPages, SelectedIndex, OnSelectedIndexChanged, MultiRows, ...rest } = props ?? {};
    const combined = {
        ...rest,
        selectedIndex: SelectedIndex,
        onSelectedIndexChanged: OnSelectedIndexChanged,
        multirows: MultiRows
    };
    const mergedChildren = flattenChildren(Pages ?? TabPages);
    return buildControl(ControlKind.tabControl, combined, ["Children"], { textProp: null }, ...children, ...mergedChildren);
};

export const TabPage = (props?: WinFormsProps, ...children: FormChild[]): FormNode =>
    buildControl(ControlKind.tabPage, props, ["Controls", "Children"], undefined, ...children);

export const MenuStrip = (props?: WinFormsProps, ...children: FormChild[]): FormNode =>
    buildControl(ControlKind.menuBar, props, ["Items", "Children"], { textProp: null }, ...children);

export const DocBar = (props?: WinFormsProps): FormNode => {
    const { Left, Right, ...rest } = props ?? {};
    const mapped = mapCommonProps(rest, { textProp: null });
    if (Left !== undefined) mapped.left = Left;
    if (Right !== undefined) mapped.right = Right;
    return node(ControlKind.docBar, mapped);
};

export const MenuItem = (props?: WinFormsProps, ...children: FormChild[]): FormNode => {
    const { props: stripped, children: fromProps } = splitChildren(props, ["Children", "Items"]);
    const { OnClick, ShortcutKey, Text, Label, ...rest } = stripped;
    const mapped = mapCommonProps(rest, { textProp: null });
    const label = Label ?? Text;
    if (label !== undefined) mapped.label = label;
    if (OnClick !== undefined) mapped.onClick = OnClick;
    if (ShortcutKey !== undefined) mapped.shortcut = ShortcutKey;
    return node(ControlKind.menuItem, mapped, ...children, ...fromProps);
};

export const MenuItemEntry = (props?: WinFormsProps, ...children: FormChild[]): FormNode => {
    const { props: stripped, children: fromProps } = splitChildren(props, ["Children"]);
    const { OnClick, ShortcutKey, Text, Label, Icon, IconPosition, ...rest } = stripped;
    const mapped = mapCommonProps(rest, { textProp: null });
    if (OnClick !== undefined) mapped.onClick = OnClick;
    if (ShortcutKey !== undefined) mapped.shortcut = ShortcutKey;
    if (Icon !== undefined) mapped.icon = Icon;
    if (IconPosition !== undefined) mapped.iconPosition = IconPosition;
    const entryLabel = (Label ?? Text) as FormChild | undefined;
    if (children.length === 0 && fromProps.length === 0 && entryLabel !== undefined) {
        return node(ControlKind.menuItemEntry, mapped, entryLabel);
    }
    return node(ControlKind.menuItemEntry, mapped, ...children, ...fromProps);
};

export const ContextBar = (props?: WinFormsProps): FormNode => {
    const { Items, Left, Center, Right, ...rest } = props ?? {};
    const mapped = mapCommonProps(rest, { textProp: null });
    if (Items !== undefined) mapped.items = Items;
    if (Left !== undefined) mapped.left = Left;
    if (Center !== undefined) mapped.center = Center;
    if (Right !== undefined) mapped.right = Right;
    return node(ControlKind.contextBar, mapped);
};

export const ToolStrip = (props?: WinFormsProps): FormNode => {
    const { Tiles, Options, Actions, ...rest } = props ?? {};
    const mapped = mapCommonProps(rest, { textProp: null });
    if (Tiles !== undefined) mapped.tiles = Tiles;
    if (Options !== undefined) mapped.options = Options;
    if (Actions !== undefined) mapped.actions = Actions;
    return node(ControlKind.toolStrip, mapped);
};

export const ToolStripButton = (props?: WinFormsProps): FormNode => {
    const { Label, OnClick, Pressed, Icon, IconPosition, IconOnly, HasFlyout, ...rest } = props ?? {};
    const mapped = mapCommonProps(rest, { textProp: null });
    if (Label !== undefined) mapped.label = Label;
    if (OnClick !== undefined) mapped.onClick = OnClick;
    if (Pressed !== undefined) mapped.pressed = Pressed;
    if (Icon !== undefined) mapped.icon = Icon;
    if (IconPosition !== undefined) mapped.iconPosition = IconPosition;
    if (IconOnly !== undefined) mapped.iconOnly = IconOnly;
    if (HasFlyout !== undefined) mapped.hasFlyout = HasFlyout;
    return node(ControlKind.toolButton, mapped);
};

export const SwitchButton = (props?: WinFormsProps, ...children: FormChild[]): FormNode => {
    const { Text, Label, Icon, Checked, Pressed, OnToggle, ...rest } = props ?? {};
    const mapped = mapCommonProps(rest, { textProp: null });
    const content = Label ?? Text;
    if (content !== undefined) mapped.text = content;
    if (Icon !== undefined) mapped.icon = Icon;
    const resolvedChecked = Checked ?? Pressed;
    if (resolvedChecked !== undefined) mapped.checked = resolvedChecked;
    if (OnToggle !== undefined) mapped.onToggle = OnToggle;
    return node(ControlKind.switchButton, mapped, ...children);
};

export const StatusStrip = (props?: WinFormsProps): FormNode => {
    const { Segments, ...rest } = props ?? {};
    const mapped = mapCommonProps(rest, { textProp: null });
    if (Segments !== undefined) mapped.segments = Segments;
    return node(ControlKind.statusBar, mapped);
};

export const Window = (props?: WinFormsProps, ...children: FormChild[]): FormNode => {
    const {
        OnClose,
        Dialog,
        Draggable,
        Minimize,
        Maximize,
        Close,
        StartMaximized,
        StartPosition,
        Icon,
        BodyClassName,
        DragBounds,
        DragHandle,
        OnDragStart,
        OnDragMove,
        OnDragEnd,
        ...rest
    } = props ?? {};
    const mapped = mapCommonProps(rest, { textProp: "title" });
    if (OnClose !== undefined) mapped.onClose = OnClose;
    if (Dialog !== undefined) mapped.dialog = Dialog;
    if (Draggable !== undefined) mapped.draggable = Draggable;
    if (Minimize !== undefined) mapped.minimize = Minimize;
    if (Maximize !== undefined) mapped.maximize = Maximize;
    if (Close !== undefined) mapped.close = Close;
    if (StartMaximized !== undefined) mapped.startMaximized = StartMaximized;
    if (StartPosition !== undefined) mapped.startPosition = StartPosition;
    if (Icon !== undefined) mapped.icon = Icon;
    if (BodyClassName !== undefined) mapped.bodyClassName = BodyClassName;
    if (DragBounds !== undefined) mapped.dragBounds = DragBounds;
    if (DragHandle !== undefined) mapped.dragHandle = DragHandle;
    if (OnDragStart !== undefined) mapped.onDragStart = OnDragStart;
    if (OnDragMove !== undefined) mapped.onDragMove = OnDragMove;
    if (OnDragEnd !== undefined) mapped.onDragEnd = OnDragEnd;
    return node(ControlKind.window, mapped, ...children);
};

export const Label = (props?: WinFormsProps, ...children: FormChild[]): FormNode =>
    buildControl(ControlKind.label, props, ["Children"], undefined, ...children);

export const TextBox = (props?: WinFormsProps): FormNode => {
    const {
        ReadOnly,
        Multiline,
        Rows,
        PlaceholderText,
        OnChange,
        OnFocus,
        OnBlur,
        OnKeyPress,
        Password,
        UseSystemPasswordChar,
        ...rest
    } = props ?? {};
    const mapped = mapCommonProps(rest, { textProp: "value" });
    if (ReadOnly !== undefined) mapped.readOnly = ReadOnly;
    if (Multiline !== undefined) mapped.multiline = Multiline;
    if (Rows !== undefined) mapped.rows = Rows;
    if (PlaceholderText !== undefined) mapped.placeholder = PlaceholderText;
    if (OnChange !== undefined) mapped.onChange = OnChange;
    if (OnFocus !== undefined) mapped.onFocus = OnFocus;
    if (OnBlur !== undefined) mapped.onBlur = OnBlur;
    if (OnKeyPress !== undefined) mapped.onKeyPress = OnKeyPress;
    if (Password !== undefined) mapped.password = Password;
    if (UseSystemPasswordChar) mapped.password = true;
    return node(ControlKind.textBox, mapped);
};

export const Button = (props?: WinFormsProps, ...children: FormChild[]): FormNode => {
    const { Default, OnClick, Icon, IconPosition, IconOnly, ...rest } = props ?? {};
    const mapped = mapCommonProps(rest, undefined);
    if (Default !== undefined) mapped.default = Default;
    if (OnClick !== undefined) mapped.onClick = OnClick;
    if (Icon !== undefined) mapped.icon = Icon;
    if (IconPosition !== undefined) mapped.iconPosition = IconPosition;
    if (IconOnly !== undefined) mapped.iconOnly = IconOnly;
    return node(ControlKind.button, mapped, ...children);
};

export const CheckBox = (props?: WinFormsProps, ...children: FormChild[]): FormNode => {
    const { Checked, OnChange, ...rest } = props ?? {};
    const mapped = mapCommonProps(rest, undefined);
    if (Checked !== undefined) mapped.checked = Checked;
    if (OnChange !== undefined) mapped.onChange = OnChange;
    return node(ControlKind.checkBox, mapped, ...children);
};

export const RadioButton = (props?: WinFormsProps, ...children: FormChild[]): FormNode => {
    const { Checked, OnChange, Group, ...rest } = props ?? {};
    const mapped = mapCommonProps(rest, undefined);
    if (Checked !== undefined) mapped.checked = Checked;
    if (OnChange !== undefined) mapped.onChange = OnChange;
    if (Group !== undefined) mapped.group = Group;
    return node(ControlKind.radioButton, mapped, ...children);
};

export const ComboBox = (props?: WinFormsProps): FormNode => {
    const { Items, SelectedIndex, SelectedValue, Value, DropDownStyle, OnChange, ...rest } = props ?? {};
    const mapped = mapCommonProps(rest, { textProp: null });
    if (Items !== undefined) mapped.items = Items;
    if (SelectedIndex !== undefined) mapped.selectedIndex = SelectedIndex;
    if (SelectedValue !== undefined) mapped.selectedValue = SelectedValue;
    if (Value !== undefined) mapped.value = Value;
    if (DropDownStyle !== undefined) mapped.dropDownStyle = DropDownStyle;
    if (OnChange !== undefined) mapped.onChange = OnChange;
    return node(ControlKind.comboBox, mapped);
};

export const ListBox = (props?: WinFormsProps): FormNode => {
    const { Items, SelectedIndex, SelectedIndices, SelectionMode, Size, OnChange, ...rest } = props ?? {};
    const mapped = mapCommonProps(rest, { textProp: null });
    if (Items !== undefined) mapped.items = Items;
    if (SelectedIndex !== undefined) mapped.selectedIndex = SelectedIndex;
    if (SelectedIndices !== undefined) mapped.selectedIndices = SelectedIndices;
    if (SelectionMode !== undefined) mapped.selectionMode = SelectionMode;
    if (Size !== undefined) mapped.size = Size;
    if (OnChange !== undefined) mapped.onChange = OnChange;
    return node(ControlKind.listBox, mapped);
};

export const ProgressBar = (props?: WinFormsProps): FormNode => {
    const { Minimum, Maximum, Value, ProgressStyle, ...rest } = props ?? {};
    const mapped = mapCommonProps(rest, { textProp: null });
    if (Minimum !== undefined) mapped.minimum = Minimum;
    if (Maximum !== undefined) mapped.maximum = Maximum;
    if (Value !== undefined) mapped.value = Value;
    if (ProgressStyle !== undefined) mapped.progressStyle = ProgressStyle;
    return node(ControlKind.progressBar, mapped);
};

export const TrackBar = (props?: WinFormsProps): FormNode => {
    const { Minimum, Maximum, Value, TickFrequency, Orientation, OnChange, ...rest } = props ?? {};
    const mapped = mapCommonProps(rest, { textProp: null });
    if (Minimum !== undefined) mapped.minimum = Minimum;
    if (Maximum !== undefined) mapped.maximum = Maximum;
    if (Value !== undefined) mapped.value = Value;
    if (TickFrequency !== undefined) mapped.tickFrequency = TickFrequency;
    if (Orientation !== undefined) mapped.orientation = Orientation;
    if (OnChange !== undefined) mapped.onChange = OnChange;
    return node(ControlKind.trackBar, mapped);
};

export const DiagnosticsPanel = (props?: WinFormsProps): FormNode => {
    const { Text, Title, MaxItems, ShowClear, ...rest } = props ?? {};
    const mapped = mapCommonProps(rest, { textProp: null });
    const header = Title ?? Text;
    if (header !== undefined) mapped.title = header;
    if (MaxItems !== undefined) mapped.maxItems = MaxItems;
    if (ShowClear !== undefined) mapped.showClear = ShowClear;
    return node(ControlKind.diagnosticsPanel, mapped);
};

export const MessageBox = (props?: WinFormsProps): FormNode => {
    const {
        Title,
        Message,
        Mode,
        Buttons,
        DefaultButton,
        Icon,
        Draggable,
        OnResult,
        ...rest
    } = props ?? {};
    const mapped = mapCommonProps(rest, { textProp: null });
    if (Title !== undefined) mapped.title = Title;
    if (Message !== undefined) mapped.message = Message;
    if (Mode !== undefined) mapped.mode = Mode;
    if (Buttons !== undefined) mapped.buttons = Buttons;
    if (DefaultButton !== undefined) mapped.defaultButton = DefaultButton;
    if (Icon !== undefined) mapped.icon = Icon;
    if (Draggable !== undefined) mapped.draggable = Draggable;
    if (OnResult !== undefined) mapped.onResult = OnResult;
    return node(ControlKind.messageBox, mapped);
};

export const LayoutCanvas = (props?: WinFormsProps, ...children: FormChild[]): FormNode => {
    const {
        GridSize,
        GridColor,
        Background,
        ShowGrid,
        OnClick,
        OnMouseDown,
        OnMouseMove,
        OnMouseUp,
        OnWheel,
        ...rest
    } = props ?? {};
    const mapped = mapCommonProps(rest, { textProp: null });
    if (GridSize !== undefined) mapped.gridSize = GridSize;
    if (GridColor !== undefined) mapped.gridColor = GridColor;
    if (Background !== undefined) mapped.background = Background;
    if (ShowGrid !== undefined) mapped.showGrid = ShowGrid;
    if (OnClick !== undefined) mapped.onClick = OnClick;
    if (OnMouseDown !== undefined) mapped.onMouseDown = OnMouseDown;
    if (OnMouseMove !== undefined) mapped.onMouseMove = OnMouseMove;
    if (OnMouseUp !== undefined) mapped.onMouseUp = OnMouseUp;
    if (OnWheel !== undefined) mapped.onWheel = OnWheel;
    return node(ControlKind.layoutCanvas, mapped, ...children);
};

export const Toolbox = (props?: WinFormsProps): FormNode => {
    const { Title, ...rest } = props ?? {};
    const mapped = mapCommonProps(rest, { textProp: null });
    if (Title !== undefined) mapped.title = Title;
    return node(ControlKind.toolbox, mapped);
};

export const Element = (tag: keyof JSX.IntrinsicElements, props?: Record<string, unknown> | null, ...children: FormChild[]): FormNode =>
    element(tag, props ?? undefined, ...children);

export const Point = (x: number, y: number): Point => ({ X: x, Y: y });
export const Size = (width: number, height: number): Size => ({ Width: width, Height: height });

type RowProps = {
    ClassName?: string;
    Style?: React.CSSProperties | string;
    Children?: FormChild[] | FormChild;
};

export const Row = (props?: RowProps, ...children: FormChild[]): FormNode => {
    const className = ["canvas-properties-row", props?.ClassName].filter(Boolean).join(" ");
    const extraChildren = flattenChildren(props?.Children);
    return element("div", { className, style: props?.Style }, ...children, ...extraChildren);
};

type FieldOptions = {
    LabelClassName?: string;
    LabelStyle?: React.CSSProperties | string;
    RowClassName?: string;
    RowStyle?: React.CSSProperties | string;
};

export const Field = (
    label: FormChild,
    control: FormChild,
    options?: FieldOptions
): FormNode => {
    const labelNode = element("label", { className: options?.LabelClassName, style: options?.LabelStyle }, label);
    return Row({ ClassName: options?.RowClassName, Style: options?.RowStyle }, labelNode, control);
};

type TextInputProps = {
    Value?: string;
    PlaceholderText?: string;
    ReadOnly?: boolean;
    OnChange?: string;
    Style?: React.CSSProperties | string;
    ClassName?: string;
};

export const Text = (props?: TextInputProps): FormNode =>
    TextBox({
        Text: props?.Value,
        PlaceholderText: props?.PlaceholderText,
        ReadOnly: props?.ReadOnly,
        OnChange: props?.OnChange,
        Style: props?.Style,
        ClassName: props?.ClassName
    });

type NumberInputProps = {
    Value?: number | string;
    Min?: number;
    Max?: number;
    Step?: number;
    OnChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    Style?: React.CSSProperties | string;
    ClassName?: string;
};

export const Number = (props?: NumberInputProps): FormNode =>
    element("input", {
        type: "number",
        className: ["textbox", props?.ClassName].filter(Boolean).join(" "),
        value: props?.Value ?? "",
        min: props?.Min,
        max: props?.Max,
        step: props?.Step,
        onChange: props?.OnChange,
        style: props?.Style
    });

export const WF = {
    Form,
    Panel,
    PanelContainer,
    GroupBox,
    SplitContainer,
    FlowLayoutPanel,
    TableLayoutPanel,
    TabControl,
    TabPage,
    MenuStrip,
    DocBar,
    MenuItem,
    MenuItemEntry,
    ContextBar,
    ToolStrip,
    ToolStripButton,
    SwitchButton,
    StatusStrip,
    Window,
    Label,
    TextBox,
    Button,
    CheckBox,
    RadioButton,
    ComboBox,
    ListBox,
    ProgressBar,
    TrackBar,
    DiagnosticsPanel,
    MessageBox,
    LayoutCanvas,
    Toolbox,
    Element,
    Row,
    Field,
    Text,
    Number,
    Point,
    Size
};
