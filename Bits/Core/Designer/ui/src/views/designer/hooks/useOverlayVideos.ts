import { useCallback, useEffect, useMemo, useState } from "react";

import type { OverlayVideoItem } from "../forms/OverlayVideoPreviewDialog";

type UseOverlayVideosParams = {
    isOpen: boolean;
};

type OverlayVideoState = {
    videoPlaylist: OverlayVideoItem[];
    videoSelectedId: string | null;
    currentVideoUrl: string;
    videoStatus: string;
    videoLoading: boolean;
    playlistCollapsed: boolean;
    videoSearchQuery: string;
    videoSearchResults: OverlayVideoItem[];
    videoSearchTotal: number;
    overlayPreviewVisible: boolean;
    overlayPreviewGrid: boolean;
};

type OverlayVideoActions = {
    setPlaylistCollapsed: (value: boolean) => void;
    setVideoSearchQuery: (value: string) => void;
    setOverlayPreviewVisible: (value: boolean) => void;
    setOverlayPreviewGrid: (value: boolean) => void;
    selectVideo: (videoId: string) => void;
    fetchRandomVideo: () => Promise<void>;
    clearOverlayVideoCache: () => Promise<void>;
};

type OverlayVideoDerived = {
    activeVideoList: OverlayVideoItem[];
};

export type UseOverlayVideosResult = OverlayVideoState & OverlayVideoActions & OverlayVideoDerived;

