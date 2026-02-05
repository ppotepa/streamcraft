import { WF } from "../../../forms/winforms";
import { UiText } from "../../uiText";

export const buildMenuNode = () =>
    WF.Element(
        "div",
        { style: "position: relative; z-index: 1000;" },
        WF.MenuStrip({
            Items: [
                WF.MenuItem({ Text: UiText.playground2.menu.file }),
                WF.MenuItem({ Text: UiText.playground2.menu.edit }),
                WF.MenuItem(
                    { Text: UiText.playground2.menu.view },
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
