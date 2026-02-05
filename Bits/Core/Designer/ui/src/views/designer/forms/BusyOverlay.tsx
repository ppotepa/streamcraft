import { buildBusyOverlay } from "./BusyOverlay.Designer";
import type { BusyOverlayProps } from "./BusyOverlay.Designer";

export type { BusyOverlayProps } from "./BusyOverlay.Designer";

export const createBusyOverlay = (props: BusyOverlayProps) => buildBusyOverlay(props);

export interface LoadingOverlayProps extends Omit<BusyOverlayProps, "title"> {
    title?: string;
}

export interface AutosaveOverlayProps extends Partial<Omit<BusyOverlayProps, "title" | "step">> {
    title?: string;
    step?: string;
}

export const createLoadingOverlay = (props: LoadingOverlayProps) => buildBusyOverlay({
    title: props.title ?? "StreamCraft Designer",
    step: props.step,
    progress: props.progress,
    showProgress: props.showProgress,
    log: props.log
});

export const createAutosaveOverlay = (props?: AutosaveOverlayProps) => buildBusyOverlay({
    title: props?.title ?? "StreamCraft Designer",
    step: props?.step ?? "AUTOSAVING ...",
    progress: props?.progress ?? 100,
    showProgress: props?.showProgress,
    log: props?.log
});
