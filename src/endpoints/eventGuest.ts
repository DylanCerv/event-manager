/** Event Guests API endpoints */

const getAuthHeaders = (): Record<string, string> => {
    const token = sessionStorage.getItem('auth_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
};

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
                ...getAuthHeaders(),
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
                ...getAuthHeaders(),
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
                // Evita el overlay global en edición inline (lista invitados / QR access)
                'X-Silent-Loading': '1',
                ...getAuthHeaders(),
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
 * Upload guest video (multipart/form-data)
 */
export const uploadEventGuestVideoAPI = async (eventId: number, guestNumber: string | number, file: File): Promise<any> => {
    try {
        const formData = new FormData();
        formData.append('video', file);

        const response = await fetch(`${import.meta.env.VITE_API_URL}/event-guests/${eventId}/${guestNumber}/video`, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                ...getAuthHeaders(),
            },
            body: formData,
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || `Error al subir video del invitado ${guestNumber} del evento ${eventId}`);
        }
        return data;
    } catch (error) {
        console.error(`Error en uploadEventGuestVideoAPI (EventID: ${eventId}, GuestNumber: ${guestNumber}):`, error);
        throw error;
    }
};

/**
 * Upload guest video with progress (XHR)
 */
export const uploadEventGuestVideoWithProgressAPI = (
    eventId: number,
    guestNumber: string | number,
    file: File,
    onProgress?: (percent: number) => void
): Promise<any> => {
    const token = sessionStorage.getItem('auth_token');
    return new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append('video', file);

        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${import.meta.env.VITE_API_URL}/event-guests/${eventId}/${guestNumber}/video`);
        xhr.setRequestHeader('Accept', 'application/json');
        xhr.setRequestHeader('X-Silent-Loading', '1');
        if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

        xhr.upload.onprogress = (evt) => {
            if (!evt.lengthComputable) return;
            const percent = Math.max(0, Math.min(100, Math.round((evt.loaded / evt.total) * 100)));
            onProgress?.(percent);
        };

        xhr.onload = () => {
            try {
                const data = JSON.parse(xhr.responseText || '{}');
                if (xhr.status < 200 || xhr.status >= 300) {
                    reject(new Error(data?.message || `Error al subir video del invitado ${guestNumber} del evento ${eventId}`));
                    return;
                }
                resolve(data);
            } catch (e) {
                reject(e);
            }
        };

        xhr.onerror = () => reject(new Error('Error de red al subir el video'));
        xhr.onabort = () => reject(new Error('Subida de video cancelada'));

        xhr.send(formData);
    });
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
            ...getAuthHeaders(),
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


