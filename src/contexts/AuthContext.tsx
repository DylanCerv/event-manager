import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthContextType, LoginResponse, ApiUser, ApiRole } from '../types/auth';
import { loginAPI } from '../endpoints/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [role, setRole] = useState<ApiRole | null>(null);
  const [isAuthInitialized, setIsAuthInitialized] = useState(false);

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
      setIsAuthInitialized(true);
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
    // Clear user-scoped caches to avoid leaking previous user data
    localStorage.removeItem('events');
    localStorage.removeItem('guests');
    localStorage.removeItem('admin_users');
    localStorage.removeItem('event_requests');
    localStorage.removeItem('eventbooks');
    localStorage.removeItem('commissions_data');
    localStorage.removeItem('user_accesses');
    localStorage.removeItem('prizes');
    localStorage.removeItem('userPoints');
    localStorage.removeItem('userTransactions');
    localStorage.removeItem('admin_notifications');
    localStorage.removeItem('system_updates');
    // Redirigir a la página de inicio de sesión
    window.location.href = '/';
  };


  useEffect(() => {
    try {
      const storedUser = sessionStorage.getItem('user');
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        setRole(userData.role as ApiRole);
      }
    } catch {
      sessionStorage.removeItem('user');
      sessionStorage.removeItem('auth_token');
      setUser(null);
      setRole(null);
    } finally {
      setIsAuthInitialized(true);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, loginWithApi, logout, updateUserPhoto, isAuthInitialized }}>
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