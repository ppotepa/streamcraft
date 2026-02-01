import React from "react";
import { createRoot } from "react-dom/client";
import AppLayout from "./AppLayout";
import { FormRenderer } from "./forms/core";
import { xmlToFormNode } from "./forms/xmlView";
import "./theme.css";
import "./win98.css";

type ThemeKey =
  | "95"
  | "98"
  | "xp"
  | "win7"
  | "system"
  | "newdawn";

const themeOrder: ThemeKey[] = [
  "95",
  "98",
  "xp",
  "win7",
  "system",
  "newdawn"
];

const themeLabels: Record<ThemeKey, string> = {
  "95": "Windows 95 (95CSS)",
  "98": "Windows 98",
  "xp": "Windows XP",
  "win7": "Windows 7",
  "system": "Classic Mac (System 6)",
  "newdawn": "Mac OS 8 (New Dawn)"
};

const themeMap: Record<number, ThemeKey> = themeOrder.reduce((acc, theme, index) => {
  acc[index] = theme;
  return acc;
}, {} as Record<number, ThemeKey>);

const resolveTheme = (value: number | string): ThemeKey | null => {
  if (typeof value === "number") {
    return themeMap[value] ?? null;
  }
  const normalized = value.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (normalized === "95" || normalized === "win95" || normalized === "windows95" || normalized === "95css") return "95";
  if (normalized === "98") return "98";
  if (normalized === "xp") return "xp";
  if (normalized === "7" || normalized === "win7" || normalized === "windows7") return "win7";
  if (normalized === "system" || normalized === "systemcss" || normalized === "mac" || normalized === "classicmac") return "system";
  if (normalized === "newdawn" || normalized === "newdawncss" || normalized === "mac8" || normalized === "macos8") return "newdawn";
  if (themeOrder.includes(normalized as ThemeKey)) return normalized as ThemeKey;
  const asNumber = Number.parseInt(normalized, 10);
  if (Number.isFinite(asNumber)) return themeMap[asNumber] ?? null;
  return null;
};

const applyTheme = (theme: ThemeKey) => {
  const links = document.querySelectorAll<HTMLLinkElement>("link[id^='theme-']");
  links.forEach((link) => {
    const id = link.id.replace("theme-", "");
    link.disabled = id !== theme;
  });
};

declare global {
  interface Window {
    debug?: DeveloperToolkit;
  }
}

type DeveloperToolkit = {
  sc: {
    changeTheme: (theme?: number | string) => ThemeKey[] | void;
    themes: () => ThemeKey[];
    changeIcons: (iconSet?: string | number) => string[] | void;
    icons: () => string[];
  };
};

let themePopupRoot: ReturnType<typeof createRoot> | null = null;
let themePopupContainer: HTMLDivElement | null = null;
let iconPopupRoot: ReturnType<typeof createRoot> | null = null;
let iconPopupContainer: HTMLDivElement | null = null;

const closeThemesPopup = () => {
  if (themePopupRoot && themePopupContainer) {
    themePopupRoot.unmount();
    themePopupContainer.remove();
  }
  themePopupRoot = null;
  themePopupContainer = null;
};

const buildThemePopupXml = () => {
  const buttons = themeOrder
    .map(
      (theme) =>
        `<Element tag="button" class="button" data-theme="${theme}"><Text>${themeLabels[theme]}</Text></Element>`
    )
    .join("");

  return `<?xml version="1.0" encoding="utf-8"?>
<Form>
  <Window title="Themes">
    <View class="theme-popup">
      <Element tag="p"><Text>Select a theme:</Text></Element>
      <Element tag="div" class="theme-popup-grid">${buttons}</Element>
      <Element tag="div" class="theme-popup-actions">
        <Element tag="button" class="button" data-action="close"><Text>Close</Text></Element>
      </Element>
    </View>
  </Window>
</Form>`;
};

type IconKey = "select" | "rect" | "line" | "text" | "image" | "bind";

type IconSet = {
  label: string;
  type: "image" | "material" | "bootstrap";
  baseUrl?: string;
  icons: Record<IconKey, string>;
};

