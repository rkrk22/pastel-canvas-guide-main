export interface Reorderable {
  id: string;
  index_num: number;
}

/**
 * Returns a new array with items reordered based on drag-and-drop metadata.
 * If targetId is null the item is appended to the end.
 */
export const reorderById = <T extends Reorderable>(
  items: T[],
  sourceId: string,
  targetId: string | null,
  placeAfter: boolean,
): T[] | null => {
  if (sourceId === targetId) return null;

  const working = [...items];
  const sourceIndex = working.findIndex((item) => item.id === sourceId);
  if (sourceIndex === -1) return null;

  const [moved] = working.splice(sourceIndex, 1);

  if (targetId) {
    const targetIndex = working.findIndex((item) => item.id === targetId);
    if (targetIndex === -1) return null;
    const insertIndex = placeAfter ? targetIndex + 1 : targetIndex;
    working.splice(insertIndex, 0, moved);
  } else {
    working.push(moved);
  }

  return working.map((item, index) => ({ ...item, index_num: index }));
};
