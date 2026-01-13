/** Prize Redemption API endpoints */

const getAuthHeaders = (): Record<string, string> => {
  const token = sessionStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const getPrizeRedemptionsAPI = async (params?: { status?: string; userId?: string }): Promise<any> => {
  const url = new URL(`${import.meta.env.VITE_API_URL}/prize-redemptions`);
  if (params?.status) url.searchParams.set('status', params.status);
  if (params?.userId) url.searchParams.set('user_id', params.userId);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...getAuthHeaders(),
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.message || 'Error al obtener solicitudes de canje');
  }
  return data;
};

export const createPrizeRedemptionAPI = async (body: { prize_id: string; user_id: string }): Promise<any> => {
  const response = await fetch(`${import.meta.env.VITE_API_URL}/prize-redemptions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.message || 'Error al crear solicitud de canje');
  }
  return data;
};

export const updatePrizeRedemptionStatusAPI = async (id: string, status: 'approved' | 'rejected'): Promise<any> => {
  const response = await fetch(`${import.meta.env.VITE_API_URL}/prize-redemptions/${id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ status }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.message || 'Error al actualizar solicitud de canje');
  }
  return data;
};

