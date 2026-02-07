export type LoadingState = {
    active: boolean;
    step: string;
    progress: number;
    log: string[];
};

export type LoadingActions = {
    setLoadingState: (state: LoadingState | ((prev: LoadingState) => LoadingState)) => void;
    updateLoadingProgress: (step: string, progress: number) => void;
    finishLoading: () => void;
};
