/** Event Finalization API endpoints (auth required) */

type ApiResponse<T> = { status?: number; message?: string; data?: T };

const getAuthHeaders = (): Record<string, string> => {
  const token = sessionStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const getEventFinalizationAPI = async (eventId: string): Promise<ApiResponse<any>> => {
  const response = await fetch(`${import.meta.env.VITE_API_URL}/bolt-events/${encodeURIComponent(eventId)}/finalization`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      ...getAuthHeaders(),
    },
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((json as any)?.message || 'Error loading event finalization');
  }
  return json as ApiResponse<any>;
};

export const upsertEventFinalizationAPI = async (eventId: string, body: Record<string, any>): Promise<ApiResponse<any>> => {
  const response = await fetch(`${import.meta.env.VITE_API_URL}/bolt-events/${encodeURIComponent(eventId)}/finalization`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(body),
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((json as any)?.message || 'Error saving event finalization');
  }
  return json as ApiResponse<any>;
};

export const deleteEventFinalizationAPI = async (eventId: string): Promise<ApiResponse<boolean>> => {
  const response = await fetch(`${import.meta.env.VITE_API_URL}/bolt-events/${encodeURIComponent(eventId)}/finalization`, {
    method: 'DELETE',
    headers: {
      Accept: 'application/json',
      ...getAuthHeaders(),
    },
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((json as any)?.message || 'Error deleting event finalization');
  }
  return json as ApiResponse<boolean>;
};

