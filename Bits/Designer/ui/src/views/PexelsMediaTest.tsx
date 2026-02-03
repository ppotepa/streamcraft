import React, { useCallback, useMemo, useState } from "react";
import { FormContainer } from "../forms/FormContainer";
import { node, element } from "../forms/core";
import { ControlKind } from "../forms/controlKinds";

type MediaPayload = {
    id?: string;
    description?: string;
    photographer?: string;
    width?: number;
    height?: number;
    duration?: number;
    sourceUrl?: string;
    previewImage?: string;
    localUrl?: string;
};

export const PexelsMediaTest: React.FC = () => {
    const [imagePayload, setImagePayload] = useState<MediaPayload | null>(null);
    const [videoPayload, setVideoPayload] = useState<MediaPayload | null>(null);
    const [status, setStatus] = useState<string>("Idle");

    const fetchJson = useCallback(async (url: string) => {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok)
        {
            throw new Error(await res.text());
        }
        return (await res.json()) as MediaPayload;
    }, []);

    const loadImage = useCallback(async () => {
        setStatus("Loading image...");
        try
        {
            const payload = await fetchJson(`/localmedia/images/random?ts=${Date.now()}`);
            setImagePayload(payload);
            setStatus("Image loaded.");
        }
        catch (err)
        {
            setStatus(`Image load failed: ${String(err)}`);
        }
    }, [fetchJson]);

    const loadVideo = useCallback(async () => {
        setStatus("Loading video...");
        try
        {
            const payload = await fetchJson(`/localmedia/videos/random?ts=${Date.now()}`);
            setVideoPayload(payload);
            setStatus("Video loaded.");
        }
        catch (err)
        {
            setStatus(`Video load failed: ${String(err)}`);
        }
    }, [fetchJson]);

    const loadBoth = useCallback(async () => {
        setStatus("Loading image + video...");
        try
        {
            const [image, video] = await Promise.all([
                fetchJson(`/localmedia/images/random?ts=${Date.now()}`),
                fetchJson(`/localmedia/videos/random?ts=${Date.now()}`)
            ]);
            setImagePayload(image);
            setVideoPayload(video);
            setStatus("Image + video loaded.");
        }
        catch (err)
        {
            setStatus(`Load failed: ${String(err)}`);
        }
    }, [fetchJson]);

    const imagePreviewNode = imagePayload?.localUrl
        ? element("img", {
            src: imagePayload.localUrl,
            style: "width: 100%; height: 220px; object-fit: cover; background: #111; border: 1px solid #444;"
        })
        : element("div", { style: "height: 220px; display: flex; align-items: center; justify-content: center; background: #111; color: #ddd; border: 1px solid #444;" }, "No image loaded");

    const videoPreviewNode = videoPayload?.localUrl
        ? element("video", {
            src: videoPayload.localUrl,
            controls: true,
            style: "width: 100%; height: 220px; object-fit: cover; background: #111; border: 1px solid #444;"
        })
        : element("div", { style: "height: 220px; display: flex; align-items: center; justify-content: center; background: #111; color: #ddd; border: 1px solid #444;" }, "No video loaded");

    const formNode = useMemo(() => node(
        ControlKind.window,
        {
            title: "Pexels Media Cache Test",
            draggable: true,
            style: "width: 940px; height: 640px; left: 48px; top: 48px;"
        },
        element("div", { style: "display: flex; flex-direction: column; gap: 12px; padding: 16px; height: 100%; box-sizing: border-box;" },
            element("div", { style: "display: flex; gap: 8px; align-items: center;" },
                node(ControlKind.button, { text: "Load Image", onClick: "loadImage" }),
                node(ControlKind.button, { text: "Load Video", onClick: "loadVideo" }),
                node(ControlKind.button, { text: "Load Both", onClick: "loadBoth" }),
                element("div", { style: "margin-left: 12px; color: #333;" }, status)
            ),
            element("div", { style: "display: grid; grid-template-columns: 1fr 1fr; gap: 16px; flex: 1;" },
                element("div", { style: "display: flex; flex-direction: column; gap: 8px;" },
                    element("div", { style: "font-weight: 600;" }, "Image Preview"),
                    imagePreviewNode,
                    element("pre", { style: "flex: 1; margin: 0; background: #f4f4f4; border: 1px solid #ccc; padding: 8px; overflow: auto;" },
                        JSON.stringify(imagePayload, null, 2)
                    )
                ),
                element("div", { style: "display: flex; flex-direction: column; gap: 8px;" },
                    element("div", { style: "font-weight: 600;" }, "Video Preview"),
                    videoPreviewNode,
                    element("pre", { style: "flex: 1; margin: 0; background: #f4f4f4; border: 1px solid #ccc; padding: 8px; overflow: auto;" },
                        JSON.stringify(videoPayload, null, 2)
                    )
                )
            )
        )
    ), [imagePreviewNode, status, videoPayload, imagePayload, videoPreviewNode]);

    const handlers = useMemo(() => ({
        loadImage: () => void loadImage(),
        loadVideo: () => void loadVideo(),
        loadBoth: () => void loadBoth()
    }), [loadBoth, loadImage, loadVideo]);

    return <FormContainer node={formNode} handlers={handlers} />;
};
