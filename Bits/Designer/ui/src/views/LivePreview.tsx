import React, { useEffect, useMemo, useRef, useState } from "react";
import { FormRenderer, xmlToFormNode } from "../forms";
import { buildDataKey, type CanvasItem, type DataSource, type TestResponse } from "./playground2/domain/types";
import { parsePathTokens } from "./playground2/services/dataSourceService";

// Free stock video URLs from various sources
const STOCK_VIDEOS = [
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/VolkswagenGTIReview.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WhatCarCanYouGetForAGrand.mp4"
];

const livePreviewFormXml = `<?xml version="1.0" encoding="utf-8"?>
<Form>
  <Window title="Live Preview — Stream Overlay" width="1280" height="720">
    <MenuBar>
      <MenuItem label="Preview">
        <Text>Close Preview</Text>
        <Text>Change Video</Text>
        <Text>Toggle Overlay</Text>
      </MenuItem>
      <MenuItem label="Options">
        <Text>Video Quality</Text>
        <Text>Playback Speed</Text>
        <Text>Loop</Text>
      </MenuItem>
    </MenuBar>
    
    <View class="preview-container">
      <Element tag="div" id="preview-video-container" class="video-container">
        <!-- Video and overlay will be inserted here -->
      </Element>
      
      <Element tag="div" class="preview-controls">
        <Element tag="button" id="preview-play-pause" class="button">Play/Pause</Element>
        <Element tag="button" id="preview-change-video" class="button">Change Video</Element>
        <Element tag="button" id="preview-toggle-overlay" class="button">Toggle Overlay</Element>
        <Element tag="div" class="preview-info">
          <Text>Stream Preview with Overlay</Text>
        </Element>
      </Element>
    </View>
  </Window>
</Form>`;

