import type { RSVPRepository } from '../rsvp/RSVPRepository';
import type { Response } from "express";
import type { ILoggingService } from "../service/LoggingService";
import type { IEventService, EventFilters, CreateEventInput } from "./EventService";
import type { UpdateEventInput } from "./UpdateEventInput";
import type { EventError } from "./errors";
import type { Event } from "./Event";
import type { UserRole } from "../auth/User";
import { IAppBrowserSession } from "../session/AppSession";



export interface IEventController {
  showEditEventPage(
    res: Response,
    eventId: string,
    userId: string,
    userRole: UserRole,
    session?: IAppBrowserSession,
  ): Promise<void>;

  updateEventFromForm(
    res: Response,
    eventId: string,
    userId: string,
    userRole: UserRole,
    isHtmx: boolean,
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
    isHtmx: boolean,
  ): Promise<void>;

  cancelEventFromForm(
    res: Response,
    eventId: string,
    userId: string,
    userRole: UserRole,
    isHtmx: boolean,
  ): Promise<void>;

  showEventList(
    res: Response,
    session: IAppBrowserSession,
    query: { category?: string; timeframe?: string },
    isHtmx: boolean,
  ): Promise<void>;

  showSearchPage(
    res: Response,
    session: IAppBrowserSession,
    query: string,
    isHtmx: boolean,
  ): Promise<void>;

  showArchivePage(
    res: Response,
    session: IAppBrowserSession,
    category: string,
    isHtmx: boolean,

  ): Promise<void>;

    showCreateEventPage(
    res: Response,
    session: IAppBrowserSession,
  ): Promise<void>;

  createEventFromForm(
    res: Response,
    session: IAppBrowserSession,
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
    isHtmx: boolean, //
  ): Promise<void>;

  showEventDetailPage(
    res: Response,
    eventId: string,
    userId?: string,
    session?: IAppBrowserSession,
    rsvpError?: string | null,
  ): Promise<void>;

  showOrganizerDashboard(
    res: Response,
    userId: string,
    userRole: UserRole,
    session?: IAppBrowserSession,
  ): Promise<void>;

  

}

class EventController implements IEventController {
  constructor(
    private readonly eventService: IEventService,
    private readonly logger: ILoggingService,
    private readonly rsvpRepository?: RSVPRepository,
  ) {}

  async showEditEventPage(
    res: Response,
    eventId: string,
    userId: string,
    userRole: UserRole,
    session?: IAppBrowserSession,
  ): Promise<void> {
    const result = await this.eventService.getEditableEventById(eventId, userId, userRole,);

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

    const event: Event = result.value;

    res.render("events/edit", {
      event,
      pageError: null,
      session
    });
  }

  async updateEventFromForm(
    res: Response,
    eventId: string,
    userId: string,
    userRole: UserRole,
    isHtmx: boolean,
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

    const result = await this.eventService.updateEvent(eventId, updates, userId, userRole,);

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
      const viewModel = {
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
        successMessage: null,
      };

      if (isHtmx) {
        res.render("events/partials/edit-form-panel", {
          ...viewModel,
          layout: false,
        });
        return;
      }

      res.status(400).render("events/edit", viewModel);
      return;
    }

