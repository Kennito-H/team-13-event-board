export type EventStatus = 'draft' | 'published' | 'cancelled' | 'past';

export interface Event {
  id: string;
  title: string;
  description: string;
  location: string;
  category: string;
  capacity?: number;
  status: EventStatus;
  startDateTime: Date;
  endDateTime: Date;
  organizerId: string;
  createdAt: Date;
  updatedAt: Date;
}