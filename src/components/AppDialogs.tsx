import React from 'react';
import { __appDialogEvents } from '../lib/dialogs';

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

export function AppDialogs() {
  const [dialog, setDialog] = React.useState<DialogRequest | null>(null);
  const [inputValue, setInputValue] = React.useState('');

  React.useEffect(() => {
    const onRequest = (evt: Event) => {
      const detail = (evt as CustomEvent<DialogRequest>)?.detail;
      if (!detail?.id || !detail?.type) return;
      setDialog(detail);
      if (detail.type === 'prompt') {
        setInputValue(detail.defaultValue || '');
      } else {
        setInputValue('');
      }
    };
    window.addEventListener(__appDialogEvents.REQUEST_EVENT, onRequest as EventListener);
    return () => window.removeEventListener(__appDialogEvents.REQUEST_EVENT, onRequest as EventListener);
  }, []);

  const resolve = React.useCallback((payload: DialogResolve) => {
    window.dispatchEvent(new CustomEvent<DialogResolve>(__appDialogEvents.RESOLVE_EVENT, { detail: payload }));
    setDialog(null);
    setInputValue('');
  }, []);

  if (!dialog) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => {
          // Click outside cancels
          if (dialog.type === 'confirm') resolve({ id: dialog.id, type: 'confirm', value: false });
          if (dialog.type === 'prompt') resolve({ id: dialog.id, type: 'prompt', value: null });
        }}
      />
      <div className="relative w-[92vw] max-w-lg rounded-xl bg-white shadow-2xl border border-gray-100">
        <div className="p-5">
          <div className="text-lg font-semibold text-gray-900">
            {dialog.title || (dialog.type === 'confirm' ? 'Confirmación' : 'Ingresar información')}
          </div>
          {dialog.type === 'confirm' ? (
            <div className="mt-2 text-sm text-gray-700 whitespace-pre-line">{dialog.message}</div>
          ) : (
            <>
              {dialog.message ? (
                <div className="mt-2 text-sm text-gray-700 whitespace-pre-line">{dialog.message}</div>
              ) : null}
              <div className="mt-3">
                {dialog.multiline ? (
                  <textarea
                    className="w-full min-h-[96px] rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder={dialog.placeholder}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    autoFocus
                  />
                ) : (
                  <input
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder={dialog.placeholder}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    autoFocus
                  />
                )}
              </div>
            </>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 px-5 pb-5">
          <button
            type="button"
            className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
            onClick={() => {
              if (dialog.type === 'confirm') resolve({ id: dialog.id, type: 'confirm', value: false });
              if (dialog.type === 'prompt') resolve({ id: dialog.id, type: 'prompt', value: null });
            }}
          >
            {dialog.cancelText}
          </button>
          <button
            type="button"
            className="px-4 py-2 rounded-lg bg-indigo-600 text-sm font-medium text-white hover:bg-indigo-700"
            onClick={() => {
              if (dialog.type === 'confirm') resolve({ id: dialog.id, type: 'confirm', value: true });
              if (dialog.type === 'prompt') resolve({ id: dialog.id, type: 'prompt', value: inputValue });
            }}
          >
            {dialog.confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

