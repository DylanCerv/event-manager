/** Bolt Events API endpoints */

const getAuthHeaders = (): Record<string, string> => {
    const token = sessionStorage.getItem('auth_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * Interface for Bolt Event query parameters
 */
interface BoltEventQueryParams {
    include_requests?: boolean;
    creator_id?: number;
    user_id?: number;
    start_date?: string;
    end_date?: string;
}

/**
 * Get all Bolt Events with optional filters
 * 
 * @param queryParams Optional query parameters for filtering events
 * @returns Promise with the API response containing bolt events
 */
export const getBoltEventsAPI = async ({ queryParams }: { queryParams?: BoltEventQueryParams }): Promise<any> => {
    try {
        const urlParams = new URLSearchParams();
        
        // Add all query parameters if provided
        if (queryParams?.include_requests) urlParams.append('include_requests', 'true');
        if (queryParams?.creator_id) urlParams.append('creator_id', queryParams.creator_id.toString());
        if (queryParams?.user_id) urlParams.append('user_id', queryParams.user_id.toString());
        if (queryParams?.start_date) urlParams.append('start_date', queryParams.start_date);
        if (queryParams?.end_date) urlParams.append('end_date', queryParams.end_date);
        
        let url = `${import.meta.env.VITE_API_URL}/bolt-events?${urlParams.toString()}`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                ...getAuthHeaders(),
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
                ...getAuthHeaders(),
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
 * 
 * @param id The ID of the event to retrieve
 * @param includeRequests Whether to include request data in the response
 * @returns Promise with the API response containing the event
 */
export const getBoltEventByIdAPI = async (id: number, includeRequests: boolean = false): Promise<any> => {
    try {
        const urlParams = new URLSearchParams();
        if (includeRequests) urlParams.append('include_requests', 'true');
        
        const url = `${import.meta.env.VITE_API_URL}/bolt-events/${id}?${urlParams.toString()}`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                ...getAuthHeaders(),
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
 * Get a Bolt Event by ID without triggering global loading overlay
 */
export const getBoltEventByIdSilentAPI = async (id: number, includeRequests: boolean = false): Promise<any> => {
    try {
        const urlParams = new URLSearchParams();
        if (includeRequests) urlParams.append('include_requests', 'true');
        
        const url = `${import.meta.env.VITE_API_URL}/bolt-events/${id}?${urlParams.toString()}`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'X-Silent-Loading': '1',
                ...getAuthHeaders(),
            },
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || `Error al obtener evento con ID ${id}`);
        }
        return data;
    } catch (error) {
        console.error(`Error en getBoltEventByIdSilentAPI (ID: ${id}):`, error);
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
                ...getAuthHeaders(),
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
 * Update an existing Bolt Event without triggering global loading overlay
 */
export const updateBoltEventSilentAPI = async (id: number, body: object): Promise<any> => {
    try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/bolt-events/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'X-Silent-Loading': '1',
                ...getAuthHeaders(),
            },
            body: JSON.stringify(body),
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || `Error al actualizar evento con ID ${id}`);
        }
        return data;
    } catch (error) {
        console.error(`Error en updateBoltEventSilentAPI (ID: ${id}):`, error);
        throw error;
    }
};

/**
 * Delete a Bolt Event
 * The backend responds with 204 No Content (empty body), so we must NOT call response.json().
 */
export const deleteBoltEventAPI = async (id: number): Promise<void> => {
    try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/bolt-events/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                ...getAuthHeaders(),
            },
        });
        if (!response.ok) {
            let errorMessage = `Error al eliminar evento con ID ${id}`;
            try {
                const data = await response.json();
                errorMessage = data.message || errorMessage;
            } catch { /* body vacío o no es JSON */ }
            throw new Error(errorMessage);
        }
        // 204 No Content — no hay body que parsear
    } catch (error) {
        console.error(`Error en deleteBoltEventAPI (ID: ${id}):`, error);
        throw error;
    }
};

