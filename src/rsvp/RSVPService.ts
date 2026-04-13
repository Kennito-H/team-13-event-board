import { Result, Ok, Err } from '../lib/result.js';
import { RSVP } from './RSVP.js';
import { RSVPRepository } from './RSVPRepository.js';
import { EventRepository } from '../events/EventRepository.js';
import { InvalidStateError } from './errors.js';
import { NotFoundError } from '../events/errors.js';

export class RSVPService {
  constructor(
    private rsvpRepo: RSVPRepository,
    private eventRepo: EventRepository
  ) {}

  async toggleRSVP(
    eventId: string,
    userId: string
  ): Promise<Result<RSVP, NotFoundError | InvalidStateError>> {
    // 1. Verify event exists and is valid
    const event = await this.eventRepo.findById(eventId);
    if (!event) {
      return Err(new NotFoundError('Event not found'));
    }

    if (event.status !== 'published') {
      return Err(new InvalidStateError('Event is not published'));
    }

    if (new Date(event.endDateTime) < new Date()) {
      return Err(new InvalidStateError('Event has already ended'));
    }

    // 2. Check for existing RSVP
    const existingRSVP = await this.rsvpRepo.findByEventAndUser(eventId, userId);

    // 3. No RSVP exists → create new
    if (!existingRSVP) {
      const activeCount = await this.rsvpRepo.countActiveByEvent(eventId);
      const status = (event.capacity && activeCount >= event.capacity) 
        ? 'waitlisted' 
        : 'going';
      
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
      const newStatus = (event.capacity && activeCount >= event.capacity)
        ? 'waitlisted'
        : 'going';
      
      const updated = await this.rsvpRepo.update(existingRSVP.id, { status: newStatus });
      return Ok(updated!);
    } else {
      // Cancel
      const updated = await this.rsvpRepo.update(existingRSVP.id, { status: 'cancelled' });
      return Ok(updated!);
    }
  }
}