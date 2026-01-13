import type { EventFinalization } from '../types/event';
import { deleteEventFinalizationAPI, getEventFinalizationAPI, upsertEventFinalizationAPI } from '../endpoints/finalization';

class FinalizationStorage {
  async getEventFinalization(eventId: string): Promise<EventFinalization | null> {
    // Primary source: backend (DB)
    try {
      const res = await getEventFinalizationAPI(eventId);
      const data = (res as any)?.data ?? null;
      return data ? (data as EventFinalization) : null;
    } catch (error) {
      // Legacy fallback (best-effort)
      console.error('Error loading finalization from API, falling back to localStorage:', error);
      return new LocalStorage().getEventFinalization(eventId);
    }
  }

  async saveEventFinalization(finalization: Omit<EventFinalization, 'id' | 'created_at'>): Promise<void> {
    // Persist to backend (DB)
    await upsertEventFinalizationAPI(finalization.event_id, finalization as any);
    // Keep local cache updated for legacy screens (best-effort)
    try {
      await new LocalStorage().saveEventFinalization(finalization);
    } catch {
      // ignore
    }
  }

  async deleteEventFinalization(eventId: string): Promise<void> {
    await deleteEventFinalizationAPI(eventId);
    // Keep local cache updated for legacy screens (best-effort)
    try {
      await new LocalStorage().deleteEventFinalization(eventId);
    } catch {
      // ignore
    }
  }
}

class LocalStorage {
  private getItem<T>(key: string): T[] {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : [];
  }

  private setItem<T>(key: string, value: T[]): void {
    localStorage.setItem(key, JSON.stringify(value));
  }

  async getEventFinalization(eventId: string): Promise<EventFinalization | null> {
    const finalizations = this.getItem<EventFinalization>('event_finalizations');
    return finalizations.find(f => f.event_id === eventId) || null;
  }

  async saveEventFinalization(finalization: Omit<EventFinalization, 'id' | 'created_at'>): Promise<void> {
    const finalizations = this.getItem<EventFinalization>('event_finalizations');
    const existingIndex = finalizations.findIndex(f => f.event_id === finalization.event_id);
    
    const newFinalization = {
      ...finalization,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };
    
    if (existingIndex !== -1) {
      finalizations[existingIndex] = newFinalization;
    } else {
      finalizations.push(newFinalization);
    }
    
    this.setItem('event_finalizations', finalizations);
    window.dispatchEvent(new CustomEvent('storage_update', {
      detail: { type: 'finalization_updated', eventId: finalization.event_id }
    }));
  }

  async deleteEventFinalization(eventId: string): Promise<void> {
    const finalizations = this.getItem<EventFinalization>('event_finalizations');
    const updatedFinalizations = finalizations.filter(f => f.event_id !== eventId);
    this.setItem('event_finalizations', updatedFinalizations);
    window.dispatchEvent(new CustomEvent('storage_update', {
      detail: { type: 'finalization_updated', eventId }
    }));
  }
}

export const finalizationStorage = new FinalizationStorage();