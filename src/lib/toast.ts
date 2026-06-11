export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

type Listener = (toasts: ToastItem[]) => void;

let _toasts: ToastItem[] = [];
const _listeners = new Set<Listener>();

function _notify() {
  _listeners.forEach(l => l([..._toasts]));
}

function _add(message: string, type: ToastType, duration = 3200) {
  const id = Math.random().toString(36).slice(2, 9);
  _toasts = [..._toasts, { id, message, type }];
  _notify();
  setTimeout(() => {
    _toasts = _toasts.filter(t => t.id !== id);
    _notify();
  }, duration);
}

export const toast = {
  success: (msg: string, duration?: number) => _add(msg, 'success', duration),
  error:   (msg: string, duration?: number) => _add(msg, 'error',   duration),
  info:    (msg: string, duration?: number) => _add(msg, 'info',    duration),
};

export function subscribeToasts(listener: Listener): () => void {
  _listeners.add(listener);
  return () => { _listeners.delete(listener); };
}