      res.status(500).render("partials/error", {
        message: "Unexpected server error.",
        layout: false,
      });
      return;
    }

    const updatedEvent: Event = result.value;
    if (isHtmx) {
      res.render("events/partials/edit-form-panel", {
        event: updatedEvent,
        pageError: null,
        successMessage: "Changes saved.",
        layout: false,
      });
      return;
    }

    res.redirect(`/events/${updatedEvent.id}`);

  }

  private renderDetailActions(
    res: Response,
    event: Event,
    options?: {
      transitionError?: string | null;
      rsvpError?: string | null;
    },
  ): void {
    res.render("events/partials/detail-actions", {
      event,
      rsvp: null,
      rsvpError: options?.rsvpError ?? null,
      transitionError: options?.transitionError ?? null,
      layout: false,
    });
  }

  async publishEventFromForm(
    res: Response,
    eventId: string,
    userId: string,
    isHtmx: boolean,
  ): Promise<void> {
    const result = await this.eventService.publishEvent(eventId, userId);

    if (result.ok === false) {
      const error: EventError = result.value;

      this.logger.warn(`Failed to publish event ${eventId}: ${error.message}`);

      if (isHtmx && (
        error.name === "UnauthorizedError" ||
        error.name === "InvalidStateError"
      )) {
        const currentEvent = await this.eventService.getEventById(eventId, userId);

        if (currentEvent.ok === true) {
          this.renderDetailActions(res, currentEvent.value, {
            transitionError: error.message,
          });
          return;
        }
      }

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

    if (isHtmx) {
      this.renderDetailActions(res, publishedEvent, {
        transitionError: null,
      });
      return;
    }

    res.redirect(`/events/${publishedEvent.id}`);
  }


  async cancelEventFromForm(
    res: Response,
    eventId: string,
    userId: string,
    userRole: UserRole,
    isHtmx: boolean,
  ): Promise<void> {
    const result = await this.eventService.cancelEvent(eventId, userId, userRole);

    if (result.ok === false) {
      const error: EventError = result.value;

      this.logger.warn(`Failed to cancel event ${eventId}: ${error.message}`);

      if (isHtmx && (
        error.name === "UnauthorizedError" ||
        error.name === "InvalidStateError"
      )) {
        const currentEvent = await this.eventService.getEventById(eventId, userId);

        if (currentEvent.ok === true) {
          this.renderDetailActions(res, currentEvent.value, {
            transitionError: error.message,
          });
          return;
        }
      }

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

    if (isHtmx) {
      this.renderDetailActions(res, cancelledEvent, {
        transitionError: null,
      });
      return;
    }

    res.redirect(`/events/${cancelledEvent.id}`);
  }


  async showEventList(
    res: Response,
    session: IAppBrowserSession,
    query: { category?: string; timeframe?: string },
    isHtmx: boolean,
  ): Promise<void> {
    const filters: EventFilters = {};

    if (query.category && query.category.trim().length > 0) {
      filters.category = query.category.trim();
    }

    if (query.timeframe && query.timeframe.trim().length > 0) {
      filters.timeframe = query.timeframe.trim();
    }

    const result = await this.eventService.listEvents(filters);

    if (result.ok === false) {
      if (isHtmx) {
        res.status(400).render("events/partials/list-results", {
          events: [],
          pageError: result.value.message,
          layout: false,
        });
        return;
      }
      res.status(400).render("events/list", {
        session,
        events: [],
        selectedCategory: query.category ?? "",
        selectedTimeframe: query.timeframe ?? "",
        pageError: result.value.message,
      });
      return;
    }

    if (isHtmx) {
      res.render("events/partials/list-results", {
        events: result.value,
        pageError: null,
        layout: false,
      });
      return;
    }

    res.render("events/list", {
      session,
      events: result.value,
      selectedCategory: query.category ?? "",
      selectedTimeframe: query.timeframe ?? "",
      pageError: null,
    });
  }

  async showSearchPage(
    res: Response,
    session: IAppBrowserSession,
    query: string,
    isHtmx: boolean,
  ): Promise<void> {
    const result = await this.eventService.searchEvents({ query });
 
    if (result.ok === false) {
      const error = result.value;
      this.logger.warn(`Search failed: ${error.message}`);
      if (isHtmx) {
        res.status(400).render("events/partials/search-results", {
          events: [],
          query,
          pageError: error.message,
          layout: false,
        });
        return;
      }
      res.status(400).render("events/search", {
        events: [],
        query,
        pageError: error.message,
        session,
      });
      return;
    }
 
    this.logger.info(`Search "${query}" returned ${result.value.length} result(s)`);
 
    if (isHtmx) {
      res.render("events/partials/search-results", {
        events: result.value,
        query,
        pageError: null,
        layout: false,
      });
      return;
    }
 
    res.render("events/search", {
      events: result.value,
      query,
      pageError: null,
      session,
    });
  }

  async showArchivePage(
    res: Response,
    session: IAppBrowserSession,
    category: string,
    isHtmx: boolean,
  ): Promise<void> {
    const transitionResult = await this.eventService.transitionExpiredEvents();
    if (transitionResult.ok === true && transitionResult.value > 0) {
      this.logger.info(`Archived ${transitionResult.value} expired event(s) on request.`);
    }
 
    const [eventsResult, categoriesResult] = await Promise.all([
      this.eventService.getArchivedEvents({ category }),
      this.eventService.getArchivedCategories(),
    ]);
 
    if (eventsResult.ok === false) {
      const error = eventsResult.value;
      this.logger.warn(`Archive fetch failed: ${error.message}`);
      if (isHtmx) {
        res.status(400).render("events/partials/archive-results", {
          events: [],
          category,
          categories: [],
          pageError: error.message,
          layout: false,
        });
        return;
      }
      res.status(400).render("events/archive", {
        events: [],
        category,
        categories: [],
        pageError: error.message,
        session,
      });
      return;
    }
 
    const categories = categoriesResult.ok ? categoriesResult.value : [];
 
    this.logger.info(
      `Archive: ${eventsResult.value.length} past event(s), category="${category || "all"}"`,
    );
 
    if (isHtmx) {
      res.render("events/partials/archive-results", {
        events: eventsResult.value,
        category,
        categories,
        pageError: null,
        layout: false,
      });
      return;
    }
 
    res.render("events/archive", {
      events: eventsResult.value,
      category,
      categories,
      pageError: null,
      session,
    });
  }

  async showCreateEventPage(
    res: Response,
    session: IAppBrowserSession,
  ): Promise<void> {
    res.render("events/create", { pageError: null, session });
  }

  async createEventFromForm(
    res: Response,
    session: IAppBrowserSession,
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
    isHtmx: boolean,
  ): Promise<void> {
    const result = await this.eventService.createEvent({
      title: form.title,
      description: form.description,
      location: form.location,
      category: form.category,
      capacity: form.capacity,
      startDateTime: new Date(form.startDateTime),
      endDateTime: new Date(form.endDateTime),
      organizerId: userId,
    });

    if (result.ok === false) {
      const error = result.value;
      this.logger.warn(`Failed to create event: ${error.message}`);

      if (error.name === "ValidationError") {
        if (isHtmx) {
        res.status(400).render("events/partials/create-form", {
          form,
          pageError: error.message,
          layout: false,
        });
        return;
      }
      res.status(400).render("events/create", {
          session,
          form,
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

    const newEvent = result.value;
    if (isHtmx) {
      res.setHeader("HX-Redirect", `/events/${newEvent.id}`);
      res.status(200).end();
      return;
    }
    res.redirect(`/events/${newEvent.id}`);

  }

  async showEventDetailPage(
    res: Response,
    eventId: string,
    userId?: string,
    session?: IAppBrowserSession,
    rsvpError?: string | null,
  ): Promise<void> {
    const result = await this.eventService.getEventById(eventId, userId);
  
    if (result.ok === false) {
      const error = result.value;
      if (error.name === "NotFoundError" || error.name === "UnauthorizedError") {
        res.status(404).render("partials/error", { message: "Event not found.", layout: false });
        return;
      }
      res.status(500).render("partials/error", { message: "Unexpected server error.", layout: false });
      return;
    }
  
    const rsvp = userId && this.rsvpRepository
      ? await this.rsvpRepository.findByEventAndUser(eventId, userId)
      : null;
    const event = result.value;
    const isOrganizer = userId !== undefined && event.organizerId === userId;
    const isAdmin = session?.authenticatedUser?.role === "admin";
    res.render("events/detail", { event, session, isOrganizer, isAdmin, rsvpError: rsvpError ?? null, rsvp });
  }

  async showOrganizerDashboard(
    res: Response,
    userId: string,
    userRole: UserRole,
    session?: IAppBrowserSession,
  ): Promise<void> {
    const result = await this.eventService.getOrganizerEvents(userId, userRole);

    if (result.ok === false) {
      res.status(500).render('partials/error', { message: 'Unexpected server error.', layout: false });
      return;
    }

    const events = result.value;

    const eventsWithCounts = await Promise.all(
      events.map(async (event) => {
        const going = this.rsvpRepository
          ? await this.rsvpRepository.countActiveByEvent(event.id)
          : 0;
        return { event, going };
      }),
    );

    res.render('events/orgDashboard', { eventsWithCounts, session });
  }
}

export function CreateEventController(
  eventService: IEventService,
  logger: ILoggingService,
  rsvpRepository?: RSVPRepository,
): IEventController {
  return new EventController(eventService, logger, rsvpRepository);
}

