import type { RSVP, CreateRSVPInput } from './RSVP';
import type { Event } from '../events/Event';

export interface RSVPRepository {
  findByEventAndUser(eventId: string, userId: string): Promise<RSVP | null>;
  create(input: CreateRSVPInput): Promise<RSVP>;
  update(id: string, updates: Partial<RSVP>): Promise<RSVP | null>;
  countActiveByEvent(eventId: string): Promise<number>;
  findByUserId(userId: string): Promise<RSVP[]>;
  countWaitlistedBeforeByEvent(eventId: string, before: Date): Promise<number>;
  findById(id: string): Promise<RSVP | null>;
  findFirstWaitlistedByEvent(eventId: string): Promise<RSVP | null>;
  findByUserIdWithEvents(userId: string): Promise<Array<{ rsvp: RSVP; event: Event }>>;
  cancelAndPromoteAtomically(
    rsvpId: string,
    eventId: string,
  ): Promise<{ cancelled: RSVP; promoted?: RSVP }>;
}