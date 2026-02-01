export type EventHandler = (payload: unknown) => void;
export type EventHandlers = Record<string, EventHandler>;

export type EventBus = {
    emit: (name: string, payload?: unknown) => void;
    handlers: EventHandlers;
};

export const createEventBus = (handlers: EventHandlers = {}): EventBus => {
    const emit = (name: string, payload?: unknown) => {
        const handler = handlers[name];
        if (handler) {
            handler(payload);
        }
        const anyHandler = handlers["*"];
        if (anyHandler) {
            anyHandler({ name, payload });
        }
    };

    return { emit, handlers };
};