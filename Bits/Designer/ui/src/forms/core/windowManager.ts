let windowZIndex = 2000;

export const getNextWindowZIndex = () => ++windowZIndex;

export const bringWindowToFront = (element: HTMLElement | null) => {
    if (!element) return;
    element.style.zIndex = String(++windowZIndex);
};
