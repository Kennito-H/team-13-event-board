import { Result, Ok, Err } from '../lib/result';
import type { RSVP } from './RSVP';
import type { RSVPRepository } from './RSVPRepository';
import type { IEventRepository } from '../repository/EventRepository';
import type { Event } from '../events/Event';
import { EventNotFoundError, InvalidRSVPStateError, UnauthorizedError } from './errors';

export interface RSVPWithEvent {
  rsvp: RSVP;
  event: Event;
}

export interface IRSVPService {
  toggleRSVP(eventId: string, userID: string): Promise<Result<RSVP, EventNotFoundError | InvalidRSVPStateError>>;
  getUserRSVPs(userId: string): Promise<Result<RSVPWithEvent[], never>>;
  cancelRSVPWithPromotion(rsvpId: string, userId: string): Promise<Result<{ cancelled: RSVP; promoted?: RSVP }, EventNotFoundError | UnauthorizedError>>
  getWaitlistPosition(eventId: string, userId: string): Promise<Result<number | null, EventNotFoundError>>;
}

export class RSVPService implements IRSVPService{
  constructor(
    private rsvpRepo: RSVPRepository,
    private eventRepo: IEventRepository,
  ) {}

  async toggleRSVP(
    eventId: string,
    userId: string,
  ): Promise<Result<RSVP, EventNotFoundError | InvalidRSVPStateError>> {
    // 1. Verify event exists and is valid
    const event = await this.eventRepo.findById(eventId);
    if (!event) {
      return Err(new EventNotFoundError('Event not found'));
    }

    if (event.organizerId === userId) {
      return Err(new InvalidRSVPStateError('Organizers cannot RSVP to their own events'));
    }
    

    if (event.status !== 'published') {
      return Err(new InvalidRSVPStateError('Event is not published'));
    }

    if (new Date(event.endDateTime) < new Date()) {
      return Err(new InvalidRSVPStateError('Event has already ended'));
    }

    // 2. Check for existing RSVP
    const existingRSVP = await this.rsvpRepo.findByEventAndUser(eventId, userId);

    // 3. No RSVP exists → create new
    if (!existingRSVP) {
      const activeCount = await this.rsvpRepo.countActiveByEvent(eventId);
      const status = event.capacity && activeCount >= event.capacity ? 'waitlisted' : 'going';

      const newRSVP = await this.rsvpRepo.create({
        eventId,
        userId,
        status,
      });
      return Ok(newRSVP);
    }

    // 4. RSVP exists → toggle status
    if (existingRSVP.status === 'cancelled') {
      // Reactivate
      const activeCount = await this.rsvpRepo.countActiveByEvent(eventId);
      const newStatus = event.capacity && activeCount >= event.capacity ? 'waitlisted' : 'going';

      const updated = await this.rsvpRepo.update(existingRSVP.id, { status: newStatus });
      return Ok(updated!);
    } else {
      // Cancel
      const updated = await this.rsvpRepo.update(existingRSVP.id, { status: 'cancelled' });
      return Ok(updated!);
    }
  }

  async getUserRSVPs(userId: string): Promise<Result<RSVPWithEvent[], never>> {
    const rsvps = await this.rsvpRepo.findByUserId(userId);

    // Join with event details
    const rsvpsWithEvents: RSVPWithEvent[] = [];
    for (const rsvp of rsvps) {
      const event = await this.eventRepo.findById(rsvp.eventId);
      if (event) {
        rsvpsWithEvents.push({ rsvp, event });
      }
    }

    // Sort: upcoming first (by event start time), then by RSVP createdAt
    rsvpsWithEvents.sort((a, b) => {
      const now = new Date();
      const aUpcoming = new Date(a.event.startDateTime) > now;
      const bUpcoming = new Date(b.event.startDateTime) > now;

      // Upcoming events first
      if (aUpcoming !== bUpcoming) {
        return bUpcoming ? -1 : 1;
      }

      // Within same section, older RSVPs first
      return a.rsvp.createdAt.getTime() - b.rsvp.createdAt.getTime();
    });

    return Ok(rsvpsWithEvents);
  }

  async cancelRSVPWithPromotion(rsvpId: string, userId: string): Promise<Result<{ cancelled: RSVP; promoted?: RSVP; }, EventNotFoundError | UnauthorizedError>> {
    const rsvp = await this.rsvpRepo.findById(rsvpId);
    if (!rsvp) {
      return Err(new EventNotFoundError('RSVP not found'));
    }

    if (rsvp.userId !== userId) {
      return Err(new UnauthorizedError('You can only cancel your own RSVP'));
    }

    if (rsvp.status === 'cancelled') {
      return Err(new EventNotFoundError('RSVP is already cancelled'));
    }

    const wasGoing = rsvp.status === 'going';

    const cancelled = await this.rsvpRepo.update(rsvpId, { status: 'cancelled' });

    if (!wasGoing) {
      return Ok({ cancelled: cancelled! });
    }

    const nextInLine = await this.rsvpRepo.findFirstWaitlistedByEvent(rsvp.eventId);
    if (!nextInLine) {
      return Ok({ cancelled: cancelled! });
    }

    const promoted = await this.rsvpRepo.update(nextInLine.id, { status: 'going' });
    if (!promoted) {
      await this.rsvpRepo.update(rsvpId, { status: 'going' });
      return Err(new EventNotFoundError('Promotion failed, cancellation rolled back'));
    }

    return Ok({ cancelled: cancelled!, promoted });
  }

  async getWaitlistPosition(
    eventId: string,
    userId: string,
  ): Promise<Result<number | null, EventNotFoundError>> {
    const event = await this.eventRepo.findById(eventId);
    if (!event) {
      return Err(new EventNotFoundError('Event not found'));
    }

    const rsvp = await this.rsvpRepo.findByEventAndUser(eventId, userId);
    if (!rsvp || rsvp.status !== 'waitlisted') {
      return Ok(null);
    }

    const position = await this.rsvpRepo.countWaitlistedBeforeByEvent(eventId, rsvp.createdAt);
    return Ok(position + 1);
  }
}