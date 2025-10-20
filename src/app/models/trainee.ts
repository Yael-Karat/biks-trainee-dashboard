export interface Trainee {
  id: number;
  name: string;
  date: string;
  grade: number;
  subject: string;
  // Optional fields
  email?: string;
  dateJoined?: string;
  address?: string;
  city?: string;
  country?: string;
  zip?: string;
}