export const useOverlayVideos = ({ isOpen }: UseOverlayVideosParams): UseOverlayVideosResult => {
    const [videoPlaylist, setVideoPlaylist] = useState<OverlayVideoItem[]>([]);
    const [videoSelectedId, setVideoSelectedId] = useState<string | null>(null);
    const [currentVideoUrl, setCurrentVideoUrl] = useState<string>("");
    const [videoStatus, setVideoStatus] = useState<string>("Ready.");
    const [videoLoading, setVideoLoading] = useState(false);
    const [playlistCollapsed, setPlaylistCollapsed] = useState(false);
    const [videoSearchQuery, setVideoSearchQuery] = useState<string>("");
    const [videoSearchResults, setVideoSearchResults] = useState<OverlayVideoItem[]>([]);
    const [videoSearchTotal, setVideoSearchTotal] = useState<number>(0);
    const [overlayPreviewVisible, setOverlayPreviewVisible] = useState(true);
    const [overlayPreviewGrid, setOverlayPreviewGrid] = useState(true);

    const activeVideoList = useMemo(
        () => (videoSearchQuery.trim().length > 0 ? videoSearchResults : videoPlaylist),
        [videoPlaylist, videoSearchQuery, videoSearchResults]
    );

    const loadVideoPlaylist = useCallback(async () => {
        setVideoLoading(true);
        setVideoStatus("Loading cached videos...");
        try {
            const res = await fetch("/localmedia/videos", { cache: "no-store" });
            if (!res.ok) throw new Error(await res.text());
            const data = (await res.json()) as OverlayVideoItem[];
            const items = Array.isArray(data)
                ? data.map(item => ({ ...item, isCached: true }))
                : [];
            setVideoPlaylist(items);
            if (items.length > 0) {
                const first = items[0];
                setVideoSelectedId(first.id);
                if (first.localUrl) {
                    setCurrentVideoUrl(first.localUrl);
                }
                setVideoStatus("Loaded cached videos.");
            } else {
                setVideoStatus("No cached videos yet.");
            }
        } catch (err) {
            setVideoStatus(`Failed to load playlist: ${String(err)}`);
        } finally {
            setVideoLoading(false);
        }
    }, []);

    const selectVideo = useCallback((videoId: string) => {
        setVideoSelectedId(videoId);
        const item = activeVideoList.find((video) => video.id === videoId);
        if (item?.localUrl || item?.downloadUrl) {
            setCurrentVideoUrl(item.localUrl ?? item.downloadUrl ?? "");
        }
    }, [activeVideoList]);

    const fetchRandomVideo = useCallback(async () => {
        setVideoLoading(true);
        setVideoStatus("Fetching random video...");
        try {
            const res = await fetch(`/localmedia/video/random?ts=${Date.now()}`, { cache: "no-store" });
            if (!res.ok) throw new Error(await res.text());
            const payload = (await res.json()) as OverlayVideoItem;
            if (!payload?.id || !payload?.localUrl) {
                throw new Error("Random video missing id/localUrl.");
            }
            const cachedPayload = { ...payload, isCached: true };
            setCurrentVideoUrl(cachedPayload.localUrl ?? "");
            setVideoSelectedId(cachedPayload.id);
            setVideoPlaylist((prev) => {
                if (prev.some((video) => video.id === cachedPayload.id)) return prev;
                return [cachedPayload, ...prev];
            });
            setVideoStatus("Random video loaded.");
        } catch (err) {
            setVideoStatus(`Random fetch failed: ${String(err)}`);
        } finally {
            setVideoLoading(false);
        }
    }, []);

    const clearOverlayVideoCache = useCallback(async () => {
        const ok = confirm("Clear cached Pexels media? This will remove stored images and videos.");
        if (!ok) return;
        setVideoLoading(true);
        setVideoStatus("Clearing media cache...");
        try {
            const res = await fetch("/localmedia/cache/clear", { method: "POST" });
            if (!res.ok) throw new Error(await res.text());
            setVideoPlaylist([]);
            setVideoSelectedId(null);
            setCurrentVideoUrl("");
            setVideoSearchResults([]);
            setVideoSearchTotal(0);
            setVideoStatus("Cache cleared. Fetch a random video to repopulate.");
        } catch (err) {
            setVideoStatus(`Cache clear failed: ${String(err)}`);
        } finally {
            setVideoLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!isOpen) return;
        const query = videoSearchQuery.trim();
        if (query.length === 0) {
            setVideoSearchResults([]);
            setVideoSearchTotal(0);
            return;
        }

        let cancelled = false;
        const timer = window.setTimeout(async () => {
            setVideoLoading(true);
            setVideoStatus("Searching Pexels...");
            try {
                const res = await fetch(`/localmedia/videos/search?query=${encodeURIComponent(query)}`, { cache: "no-store" });
                if (!res.ok) throw new Error(await res.text());
                const payload = await res.json();
                const items = Array.isArray(payload?.videos) ? payload.videos : [];
                if (cancelled) return;
                setVideoSearchResults(items);
                setVideoSearchTotal(typeof payload?.totalResults === "number" ? payload.totalResults : items.length);
                if (items.length > 0) {
                    setVideoSelectedId(items[0].id);
                    setCurrentVideoUrl(items[0].localUrl ?? items[0].downloadUrl ?? "");
                    setVideoStatus("Search results ready.");
                } else {
                    setVideoStatus("No results found.");
                }
            } catch (err) {
                if (!cancelled) {
                    setVideoStatus(`Search failed: ${String(err)}`);
                    setVideoSearchResults([]);
                    setVideoSearchTotal(0);
                }
            } finally {
                if (!cancelled) {
                    setVideoLoading(false);
                }
            }
        }, 300);

        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
    }, [isOpen, videoSearchQuery]);

    useEffect(() => {
        if (!isOpen) return;
        if (videoSearchQuery.trim().length > 0) return;
        if (videoPlaylist.length === 0) return;
        const exists = videoPlaylist.some(video => video.id === videoSelectedId);
        if (!exists) {
            const first = videoPlaylist[0];
            setVideoSelectedId(first.id);
            setCurrentVideoUrl(first.localUrl ?? "");
        }
    }, [isOpen, videoPlaylist, videoSearchQuery, videoSelectedId]);

    useEffect(() => {
        if (!isOpen) return;
        void loadVideoPlaylist();
    }, [isOpen, loadVideoPlaylist]);

    return {
        videoPlaylist,
        videoSelectedId,
        currentVideoUrl,
        videoStatus,
        videoLoading,
        playlistCollapsed,
        videoSearchQuery,
        videoSearchResults,
        videoSearchTotal,
        overlayPreviewVisible,
        overlayPreviewGrid,
        setPlaylistCollapsed,
        setVideoSearchQuery,
        setOverlayPreviewVisible,
        setOverlayPreviewGrid,
        selectVideo,
        fetchRandomVideo,
        clearOverlayVideoCache,
        activeVideoList
    };
};