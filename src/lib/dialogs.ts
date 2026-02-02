export type AppConfirmOptions = {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
};

export type AppPromptOptions = {
  title?: string;
  message?: string;
  placeholder?: string;
  defaultValue?: string;
  confirmText?: string;
  cancelText?: string;
  multiline?: boolean;
};

type DialogRequest =
  | {
      id: string;
      type: 'confirm';
      title?: string;
      message: string;
      confirmText: string;
      cancelText: string;
    }
  | {
      id: string;
      type: 'prompt';
      title?: string;
      message?: string;
      placeholder?: string;
      defaultValue?: string;
      confirmText: string;
      cancelText: string;
      multiline: boolean;
    };

type DialogResolve =
  | { id: string; type: 'confirm'; value: boolean }
  | { id: string; type: 'prompt'; value: string | null };

const REQUEST_EVENT = 'app_dialog_request';
const RESOLVE_EVENT = 'app_dialog_resolve';

function createId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function waitResolve<T extends DialogResolve['type']>(
  id: string,
  type: T
): Promise<Extract<DialogResolve, { type: T }>['value']> {
  return new Promise((resolve) => {
    const onResolve = (evt: Event) => {
      const detail = (evt as CustomEvent<DialogResolve>)?.detail;
      if (!detail || detail.id !== id || detail.type !== type) return;
      window.removeEventListener(RESOLVE_EVENT, onResolve as EventListener);
      resolve((detail as any).value);
    };
    window.addEventListener(RESOLVE_EVENT, onResolve as EventListener);
  });
}

export function appConfirm(opts: AppConfirmOptions): Promise<boolean> {
  const id = createId();
  const payload: DialogRequest = {
    id,
    type: 'confirm',
    title: opts.title,
    message: opts.message,
    confirmText: opts.confirmText || 'Confirmar',
    cancelText: opts.cancelText || 'Cancelar',
  };
  window.dispatchEvent(new CustomEvent<DialogRequest>(REQUEST_EVENT, { detail: payload }));
  return waitResolve(id, 'confirm') as Promise<boolean>;
}

export function appPrompt(opts: AppPromptOptions): Promise<string | null> {
  const id = createId();
  const payload: DialogRequest = {
    id,
    type: 'prompt',
    title: opts.title,
    message: opts.message,
    placeholder: opts.placeholder,
    defaultValue: opts.defaultValue,
    confirmText: opts.confirmText || 'Aceptar',
    cancelText: opts.cancelText || 'Cancelar',
    multiline: !!opts.multiline,
  };
  window.dispatchEvent(new CustomEvent<DialogRequest>(REQUEST_EVENT, { detail: payload }));
  return waitResolve(id, 'prompt') as Promise<string | null>;
}

export const __appDialogEvents = {
  REQUEST_EVENT,
  RESOLVE_EVENT,
};

