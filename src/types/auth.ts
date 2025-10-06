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
  user: ApiUser | null;
  // login: (role: Role, username?: string, password?: string) => Promise<void>;
  loginWithApi: (email: string, password: string) => Promise<ApiUser>;
  logout: () => void;
  updateUserPhoto: (photoUrl: string) => void;
  role: ApiRole | null;
}

// API response types for authentication
export interface ApiRole {
  id: number | string;
  name: Role | string;
}

export interface ApiUser {
  id: number | string;
  name: string;
  last_name?: string;
  username?: string;
  email: string;
  country?: string | null;
  city?: string | null;
  address?: string | null;
  phone?: string | null;
  company?: string | null;
  role_id?: number;
  creator_id?: string | null;
  status?: string;
  email_verified_at?: string | null;
  created_at?: string;
  updated_at?: string;
  role?: ApiRole;
  profile_photo?: string;
  commission_percentage?: number;
  password?: string;
  password_plain?: string;
}

export interface LoginResponse {
  token: string;
  token_type: string;
  user: ApiUser;
}

export interface ApiUsersResponse {
  data: ApiUser[];
}