export const toggleSelection = (selected: string[], id: string) =>
    selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];

export const selectSingle = (selected: string[], id: string) => (selected.includes(id) && selected.length === 1 ? selected : [id]);
