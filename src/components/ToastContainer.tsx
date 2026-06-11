import { useEffect, useState } from 'react';
import { subscribeToasts, type ToastItem } from '../lib/toast';

const STYLES: Record<ToastItem['type'], string> = {
  success: 'bg-forest-600 text-white',
  error:   'bg-red-500 text-white',
  info:    'bg-earth-700 text-white',
};

const ICONS: Record<ToastItem['type'], string> = {
  success: '✓',
  error:   '✕',
  info:    '·',
};

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => subscribeToasts(setToasts), []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-20 sm:bottom-6 inset-x-0 sm:inset-x-auto sm:right-6 z-[100] flex flex-col gap-2 items-center sm:items-end pointer-events-none px-4 sm:px-0">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-sm font-medium max-w-xs w-full sm:w-auto toast-enter pointer-events-auto ${STYLES[t.type]}`}
        >
          <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold shrink-0">
            {ICONS[t.type]}
          </span>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
