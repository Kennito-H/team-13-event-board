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
import { InMemoryRSVPRepository } from "./rsvp/InMemoryRSVPRepository";
import { RSVPService } from "./rsvp/RSVPService";
import { InMemoryEventRepositoryStub } from "./rsvp/StubEventRepository";
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
  const eventController = CreateEventController(eventService, resolvedLogger);

  // RSVP wiring using stub event repository for now
  const rsvpRepository = new InMemoryRSVPRepository();
  const eventRepositoryStub = new InMemoryEventRepositoryStub();
  const rsvpService = new RSVPService(rsvpRepository, eventRepositoryStub);

  return CreateApp(authController, eventController, resolvedLogger);
}