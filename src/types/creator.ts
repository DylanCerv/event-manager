export interface Creator {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  password: string;
  phone: string;
  country: string;
  city: string;
  status: 'active' | 'suspended';
  commissionPercentage: number;
  createdAt: string;
  createdBy: string;
}

export interface CreateCreatorData {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  password: string;
  phone: string;
  country: string;
  commissionPercentage: number;
  createdBy: number;
}