const iconSets: Record<string, IconSet> = {
  chicago95: {
    label: "Chicago95 (Win95)",
    type: "image",
    icons: {
      select: "https://cdn.jsdelivr.net/gh/grassmunk/Chicago95@master/Icons/Chicago95/actions/22/edit-select.png",
      rect: "https://cdn.jsdelivr.net/gh/grassmunk/Chicago95@master/Icons/Chicago95/tools/22/draw-rectangle.png",
      line: "https://cdn.jsdelivr.net/gh/grassmunk/Chicago95@master/Icons/Chicago95/tools/22/draw-polyline.png",
      text: "https://cdn.jsdelivr.net/gh/grassmunk/Chicago95@master/Icons/Chicago95/tools/22/draw-text.png",
      image: "https://cdn.jsdelivr.net/gh/grassmunk/Chicago95@master/Icons/Chicago95/actions/22/insert-image.png",
      bind: "https://cdn.jsdelivr.net/gh/grassmunk/Chicago95@master/Icons/Chicago95/actions/22/insert-link.png"
    }
  },
  famfamfam: {
    label: "FamFamFam Silk",
    type: "image",
    baseUrl: "https://cdn.jsdelivr.net/gh/markjames/famfamfam-silk-icons@master/icons/",
    icons: {
      select: "cursor.png",
      rect: "shape_square.png",
      line: "vector.png",
      text: "text_align_left.png",
      image: "image.png",
      bind: "link.png"
    }
  },
  tango: {
    label: "Tango (PNG 64)",
    type: "image",
    baseUrl: "https://cdn.jsdelivr.net/gh/nigeltao/tango-icon-library-pngs@main/png-64/",
    icons: {
      select: "actions/edit-select.png",
      rect: "actions/selection-rectangular.png",
      line: "actions/draw-line.png",
      text: "actions/insert-text.png",
      image: "actions/insert-image.png",
      bind: "actions/insert-link.png"
    }
  },
  crystal: {
    label: "Crystal Clear",
    type: "image",
    baseUrl: "https://cdn.jsdelivr.net/gh/niko-yanev/crystal-clear@master/",
    icons: {
      select: "actions/mouse_pointer.png",
      rect: "actions/draw-rectangle.png",
      line: "actions/draw-line.png",
      text: "actions/draw-text.png",
      image: "actions/insert-image.png",
      bind: "actions/insert-link.png"
    }
  },
  oxygen: {
    label: "Oxygen",
    type: "image",
    baseUrl: "https://cdn.jsdelivr.net/gh/KDE/oxygen-icons@master/",
    icons: {
      select: "32x32/actions/tool-select.png",
      rect: "32x32/actions/draw-rectangle.png",
      line: "32x32/actions/draw-line.png",
      text: "32x32/actions/draw-text.png",
      image: "32x32/actions/insert-image.png",
      bind: "32x32/actions/insert-link.png"
    }
  },
  fugue: {
    label: "Fugue",
    type: "image",
    baseUrl: "https://cdn.jsdelivr.net/gh/unikent/fugue-icons@master/icons/",
    icons: {
      select: "cursor.png",
      rect: "shape-square.png",
      line: "slash.png",
      text: "document-text.png",
      image: "image.png",
      bind: "chain.png"
    }
  },
  material: {
    label: "Material Symbols",
    type: "material",
    icons: {
      select: "mouse",
      rect: "crop_square",
      line: "show_chart",
      text: "text_fields",
      image: "image",
      bind: "link"
    }
  },
  bootstrap: {
    label: "Bootstrap Icons",
    type: "bootstrap",
    icons: {
      select: "cursor",
      rect: "square",
      line: "slash-lg",
      text: "type",
      image: "image",
      bind: "link-45deg"
    }
  }
};

const iconSetOrder = Object.keys(iconSets);
let activeIconSetKey = "material";

