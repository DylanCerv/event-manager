export interface UserAccess {
  id: string;
  accessType: 'control_acceso' | 'seguridad' | 'catering' | 'moderador';
  name: string;
  lastName: string;
  username: string;
  password: string;
  assignedEvents: string[]; // Array of event IDs (for non-moderator roles)
  assignedEventBooks?: string[]; // Array of EventBook IDs (for moderator role)
  createdAt: string;
  createdBy: string; // Admin ID who created this access
}

export interface CreateUserAccessData {
  accessType: 'control_acceso' | 'seguridad' | 'catering' | 'moderador';
  name: string;
  lastName: string;
  username: string;
  password: string;
}