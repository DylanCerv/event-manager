import type { EventCard } from '../types/event';

const token = sessionStorage.getItem('auth_token');

// Función para obtener la tarjeta interactiva por ID de evento
export const getInteractiveCardByEventId = async (eventId: string | number): Promise<EventCard> => {
    try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/interactive-cards/event/${eventId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Failed to get interactive card');
        }
        
        return data;
    } catch (error) {
        console.error('Get interactive card by event ID error:', error);
        throw error;
    }
};

// Función para obtener la tarjeta interactiva por su propio ID
export const getInteractiveCardById = async (id: string | number): Promise<EventCard> => {
    try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/interactive-cards/${id}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Failed to get interactive card');
        }
        
        return data;
    } catch (error) {
        console.error('Get interactive card by ID error:', error);
        throw error;
    }
};

// Función para crear una nueva tarjeta interactiva
export const createInteractiveCard = async (body: FormData): Promise<EventCard> => {
    try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/interactive-cards`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
            body: body,
        });
        
        const responseData = await response.json();
        
        if (!response.ok) {
            throw new Error(responseData.message || 'Failed to create interactive card');
        }
        
        return responseData;
    } catch (error) {
        console.error('Create interactive card error:', error);
        throw error;
    }
};

// Función para actualizar una tarjeta interactiva existente
export const updateInteractiveCard = async (id: string | number, data: FormData): Promise<EventCard> => {
    try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/interactive-cards/${id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                // No establecer Content-Type para FormData, el navegador lo hará automáticamente con el boundary correcto
            },
            body: data,
        });
        
        const responseData = await response.json();
        
        if (!response.ok) {
            throw new Error(responseData.message || 'Failed to update interactive card');
        }
        
        return responseData;
    } catch (error) {
        console.error('Update interactive card error:', error);
        throw error;
    }
};

// Función para eliminar una tarjeta interactiva
export const deleteInteractiveCard = async (id: string | number): Promise<void> => {
    try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/interactive-cards/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });
        
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || 'Failed to delete interactive card');
        }
    } catch (error) {
        console.error('Delete interactive card error:', error);
        throw error;
    }
};