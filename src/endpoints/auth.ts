import { LoginResponse } from '../types/auth';

/**
 * Login with identifier (email or username) and password
 */
export const loginAPI = async (email: string, password: string): Promise<LoginResponse> => {
    try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify({ email: email, password }),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Invalid credentials');
        }
        
        return data;
    } catch (error) {
        console.error('Login API error:', error);
        throw error;
    }
};

/**
 * Get current user data using JWT token
 * @param jwt JWT token
 * @returns Promise with user data
 */
export const getUserByJwtAPI = async (jwt: string) => {
    try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/me`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${jwt}`,
                'Content-Type': 'application/json',
            },
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Failed to get user data');
        }
        
        return data;
    } catch (error) {
        console.error('Get user by JWT API error:', error);
        throw error;
    }
};

/**
 * Reset user password
 * @param email User email
 * @param password New password
 * @param password_confirmation Password confirmation
 * @returns Promise with reset result
 */
export const resetPasswordAPI = async (email: string, password: string, password_confirmation: string) => {
    try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/reset-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password, password_confirmation }),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Failed to reset password');
        }
        
        return data;
    } catch (error) {
        console.error('Reset password API error:', error);
        throw error;
    }
};
