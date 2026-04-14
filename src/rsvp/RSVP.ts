export interface RSVP {
    id: string;
    eventId: string;
    userId: string;
    status: 'going' | 'waitlisted' | 'cancelled';
    createdAt: Date;
  }
  
  export type CreateRSVPInput = Omit<RSVP, 'id' | 'createdAt'>;