const resolveIconUrl = (iconSet: IconSet, iconValue: string) => {
  if (/^https?:\/\//i.test(iconValue)) return iconValue;
  return `${iconSet.baseUrl ?? ""}${iconValue}`;
};

const clearIconClasses = (element: HTMLElement) => {
  element.classList.remove("material-symbols-outlined", "bi", "tool-icon-font");
  Array.from(element.classList)
    .filter((name) => name.startsWith("bi-"))
    .forEach((name) => element.classList.remove(name));
};

const applyIconSet = (iconSetKey: string, root: ParentNode = document) => {
  const iconSet = iconSets[iconSetKey];
  if (!iconSet) return;
  const nodes = root.querySelectorAll<HTMLElement>("[data-icon]");
  nodes.forEach((node) => {
    const key = node.getAttribute("data-icon") as IconKey | null;
    if (!key) return;
    const iconValue = iconSet.icons[key];
    clearIconClasses(node);
    node.style.removeProperty("background-image");
    node.textContent = "";
    node.classList.add("tool-icon");

    if (iconSet.type === "image") {
      node.style.backgroundImage = `url(${resolveIconUrl(iconSet, iconValue)})`;
      node.setAttribute("aria-label", key);
    } else if (iconSet.type === "material") {
      node.classList.add("material-symbols-outlined", "tool-icon-font");
      node.textContent = iconValue;
    } else if (iconSet.type === "bootstrap") {
      node.classList.add("bi", `bi-${iconValue}`, "tool-icon-font");
    }
  });
};

const applyIconPreviewSet = (iconSetKey: string, root: ParentNode) => {
  const iconSet = iconSets[iconSetKey];
  if (!iconSet) return;
  const nodes = root.querySelectorAll<HTMLElement>("[data-icon-preview]");
  nodes.forEach((node) => {
    const key = node.getAttribute("data-icon-preview") as IconKey | null;
    if (!key) return;
    const iconValue = iconSet.icons[key];
    clearIconClasses(node);
    node.style.removeProperty("background-image");
    node.textContent = "";
    node.classList.add("tool-icon", "tool-icon-preview");

    if (iconSet.type === "image") {
      node.style.backgroundImage = `url(${resolveIconUrl(iconSet, iconValue)})`;
      node.setAttribute("aria-label", key);
    } else if (iconSet.type === "material") {
      node.classList.add("material-symbols-outlined", "tool-icon-font");
      node.textContent = iconValue;
    } else if (iconSet.type === "bootstrap") {
      node.classList.add("bi", `bi-${iconValue}`, "tool-icon-font");
    }
  });
};

const closeIconsPopup = () => {
  if (iconPopupRoot && iconPopupContainer) {
    iconPopupRoot.unmount();
    iconPopupContainer.remove();
  }
  iconPopupRoot = null;
  iconPopupContainer = null;
};

const buildIconsPopupXml = () => {
  const items = iconSetOrder
    .map((key) => {
      const label = iconSets[key].label;
      return `
      <Element tag="div" class="icon-set-item" data-iconset="${key}">
        <Element tag="div" class="icon-set-label"><Text>${label}</Text></Element>
        <Element tag="div" class="icon-set-preview" data-preview-set="${key}">
          <Element tag="span" class="tool-icon tool-icon-preview" data-icon-preview="select" />
          <Element tag="span" class="tool-icon tool-icon-preview" data-icon-preview="rect" />
          <Element tag="span" class="tool-icon tool-icon-preview" data-icon-preview="line" />
          <Element tag="span" class="tool-icon tool-icon-preview" data-icon-preview="text" />
          <Element tag="span" class="tool-icon tool-icon-preview" data-icon-preview="image" />
          <Element tag="span" class="tool-icon tool-icon-preview" data-icon-preview="bind" />
        </Element>
      </Element>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="utf-8"?>
<Form>
  <Window title="Icons" draggable="true" dragBounds=".icon-popup-overlay" dragHandle=".title-bar">
    <View class="icon-popup">
      <Element tag="p"><Text>Select an icon set:</Text></Element>
      <Element tag="div" class="icon-popup-grid">${items}</Element>
      <Element tag="div" class="icon-popup-actions">
        <Element tag="button" class="button" data-action="close"><Text>Close</Text></Element>
      </Element>
    </View>
  </Window>
</Form>`;
};

const showIconsPopup = () => {
  if (iconPopupContainer) {
    closeIconsPopup();
  }
  const container = document.createElement("div");
  container.id = "sc-icon-popup";
  container.className = "icon-popup-overlay";
  document.body.appendChild(container);
  iconPopupContainer = container;
  iconPopupRoot = createRoot(container);
  const popupNode = xmlToFormNode(buildIconsPopupXml());
  iconPopupRoot.render(<FormRenderer node={popupNode} />);

  const renderPreviews = () => {
    const previewRoots = container.querySelectorAll<HTMLElement>("[data-preview-set]");
    previewRoots.forEach((previewRoot) => {
      const key = previewRoot.getAttribute("data-preview-set");
      if (key) {
        applyIconPreviewSet(key, previewRoot);
      }
    });
  };

  requestAnimationFrame(renderPreviews);
  setTimeout(renderPreviews, 0);

  const onClick = (event: MouseEvent) => {
    const target = event.target as HTMLElement | null;
    if (!target) return;
    if (target === container) {
      closeIconsPopup();
      return;
    }
    const item = target.closest<HTMLElement>("[data-iconset]");
    if (item) {
      const key = item.getAttribute("data-iconset");
      if (key) {
        activeIconSetKey = key;
        applyIconSet(key);
        console.info(`Icon set switched to: ${key}`);
      }
      return;
    }
    const closeButton = target.closest<HTMLElement>("[data-action='close']");
    if (closeButton) {
      closeIconsPopup();
    }
  };

  container.addEventListener("click", onClick);
  return iconSetOrder;
};

const buildThemeOptionsMessage = () => {
  const options = themeOrder
    .map((name, index) => `${index}: ${name} — ${themeLabels[name]}`)
    .join("\n");
  return (
    "StreamCraft UI Themes\n\n" +
    "Use: window.debug.sc.changeTheme('98' | 'xp' | name) or window.debug.sc.changeTheme(index)\n\n" +
    options
  );
};

const showThemesPopup = () => {
  if (themePopupContainer) {
    closeThemesPopup();
  }
  const container = document.createElement("div");
  container.id = "sc-theme-popup";
  container.className = "theme-popup-overlay";
  document.body.appendChild(container);
  themePopupContainer = container;
  themePopupRoot = createRoot(container);
  const popupNode = xmlToFormNode(buildThemePopupXml());
  themePopupRoot.render(<FormRenderer node={popupNode} />);

  const onClick = (event: MouseEvent) => {
    const target = event.target as HTMLElement | null;
    if (!target) return;
    if (target === container) {
      closeThemesPopup();
      return;
    }
    const themeButton = target.closest<HTMLElement>("[data-theme]");
    if (themeButton) {
      const themeValue = themeButton.getAttribute("data-theme");
      if (themeValue) {
        const resolved = resolveTheme(themeValue);
        if (resolved) {
          applyTheme(resolved);
          console.info(`Theme switched to: ${resolved}`);
        }
      }
      return;
    }
    const closeButton = target.closest<HTMLElement>("[data-action='close']");
    if (closeButton) {
      closeThemesPopup();
    }
  };

  container.addEventListener("click", onClick);
  return themeOrder;
};

const container = document.getElementById("root");
if (container) {
  applyTheme("98");
  const toolkit: DeveloperToolkit = {
    sc: {
      changeTheme: (theme?: number | string) => {
        if (theme === undefined || theme === null || theme === "") {
          return showThemesPopup();
        }
        const resolved = resolveTheme(theme);
        if (!resolved) {
          const message = buildThemeOptionsMessage();
          alert(message);
          throw new Error(`Unknown theme.\n\n${message}`);
        }
        applyTheme(resolved);
        console.info(`Theme switched to: ${resolved}`);
      },
      themes: () => showThemesPopup(),
      changeIcons: (iconSet?: string | number) => {
        if (iconSet === undefined || iconSet === null || iconSet === "") {
          return showIconsPopup();
        }
        const key = typeof iconSet === "number" ? iconSetOrder[iconSet] : iconSet.toString().toLowerCase();
        if (!key || !iconSets[key]) {
          const options = iconSetOrder.map((name, index) => `${index}: ${name} — ${iconSets[name].label}`).join("\n");
          const message =
            "StreamCraft UI Icons\n\n" +
            "Use: window.debug.sc.changeIcons('material' | name) or window.debug.sc.changeIcons(index)\n\n" +
            options;
          alert(message);
          throw new Error(`Unknown icon set.\n\n${message}`);
        }
        activeIconSetKey = key;
        applyIconSet(key);
        console.info(`Icon set switched to: ${key}`);
      },
      icons: () => showIconsPopup()
    }
  };

  window.debug = toolkit;
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <AppLayout />
    </React.StrictMode>
  );
  applyIconSet(activeIconSetKey);
}
