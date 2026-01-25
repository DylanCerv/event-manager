/** Points API endpoints */

const getAuthHeaders = (): Record<string, string> => {
  const token = sessionStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const getPointBalancesAPI = async (role?: 'ADMIN' | 'CREATOR' | 'ALL'): Promise<any> => {
  const url = new URL(`${import.meta.env.VITE_API_URL}/points/balances`);
  if (role) url.searchParams.set('role', role);

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
    throw new Error(data?.message || 'Error al obtener balances de puntos');
  }
  return data;
};

export const getPointTransactionsAPI = async (userId: string): Promise<any> => {
  const response = await fetch(`${import.meta.env.VITE_API_URL}/points/transactions/${userId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      // No mostrar overlay global para este fetch (se usa en navbar/dropdown)
      'X-Silent-Loading': '1',
      ...getAuthHeaders(),
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.message || 'Error al obtener transacciones de puntos');
  }
  return data;
};

export const adjustPointsAPI = async (body: { user_id: string; points: number; action: 'add' | 'subtract'; reason: string }): Promise<any> => {
  const response = await fetch(`${import.meta.env.VITE_API_URL}/points/adjust`, {
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
    throw new Error(data?.message || 'Error al ajustar puntos');
  }
  return data;
};

