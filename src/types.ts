export interface User {
  id: string;
  name: string;
  email: string;
  username?: string | null;
  role: 'admin' | 'team_leader' | 'sales';
  teamLeaderId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Note {
  text: string;
  by: string;
  createdAt: string;
}

export interface Lead {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string;
  public: boolean;
  assignedTo: string | null;
  createdBy?: string | null;
  createdByUser?: {
    id: string;
    name: string;
    email: string;
  };
  notes?: Note[];
  status: 'new' | 'contacted' | 'interested' | 'converted';
  priority: 'low' | 'medium' | 'high';
  followUpDate?: string;
  adminComment?: string | null;
  saleAmount?: number | null;
  createdAt: string;
  updatedAt: string;
}