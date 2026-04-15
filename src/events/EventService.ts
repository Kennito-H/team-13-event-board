import { Err, Ok, type Result } from '../lib/result';
import type { Event } from './Event';
import type { UpdateEventInput } from './UpdateEventInput';
import {
  InvalidStateError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from './errors';
import type { IEventRepository } from '../repository/EventRepository';

export interface IEventService {
  getEventById(
    eventId: string,
    requestingUserId?: string,
  ): Promise<Result<Event, NotFoundError | UnauthorizedError>>;

  updateEvent(
    eventId: string,
    updates: UpdateEventInput,
    userId: string,
  ): Promise<
    Result<Event, NotFoundError | UnauthorizedError | ValidationError | InvalidStateError>
  >;
}

class EventService implements IEventService {
  constructor(private readonly eventRepository: IEventRepository) {}

  async getEventById(
    eventId: string,
    requestingUserId?: string,
  ): Promise<Result<Event, NotFoundError | UnauthorizedError>> {
    const event = await this.eventRepository.findById(eventId);

    if (!event) {
      return Err(new NotFoundError('Event does not exist.'));
    }

    if (event.status === 'draft' && event.organizerId !== requestingUserId) {
      return Err(
        new UnauthorizedError(
          'Draft events are only visible to the organizer.',
        ),
      );
    }

    return Ok(event);
  }

  async updateEvent(
    eventId: string,
    updates: UpdateEventInput,
    userId: string,
  ): Promise<
    Result<Event, NotFoundError | UnauthorizedError | ValidationError | InvalidStateError>
  > {
    const existingEvent = await this.eventRepository.findById(eventId);

    if (!existingEvent) {
      return Err(new NotFoundError('Event does not exist.'));
    }

    if (existingEvent.organizerId !== userId) {
      return Err(
        new UnauthorizedError('Only the organizer can edit this event.'),
      );
    }

    if (
      existingEvent.status === 'published' ||
      existingEvent.status === 'cancelled' ||
      existingEvent.status === 'past'
    ) {
      return Err(
        new InvalidStateError(
          'Published, cancelled, and past events cannot be edited.',
        ),
      );
    }

    const validationError = this.validateUpdateInput(updates);
    if (validationError) {
      return Err(validationError);
    }

    const updatedEvent: Event = {
      ...existingEvent,
      title: updates.title.trim(),
      description: updates.description.trim(),
      location: updates.location.trim(),
      category: updates.category.trim(),
      capacity: updates.capacity,
      startDateTime: new Date(updates.startDateTime),
      endDateTime: new Date(updates.endDateTime),
      updatedAt: new Date(),
    };

    const savedEvent = await this.eventRepository.save(updatedEvent);
    return Ok(savedEvent);
  }

  private validateUpdateInput(
    updates: UpdateEventInput,
  ): ValidationError | null {
    if (!updates.title || updates.title.trim().length === 0) {
      return new ValidationError('Title is required.');
    }

    if (!updates.description || updates.description.trim().length === 0) {
      return new ValidationError('Description is required.');
    }

    if (!updates.location || updates.location.trim().length === 0) {
      return new ValidationError('Location is required.');
    }

    if (!updates.category || updates.category.trim().length === 0) {
      return new ValidationError('Category is required.');
    }

    if (!(updates.startDateTime instanceof Date) || Number.isNaN(updates.startDateTime.getTime())) {
      return new ValidationError('Start date/time must be valid.');
    }

    if (!(updates.endDateTime instanceof Date) || Number.isNaN(updates.endDateTime.getTime())) {
      return new ValidationError('End date/time must be valid.');
    }

    if (updates.endDateTime <= updates.startDateTime) {
      return new ValidationError('End date/time must be after start date/time.');
    }

    if (updates.capacity !== undefined) {
      if (!Number.isInteger(updates.capacity) || updates.capacity < 1) {
        return new ValidationError(
          'Capacity must be a positive whole number when provided.',
        );
      }
    }

    return null;
  }
}

export function CreateEventService(
  eventRepository: IEventRepository,
): IEventService {
  return new EventService(eventRepository);
}