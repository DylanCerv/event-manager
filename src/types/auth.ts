export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'GUEST' | 'ACCESS_CONTROL' | 'MODERATOR' | 'CREATOR';

export interface User {
  id: string;
  name: string;
  role: Role;
  company?: string;
  profilePhoto?: string;
  createdBy?: string;
}

export interface AuthContextType {
  user: User | null;
  login: (role: Role, username?: string, password?: string) => Promise<void>;
  logout: () => void;
  updateUserPhoto: (photoUrl: string) => void;
}