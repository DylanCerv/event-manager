import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthContextType, LoginResponse, ApiUser, ApiRole } from '../types/auth';
import { loginAPI } from '../endpoints/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [role, setRole] = useState<ApiRole | null>(null);

  const updateUserPhoto = (photoUrl: string) => {
    if (user) {
      setUser({ ...user, profile_photo: photoUrl });
    }
  };

  const loginWithApi = async (email: string, password: string) => {
    try {
      const responseApi: LoginResponse = await loginAPI(email, password);

      // Local storage for token and user
      sessionStorage.setItem('auth_token', responseApi.token);
      sessionStorage.setItem('user', JSON.stringify(responseApi.user));

      const apiUser = responseApi.user;
      const roleName = apiUser.role?.name.toString().toUpperCase() || 'ADMIN';

      const formatResponse = {  
        ...apiUser,
        role: {
          id: apiUser.role?.id.toString() || 'admin',
          name: roleName as string
        }
      };
      
      setUser(formatResponse);
      setRole(formatResponse.role as ApiRole);
      // storage.setCurrentUser({ id: apiUser.id.toString(), role: roleName });
      return formatResponse;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    setRole(null);
    // storage.setCurrentUser({ id: '', role: '' });
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('auth_token');
    // Redirigir a la página de inicio de sesión
    window.location.href = '/';
  };


  useEffect(() => {
    const user = sessionStorage.getItem('user');
    if (user) {
      const userData = JSON.parse(user);
      setUser(userData);
      setRole(userData.role as ApiRole);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, loginWithApi, logout, updateUserPhoto }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}