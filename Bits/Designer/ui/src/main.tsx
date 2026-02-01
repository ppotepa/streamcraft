import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import AppLayout from "./AppLayout";
import { FormRenderer } from "./forms/core";
import { xmlToFormNode } from "./forms/xmlView";
import iconStyles from "./icons/iconSets.module.css";
import "./forms/controls/controls.css";

declare global {
  interface Window {
    debug?: DeveloperToolkit;
  }
}

type DeveloperToolkit = {
  sc: {
    changeIcons: (iconSet?: string | number) => string[] | void;
    icons: () => string[];
    enrichLogging: boolean;
    setEnrichLogging: (enabled?: boolean) => boolean;
    getLogs: () => string[];
    clearLogs: () => void;
  };
};

type CoreLogPayload = {
  __scCore: true;
  message: string;
  data?: unknown;
};

const isCoreLogPayload = (value: unknown): value is CoreLogPayload =>
  typeof value === "object" && value !== null && (value as { __scCore?: boolean }).__scCore === true;

const coreLogs: string[] = [];
const CORE_LOG_LIMIT = 200;
let consoleWrapped = false;

const installConsoleOverride = () => {
  if (consoleWrapped) return;
  const originalLog = console.log.bind(console);
  console.log = (...args: unknown[]) => {
    const first = args[0];
    const toolkit = window.debug?.sc;
    if (isCoreLogPayload(first)) {
      if (!toolkit?.enrichLogging) return;
      const timestamp = new Date().toLocaleTimeString();
      const line = `[SC Core ${timestamp}] ${first.message}`;
      coreLogs.push(line);
      if (coreLogs.length > CORE_LOG_LIMIT) coreLogs.shift();
      if (first.data !== undefined) {
        originalLog(line, first.data);
      } else {
        originalLog(line);
      }
      return;
    }
    originalLog(...args);
  };
  consoleWrapped = true;
};

let iconPopupRoot: ReturnType<typeof createRoot> | null = null;
let iconPopupContainer: HTMLDivElement | null = null;

type IconSet = {
  label: string;
  type: "image";
};

const iconSets: Record<string, IconSet> = {
  chicago95: {
    label: "Chicago95 (Win95)",
    type: "image"
  },
  famfamfam: {
    label: "FamFamFam Silk",
    type: "image"
  },
  tango: {
    label: "Tango (PNG 64)",
    type: "image"
  },
  crystal: {
    label: "Crystal Clear",
    type: "image"
  },
  oxygen: {
    label: "Oxygen",
    type: "image"
  },
  fugue: {
    label: "Fugue",
    type: "image"
  },
  material: {
    label: "Material Symbols",
    type: "image"
  },
  bootstrap: {
    label: "Bootstrap Icons",
    type: "image"
  }
};

const iconSetOrder = Object.keys(iconSets);
let activeIconSetKey = "material";

const iconSetClassMap: Record<string, string> = {
  chicago95: iconStyles.iconSetChicago95,
  famfamfam: iconStyles.iconSetFamfamfam,
  tango: iconStyles.iconSetTango,
  crystal: iconStyles.iconSetCrystal,
  oxygen: iconStyles.iconSetOxygen,
  fugue: iconStyles.iconSetFugue,
  material: iconStyles.iconSetMaterial,
  bootstrap: iconStyles.iconSetBootstrap
};

const addClassTokens = (element: HTMLElement, classValue?: string) => {
  if (!classValue) return;
  classValue
    .split(/\s+/)
    .filter(Boolean)
    .forEach((token) => element.classList.add(token));
};

const applyIconSetClass = (iconSetKey: string, target: HTMLElement) => {
  addClassTokens(target, iconStyles.iconHost);
  Object.values(iconSetClassMap).forEach((className) => {
    className
      .split(/\s+/)
      .filter(Boolean)
      .forEach((token) => target.classList.remove(token));
  });
  const className = iconSetClassMap[iconSetKey];
  if (className) {
    addClassTokens(target, className);
  }
};

const applyIconPreviewClass = (iconSetKey: string, target: HTMLElement) => {
  addClassTokens(target, iconStyles.iconPreviewHost);
  Object.values(iconSetClassMap).forEach((className) => {
    className
      .split(/\s+/)
      .filter(Boolean)
      .forEach((token) => target.classList.remove(token));
  });
  const className = iconSetClassMap[iconSetKey];
  if (className) {
    addClassTokens(target, className);
  }
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
        applyIconPreviewClass(key, previewRoot);
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
        applyIconSetClass(key, document.body);
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


const container = document.getElementById("root");
if (container) {
  const toolkit: DeveloperToolkit = {
    sc: {
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
        applyIconSetClass(key, document.body);
        console.info(`Icon set switched to: ${key}`);
      },
      icons: () => showIconsPopup(),
      enrichLogging: false,
      setEnrichLogging: (enabled?: boolean) => {
        if (enabled === undefined) {
          toolkit.sc.enrichLogging = !toolkit.sc.enrichLogging;
        } else {
          toolkit.sc.enrichLogging = Boolean(enabled);
        }
        return toolkit.sc.enrichLogging;
      },
      getLogs: () => [...coreLogs],
      clearLogs: () => {
        coreLogs.length = 0;
      },
      testForm: () => {
        if ((window as any).__showTestForm) {
          (window as any).__showTestForm();
          console.info("Test form opened. Showcasing new WinForms-like controls: Label, TextBox, Button, CheckBox, RadioButton");
        }
      },
      playground: () => {
        if ((window as any).__showPlayground) {
          (window as any).__showPlayground();
          console.info("Control Playground opened. Explore all 5 controls with 40+ variants and combinations!");
        }
      },
      phase2: () => {
        if ((window as any).__showPlaygroundPhase2) {
          (window as any).__showPlaygroundPhase2();
          console.info("Phase 2 Playground opened. Layout containers: FlowLayoutPanel, TableLayoutPanel, GroupBox, SplitContainer!");
        }
      },
      phase3: () => {
        if ((window as any).__showPlaygroundPhase3) {
          (window as any).__showPlaygroundPhase3();
          console.info("Phase 3 Playground opened. Advanced controls: ComboBox, ListBox, ProgressBar, TrackBar, TabControl!");
        }
      }
    }
  };

  window.debug = toolkit;
  installConsoleOverride();
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <BrowserRouter basename="/designer/ui">
        <AppLayout />
      </BrowserRouter>
    </React.StrictMode>
  );
  applyIconSetClass(activeIconSetKey, document.body);
}
