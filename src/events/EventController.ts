import type { Response } from "express";
import type { ILoggingService } from "../service/LoggingService";
import type { IEventService } from "./EventService";
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
}

export function CreateEventController(
  eventService: IEventService,
  logger: ILoggingService,
): IEventController {
  return new EventController(eventService, logger);
}