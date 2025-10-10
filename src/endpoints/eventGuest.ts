/** Event Guests API endpoints */

const token = sessionStorage.getItem('auth_token');

/**
 * Get all guests for a specific event
 */
export const getEventGuestsByEventIdAPI = async (eventId: number): Promise<any> => {
    try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/event-guests/event/${eventId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || `Error al obtener invitados del evento ${eventId}`);
        }
        return data;
    } catch (error) {
        console.error(`Error en getEventGuestsByEventIdAPI (EventID: ${eventId}):`, error);
        throw error;
    }
};

/**
 * Create a new Event Guest
 */
export const createEventGuestAPI = async (body: object): Promise<any> => {
    try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/event-guests`, {
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
            throw new Error(data.message || `Error al crear invitado para el evento`);
        }
        return data;
    } catch (error) {
        console.error(`Error en createEventGuestAPI (Body: ${JSON.stringify(body)}):`, error);
        throw error;
    }
};

/**
 * Update an existing Event Guest or create if not exists
 * @param eventId - The ID of the event
 * @param guestNumber - The guest number
 * @param body - The guest data to update
 */
export const updateEventGuestAPI = async (eventId: number, guestNumber: string | number, body: object): Promise<any> => {
    try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/event-guests/${eventId}/${guestNumber}`, {
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
            throw new Error(data.message || `Error al actualizar invitado ${guestNumber} del evento ${eventId}`);
        }
        return data;
    } catch (error) {
        console.error(`Error en updateEventGuestAPI (EventID: ${eventId}, GuestNumber: ${guestNumber}):`, error);
        throw error;
    }
};

/**
 * Delete an Event Guest
 */
export const deleteEventGuestAPI = async (id: number): Promise<any> => {
    try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/event-guests/${id}`, {
            method: 'DELETE',
            headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || `Error al eliminar invitado con ID ${id}`);
        }
        return data;
    } catch (error) {
        console.error(`Error en deleteEventGuestAPI (ID: ${id}):`, error);
        throw error;
    }
};


