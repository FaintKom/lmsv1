// Excalidraw elements carry {id, version, isDeleted}. We diff against the
// last-SENT versions, not the previous onChange — onChange fires on every
// pointer move and would produce noise diffs.

export interface ExElement {
  id: string;
  version: number;
  isDeleted?: boolean;
  [k: string]: unknown;
}

export interface Delta {
  updated: ExElement[];
  deleted: string[];
}

export function diffElements(current: readonly ExElement[], lastSent: Map<string, number>): Delta {
  const updated: ExElement[] = [];
  const deleted: string[] = [];
  for (const e of current) {
    const sent = lastSent.get(e.id);
    if (e.isDeleted) {
      if (sent !== undefined) deleted.push(e.id);
      continue;
    }
    if (sent === undefined || sent < e.version) updated.push(e);
  }
  return { updated, deleted };
}

export function markSent(delta: Delta, lastSent: Map<string, number>): void {
  for (const e of delta.updated) lastSent.set(e.id, e.version);
  for (const id of delta.deleted) lastSent.delete(id);
}

export function applyDelta(
  elements: readonly ExElement[],
  delta: { updated: ExElement[]; deleted: string[]; version: number },
): ExElement[] {
  const map = new Map(elements.map((e) => [e.id, e]));
  for (const e of delta.updated) map.set(e.id, e);
  for (const id of delta.deleted) map.delete(id);
  return [...map.values()];
}