export const LivePreview: React.FC = () => {
    const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
    const [showOverlay, setShowOverlay] = useState(true);
    const [overlayItems, setOverlayItems] = useState<CanvasItem[]>([]);
    const [overlayName, setOverlayName] = useState<string>("");
    const [sources, setSources] = useState<DataSource[]>([]);
    const [virtualState, setVirtualState] = useState<Record<string, unknown>>({});
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const overlayContainerRef = useRef<HTMLDivElement | null>(null);
    const overlayCanvasRef = useRef<HTMLDivElement | null>(null);
    const lastExecutionRef = useRef<Map<string, number>>(new Map());
    const tree = xmlToFormNode(livePreviewFormXml);
    const projectId = useMemo(() => {
        if (typeof window === "undefined") return "default";
        const value = new URLSearchParams(window.location.search).get("project");
        return value && value.trim().length > 0 ? value.trim() : "default";
    }, []);

    const escapeHtml = (value: string) =>
        value
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#39;");

    const buildItemStyle = (item: CanvasItem) => {
        const parts = [
            "position: absolute;",
            `left: ${item.x}px;`,
            `top: ${item.y}px;`,
            `width: ${item.width}px;`,
            `height: ${item.height}px;`,
            `z-index: ${item.zIndex ?? 1};`,
            "box-sizing: border-box;",
            item.visible === false ? "display: none;" : ""
        ].filter(Boolean);

        if (item.type === "line") {
            const thickness = Math.max(2, item.strokeWidth ?? item.height);
            parts.push(`height: ${thickness}px;`);
            parts.push(`background: ${item.stroke ?? "rgba(255,255,255,0.7)"};`);
            parts.push("border: none;");
            return parts.join(" ");
        }

        if (item.type === "text") {
            parts.push(`font-family: ${item.fontFamily ?? "Segoe UI"};`);
            parts.push(`font-size: ${item.fontSize ?? 18}px;`);
            parts.push(`font-weight: ${item.fontWeight ?? "600"};`);
            parts.push(`font-style: ${item.fontStyle ?? "normal"};`);
            parts.push(`color: ${item.textColor ?? "#ffffff"};`);
            parts.push(`text-transform: ${item.textTransform ?? "none"};`);
            parts.push(`letter-spacing: ${item.letterSpacing ?? 0}px;`);
            const shadowX = item.textShadowX ?? 0;
            const shadowY = item.textShadowY ?? 0;
            const shadowBlur = item.textShadowBlur ?? 0;
            const shadowColor = item.textShadowColor ?? "rgba(0,0,0,0.6)";
            parts.push(`text-shadow: ${shadowX}px ${shadowY}px ${shadowBlur}px ${shadowColor};`);
            return parts.join(" ");
        }

        if (item.type === "image") {
            if (item.src) {
                parts.push(`background-image: url('${item.src}');`);
                parts.push("background-size: cover;");
                parts.push("background-position: center;");
            }
            return parts.join(" ");
        }

        if (item.type === "rect" || item.type === "ellipse") {
            parts.push(`background: ${item.fill ?? "rgba(0,0,0,0.2)"};`);
            parts.push(`border: 1px solid ${item.stroke ?? "rgba(255,255,255,0.5)"};`);
            if (item.type === "ellipse") {
                parts.push("border-radius: 50%;");
            }
        }

        return parts.join(" ");
    };

    const isSystemSource = (source?: DataSource | null) => {
        if (!source) return false;
        const kind = source.kind ?? "";
        return kind.startsWith("system") || source.id.startsWith("system-");
    };

    const resolveFieldValue = (item: CanvasItem) => {
        if (!item.sourceId || !item.fieldPath) return undefined;
        const source = sources.find((candidate) => candidate.id === item.sourceId);
        if (isSystemSource(source)) return undefined;
        const key = buildDataKey(item.sourceId, item.endpointPath);
        if (!key) return undefined;
        const data = virtualState[key];
        if (!data) return undefined;
        const trimmed = item.fieldPath.replace(/^response\./, "").replace(/^response/, "").replace(/^\./, "");
        const tokens = parsePathTokens(trimmed);
        let current: any = data;
        for (const token of tokens) {
            if (current === undefined || current === null) break;
            current = (current as any)[token as any];
        }
        return current;
    };

    const resolveTextValue = (item: CanvasItem) => {
        const bound = resolveFieldValue(item);
        if (bound !== undefined && bound !== null) {
            const value = Array.isArray(bound) ? bound[0] : bound;
            if (item.format === "uppercase" && typeof value === "string") return value.toUpperCase();
            if (item.format === "json") return JSON.stringify(value, null, 2);
            return String(value);
        }
        return item.label ?? item.name ?? "";
    };

    const resolveProgressPercent = (item: CanvasItem) => {
        const min = typeof item.minimum === "number" ? item.minimum : 0;
        const max = typeof item.maximum === "number" ? item.maximum : 100;
        let value = typeof item.value === "number" ? item.value : 0;
        const bound = resolveFieldValue(item);
        if (bound !== undefined && bound !== null) {
            const raw = Array.isArray(bound) ? bound[0] : bound;
            const parsed = typeof raw === "number" ? raw : typeof raw === "string" ? Number.parseFloat(raw) : NaN;
            if (Number.isFinite(parsed)) {
                value = parsed;
            }
        }
        if (max <= min) return 0;
        return Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
    };

    const resolveImageSource = (item: CanvasItem) => {
        const bound = resolveFieldValue(item);
        if (typeof bound === "string" && bound.length > 0) return bound;
        return item.src ?? "";
    };

    const buildOverlayHtml = (items: CanvasItem[]) => {
        if (!items.length) return "";
        const ordered = [...items].sort((a, b) => (a.zIndex ?? 1) - (b.zIndex ?? 1));
        return ordered.map((item) => {
            if (item.type === "progress") {
                const percent = resolveProgressPercent(item);
                return `
<div style="${buildItemStyle(item)}">
  <div style="width: 100%; height: 100%; background: rgba(255,255,255,0.15); border-radius: 6px; overflow: hidden;">
    <div style="height: 100%; width: ${percent}%; background: linear-gradient(90deg, #42e695, #3bb2b8);"></div>
  </div>
</div>`;
            }

            if (item.type === "image") {
                const source = resolveImageSource(item);
                const style = source
                    ? `${buildItemStyle(item)} background-image: url('${source}'); background-size: cover; background-position: center;`
                    : buildItemStyle(item);
                return `
<div style="${style}"></div>`;
            }

            const label = item.type === "text"
                ? escapeHtml(resolveTextValue(item))
                : "";

            return `
<div style="${buildItemStyle(item)}">
  ${label}
</div>`;
        }).join("\n");
    };

    useEffect(() => {
        let cancelled = false;
        const loadAutosave = async () => {
            try {
                const res = await fetch(`/designer/autosave?sessionId=${encodeURIComponent(projectId)}`, { cache: "no-store" });
                if (res.status === 204) return;
                if (!res.ok) throw new Error(await res.text());
                const json = await res.text();
                if (!json || cancelled) return;
                const parsed = JSON.parse(json) as { items?: CanvasItem[]; overlayName?: string | null };
                if (Array.isArray(parsed.items)) {
                    setOverlayItems(parsed.items);
                }
                if (parsed.overlayName) {
                    setOverlayName(parsed.overlayName);
                }
            } catch (err) {
                console.warn("Failed to load autosave for preview", err);
            }
        };

        loadAutosave();
        return () => {
            cancelled = true;
        };
    }, [projectId]);

    useEffect(() => {
        let cancelled = false;
        const loadSources = async () => {
            try {
                const res = await fetch("/designer/sources", { cache: "no-store" });
                if (!res.ok) throw new Error(await res.text());
                const data = (await res.json()) as DataSource[];
                if (!cancelled) {
                    setSources(data || []);
                }
            } catch (err) {
                console.warn("Failed to load sources for preview", err);
            }
        };
        loadSources();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (!overlayItems.length) return;
        const tick = setInterval(() => {
            overlayItems
                .filter((item) => Boolean(item.workerEnabled && item.sourceId && item.endpointPath && item.fieldPath))
                .forEach((item) => {
                    if (!item.sourceId || !item.endpointPath) return;
                    const intervalMs = Math.max(item.workerIntervalMs ?? 5000, 250);
                    const lastExecution = lastExecutionRef.current.get(item.id) ?? 0;
                    if (item.workerTrigger === "onLoad" || item.workerTrigger === "onVisible") {
                        if (lastExecution > 0) return;
                    } else if (Date.now() - lastExecution < intervalMs) {
                        return;
                    }

                    lastExecutionRef.current.set(item.id, Date.now());
                    void (async () => {
                        try {
                            const res = await fetch(
                                `/public-api-sources/test?sourceId=${encodeURIComponent(item.sourceId)}&endpointPath=${encodeURIComponent(item.endpointPath)}`,
                                { cache: "no-store" }
                            );
                            let payload: TestResponse;
                            try {
                                payload = (await res.json()) as TestResponse;
                            } catch {
                                payload = { success: res.ok, statusCode: res.status, error: await res.text() };
                            }
                            const responseBody = payload?.data ?? payload?.response;
                            if (responseBody !== undefined) {
                                const key = buildDataKey(item.sourceId, item.endpointPath);
                                if (!key) return;
                                setVirtualState((prev) => ({ ...prev, [key]: responseBody }));
                            }
                        } catch (err) {
                            console.warn("Preview worker failed", err);
                        }
                    })();
                });
        }, 250);

        return () => clearInterval(tick);
    }, [overlayItems]);

    // Select random video on mount
    useEffect(() => {
        const randomIndex = Math.floor(Math.random() * STOCK_VIDEOS.length);
        setCurrentVideoIndex(randomIndex);
    }, []);

    // Initialize video and overlay after render
    useEffect(() => {
        const container = document.getElementById("preview-video-container");
        if (!container) return;

        if (!videoRef.current) {
            const video = document.createElement("video");
            video.className = "preview-video";
            video.controls = false;
            video.autoplay = true;
            video.loop = true;
            video.muted = true;
            video.style.width = "100%";
            video.style.height = "100%";
            video.style.objectFit = "cover";
            videoRef.current = video;
            container.appendChild(video);
        }

        if (!overlayContainerRef.current) {
            const overlay = document.createElement("div");
            overlay.className = "preview-overlay";
            overlay.style.pointerEvents = "none";

            const canvas = document.createElement("div");
            canvas.className = "preview-overlay-canvas";
            canvas.style.position = "absolute";
            canvas.style.top = "0";
            canvas.style.left = "0";
            canvas.style.width = "1920px";
            canvas.style.height = "1080px";
            canvas.style.transformOrigin = "top left";

            overlay.appendChild(canvas);
            overlayContainerRef.current = overlay;
            overlayCanvasRef.current = canvas;
            container.appendChild(overlay);
        }

        if (videoRef.current) {
            videoRef.current.src = STOCK_VIDEOS[currentVideoIndex];
        }

        // Setup button handlers
        const playPauseBtn = document.getElementById("preview-play-pause");
        const changeVideoBtn = document.getElementById("preview-change-video");
        const toggleOverlayBtn = document.getElementById("preview-toggle-overlay");

        const handlePlayPause = () => {
            if (videoRef.current) {
                if (videoRef.current.paused) {
                    videoRef.current.play();
                } else {
                    videoRef.current.pause();
                }
            }
        };

        const handleChangeVideo = () => {
            setCurrentVideoIndex((prev) => (prev + 1) % STOCK_VIDEOS.length);
        };

        const handleToggleOverlay = () => {
            setShowOverlay((prev) => !prev);
        };

        playPauseBtn?.addEventListener("click", handlePlayPause);
        changeVideoBtn?.addEventListener("click", handleChangeVideo);
        toggleOverlayBtn?.addEventListener("click", handleToggleOverlay);

        return () => {
            playPauseBtn?.removeEventListener("click", handlePlayPause);
            changeVideoBtn?.removeEventListener("click", handleChangeVideo);
            toggleOverlayBtn?.removeEventListener("click", handleToggleOverlay);
        };
    }, [currentVideoIndex]);

    useEffect(() => {
        const container = document.getElementById("preview-video-container");
        const canvas = overlayCanvasRef.current;
        if (!container || !canvas) return;

        const updateScale = () => {
            const rect = container.getBoundingClientRect();
            const scale = Math.min(rect.width / 1920, rect.height / 1080);
            const offsetX = (rect.width - 1920 * scale) / 2;
            const offsetY = (rect.height - 1080 * scale) / 2;
            canvas.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
        };

        updateScale();
        const observer = new ResizeObserver(updateScale);
        observer.observe(container);

        return () => observer.disconnect();
    }, [overlayItems, showOverlay]);

    // Update overlay visibility
    useEffect(() => {
        if (overlayContainerRef.current) {
            overlayContainerRef.current.style.display = showOverlay ? "block" : "none";
        }
    }, [showOverlay]);

    useEffect(() => {
        const canvas = overlayCanvasRef.current;
        if (!canvas) return;
        const overlayHtml = buildOverlayHtml(overlayItems);
        canvas.innerHTML = overlayHtml || `
            <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,0.7); font-family: 'Segoe UI', sans-serif; font-size: 18px;">
                ${overlayName ? `Previewing ${escapeHtml(overlayName)}` : "No overlay items found"}
            </div>
        `;
    }, [overlayItems, overlayName, virtualState, sources]);

    return (
        <div className="live-preview-view">
            <FormRenderer node={tree} />
        </div>
    );
};

// Export function to open live preview in new window
export const openLivePreviewWindow = (projectId?: string) => {
    const resolvedProjectId = projectId ?? Math.random().toString(36).slice(2, 11);
    const previewWindow = window.open(
        `/designer/preview?project=${encodeURIComponent(resolvedProjectId)}`,
        "LivePreview",
        "width=1280,height=800,menubar=no,toolbar=no,location=no,status=no"
    );

    if (previewWindow) {
        console.log("Live Preview window opened");
    } else {
        alert("Failed to open Live Preview window. Please allow popups for this site.");
    }
};
