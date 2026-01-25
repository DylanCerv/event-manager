/** Event Requests API endpoints */

const getAuthHeaders = (): Record<string, string> => {
    const token = sessionStorage.getItem('auth_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * Get all event requests
 */
export const getEventRequestsAPI = async (include: string = 'bolt_event,creator,bolt_event.creator'): Promise<any> => {
    try {
        const includeParam = include ? `?include=${include}` : '';
        const response = await fetch(`${import.meta.env.VITE_API_URL}/event-requests${includeParam}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                ...getAuthHeaders(),
            },
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Error al obtener solicitudes de eventos');
        }
        return data;
    } catch (error) {
        console.error('Error en getEventRequestsAPI:', error);
        throw error;
    }
};

/**
 * Get event request by ID
 */
export const getEventRequestByIdAPI = async (id: number, include?: string): Promise<any> => {
    try {
        const includeParam = include ? `?include=${include}` : '';
        const response = await fetch(`${import.meta.env.VITE_API_URL}/event-requests/${id}${includeParam}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                ...getAuthHeaders(),
            },
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || `Error al obtener solicitud de evento con ID ${id}`);
        }
        return data;
    } catch (error) {
        console.error(`Error en getEventRequestByIdAPI (ID: ${id}):`, error);
        throw error;
    }
};

/**
 * Create a new event request
 */
export const createEventRequestAPI = async (body: { bolt_event_id: number; creator_id: number; request_details?: string }): Promise<any> => {
    try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/event-requests`, {
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
            throw new Error(data.message || 'Error al crear solicitud de evento');
        }
        return data;
    } catch (error) {
        console.error('Error en createEventRequestAPI:', error);
        throw error;
    }
};

/**
 * Update event request status
 */
export const updateEventRequestStatusAPI = async (id: number, status: 'pending' | 'approved' | 'rejected', processed?: boolean): Promise<any> => {
    try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/event-requests/${id}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                ...getAuthHeaders(),
            },
            body: JSON.stringify({ status, processed }),
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || `Error al actualizar estado de solicitud de evento con ID ${id}`);
        }
        return data;
    } catch (error) {
        console.error(`Error en updateEventRequestStatusAPI (ID: ${id}):`, error);
        throw error;
    }
};

/**
 * Delete event request
 */
export const deleteEventRequestAPI = async (id: number): Promise<any> => {
    try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/event-requests/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                ...getAuthHeaders(),
            },
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || `Error al eliminar solicitud de evento con ID ${id}`);
        }
        return data;
    } catch (error) {
        console.error(`Error en deleteEventRequestAPI (ID: ${id}):`, error);
        throw error;
    }
};

/**
 * Archive/unarchive an event request
 */
export const archiveEventRequestAPI = async (id: number, archived: boolean = true): Promise<any> => {
    try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/event-requests/${id}/archive`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                ...getAuthHeaders(),
            },
            body: JSON.stringify({ archived }),
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || `Error al archivar solicitud de evento con ID ${id}`);
        }
        return data;
    } catch (error) {
        console.error(`Error en archiveEventRequestAPI (ID: ${id}):`, error);
        throw error;
    }
};
