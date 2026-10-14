export type FeedbackSeverity = "success" | "error" | "info" | "warning";
export interface ToastMessage { id: number; message: string; severity: FeedbackSeverity; duration: number }
export interface MessageOptions { title: string; message: string; severity?: FeedbackSeverity; confirmLabel?: string }
export interface DialogMessage extends MessageOptions { id: number; confirmation: boolean; resolve?: (accepted: boolean) => void }
interface FeedbackState { toasts: ToastMessage[]; dialogs: DialogMessage[] }
const initial: FeedbackState = { toasts: [], dialogs: [] };
let state = initial;
let sequence = 0;
const listeners = new Set<() => void>();
const update = (next: FeedbackState) => { state = next; listeners.forEach(listener => listener()); };

export const feedbackStore = {
  subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
  getSnapshot: () => state,
  getServerSnapshot: () => initial,
};
export function dismissToast(id: number) { update({ ...state, toasts: state.toasts.filter(item => item.id !== id) }); }
export function dismissMessage(id: number, accepted = false) {
  const dialog = state.dialogs.find(item => item.id === id);
  if (!dialog) return;
  update({ ...state, dialogs: state.dialogs.filter(item => item.id !== id) });
  dialog.resolve?.(accepted);
}
function toast(severity: FeedbackSeverity, message: string, duration = severity === "error" ? 7000 : 4500) {
  if (!message.trim()) return;
  const id = ++sequence;
  update({ ...state, toasts: [...state.toasts, { id, severity, message, duration }].slice(-4) });
  return id;
}

/** Shared action feedback. Toasts survive route changes; dialogs are shown one at a time. */
export const feedback = {
  success: (message: string) => toast("success", message),
  error: (message: string) => toast("error", message),
  info: (message: string) => toast("info", message),
  warning: (message: string) => toast("warning", message),
  toast,
  message(options: MessageOptions) {
    update({ ...state, dialogs: [...state.dialogs, { ...options, severity: options.severity ?? "info", id: ++sequence, confirmation: false }] });
  },
  confirm(options: MessageOptions): Promise<boolean> {
    return new Promise(resolve => update({ ...state, dialogs: [...state.dialogs, { ...options, severity: options.severity ?? "warning", id: ++sequence, confirmation: true, resolve }] }));
  },
};
