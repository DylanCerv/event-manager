import type { UserAccess, CreateUserAccessData } from '../types/roles';

class RolesStorage {
  private getItem<T>(key: string): T[] {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : [];
  }

  private setItem<T>(key: string, value: T[]): void {
    localStorage.setItem(key, JSON.stringify(value));
  }

  // User Access Management
  async getUserAccesses(createdBy: string): Promise<UserAccess[]> {
    const allAccesses = this.getItem<UserAccess>('user_accesses');
    console.log('All user accesses from storage:', allAccesses);
    if (createdBy === 'all') {
      return allAccesses; // Return all accesses for login purposes
    }
    return allAccesses.filter(access => access.createdBy === createdBy);
  }

  async createUserAccess(data: CreateUserAccessData, createdBy: string): Promise<UserAccess> {
    const accesses = this.getItem<UserAccess>('user_accesses');
    
    const newAccess: UserAccess = {
      ...data,
      id: crypto.randomUUID(),
      assignedEvents: [],
      assignedEventBooks: data.accessType === 'moderador' ? [] : undefined,
      createdAt: new Date().toISOString(),
      createdBy
    };
    
    accesses.push(newAccess);
    this.setItem('user_accesses', accesses);
    return newAccess;
  }

  async updateUserAccess(id: string, updates: Partial<UserAccess>): Promise<void> {
    const accesses = this.getItem<UserAccess>('user_accesses');
    const index = accesses.findIndex(access => access.id === id);
    
    if (index !== -1) {
      accesses[index] = { ...accesses[index], ...updates };
      this.setItem('user_accesses', accesses);
    }
  }

  async deleteUserAccess(id: string): Promise<void> {
    const accesses = this.getItem<UserAccess>('user_accesses');
    const updatedAccesses = accesses.filter(access => access.id !== id);
    this.setItem('user_accesses', updatedAccesses);
  }

  async assignEventToUser(userAccessId: string, eventId: string): Promise<void> {
    const accesses = this.getItem<UserAccess>('user_accesses');
    const index = accesses.findIndex(access => access.id === userAccessId);
    
    if (index !== -1) {
      if (!accesses[index].assignedEvents.includes(eventId)) {
        accesses[index].assignedEvents.push(eventId);
        this.setItem('user_accesses', accesses);
      }
    }
  }

  async revokeEventFromUser(userAccessId: string, eventId: string): Promise<void> {
    const accesses = this.getItem<UserAccess>('user_accesses');
    const index = accesses.findIndex(access => access.id === userAccessId);
    
    if (index !== -1) {
      accesses[index].assignedEvents = accesses[index].assignedEvents.filter(id => id !== eventId);
      this.setItem('user_accesses', accesses);
    }
  }

  async checkUsernameExists(username: string, excludeId?: string): Promise<boolean> {
    const accesses = this.getItem<UserAccess>('user_accesses');
    return accesses.some(access => 
      access.username === username && access.id !== excludeId
    );
  }

  // EventBook assignment methods for moderators
  async assignEventBookToUser(userAccessId: string, eventBookId: string): Promise<void> {
    const accesses = this.getItem<UserAccess>('user_accesses');
    const index = accesses.findIndex(access => access.id === userAccessId);
    
    if (index !== -1 && accesses[index].accessType === 'moderador') {
      if (!accesses[index].assignedEventBooks) {
        accesses[index].assignedEventBooks = [];
      }
      if (!accesses[index].assignedEventBooks!.includes(eventBookId)) {
        accesses[index].assignedEventBooks!.push(eventBookId);
        this.setItem('user_accesses', accesses);
      }
    }
  }

  async revokeEventBookFromUser(userAccessId: string, eventBookId: string): Promise<void> {
    const accesses = this.getItem<UserAccess>('user_accesses');
    const index = accesses.findIndex(access => access.id === userAccessId);
    
    if (index !== -1 && accesses[index].assignedEventBooks) {
      accesses[index].assignedEventBooks = accesses[index].assignedEventBooks!.filter(id => id !== eventBookId);
      this.setItem('user_accesses', accesses);
    }
  }
}

export const rolesStorage = new RolesStorage();