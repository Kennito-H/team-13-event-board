import type { Response } from "express";
import type { ILoggingService } from "../service/LoggingService";
import type { IEventService, EventFilters } from "./EventService";
import type { UpdateEventInput } from "./UpdateEventInput";
import type { EventError } from "./errors";
import type { Event } from "./Event";
import type { UserRole } from "../auth/User";


export interface IEventController {
  showEditEventPage(
    res: Response,
    eventId: string,
    userId: string,
  ): Promise<void>;

  updateEventFromForm(
    res: Response,
    eventId: string,
    userId: string,
    form: {
      title: string;
      description: string;
      location: string;
      category: string;
      capacity?: number;
      startDateTime: string;
      endDateTime: string;
    },
  ): Promise<void>;

  publishEventFromForm(
    res: Response,
    eventId: string,
    userId: string,
  ): Promise<void>;

   cancelEventFromForm(
    res: Response,
    eventId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<void>;

  showEventList(
    res: Response,
    query: { category?: string; timeframe?: string },
  ): Promise<void>;
}

class EventController implements IEventController {
  constructor(
    private readonly eventService: IEventService,
    private readonly logger: ILoggingService,
  ) {}

  async showEditEventPage(
    res: Response,
    eventId: string,
    userId: string,
  ): Promise<void> {
    const result = await this.eventService.getEventById(eventId, userId);

    if (result.ok === false) {
      const error: EventError = result.value;

      if (error.name === "NotFoundError") {
        res.status(404).render("partials/error", {
          message: error.message,
          layout: false,
        });
        return;
      }

      if (error.name === "UnauthorizedError") {
        res.status(403).render("partials/error", {
          message: error.message,
          layout: false,
        });
        return;
      }

      res.status(500).render("partials/error", {
        message: "Unexpected server error.",
        layout: false,
      });
      return;
    }

    const event: Event = result.value;

    res.render("events/edit", {
      event,
      pageError: null,
    });
  }

  async updateEventFromForm(
    res: Response,
    eventId: string,
    userId: string,
    form: {
      title: string;
      description: string;
      location: string;
      category: string;
      capacity?: number;
      startDateTime: string;
      endDateTime: string;
    },
  ): Promise<void> {
    const updates: UpdateEventInput = {
      title: form.title,
      description: form.description,
      location: form.location,
      category: form.category,
      capacity: form.capacity,
      startDateTime: new Date(form.startDateTime),
      endDateTime: new Date(form.endDateTime),
    };

    const result = await this.eventService.updateEvent(eventId, updates, userId);

    if (result.ok === false) {
      const error: EventError = result.value;

      this.logger.warn(`Failed to update event ${eventId}: ${error.message}`);

      if (error.name === "NotFoundError") {
        res.status(404).render("partials/error", {
          message: error.message,
          layout: false,
        });
        return;
      }

      if (error.name === "UnauthorizedError") {
        res.status(403).render("partials/error", {
          message: error.message,
          layout: false,
        });
        return;
      }

      if (
        error.name === "ValidationError" ||
        error.name === "InvalidStateError"
      ) {
        res.status(400).render("events/edit", {
          event: {
            id: eventId,
            title: form.title,
            description: form.description,
            location: form.location,
            category: form.category,
            capacity: form.capacity,
            startDateTime: form.startDateTime,
            endDateTime: form.endDateTime,
          },
          pageError: error.message,
        });
        return;
      }

      res.status(500).render("partials/error", {
        message: "Unexpected server error.",
        layout: false,
      });
      return;
    }

    const updatedEvent: Event = result.value;
    res.redirect(`/events/${updatedEvent.id}`);
  }

  async publishEventFromForm(
    res: Response,
    eventId: string,
    userId: string,
  ): Promise<void> {
    const result = await this.eventService.publishEvent(eventId, userId);

    if (result.ok === false) {
      const error: EventError = result.value;

      this.logger.warn(`Failed to publish event ${eventId}: ${error.message}`);

      if (error.name === "NotFoundError") {
        res.status(404).render("partials/error", {
          message: error.message,
          layout: false,
        });
        return;
      }

      if (error.name === "UnauthorizedError") {
        res.status(403).render("partials/error", {
          message: error.message,
          layout: false,
        });
        return;
      }

      if (error.name === "InvalidStateError") {
        res.status(400).render("partials/error", {
          message: error.message,
          layout: false,
        });
        return;
      }

      res.status(500).render("partials/error", {
        message: "Unexpected server error.",
        layout: false,
      });
      return;
    }

    const publishedEvent: Event = result.value;
    res.redirect(`/events/${publishedEvent.id}`);
  }

  async cancelEventFromForm(
    res: Response,
    eventId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<void> {
    const result = await this.eventService.cancelEvent(eventId, userId, userRole);

    if (result.ok === false) {
      const error: EventError = result.value;

      this.logger.warn(`Failed to cancel event ${eventId}: ${error.message}`);

      if (error.name === "NotFoundError") {
        res.status(404).render("partials/error", {
          message: error.message,
          layout: false,
        });
        return;
      }

      if (error.name === "UnauthorizedError") {
        res.status(403).render("partials/error", {
          message: error.message,
          layout: false,
        });
        return;
      }

      if (error.name === "InvalidStateError") {
        res.status(400).render("partials/error", {
          message: error.message,
          layout: false,
        });
        return;
      }

      res.status(500).render("partials/error", {
        message: "Unexpected server error.",
        layout: false,
      });
      return;
    }

    const cancelledEvent: Event = result.value;
    res.redirect(`/events/${cancelledEvent.id}`);
  }

  async showEventList(
    res: Response,
    query: { category?: string; timeframe?: string },
  ): Promise<void> {
    const filters: EventFilters = {};

    if (query.category && query.category.trim().length > 0) {
      filters.category = query.category.trim();
    }

    const now = new Date();
    if (query.timeframe === "this-week") {
      filters.startDate = now;
      filters.endDate = this.endOfWeek(now);
    } else if (query.timeframe === "this-weekend") {
      filters.startDate = this.startOfUpcomingSaturday(now);
      filters.endDate = this.endOfUpcomingSunday(now);
    } else if (query.timeframe === "upcoming") {
      filters.startDate = now;
    }

    const result = await this.eventService.listEvents(filters);
    const events = result.value;

    res.render("events/list", {
      events,
      selectedCategory: query.category ?? "",
      selectedTimeframe: query.timeframe ?? "",
      pageError: null,
    });
  }

  private endOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay(); // 0 = Sunday
    const daysUntilSunday = (7 - day) % 7;
    d.setDate(d.getDate() + daysUntilSunday);
    d.setHours(23, 59, 59, 999);
    return d;
  }

  private startOfUpcomingSaturday(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const daysUntilSaturday = (6 - day + 7) % 7;
    d.setDate(d.getDate() + daysUntilSaturday);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private endOfUpcomingSunday(date: Date): Date {
    const d = this.startOfUpcomingSaturday(date);
    d.setDate(d.getDate() + 1);
    d.setHours(23, 59, 59, 999);
    return d;
  }
}

export function CreateEventController(
  eventService: IEventService,
  logger: ILoggingService,
): IEventController {
  return new EventController(eventService, logger);
}