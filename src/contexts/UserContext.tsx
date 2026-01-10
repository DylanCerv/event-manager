import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ApiUser, Role } from '../types/auth';
import { getUsersAPI } from '../endpoints/user';
import { useAuth } from './AuthContext';

interface UserContextType {
    users: ApiUser[];
    loading: boolean;
    error: string | null;
    fetchUsers: () => Promise<ApiUser[]>;
    filterByRoleId: (role: Role) => ApiUser[];
    getByRoleName: (roleName: string) => ApiUser[];
    getUserById: (id: number | string) => ApiUser | undefined;
    user: ApiUser | null; // current authenticated user (from AuthContext)
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
    const { user: authUser } = useAuth();
    const [users, setUsers] = useState<ApiUser[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const fetchUsers = async (): Promise<ApiUser[]> => {
        setLoading(true);
        setError(null);
        try {
            const response = await getUsersAPI({includePassword: true});
            // @ts-ignore
            const listUsers: any[] = response?.data || [];
            setUsers(listUsers);
            return listUsers as ApiUser[];
        } catch (err: any) {
            setError(err?.message || 'Failed to load users');
            return [];
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const filterByRoleId = (role: Role) => {
        let role_id = 0;
        if (role === 'SUPER_ADMIN') {
            role_id = 1;
        } else if (role === 'ADMIN') {
            role_id = 2;
        } else if (role === 'ACCESS_CONTROL') {
            role_id = 3;
        } else if (role === 'MODERATOR') {
            role_id = 4;
        } else if (role === 'CREATOR') {
            role_id = 5;
        } else if (role === 'GUEST') {  
            role_id = 6;
        }
        return users.filter(u => String((u as any).role_id ?? u.role?.id) === String(role_id));
    };

    const getByRoleName = (roleName: string) => {
        const name = roleName.toUpperCase();
        return users.filter(u => (u.role?.name as string | undefined)?.toUpperCase() === name);
    };

    const getUserById = (id: number | string) => {
        const targetId = String(id);
        return users.find(u => String(u.id) === targetId);
    };

    const value = useMemo<UserContextType>(() => ({
        users,
        loading,
        error,
        fetchUsers,
        filterByRoleId,
        getByRoleName,
        getUserById,
        user: authUser,
    }), [users, loading, error, authUser]);

    return (
        <UserContext.Provider value={value}>
            {children}
        </UserContext.Provider>
    );
}

export function useUser() {
    const ctx = useContext(UserContext);
    if (!ctx) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return ctx;
}


