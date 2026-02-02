import React from 'react';
import type { AppToastPayload } from '../lib/notify';

type ToastItem = Required<Pick<AppToastPayload, 'id' | 'type' | 'message'>> &
  Pick<AppToastPayload, 'title' | 'durationMs'>;

const EVENT_NAME = 'app_toast';

function getStyles(type: ToastItem['type']) {
  switch (type) {
    case 'success':
      return {
        container: 'bg-green-50 border-green-200 text-green-900',
        dot: 'bg-green-600',
      };
    case 'error':
      return {
        container: 'bg-red-50 border-red-200 text-red-900',
        dot: 'bg-red-600',
      };
    default:
      return {
        container: 'bg-slate-50 border-slate-200 text-slate-900',
        dot: 'bg-slate-600',
      };
  }
}

export function AppToasts() {
  const [items, setItems] = React.useState<ToastItem[]>([]);

  React.useEffect(() => {
    const onToast = (evt: Event) => {
      const detail = (evt as CustomEvent<AppToastPayload>)?.detail;
      if (!detail?.id || !detail?.type || !detail?.message) return;

      const next: ToastItem = {
        id: detail.id,
        type: detail.type,
        message: detail.message,
        title: detail.title,
        durationMs: detail.durationMs,
      };

      setItems((prev) => [next, ...prev].slice(0, 5));

      const duration = Math.max(1200, Math.min(10000, next.durationMs ?? 3500));
      window.setTimeout(() => {
        setItems((prev) => prev.filter((t) => t.id !== next.id));
      }, duration);
    };

    window.addEventListener(EVENT_NAME, onToast as EventListener);
    return () => window.removeEventListener(EVENT_NAME, onToast as EventListener);
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-[90vw] w-[420px] pointer-events-none">
      {items.map((t) => {
        const styles = getStyles(t.type);
        return (
          <div
            key={t.id}
            className={`pointer-events-auto border rounded-lg shadow-lg px-4 py-3 backdrop-blur-sm ${styles.container}`}
          >
            <div className="flex items-start gap-3">
              <span className={`mt-1.5 h-2.5 w-2.5 rounded-full ${styles.dot}`} />
              <div className="flex-1 min-w-0">
                {t.title ? (
                  <div className="text-sm font-semibold leading-5">{t.title}</div>
                ) : null}
                <div className="text-sm leading-5 whitespace-pre-line break-words">{t.message}</div>
              </div>
              <button
                type="button"
                className="text-xs font-medium opacity-70 hover:opacity-100"
                onClick={() => setItems((prev) => prev.filter((x) => x.id !== t.id))}
                aria-label="Cerrar"
              >
                Cerrar
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

