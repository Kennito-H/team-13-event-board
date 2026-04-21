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

export interface SearchEventsInput {
  query: string;
}
export interface CreateEventInput {
  title: string;
  description: string;
  location: string;
  category: string;
  capacity?: number;
  startDateTime: Date;
  endDateTime: Date;
  organizerId: string;
}

export interface GetArchivedEventsInput {
  category?: string;
}
 
export interface EventFilters {
  category?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface IEventService {
  getEventById(
    eventId: string,
    requestingUserId?: string,
  ): Promise<Result<Event, EventError>>;

  updateEvent(
    eventId: string,
    updates: UpdateEventInput,
    userId: string,
    userRole: UserRole,
  ): Promise<Result<Event, EventError>>;

  getEditableEventById(
    eventId: string,
    userId: string,
    userRole: UserRole,
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

  searchEvents(input: SearchEventsInput): Promise<Result<Event[], EventError>>;

  transitionExpiredEvents(): Promise<Result<number, EventError>>;
 
  getArchivedEvents(
    input: GetArchivedEventsInput,
  ): Promise<Result<Event[], EventError>>;
 
  getArchivedCategories(): Promise<Result<string[], EventError>>;
  
  listEvents(
    filters: EventFilters
  ): Promise<Result<Event[], never>>;

  createEvent(input: CreateEventInput): Promise<Result<Event, EventError>>;

  getOrganizerEvents(
    userId: string,
    userRole: UserRole,
  ): Promise<Result<Event[], EventError>>;


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

  async getEditableEventById(
    eventId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<Result<Event, EventError>> {
    const event = await this.eventRepository.findById(eventId);

    if (!event) {
      return Err(NotFoundError("Event does not exist."));
    }

    const editError = this.canEditEvent(event, userId, userRole);
    if (editError) {
      return Err(editError);
    }

    return Ok(event);
  }


  async updateEvent(
    eventId: string,
    updates: UpdateEventInput,
    userId: string,
    userRole: UserRole,
  ): Promise<Result<Event, EventError>> {
    const existingEvent = await this.eventRepository.findById(eventId);

    if (!existingEvent) {
      return Err(NotFoundError("Event does not exist."));
    }

    const editError = this.canEditEvent(existingEvent, userId, userRole);
    if (editError) {
      return Err(editError);
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
  

  async searchEvents(
  input: SearchEventsInput,
): Promise<Result<Event[], EventError>> {
  try {
    const raw = input.query.trim();

    if (raw.length > 200) {
      return Err(ValidationError("Search query is too long (max 200 characters)."));
    }

    const allPublished = await this.eventRepository.findByStatus("published");
    const now = new Date();
    const upcoming = allPublished.filter((e) => e.startDateTime > now);

    if (raw.length === 0) {
      return Ok(this.sortByDateAsc(upcoming));
    }

    const lower = raw.toLowerCase();
    const matched = upcoming.filter(
      (e) =>
        e.title.toLowerCase().includes(lower) ||
        e.description.toLowerCase().includes(lower) ||
        e.location.toLowerCase().includes(lower),
    );

    return Ok(this.sortByDateAsc(matched));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error in searchEvents";
    return Err(ValidationError(message));
  }
}
  private canEditEvent(
    event: Event,
    userId: string,
    userRole: UserRole,
  ): EventError | null {
    const isOrganizer = event.organizerId === userId;
    const isAdmin = userRole === "admin";

    if (!isOrganizer && !isAdmin) {
      return UnauthorizedError(
        "Only the organizer or an admin can edit this event.",
      );
    }

    if (event.status === "cancelled" || event.status === "past") {
      return InvalidStateError(
        "Cancelled and past events cannot be edited.",
      );
    }

    return null;
  }


  private sortByDateAsc(events: Event[]): Event[] {
    return [...events].sort(
      (a, b) => a.startDateTime.getTime() - b.startDateTime.getTime(),
    );
  }

  async transitionExpiredEvents(): Promise<Result<number, EventError>> {
    const published = await this.eventRepository.findByStatus("published");
    const now = new Date();
    const expired = published.filter((e) => e.endDateTime <= now);
 
    let count = 0;
    for (const event of expired) {
      const updated = await this.eventRepository.updateStatus(event.id, "past");
      if (updated) count++;
    }
 
    return Ok(count);
  }
 
  async getArchivedEvents(
    input: GetArchivedEventsInput,
  ): Promise<Result<Event[], EventError>> {
    const category = input.category?.trim() ?? "";
 
    if (category.length > 100) {
      return Err(ValidationError("Category filter is too long."));
    }
 
    const past = await this.eventRepository.findByStatus("past");
 
    const filtered =
      category.length > 0
        ? past.filter(
            (e) => e.category.toLowerCase() === category.toLowerCase(),
          )
        : past;
 
    const sorted = [...filtered].sort(
      (a, b) => b.endDateTime.getTime() - a.endDateTime.getTime(),
    );
 
    return Ok(sorted);
  }
 
  async getArchivedCategories(): Promise<Result<string[], EventError>> {
    const past = await this.eventRepository.findByStatus("past");
    const unique = [...new Set(past.map((e) => e.category))].sort();
    return Ok(unique);
  }

  async createEvent(input: CreateEventInput): Promise<Result<Event, EventError>> {
    const validationError = this.validateUpdateInput(input);
    if (validationError) {
      return Err(validationError);
    }

    const now = new Date();
    const newEvent: Event = {
      id: crypto.randomUUID(),
      title: input.title.trim(),
      description: input.description.trim(),
      location: input.location.trim(),
      category: input.category.trim(),
      capacity: input.capacity,
      status: "draft",
      startDateTime: input.startDateTime,
      endDateTime: input.endDateTime,
      organizerId: input.organizerId,
      createdAt: now,
      updatedAt: now,
    };

    const savedEvent = await this.eventRepository.save(newEvent);
    return Ok(savedEvent);
  }

  async getOrganizerEvents(
    userId: string,
    userRole: UserRole,
  ): Promise<Result<Event[], EventError>> {
    if (userRole === 'admin') {
      const events = await this.eventRepository.findAll();
      return Ok(events);
    }
    const events = await this.eventRepository.findByOrganizer(userId);
    return Ok(events);
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

  async listEvents(filters: EventFilters): Promise<Result<Event[], never>> {
    const published = await this.eventRepository.findByStatus("published");

    const filtered = published.filter((event) => {
      if (filters.category && event.category !== filters.category) return false;
      if (filters.startDate && event.startDateTime < filters.startDate) return false;
      if (filters.endDate && event.startDateTime > filters.endDate) return false;
      return true;
    });

    return Ok(this.sortByDateAsc(filtered));
  }

}

export function CreateEventService(
  eventRepository: IEventRepository,
): IEventService {
  return new EventService(eventRepository);
}