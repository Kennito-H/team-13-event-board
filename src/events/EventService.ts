import { Err, Ok, type Result } from "../lib/result";
import type { IEventRepository } from "../repository/EventRepository";
import type { Event } from "./Event";
import type { UpdateEventInput } from "./UpdateEventInput";
import {
  InvalidStateError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "./errors";
import type { EventError } from "./errors";
import type { UserRole } from "../auth/User";

export interface IEventService {
  getEventById(
    eventId: string,
    requestingUserId?: string,
  ): Promise<Result<Event, EventError>>;

  updateEvent(
    eventId: string,
    updates: UpdateEventInput,
    userId: string,
  ): Promise<Result<Event, EventError>>;

    publishEvent(
    eventId: string,
    userId: string,
  ): Promise<Result<Event, EventError>>;

    cancelEvent(
    eventId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<Result<Event, EventError>>;
}

class EventService implements IEventService {
  constructor(private readonly eventRepository: IEventRepository) {}

  async getEventById(
    eventId: string,
    requestingUserId?: string,
  ): Promise<Result<Event, EventError>> {
    const event = await this.eventRepository.findById(eventId);

    if (!event) {
      return Err(NotFoundError("Event does not exist."));
    }

    if (event.status === "draft" && event.organizerId !== requestingUserId) {
      return Err(
        UnauthorizedError("Draft events are only visible to the organizer."),
      );
    }

    return Ok(event);
  }

  async updateEvent(
    eventId: string,
    updates: UpdateEventInput,
    userId: string,
  ): Promise<Result<Event, EventError>> {
    const existingEvent = await this.eventRepository.findById(eventId);

    if (!existingEvent) {
      return Err(NotFoundError("Event does not exist."));
    }

    if (existingEvent.organizerId !== userId) {
      return Err(UnauthorizedError("Only the organizer can edit this event."));
    }

    if (
      existingEvent.status === "published" ||
      existingEvent.status === "cancelled" ||
      existingEvent.status === "past"
    ) {
      return Err(
        InvalidStateError(
          "Published, cancelled, and past events cannot be edited.",
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

  async publishEvent(
    eventId: string,
    userId: string,
  ): Promise<Result<Event, EventError>> {
    const existingEvent = await this.eventRepository.findById(eventId);

    if (!existingEvent) {
      return Err(NotFoundError("Event does not exist."));
    }

    if (existingEvent.organizerId !== userId) {
      return Err(
        UnauthorizedError("Only the organizer can publish this event."),
      );
    }

    if (existingEvent.status !== "draft") {
      return Err(InvalidStateError("Only draft events can be published."));
    }

    const publishedEvent: Event = {
      ...existingEvent,
      status: "published",
      updatedAt: new Date(),
    };

    const savedEvent = await this.eventRepository.save(publishedEvent);
    return Ok(savedEvent);
  }

  async cancelEvent(
    eventId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<Result<Event, EventError>> {
    const existingEvent = await this.eventRepository.findById(eventId);

    if (!existingEvent) {
      return Err(NotFoundError("Event does not exist."));
    }

    const isOrganizer = existingEvent.organizerId === userId;
    const isAdmin = userRole === "admin";

    if (!isOrganizer && !isAdmin) {
      return Err(
        UnauthorizedError("Only the organizer or an admin can cancel this event."),
      );
    }

    if (existingEvent.status !== "published") {
      return Err(InvalidStateError("Only published events can be cancelled."));
    }

    const cancelledEvent: Event = {
      ...existingEvent,
      status: "cancelled",
      updatedAt: new Date(),
    };

    const savedEvent = await this.eventRepository.save(cancelledEvent);
    return Ok(savedEvent);
  }

  private validateUpdateInput(updates: UpdateEventInput): EventError | null {
    if (!updates.title || updates.title.trim().length === 0) {
      return ValidationError("Title is required.");
    }

    if (!updates.description || updates.description.trim().length === 0) {
      return ValidationError("Description is required.");
    }

    if (!updates.location || updates.location.trim().length === 0) {
      return ValidationError("Location is required.");
    }

    if (!updates.category || updates.category.trim().length === 0) {
      return ValidationError("Category is required.");
    }

    if (
      !(updates.startDateTime instanceof Date) ||
      Number.isNaN(updates.startDateTime.getTime())
    ) {
      return ValidationError("Start date/time must be valid.");
    }

    if (
      !(updates.endDateTime instanceof Date) ||
      Number.isNaN(updates.endDateTime.getTime())
    ) {
      return ValidationError("End date/time must be valid.");
    }

    if (updates.endDateTime <= updates.startDateTime) {
      return ValidationError("End date/time must be after start date/time.");
    }

    if (updates.capacity !== undefined) {
      if (!Number.isInteger(updates.capacity) || updates.capacity < 1) {
        return ValidationError(
          "Capacity must be a positive whole number when provided.",
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