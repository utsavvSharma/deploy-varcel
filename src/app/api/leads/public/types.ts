export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  assignedTo: string | null;
  public: boolean;
  notes: {
    text: string;
    by: string;
    date: string;
  }[];
  createdAt: string;
  updatedAt: string;
}