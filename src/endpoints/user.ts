import type { ApiUsersResponse } from '../types/auth';

/**
 * Get all users
 * @param includePassword - Optional parameter to include decrypted passwords
 */
export const getUsersAPI = async ({includePassword}: {includePassword?: boolean}): Promise<ApiUsersResponse> => {
    const token = sessionStorage.getItem('auth_token');
    const url = new URL(`${import.meta.env.VITE_API_URL}/users`);
    
    // Add query parameter if includePassword is true
    if (includePassword) {
        url.searchParams.append('include_password', 'true');
    }
    
    const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
    });
    return response.json();
};

/**
 * Get user by ID
 */
export const getUserByIdAPI = async ({id, includePassword}: {id: number, includePassword?: boolean}): Promise<any> => {
    const token = sessionStorage.getItem('auth_token');
    const url = new URL(`${import.meta.env.VITE_API_URL}/users/${id}`);
    
    // Add query parameter if includePassword is true
    if (includePassword) {
        url.searchParams.append('include_password', 'true');
    }
    
    const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
    });
    return response.json();
};

/**
 * Create a new user
 */
export const createUserAPI = async (body: object): Promise<any> => {
    const token = sessionStorage.getItem('auth_token');
    const response = await fetch(`${import.meta.env.VITE_API_URL}/users`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
    });
    return response.json();
};

/**
 * Update an existing user
 */
export const updateUserAPI = async (id: number, body: object): Promise<any> => {
    const token = sessionStorage.getItem('auth_token');
    const response = await fetch(`${import.meta.env.VITE_API_URL}/users/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
    });
    return response.json();
};

/**
 * Update user status
 */
export const updateUserStatusAPI = async (id: number, body: object): Promise<any> => {
    const token = sessionStorage.getItem('auth_token');
    const response = await fetch(`${import.meta.env.VITE_API_URL}/users/${id}/status`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
    });
    return response.json();
};

/**
 * Delete a user
 * 
 * @param id - The ID of the user to delete
 * @returns Promise with the response data
 */
export const deleteUserAPI = async (id: number): Promise<any> => {
    const token = sessionStorage.getItem('auth_token');
    const response = await fetch(`${import.meta.env.VITE_API_URL}/users/${id}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
    });
    return response.json();
};

/**
 * Upload profile photo for current authenticated user
 */
export const uploadMyProfilePhotoAPI = async (file: File): Promise<any> => {
    const token = sessionStorage.getItem('auth_token');
    const form = new FormData();
    form.append('file', file);

    const response = await fetch(`${import.meta.env.VITE_API_URL}/me/profile-photo`, {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: form,
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data?.message || 'Error al subir la foto de perfil');
    }
    return data;
};