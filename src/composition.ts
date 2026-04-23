import { CreateAdminUserService } from "./auth/AdminUserService";
import { CreateAuthController } from "./auth/AuthController";
import { CreateAuthService } from "./auth/AuthService";
import { CreateInMemoryUserRepository } from "./auth/InMemoryUserRepository";
import { CreatePasswordHasher } from "./auth/PasswordHasher";
import { CreateApp } from "./app";
import type { IApp } from "./contracts";
import { CreateEventController } from "./events/EventController";
import { CreateEventService } from "./events/EventService";
import { CreateInMemoryEventRepository } from "./repository/InMemoryEventRepository";
import { CreateInMemoryRSVPRepository } from "./rsvp/InMemoryRSVPRepository";
import { RSVPService } from "./rsvp/RSVPService";
import { CreateRSVPController } from "./rsvp/RSVPController";
import { CreateLoggingService } from "./service/LoggingService";
import type { ILoggingService } from "./service/LoggingService";

export function createComposedApp(logger?: ILoggingService): IApp {
  const resolvedLogger = logger ?? CreateLoggingService();

  // Authentication & authorization wiring
  const authUsers = CreateInMemoryUserRepository();
  const passwordHasher = CreatePasswordHasher();
  const authService = CreateAuthService(authUsers, passwordHasher);
  const adminUserService = CreateAdminUserService(authUsers, passwordHasher);
  const authController = CreateAuthController(authService, adminUserService, resolvedLogger);

  // Event feature wiring
  const eventRepository = CreateInMemoryEventRepository();
  const eventService = CreateEventService(eventRepository);

  const rsvpRepository = CreateInMemoryRSVPRepository();
  const rsvpService = new RSVPService(rsvpRepository, eventRepository);
  const rsvpController = CreateRSVPController(rsvpService);

  const eventController = CreateEventController(eventService, resolvedLogger, rsvpRepository);



  return CreateApp(authController, eventController, rsvpController, resolvedLogger);
}