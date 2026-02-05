import React from "react";
import { type FormChild } from "../../../forms/core";
import { WF } from "../../../forms/winforms";

export type OverlayVideoItem = {
    id: string;
    description?: string;
    duration?: number;
    localUrl?: string;
    downloadUrl?: string;
    previewImage?: string;
    width?: number;
    height?: number;
    sourceUrl?: string;
    isCached?: boolean;
};

export interface OverlayVideoPreviewDialogProps {
    videos: OverlayVideoItem[];
    selectedId: string | null;
    currentVideoUrl: string;
    isLoading: boolean;
    statusMessage?: string | null;
    searchQuery: string;
    filteredCount: number;
    totalCount: number;
    showOverlay: boolean;
    showGrid: boolean;
    overlayNodes: FormChild[];
    playlistCollapsed: boolean;
    onTogglePlaylist: () => void;
    onSelectVideo: (videoId: string) => void;
    onRandom: () => void;
    onSearchChange: (value: string) => void;
    onToggleOverlay: (value: boolean) => void;
    onToggleGrid: (value: boolean) => void;
    onClose: () => void;
}

const formatDuration = (value?: number) => {
    if (!value || Number.isNaN(value)) return "--:--";
    const minutes = Math.floor(value / 60);
    const seconds = Math.floor(value % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

export const buildOverlayVideoPreviewDialog = (props: OverlayVideoPreviewDialogProps) => {
    const selected = props.selectedId
        ? props.videos.find((video) => video.id === props.selectedId)
        : null;
    const isSearchMode = props.searchQuery.trim().length > 0;

    const overlayLayer = WF.Element(
        "div",
        { className: "overlay-preview-layer" },
        props.showGrid ? WF.Element("div", { className: "overlay-preview-grid" }) : null,
        props.showOverlay
            ? WF.Element("div", { className: "overlay-preview-items" }, ...props.overlayNodes)
            : null
    );

    const videoArea = WF.Element(
        "div",
        {
            style:
                "flex: 1; min-width: 0; min-height: 0; border: 1px solid #9a9a9a; background: #111; display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden;"
        },
        WF.Element(
            "div",
            {
                style:
                    "width: 100%; max-width: 100%; max-height: 100%; aspect-ratio: 16 / 9; background: #000; display: flex; align-items: center; justify-content: center; box-shadow: inset 0 0 0 1px #000; position: relative;"
            },
            props.currentVideoUrl
                ? WF.Element("video", {
                    src: props.currentVideoUrl,
                    autoPlay: true,
                    muted: true,
                    loop: true,
                    playsInline: true,
                    style: "position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; background: #000;",
                    poster: selected?.previewImage
                })
                : WF.Element("div", { style: "color: #e0e0e0; font-size: 12px;" }, props.isLoading ? "Loading video..." : "No video selected.")
            ,
            overlayLayer
        )
    );

    const playlistContent = props.playlistCollapsed
        ? WF.Element(
            "div",
            {
                style:
                    "width: 32px; border: 1px solid #9a9a9a; background: #d6d6d6; display: flex; align-items: center; justify-content: center;"
            },
            WF.Element(
                "button",
                {
                    className: "canvas-properties-button",
                    style: "width: 24px; height: 24px; padding: 0;",
                    onClick: props.onTogglePlaylist
                },
                "▶"
            )
        )
        : WF.Element(
            "div",
            {
                style:
                    "width: 260px; border: 1px solid #9a9a9a; background: #f5f5f5; display: flex; flex-direction: column;"
            },
            WF.Element(
                "div",
                {
                    style:
                        "display: flex; align-items: center; justify-content: space-between; padding: 6px 8px; background: #d6d6d6; border-bottom: 1px solid #9a9a9a; font-size: 12px; font-weight: 600;"
                },
                WF.Element("span", null, isSearchMode ? "Search Results (Pexels)" : "Playlist (Cached Videos)"),
                WF.Element(
                    "button",
                    {
                        className: "canvas-properties-button",
                        style: "width: 24px; height: 20px; padding: 0;",
                        onClick: props.onTogglePlaylist
                    },
                    "◀"
                )
            ),
            WF.Element(
                "div",
                { style: "flex: 1; min-height: 0; overflow-y: auto; background: #ffffff;" },
                ...(props.videos.length > 0
                    ? props.videos.map((video) => {
                        const isSelected = video.id === props.selectedId;
                        const label = video.description && video.description.trim().length > 0
                            ? video.description
                            : `Video ${video.id}`;
                        const isCached = video.isCached ?? Boolean(video.localUrl);
                        const cachedSuffix = isCached ? " (cached)" : "";
                        const line = `${label} — ${formatDuration(video.duration)}${cachedSuffix}`;
                        const badgeLabel = isCached ? "cached" : "api";
                        const badgeStyle = isCached
                            ? "background: #000080; color: #ffffff;"
                            : "background: #d6d6d6; color: #1b1b1b; border: 1px solid #9a9a9a;";
                        const thumbStyle = video.previewImage
                            ? `background-image: url('${video.previewImage}'); background-size: cover; background-position: center;`
                            : "background: #c9c9c9;";
                        return WF.Element(
                            "div",
                            {
                                style:
                                    `padding: 6px 8px; border-bottom: 1px solid #e0e0e0; cursor: pointer; background: ${isSelected ? "#000080" : "#f8f8f8"}; color: ${isSelected ? "#ffffff" : "#1b1b1b"}; display: flex; align-items: center; gap: 6px;`,
                                onClick: () => props.onSelectVideo(video.id)
                            },
                            WF.Element("div", { style: `width: 42px; height: 24px; border: 1px solid #9a9a9a; ${thumbStyle}` }),
                            WF.Element(
                                "div",
                                { style: "flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" },
                                line
                            ),
                            WF.Element(
                                "span",
                                {
                                    style: `padding: 1px 4px; font-size: 10px; text-transform: uppercase; ${badgeStyle}`
                                },
                                badgeLabel
                            )
                        );
                    })
                    : [WF.Element(
                        "div",
                        { style: "padding: 12px; color: #5a5a5a; font-size: 12px;" },
                        isSearchMode ? "No matching videos." : "No cached videos yet."
                    )])
            ),
            WF.Element(
                "div",
                { style: "padding: 8px; display: flex; gap: 8px; border-top: 1px solid #e0e0e0; background: #ededed; justify-content: flex-end;" },
                WF.Element(
                    "button",
                    {
                        className: "canvas-properties-button",
                        onClick: props.onRandom
                    },
                    "Random"
                )
            )
        );

    const menuBar = WF.MenuStrip({
        Items: [
            WF.MenuItem(
                { Text: "Options" },
                WF.MenuItemEntry({ Text: "Clear Cache", OnClick: "clearOverlayVideoCache" })
            )
        ]
    });

    const busyOverlay = props.isLoading && isSearchMode
        ? WF.Element(
            "div",
            {
                style:
                    "position: absolute; inset: 0; background: rgba(160, 160, 160, 0.5); display: flex; align-items: center; justify-content: center; z-index: 5; cursor: wait;"
            },
            WF.Element(
                "div",
                {
                    style:
                        "min-width: 260px; padding: 12px 16px; background: #c0c0c0; border: 2px groove #808080; box-shadow: inset 1px 1px 0 #ffffff;"
                },
                WF.Element("div", { style: "font-weight: 600; margin-bottom: 6px;" }, "Searching Pexels"),
                WF.Element(
                    "div",
                    { style: "display: flex; align-items: center; gap: 8px; font-size: 12px;" },
                    WF.Element("span", { className: "designer-status-spinner" }, "●"),
                    WF.Element("span", null, "Loading results...")
                )
            )
        )
        : null;

    return WF.Window(
        {
            Text: "Overlay Video Preview",
            Dialog: true,
            Draggable: true,
            OnClose: "closeOverlayVideoPreview",
            ClassName: "window-resizable overlay-video-preview-window",
            Style: "position: absolute; left: 120px; top: 80px; width: 1040px; height: 620px;"
        },
        WF.Element(
            "div",
            { className: "canvas-properties", style: "height: 100%; display: flex; flex-direction: column; gap: 8px; position: relative;" },
            menuBar,
            WF.Element(
                "div",
                {
                    className: "overlay-video-search"
                },
                WF.Element("span", { className: "overlay-video-search-icon", "aria-hidden": "true" }),
                WF.Element("input", {
                    className: "textbox overlay-video-search-input",
                    type: "text",
                    placeholder: "Search cached videos...",
                    value: props.searchQuery,
                    onChange: (event: React.ChangeEvent<HTMLInputElement>) => props.onSearchChange(event.target.value)
                }),
                WF.Element(
                    "span",
                    { className: "overlay-video-search-meta" },
                    `Showing ${props.filteredCount} of ${props.totalCount}`
                ),
                props.statusMessage
                    ? WF.Element("span", { className: "overlay-video-search-status" }, props.statusMessage)
                    : null
                ,
                WF.Element(
                    "label",
                    { className: "checkbox-label overlay-video-toggle" },
                    WF.Element("input", {
                        className: "checkbox",
                        type: "checkbox",
                        checked: props.showOverlay,
                        onChange: (event: React.ChangeEvent<HTMLInputElement>) => props.onToggleOverlay(event.target.checked)
                    }),
                    WF.Element("span", { className: "checkbox-text" }, "Show overlay")
                ),
                WF.Element(
                    "label",
                    { className: "checkbox-label overlay-video-toggle" },
                    WF.Element("input", {
                        className: "checkbox",
                        type: "checkbox",
                        checked: props.showGrid,
                        onChange: (event: React.ChangeEvent<HTMLInputElement>) => props.onToggleGrid(event.target.checked)
                    }),
                    WF.Element("span", { className: "checkbox-text" }, "Grid")
                )
            ),
            WF.Element(
                "div",
                { style: "flex: 1; min-height: 0; display: flex; gap: 10px;" },
                videoArea,
                playlistContent
            ),
            busyOverlay
        )
    );
};

