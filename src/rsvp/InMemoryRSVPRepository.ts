import type { RSVP, CreateRSVPInput } from './RSVP';
import type { RSVPRepository } from './RSVPRepository';

export class InMemoryRSVPRepository implements RSVPRepository {
  private rsvps: Map<string, RSVP> = new Map();
  private currentId = 1;

  async findByEventAndUser(eventId: string, userId: string): Promise<RSVP | null> {
    for (const rsvp of this.rsvps.values()) {
      if (rsvp.eventId === eventId && rsvp.userId === userId) {
        return rsvp;
      }
    }
    return null;
  }

  async create(input: CreateRSVPInput): Promise<RSVP> {
    const rsvp: RSVP = {
      id: String(this.currentId++),
      ...input,
      createdAt: new Date(),
    };
    this.rsvps.set(rsvp.id, rsvp);
    return rsvp;
  }

  async update(id: string, updates: Partial<RSVP>): Promise<RSVP | null> {
    const rsvp = this.rsvps.get(id);
    if (!rsvp) return null;

    const updated = { ...rsvp, ...updates };
    this.rsvps.set(id, updated);
    return updated;
  }

  async countActiveByEvent(eventId: string): Promise<number> {
    let count = 0;
    for (const rsvp of this.rsvps.values()) {
      if (rsvp.eventId === eventId && rsvp.status === 'going') {
        count++;
      }
    }
    return count;
  }

  async findByUserId(userId: string): Promise<RSVP[]> {
    const userRSVPs: RSVP[] = [];
    for (const rsvp of this.rsvps.values()) {
      if (rsvp.userId === userId) {
        userRSVPs.push(rsvp);
      }
    }
    return userRSVPs;
  }

  countWaitlistedBeforeByEvent(eventId: string, before: Date): Promise<number> {
    throw new Error('Method not implemented.');
  }
  findById(id: string): Promise<RSVP | null> {
    throw new Error('Method not implemented.');
  }
  findFirstWaitlistedByEvent(eventId: string): Promise<RSVP | null> {
    throw new Error('Method not implemented.');
  }
}