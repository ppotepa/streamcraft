import React, { useState } from "react";
import type { FormNode } from "./core";
import { FormRenderer } from "./core";
import { createEventBus } from "./core/events";
import type { EventHandlers } from "./core/events";

interface FormContainerProps {
    node: FormNode;
    handlers?: EventHandlers;
    data?: any;
}

export const FormContainer: React.FC<FormContainerProps> = ({ node, handlers = {}, data: initialData }) => {
    const [formData, setFormData] = useState(initialData ?? {});

    const eventBus = createEventBus(handlers);
    const raiseEvent = (name: string, args: any) => {
        eventBus.emit(name, args);
    };

    const updateBinding = (path: string, value: any) => {
        setFormData((prev: any) => {
            const newData = { ...prev };
            const keys = path.split(".");
            let current: any = newData;
            for (let i = 0; i < keys.length - 1; i++) {
                if (!(keys[i] in current)) {
                    current[keys[i]] = {};
                }
                current = current[keys[i]];
            }
            current[keys[keys.length - 1]] = value;
            return newData;
        });
    };

    // Pass event handlers and binding context through node props
    const enhancedNode: FormNode = {
        ...node,
        props: {
            ...node.props,
            __eventHandlers: handlers,
            __raiseEvent: raiseEvent,
            __bindingData: formData,
            __updateBinding: updateBinding,
        },
    };

    return <FormRenderer node={enhancedNode} />;
};
