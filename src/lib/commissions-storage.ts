import type { Commission, CreateCommissionData, CommissionSummary } from '../types/commission';
import { configStorage } from './config-storage';

class CommissionsStorage {
  private storageKey = 'commissions_data';

  private getAuthHeaders(): Record<string, string> {
    const token = sessionStorage.getItem('auth_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async getCommissions(): Promise<Commission[]> {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/commissions`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...this.getAuthHeaders(),
        },
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json?.message || 'Error al obtener comisiones');
      }
      return (json?.data || []) as Commission[];
    } catch (error) {
      console.error('Error loading commissions from API, falling back to localStorage:', error);
      try {
        const data = localStorage.getItem(this.storageKey);
        if (data) return JSON.parse(data);
      } catch {
        // ignore
      }
      return [];
    }
  }

  async saveCommissions(commissions: Commission[]): Promise<void> {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(commissions));
    } catch (error) {
      console.error('Error saving commissions:', error);
      throw new Error('Failed to save commissions');
    }
  }

  async createCommission(commissionData: CreateCommissionData): Promise<Commission> {
    try {
      // Commissions are generated on backend when an event request is approved.
      console.warn('createCommission is deprecated: commissions are generated in backend.');
      const commissions = await this.getCommissions();
      const existing = commissions.find(c => c.eventRequestId === commissionData.eventRequestId);
      if (existing) return existing;
      throw new Error('La comisión se genera automáticamente cuando se aprueba la solicitud.');
    } catch (error) {
      console.error('Error creating commission:', error);
      throw error;
    }
  }

  async markAsPaid(commissionId: string, paidBy: string): Promise<Commission> {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/commissions/${commissionId}/paid`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...this.getAuthHeaders(),
        },
        body: JSON.stringify({ status: 'paid', paidBy }),
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json?.message || 'Error al marcar comisión como pagada');
      }
      return json.data as Commission;
    } catch (error) {
      console.error('Error marking commission as paid:', error);
      throw error;
    }
  }

  async getCommissionsByCreator(creatorId: string): Promise<Commission[]> {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/commissions?creator_id=${encodeURIComponent(creatorId)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...this.getAuthHeaders(),
        },
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json?.message || 'Error al obtener comisiones del creador');
      }
      return (json?.data || []) as Commission[];
    } catch (error) {
      console.error('Error getting commissions by creator:', error);
      const commissions = await this.getCommissions();
      return commissions.filter(c => c.creatorId === creatorId);
    }
  }

  async getCommissionSummary(creatorId: string): Promise<CommissionSummary> {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/commissions/summary?creator_id=${encodeURIComponent(creatorId)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...this.getAuthHeaders(),
        },
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json?.message || 'Error al obtener resumen de comisiones');
      }
      return json.data as CommissionSummary;
    } catch (error) {
      console.error('Error getting commission summary:', error);
      // fallback (legacy local calculation)
      const creatorCommissions = await this.getCommissionsByCreator(creatorId);
      const pricePerGuest = await configStorage.getPricePerGuest();
      const paidCommissions = creatorCommissions.filter(c => c.status === 'paid');
      const pendingCommissions = creatorCommissions.filter(c => c.status === 'pending');
      return {
        creatorId,
        totalCommissions: creatorCommissions.reduce((sum, c) => sum + c.amount, 0),
        paidCommissions: paidCommissions.reduce((sum, c) => sum + c.amount, 0),
        pendingCommissions: pendingCommissions.reduce((sum, c) => sum + c.amount, 0),
        totalEvents: creatorCommissions.length,
        totalGuests: creatorCommissions.reduce((sum, c) => sum + c.guestCount, 0),
        totalRevenue: creatorCommissions.reduce((sum, c) => sum + (c.guestCount * pricePerGuest), 0),
      };
    }
  }

  async getAllCommissionsSummary(): Promise<{
    totalRevenue: number;
    totalCommissions: number;
    paidCommissions: number;
    pendingCommissions: number;
  }> {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/commissions/summary?creator_id=all`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...this.getAuthHeaders(),
        },
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json?.message || 'Error al obtener resumen global de comisiones');
      }
      return json.data as any;
    } catch (error) {
      console.error('Error getting all commissions summary:', error);
      return {
        totalRevenue: 0,
        totalCommissions: 0,
        paidCommissions: 0,
        pendingCommissions: 0
      };
    }
  }

  // Auto-generate commission when request is approved
  async generateCommissionFromRequest(
    eventRequestId: string,
    eventId: string,
    userId: string,
    creatorId: string,
    guestCount: number,
    commissionPercentage: number
  ): Promise<Commission> {
    // Generated on backend on request approval.
    console.warn('generateCommissionFromRequest is deprecated: commissions are generated in backend.');
    const commissions = await this.getCommissions();
    const existing = commissions.find(c => c.eventRequestId === eventRequestId);
    if (existing) return existing;
    const pricePerGuest = await configStorage.getPricePerGuest();
    const revenue = guestCount * pricePerGuest;
    const commissionAmount = (revenue * commissionPercentage) / 100;
    return this.createCommission({
      creatorId,
      eventRequestId,
      eventId,
      userId,
      amount: commissionAmount,
      guestCount,
      commissionPercentage,
    });
  }
}

export const commissionsStorage = new CommissionsStorage();
