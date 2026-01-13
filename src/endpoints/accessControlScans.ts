/** Access Control scan log endpoints (auth required) */

type ScanStatus = 'success' | 'duplicate' | 'denied' | 'invalid';
type ScanMethod = 'reader' | 'camera' | 'manual';

const getAuthHeaders = (): Record<string, string> => {
  const token = sessionStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const getAccessControlScansAPI = async (eventId: number, limit = 500): Promise<any> => {
  const url = new URL(`${import.meta.env.VITE_API_URL}/access-control/scans`);
  url.searchParams.set('bolt_event_id', String(eventId));
  url.searchParams.set('limit', String(limit));

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      ...getAuthHeaders(),
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((data as any)?.message || 'Error al obtener historial de escaneos');
  }
  return data;
};

export const logAccessControlScanAPI = async (body: {
  bolt_event_id: number;
  qr_code?: string | null;
  scan_method?: ScanMethod | string | null;
  status: ScanStatus | string;
  message?: string | null;
  meta?: Record<string, any> | null;
}): Promise<any> => {
  const response = await fetch(`${import.meta.env.VITE_API_URL}/access-control/scans`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((data as any)?.message || 'Error al registrar escaneo');
  }
  return data;
};

export const clearAccessControlScansAPI = async (eventId: number): Promise<any> => {
  const response = await fetch(`${import.meta.env.VITE_API_URL}/access-control/scans`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ bolt_event_id: eventId }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((data as any)?.message || 'Error al limpiar historial de escaneos');
  }
  return data;
};

