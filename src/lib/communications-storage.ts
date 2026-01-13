import type { Notification, SystemUpdate } from '../types/communications';

class CommunicationsStorage {
  private getAuthHeaders(): Record<string, string> {
    const token = sessionStorage.getItem('auth_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private getItem<T>(key: string): T[] {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : [];
  }

  private setItem<T>(key: string, value: T[]): void {
    localStorage.setItem(key, JSON.stringify(value));
  }

  // Notifications
  async getNotifications(): Promise<Notification[]> {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/communications/notifications`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...this.getAuthHeaders(),
        },
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json?.message || 'Error al obtener notificaciones');
      }
      return (json?.data || []) as Notification[];
    } catch (error) {
      console.error('Error loading notifications from API, falling back to localStorage:', error);
      return this.getItem<Notification>('admin_notifications');
    }
  }

  async createNotification(data: Omit<Notification, 'id' | 'createdAt'>): Promise<Notification> {
    const { createdBy: _createdBy, ...payload } = data;

    const response = await fetch(`${import.meta.env.VITE_API_URL}/communications/notifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify(payload),
    });
    const json = await response.json();
    if (!response.ok) {
      throw new Error(json?.message || 'Error al crear notificación');
    }
    return json.data as Notification;
  }

  async updateNotification(id: string, data: Partial<Notification>): Promise<void> {
    const { createdBy: _createdBy, createdAt: _createdAt, id: _id, ...payload } = data as any;

    const response = await fetch(`${import.meta.env.VITE_API_URL}/communications/notifications/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify(payload),
    });
    const json = await response.json();
    if (!response.ok) {
      throw new Error(json?.message || 'Error al actualizar notificación');
    }
  }

  async deleteNotification(id: string): Promise<void> {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/communications/notifications/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...this.getAuthHeaders(),
      },
    });
    const json = await response.json();
    if (!response.ok) {
      throw new Error(json?.message || 'Error al eliminar notificación');
    }
  }

  // System Updates
  async getSystemUpdates(): Promise<SystemUpdate[]> {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/communications/updates`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...this.getAuthHeaders(),
        },
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json?.message || 'Error al obtener actualizaciones del sistema');
      }
      return (json?.data || []) as SystemUpdate[];
    } catch (error) {
      console.error('Error loading system updates from API, falling back to localStorage:', error);
      return this.getItem<SystemUpdate>('system_updates');
    }
  }

  async createSystemUpdate(data: Omit<SystemUpdate, 'id' | 'createdAt'>): Promise<SystemUpdate> {
    const { createdBy: _createdBy, ...payload } = data;

    const response = await fetch(`${import.meta.env.VITE_API_URL}/communications/updates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify(payload),
    });
    const json = await response.json();
    if (!response.ok) {
      throw new Error(json?.message || 'Error al crear actualización del sistema');
    }
    return json.data as SystemUpdate;
  }

  async updateSystemUpdate(id: string, data: Partial<SystemUpdate>): Promise<void> {
    const { createdBy: _createdBy, createdAt: _createdAt, id: _id, ...payload } = data as any;

    const response = await fetch(`${import.meta.env.VITE_API_URL}/communications/updates/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify(payload),
    });
    const json = await response.json();
    if (!response.ok) {
      throw new Error(json?.message || 'Error al actualizar actualización del sistema');
    }
  }

  async deleteSystemUpdate(id: string): Promise<void> {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/communications/updates/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...this.getAuthHeaders(),
      },
    });
    const json = await response.json();
    if (!response.ok) {
      throw new Error(json?.message || 'Error al eliminar actualización del sistema');
    }
  }

  // Get active items for admin dashboard
  async getActiveNotifications(): Promise<Notification[]> {
    const notifications = await this.getNotifications();
    return notifications.filter(n => n.isActive && (n.targetRole === 'ADMIN' || n.targetRole === 'ALL'));
  }

  async getActiveSystemUpdates(): Promise<SystemUpdate[]> {
    const updates = await this.getSystemUpdates();
    return updates.filter(u => u.isActive && (u.targetRole === 'ADMIN' || u.targetRole === 'ALL'))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
}

export const communicationsStorage = new CommunicationsStorage();