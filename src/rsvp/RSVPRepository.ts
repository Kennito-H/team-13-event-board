import { RSVP, CreateRSVPInput } from './RSVP.js';

export interface RSVPRepository {
  findByEventAndUser(eventId: string, userId: string): Promise<RSVP | null>;
  create(input: CreateRSVPInput): Promise<RSVP>;
  update(id: string, updates: Partial<RSVP>): Promise<RSVP | null>;
  countActiveByEvent(eventId: string): Promise<number>;
}