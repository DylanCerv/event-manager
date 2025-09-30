export interface Commission {
  id: string;
  creatorId: string;
  eventRequestId: string;
  eventId: string;
  userId: string;
  amount: number;
  guestCount: number;
  commissionPercentage: number;
  status: 'pending' | 'paid';
  createdAt: string;
  paidAt?: string;
  paidBy?: string;
}

export interface CreateCommissionData {
  creatorId: string;
  eventRequestId: string;
  eventId: string;
  userId: string;
  amount: number;
  guestCount: number;
  commissionPercentage: number;
}

export interface CommissionSummary {
  creatorId: string;
  totalCommissions: number;
  paidCommissions: number;
  pendingCommissions: number;
  totalEvents: number;
  totalGuests: number;
  totalRevenue: number;
}
