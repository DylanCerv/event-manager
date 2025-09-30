import type { Commission, CreateCommissionData, CommissionSummary } from '../types/commission';
import { configStorage } from './config-storage';

class CommissionsStorage {
  private storageKey = 'commissions_data';

  async getCommissions(): Promise<Commission[]> {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (data) {
        return JSON.parse(data);
      }
      return [];
    } catch (error) {
      console.error('Error loading commissions:', error);
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
      const commissions = await this.getCommissions();
      
      // Check if commission already exists for this request
      const existingCommission = commissions.find(c => 
        c.eventRequestId === commissionData.eventRequestId
      );
      
      if (existingCommission) {
        throw new Error('Commission already exists for this request');
      }

      const newCommission: Commission = {
        id: `commission-${Date.now()}`,
        ...commissionData,
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      const updatedCommissions = [...commissions, newCommission];
      await this.saveCommissions(updatedCommissions);
      
      return newCommission;
    } catch (error) {
      console.error('Error creating commission:', error);
      throw error;
    }
  }

  async markAsPaid(commissionId: string, paidBy: string): Promise<Commission> {
    try {
      const commissions = await this.getCommissions();
      const commissionIndex = commissions.findIndex(c => c.id === commissionId);
      
      if (commissionIndex === -1) {
        throw new Error('Commission not found');
      }

      const updatedCommission = {
        ...commissions[commissionIndex],
        status: 'paid' as const,
        paidAt: new Date().toISOString(),
        paidBy
      };

      commissions[commissionIndex] = updatedCommission;
      await this.saveCommissions(commissions);
      
      return updatedCommission;
    } catch (error) {
      console.error('Error marking commission as paid:', error);
      throw error;
    }
  }

  async getCommissionsByCreator(creatorId: string): Promise<Commission[]> {
    try {
      const commissions = await this.getCommissions();
      return commissions.filter(c => c.creatorId === creatorId);
    } catch (error) {
      console.error('Error getting commissions by creator:', error);
      return [];
    }
  }

  async getCommissionSummary(creatorId: string): Promise<CommissionSummary> {
    try {
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
        totalRevenue: creatorCommissions.reduce((sum, c) => sum + (c.guestCount * pricePerGuest), 0)
      };
    } catch (error) {
      console.error('Error getting commission summary:', error);
      return {
        creatorId,
        totalCommissions: 0,
        paidCommissions: 0,
        pendingCommissions: 0,
        totalEvents: 0,
        totalGuests: 0,
        totalRevenue: 0
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
      const commissions = await this.getCommissions();
      const pricePerGuest = await configStorage.getPricePerGuest();
      
      const paidCommissions = commissions.filter(c => c.status === 'paid');
      const pendingCommissions = commissions.filter(c => c.status === 'pending');
      
      return {
        totalRevenue: commissions.reduce((sum, c) => sum + (c.guestCount * pricePerGuest), 0),
        totalCommissions: commissions.reduce((sum, c) => sum + c.amount, 0),
        paidCommissions: paidCommissions.reduce((sum, c) => sum + c.amount, 0),
        pendingCommissions: pendingCommissions.reduce((sum, c) => sum + c.amount, 0)
      };
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
      commissionPercentage
    });
  }
}

export const commissionsStorage = new CommissionsStorage();
