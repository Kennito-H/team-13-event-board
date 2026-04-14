import type { RSVP, CreateRSVPInput } from './RSVP';

export interface RSVPRepository {
  findByEventAndUser(eventId: string, userId: string): Promise<RSVP | null>;
  create(input: CreateRSVPInput): Promise<RSVP>;
  update(id: string, updates: Partial<RSVP>): Promise<RSVP | null>;
  countActiveByEvent(eventId: string): Promise<number>;
  findByUserId(userId: string): Promise<RSVP[]>;
}