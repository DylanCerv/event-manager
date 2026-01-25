import { useSyncExternalStore } from 'react';
import { useLocation } from 'react-router-dom';
import { loadingStore } from '../lib/loadingStore';

// El spinner mantiene los colores originales.
function Spinner() {
  return (
    <span
      className="inline-block h-8 w-8"
      aria-hidden="true"
    >
      <svg
        className="animate-spin"
        viewBox="0 0 32 32"
        fill="none"
        width="100%"
        height="100%"
      >
        <circle
          className="opacity-20"
          cx="16"
          cy="16"
          r="13"
          stroke="var(--tw-prose-invert)"
          strokeWidth="3"
        />
        <path
          d="M29 16a13 13 0 1 0-2.73 7.97"
          stroke="#3B82F6"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

export function GlobalLoadingOverlay() {
  const location = useLocation();
  const pendingCount = useSyncExternalStore(loadingStore.subscribe, loadingStore.getSnapshot);
  const isVisible = pendingCount > 0;

  const pathname = location.pathname || '/';

  // No mostrar overlay global en rutas públicas (guest / login)
  const segments = pathname.split('/').filter(Boolean);
  const reserved = new Set([
    'login',
    'home',
    'events',
    'eventbook',
    'usuarios',
    'roles',
    'requests',
    'feedback',
    'communications',
    'creadores',
    'configuraciones',
    'super-admin',
    'creator',
    'access-control',
    'moderador',
    'invitation',
  ]);

  const isLoginRoute = pathname === '/' || pathname === '/login';
  const isInvitationRoute = pathname.startsWith('/invitation/');
  // Public EventBook route: "/:userSlug/:eventSlug" (first segment not reserved)
  const isPublicEventBookRoute = segments.length === 2 && !reserved.has(segments[0]);
  const disableOnThisRoute = isLoginRoute || isInvitationRoute || isPublicEventBookRoute;

  if (!isVisible || disableOnThisRoute) return null;

  // Fondo negro transparente y sin contenedor decorativo
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      <div className="flex flex-col items-center gap-2">
        <Spinner />
        <div className="text-sm font-medium text-white">Cargando...</div>
      </div>
    </div>
  );
}
