let windowZIndex = 20;

export const getNextWindowZIndex = () => ++windowZIndex;

export const bringWindowToFront = (element: HTMLElement | null) => {
    if (!element) return;
    element.style.zIndex = String(++windowZIndex);
};