/** Bolt Events API endpoints */


const token = sessionStorage.getItem('auth_token');

/**
 * Get all Bolt Events
 */
export const getBoltEventsAPI = async ({ queryParams }: { queryParams?: { include_requests?: boolean } }): Promise<any> => {
    try {
        const urlParams = new URLSearchParams();
        if (queryParams?.include_requests) urlParams.append('include_requests', 'true');
        let url = `${import.meta.env.VITE_API_URL}/bolt-events?${urlParams.toString()}`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Error al obtener eventos');
        }
        return data;
    } catch (error) {
        console.error('Error en getBoltEventsAPI:', error);
        throw error;
    }
};

/**
 * Create a new Bolt Event
 */
export const createBoltEventAPI = async (body: object): Promise<any> => {
    try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/bolt-events`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(body),
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Error al crear evento');
        }
        return data;
    } catch (error) {
        console.error('Error en createBoltEventAPI:', error);
        throw error;
    }
};

/**
 * Get a Bolt Event by ID
 */
export const getBoltEventByIdAPI = async (id: number): Promise<any> => {
    try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/bolt-events/${id}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || `Error al obtener evento con ID ${id}`);
        }
        return data;
    } catch (error) {
        console.error(`Error en getBoltEventByIdAPI (ID: ${id}):`, error);
        throw error;
    }
};

/**
 * Update an existing Bolt Event
 */
export const updateBoltEventAPI = async (id: number, body: object): Promise<any> => {
    try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/bolt-events/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(body),
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || `Error al actualizar evento con ID ${id}`);
        }
        return data;
    } catch (error) {
        console.error(`Error en updateBoltEventAPI (ID: ${id}):`, error);
        throw error;
    }
};

/**
 * Delete a Bolt Event
 */
export const deleteBoltEventAPI = async (id: number): Promise<any> => {
    try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/bolt-events/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || `Error al eliminar evento con ID ${id}`);
        }
        return data;
    } catch (error) {
        console.error(`Error en deleteBoltEventAPI (ID: ${id}):`, error);
        throw error;
    }
};
