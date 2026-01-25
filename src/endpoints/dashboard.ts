const API_BASE = import.meta.env.VITE_API_URL as string;

const getAuthHeaders = (): Record<string, string> => {
  const token = sessionStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const getSuperAdminDashboardAPI = async (params: { dateFilter?: string; specificDate?: string } = {}): Promise<any> => {
  const url = new URL(`${API_BASE}/dashboard/super-admin`);
  if (params.dateFilter) url.searchParams.set('dateFilter', params.dateFilter);
  if (params.specificDate) url.searchParams.set('specificDate', params.specificDate);

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: { Accept: 'application/json', ...getAuthHeaders() },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as any)?.message || 'Error loading dashboard');
  return json;
};

export const getCreatorDashboardAPI = async (): Promise<any> => {
  const res = await fetch(`${API_BASE}/dashboard/creator`, {
    method: 'GET',
    headers: { Accept: 'application/json', ...getAuthHeaders() },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as any)?.message || 'Error loading creator dashboard');
  return json;
};

export const getAdminDashboardAPI = async (): Promise<any> => {
  const res = await fetch(`${API_BASE}/dashboard/admin`, {
    method: 'GET',
    headers: { Accept: 'application/json', ...getAuthHeaders() },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as any)?.message || 'Error loading admin dashboard');
  return json;
};

export const getCreatorEventConfigAPI = async (eventId: string | number): Promise<any> => {
  const res = await fetch(`${API_BASE}/dashboard/creator/events/${encodeURIComponent(String(eventId))}/config`, {
    method: 'GET',
    headers: { Accept: 'application/json', ...getAuthHeaders() },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as any)?.message || 'Error loading event config');
  return json;
};

export const getAdminEventConfigAPI = async (eventId: string | number): Promise<any> => {
  const res = await fetch(`${API_BASE}/dashboard/admin/events/${encodeURIComponent(String(eventId))}/config`, {
    method: 'GET',
    headers: { Accept: 'application/json', ...getAuthHeaders() },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as any)?.message || 'Error loading event config');
  return json;
};

