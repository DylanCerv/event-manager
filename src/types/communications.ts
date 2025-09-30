export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  isActive: boolean;
  targetRole: 'ADMIN' | 'CREATOR' | 'ALL';
  createdAt: string;
  createdBy: string;
}

export interface SystemUpdate {
  id: string;
  title: string;
  message: string;
  type: 'feature' | 'reminder' | 'maintenance' | 'announcement';
  date: string;
  isActive: boolean;
  targetRole: 'ADMIN' | 'CREATOR' | 'ALL';
  createdAt: string;
  createdBy: string;
}

export interface CommunicationFormData {
  title: string;
  message: string;
  type: string;
  date?: string;
  targetRole: 'ADMIN' | 'CREATOR' | 'ALL';
}