import React, { createContext, useContext, useState } from 'react';
import { AuthContextType, Role, User } from '../types/auth';
import { storage } from '../lib/storage';
import { rolesStorage } from '../lib/roles-storage';
import { creatorsStorage } from '../lib/creators-storage';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const updateUserPhoto = (photoUrl: string) => {
    if (user) {
      setUser({ ...user, profilePhoto: photoUrl });
    }
  };

  const login = async (role: Role, username?: string, password?: string) => {
    if (role === 'SUPER_ADMIN') {
      setUser({
        id: 'super-admin',
        name: 'Super Admin',
        role: 'SUPER_ADMIN',
      });
      // Set current user for data isolation
      storage.setCurrentUser({ id: 'super-admin', role: 'SUPER_ADMIN' });
      return;
    }

    // Try to login with access control users and moderators
    const accessControlUsers = await rolesStorage.getUserAccesses('all'); // Get all access control users
    console.log('Access control users found:', accessControlUsers);
    
    // Check for moderator login
    const foundModerator = accessControlUsers.find(u => 
      u.username === username && 
      u.password === password &&
      u.accessType === 'moderador'
    );
    
    if (foundModerator) {
      // Verificar que el administrador que creó este usuario esté activo
      const users = await storage.getUsers();
      const creatorAdmin = users.find(u => u.id === foundModerator.createdBy);
      
      if (!creatorAdmin || creatorAdmin.status === 'suspended') {
        throw new Error('Acceso denegado: Tu cuenta de administrador creador está inactiva o suspendida');
      }
      
      setUser({
        id: foundModerator.id,
        name: `${foundModerator.firstName} ${foundModerator.lastName}`,
        role: 'MODERATOR',
        createdBy: foundModerator.createdBy,
      });
      // Set current user for data isolation
      storage.setCurrentUser({ id: foundModerator.id, role: 'MODERATOR' });
      console.log('User logged in as MODERATOR:', foundModerator);
      return;
    }
    
    // Check for access control login
    const foundAccessUser = accessControlUsers.find(u => 
      u.username === username && 
      u.password === password &&
      u.accessType === 'control_acceso'
    );
    console.log('Found access user:', foundAccessUser);

    if (foundAccessUser) {
      // Verificar que el administrador que creó este usuario esté activo
      const users = await storage.getUsers();
      const creatorAdmin = users.find(u => u.id === foundAccessUser.createdBy);
      
      if (!creatorAdmin || creatorAdmin.status === 'suspended') {
        throw new Error('Acceso denegado: Tu cuenta de administrador creador está inactiva o suspendida');
      }
      
      setUser({
        id: foundAccessUser.id,
        name: `${foundAccessUser.firstName} ${foundAccessUser.lastName}`,
        role: 'ACCESS_CONTROL',
        createdBy: foundAccessUser.createdBy,
      });
      // Set current user for data isolation
      storage.setCurrentUser({ id: foundAccessUser.id, role: 'ACCESS_CONTROL' });
      console.log('User logged in as ACCESS_CONTROL:', foundAccessUser);
      return;
    }

    // Check for creator login
    if (role === 'CREATOR' && username && password) {
      const creators = await creatorsStorage.getCreators();
      const foundCreator = creators.find(c => 
        c.username === username && 
        c.password === password
      );

      if (foundCreator) {
        if (foundCreator.status === 'suspended') {
          throw new Error('Creator account is suspended');
        } else if (foundCreator.status === 'active') {
          setUser({
            id: foundCreator.id,
            name: `${foundCreator.firstName} ${foundCreator.lastName}`,
            role: 'CREATOR',
          });
          // Set current user for data isolation
          storage.setCurrentUser({ id: foundCreator.id, role: 'CREATOR' });
          return;
        }
      }
    }

    if (role === 'ADMIN' && username && password) {
      // Get users from storage and find matching credentials
      const users = await storage.getUsers();
      const foundUser = users.find(u => 
        u.username === username && 
        u.password === password 
      );

      if (foundUser) {
        if (foundUser.status === 'suspended') {
          throw new Error('User account is suspended');
        } else if (foundUser.status === 'active') {
          setUser({
            id: foundUser.id,
            name: `${foundUser.firstName} ${foundUser.lastName}`,
            role: 'ADMIN',
            company: foundUser.company,
            profilePhoto: foundUser.profilePhoto,
            createdBy: foundUser.createdBy,
          });
          // Set current user for data isolation
          storage.setCurrentUser({ id: foundUser.id, role: 'ADMIN' });
          return;
        }
      }
    }

    throw new Error('Invalid credentials');
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem('current_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUserPhoto }}>
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