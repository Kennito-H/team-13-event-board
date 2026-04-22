import request from "supertest";
import { createComposedApp } from "../../src/composition";
import { CreateInMemoryEventRepository } from "../../src/repository/InMemoryEventRepository";
import type { Event } from "../../src/events/Event";
 
describe("Event archive endpoints", () => {
  const now = new Date();
  const past = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const future = (days: number) => new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
 
  const pastTechEvent: Event = {
    id: "archive-past-tech",
    title: "Winter Code Sprint",
    description: "A focused two-hour coding session.",
    location: "Library Room 204",
    category: "Technology",
    status: "past",
    capacity: 20,
    startDateTime: past(14),
    endDateTime: past(13),
    organizerId: "user-staff",
    createdAt: past(30),
    updatedAt: past(14),
  };
 
  const pastSocialEvent: Event = {
    id: "archive-past-social",
    title: "Holiday Potluck Dinner",
    description: "Annual potluck dinner.",
    location: "Student Union Ballroom",
    category: "Social",
    status: "past",
    startDateTime: past(30),
    endDateTime: past(29),
    organizerId: "user-admin",
    createdAt: past(45),
    updatedAt: past(30),
  };
  
  const expiredPublishedEvent: Event = {
    id: "archive-expired-published",
    title: "Expired Published Event",
    description: "This event ended yesterday but is still marked published.",
    location: "Old Hall",
    category: "Technology",
    status: "published",
    startDateTime: past(3),
    endDateTime: past(1),
    organizerId: "user-staff",
    createdAt: past(10),
    updatedAt: past(3),
  };
 
  const futurePublishedEvent: Event = {
    id: "archive-future-published",
    title: "Upcoming Workshop",
    description: "This event has not happened yet.",
    location: "New Hall",
    category: "Technology",
    status: "published",
    startDateTime: future(5),
    endDateTime: future(6),
    organizerId: "user-staff",
    createdAt: past(2),
    updatedAt: past(2),
  };
 
  const cancelledEvent: Event = {
    id: "archive-cancelled",
    title: "Cancelled Event",
    description: "This event was cancelled and should not appear in archive.",
    location: "Nowhere",
    category: "Social",
    status: "cancelled",
    startDateTime: future(2),
    endDateTime: future(3),
    organizerId: "user-admin",
    createdAt: past(5),
    updatedAt: past(1),
  };
 
  CreateInMemoryEventRepository([
    pastTechEvent,
    pastSocialEvent,
    expiredPublishedEvent,
    futurePublishedEvent,
    cancelledEvent,
  ]);
 
  const app = createComposedApp().getExpressApp();
 
  async function loginAsUser() {
    const agent = request.agent(app);
    await agent
      .post("/login")
      .type("form")
      .send({ email: "user@app.test", password: "password123" })
      .expect(302);
    return agent;
  }

});