export interface EditorHistory<T> { past: T[]; present: T; future: T[]; group?: string; at: number }
export function createHistory<T>(present: T): EditorHistory<T> { return { past: [], present, future: [], at: 0 }; }
export function commitHistory<T>(history: EditorHistory<T>, present: T, group?: string, at = Date.now()): EditorHistory<T> {
  if (JSON.stringify(history.present) === JSON.stringify(present)) return history;
  const merge = Boolean(group && group === history.group && at - history.at < 700 && history.future.length === 0);
  return { past: merge ? history.past : [...history.past, history.present].slice(-80), present, future: [], group, at };
}
export function undoHistory<T>(history: EditorHistory<T>): EditorHistory<T> {
  if (!history.past.length) return history;
  return { past: history.past.slice(0, -1), present: history.past[history.past.length - 1], future: [history.present, ...history.future], at: 0 };
}
export function redoHistory<T>(history: EditorHistory<T>): EditorHistory<T> {
  if (!history.future.length) return history;
  return { past: [...history.past, history.present], present: history.future[0], future: history.future.slice(1), at: 0 };
}
export function canvasHistoryShortcut(key: string, shift: boolean, modifier: boolean, editingText: boolean): "undo" | "redo" | null {
  if (!modifier || editingText) return null;
  if (key.toLowerCase() === "z") return shift ? "redo" : "undo";
  return key.toLowerCase() === "y" ? "redo" : null;
}
