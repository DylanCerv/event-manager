export type AppToastType = 'success' | 'error' | 'info';

export type AppToastPayload = {
  id: string;
  type: AppToastType;
  message: string;
  title?: string;
  durationMs?: number;
};

const EVENT_NAME = 'app_toast';

function dispatchToast(payload: AppToastPayload) {
  window.dispatchEvent(new CustomEvent<AppToastPayload>(EVENT_NAME, { detail: payload }));
}

function createId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export const notify = {
  success(message: string, opts?: { title?: string; durationMs?: number }) {
    dispatchToast({
      id: createId(),
      type: 'success',
      message,
      title: opts?.title,
      durationMs: opts?.durationMs,
    });
  },
  error(message: string, opts?: { title?: string; durationMs?: number }) {
    dispatchToast({
      id: createId(),
      type: 'error',
      message,
      title: opts?.title,
      durationMs: opts?.durationMs,
    });
  },
  info(message: string, opts?: { title?: string; durationMs?: number }) {
    dispatchToast({
      id: createId(),
      type: 'info',
      message,
      title: opts?.title,
      durationMs: opts?.durationMs,
    });
  },
};

