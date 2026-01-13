/** Prizes API endpoints */

const getAuthHeaders = (): Record<string, string> => {
  const token = sessionStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export interface PrizeDTO {
  id: string;
  title: string;
  description?: string | null;
  points: number;
  targetAudience: string;
  image?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export const getPrizesAPI = async (): Promise<any> => {
  const response = await fetch(`${import.meta.env.VITE_API_URL}/prizes`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...getAuthHeaders(),
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.message || 'Error al obtener premios');
  }
  return data;
};

export const createPrizeAPI = async (body: Omit<PrizeDTO, 'id' | 'createdAt' | 'updatedAt'>): Promise<any> => {
  const response = await fetch(`${import.meta.env.VITE_API_URL}/prizes`, {
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
    throw new Error(data?.message || 'Error al crear premio');
  }
  return data;
};

export const updatePrizeAPI = async (id: string, body: Partial<PrizeDTO>): Promise<any> => {
  const response = await fetch(`${import.meta.env.VITE_API_URL}/prizes/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.message || 'Error al actualizar premio');
  }
  return data;
};

export const deletePrizeAPI = async (id: string): Promise<any> => {
  const response = await fetch(`${import.meta.env.VITE_API_URL}/prizes/${id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...getAuthHeaders(),
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.message || 'Error al eliminar premio');
  }
  return data;
};

