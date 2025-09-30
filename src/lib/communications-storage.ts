import type { Notification, SystemUpdate } from '../types/communications';

class CommunicationsStorage {
  private getItem<T>(key: string): T[] {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : [];
  }

  private setItem<T>(key: string, value: T[]): void {
    localStorage.setItem(key, JSON.stringify(value));
  }

  // Notifications
  async getNotifications(): Promise<Notification[]> {
    return this.getItem<Notification>('admin_notifications');
  }

  async createNotification(data: Omit<Notification, 'id' | 'createdAt'>): Promise<Notification> {
    const notifications = this.getItem<Notification>('admin_notifications');
    const newNotification: Notification = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    notifications.push(newNotification);
    this.setItem('admin_notifications', notifications);
    return newNotification;
  }

  async updateNotification(id: string, data: Partial<Notification>): Promise<void> {
    const notifications = this.getItem<Notification>('admin_notifications');
    const index = notifications.findIndex(n => n.id === id);
    if (index !== -1) {
      notifications[index] = { ...notifications[index], ...data };
      this.setItem('admin_notifications', notifications);
    }
  }

  async deleteNotification(id: string): Promise<void> {
    const notifications = this.getItem<Notification>('admin_notifications');
    const filtered = notifications.filter(n => n.id !== id);
    this.setItem('admin_notifications', filtered);
  }

  // System Updates
  async getSystemUpdates(): Promise<SystemUpdate[]> {
    return this.getItem<SystemUpdate>('system_updates');
  }

  async createSystemUpdate(data: Omit<SystemUpdate, 'id' | 'createdAt'>): Promise<SystemUpdate> {
    const updates = this.getItem<SystemUpdate>('system_updates');
    const newUpdate: SystemUpdate = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    updates.push(newUpdate);
    this.setItem('system_updates', updates);
    return newUpdate;
  }

  async updateSystemUpdate(id: string, data: Partial<SystemUpdate>): Promise<void> {
    const updates = this.getItem<SystemUpdate>('system_updates');
    const index = updates.findIndex(u => u.id === id);
    if (index !== -1) {
      updates[index] = { ...updates[index], ...data };
      this.setItem('system_updates', updates);
    }
  }

  async deleteSystemUpdate(id: string): Promise<void> {
    const updates = this.getItem<SystemUpdate>('system_updates');
    const filtered = updates.filter(u => u.id !== id);
    this.setItem('system_updates', filtered);
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