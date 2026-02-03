import { element, node } from "../../../forms/core";
import { ControlKind } from "../../../forms/controlKinds";
import { UiText } from "../../uiText";

export const buildMenuNode = () =>
    element(
        "div",
        { style: "position: relative; z-index: 1000;" },
        node(
            ControlKind.menuBar,
            {},
            node(ControlKind.menuItem, { label: UiText.playground2.menu.file }),
            node(ControlKind.menuItem, { label: UiText.playground2.menu.edit }),
            node(
                ControlKind.menuItem,
                { label: UiText.playground2.menu.view },
                node(
                    ControlKind.menuItem,
                    { label: UiText.playground2.menu.windows },
                    node(
                        ControlKind.menuItemEntry,
                        { onClick: "openLayersToolbox" },
                        element("span", {}, UiText.playground2.menu.layers)
                    )
                )
            ),
            node(
                ControlKind.menuItem,
                { label: UiText.playground2.menu.tools },
                node(
                    ControlKind.menuItemEntry,
                    { onClick: "openWorkersView" },
                    element("span", {}, UiText.playground2.menu.workers)
                )
            ),
            node(ControlKind.menuItem, { label: UiText.playground2.menu.help })
        )
    );
