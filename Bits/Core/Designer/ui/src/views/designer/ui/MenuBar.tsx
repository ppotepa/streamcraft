import { WF } from "@streamcraft/forms";
import { UiText } from "../../uiText";

type MenuNodeProps = {
    showEffectsLive: boolean;
};

export const buildMenuNode = ({ showEffectsLive }: MenuNodeProps) =>
    WF.Element(
        "div",
        { style: "position: relative; z-index: 1000;" },
        WF.MenuStrip({
            Items: [
                WF.MenuItem(
                    { Text: UiText.playground2.menu.file },
                    WF.MenuItemEntry({ Text: "Projects", OnClick: "openProjectLauncher" }),
                    WF.MenuItemEntry({ Text: "Save...", OnClick: "saveOverlayAs" }),
                    WF.MenuItemEntry({ Text: "Save Current", OnClick: "saveOverlay" })
                ),
                WF.MenuItem(
                    { Text: UiText.playground2.menu.edit },
                    WF.MenuItemEntry({ Text: "Designer Settings", OnClick: "openDesignerSettings" })
                ),
                WF.MenuItem(
                    { Text: UiText.playground2.menu.view },
                    WF.MenuItemEntry({ Text: "Designer Settings", OnClick: "openDesignerSettings" }),
                    WF.MenuItemEntry({ Text: "Runtime Settings", OnClick: "openRuntimeSettings" }),
                    WF.MenuItemEntry({ Text: `${showEffectsLive ? "✓ " : ""}Show Effects Live`, OnClick: "toggleEffectsLive" }),
                    WF.MenuItem(
                        { Text: UiText.playground2.menu.windows },
                        WF.MenuItemEntry({ Text: UiText.playground2.menu.layers, OnClick: "openLayersToolbox" }),
                        WF.MenuItemEntry({ Text: UiText.playground2.menu.livePreview, OnClick: "openLivePreview" }),
                        WF.MenuItemEntry({ Text: UiText.playground2.menu.overlayVideoPreview, OnClick: "openOverlayVideoPreview" }),
                        WF.MenuItemEntry({ Text: UiText.playground2.menu.workers, OnClick: "openSchedulerOverview" })
                    )
                ),
                WF.MenuItem({ Text: UiText.playground2.menu.help })
            ]
        })
    );

