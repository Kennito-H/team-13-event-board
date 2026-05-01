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
      // Cancel — if the user was attending, free their seat and promote the
      // first waitlisted member atomically.
      if (existingRSVP.status === 'going') {
        const { cancelled } = await this.rsvpRepo.cancelAndPromoteAtomically(
          existingRSVP.id,
          eventId,
        );
        return Ok(cancelled);
      }

      const updated = await this.rsvpRepo.update(existingRSVP.id, { status: 'cancelled' });
      return Ok(updated!);
    }
  }

  async getUserRSVPs(userId: string): Promise<Result<RSVPWithEvent[], never>> {
    const rsvpsWithEvents: RSVPWithEvent[] = await this.rsvpRepo.findByUserIdWithEvents(userId);

    // Sort: upcoming first (by event start time), then by RSVP createdAt
    rsvpsWithEvents.sort((a, b) => {
      const now = new Date();
      const aTime = new Date(a.event.startDateTime).getTime();
      const bTime = new Date(b.event.startDateTime).getTime();
      const aUpcoming = aTime > now.getTime();
      const bUpcoming = bTime > now.getTime();
    
      if (aUpcoming !== bUpcoming) {
        return bUpcoming ? -1 : 1;
      }
    
      // Upcoming: soonest first. Past: most recent first.
      return aUpcoming ? aTime - bTime : bTime - aTime;
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

    if (rsvp.status !== 'going') {
      const cancelled = await this.rsvpRepo.update(rsvpId, { status: 'cancelled' });
      return Ok({ cancelled: cancelled! });
    }

    const { cancelled, promoted } = await this.rsvpRepo.cancelAndPromoteAtomically(
      rsvpId,
      rsvp.eventId,
    );

    return Ok({ cancelled, promoted });
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