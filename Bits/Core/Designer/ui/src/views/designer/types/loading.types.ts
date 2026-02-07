/**
 * Loading state types
 */

export type LoadingState = {
    active: boolean;
    step: string;
    progress: number;
    log: string[];
};
