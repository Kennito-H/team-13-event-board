import request from "supertest";
import { createComposedApp } from "../../src/composition";
import { CreateInMemoryEventRepository } from "../../src/repository/InMemoryEventRepository";
import type { Event } from "../../src/events/Event";

describe("Event transition endpoints", () => {
  const draftEvent: Event = {
    id: "event-publish-1",
    title: "Draft Event",
    description: "Ready to publish",
    location: "Campus Center",
    category: "Social",
    capacity: 25,
    status: "draft",
    startDateTime: new Date("2026-04-25T18:00:00.000Z"),
    endDateTime: new Date("2026-04-25T20:00:00.000Z"),
    organizerId: "user-reader",
    createdAt: new Date("2026-04-01T12:00:00.000Z"),
    updatedAt: new Date("2026-04-01T12:00:00.000Z"),
  };

  const organizerPublishedEvent: Event = {
    id: "event-cancel-1",
    title: "Organizer Published Event",
    description: "Organizer can cancel this",
    location: "Student Union",
    category: "Workshop",
    capacity: 30,
    status: "published",
    startDateTime: new Date("2026-04-26T18:00:00.000Z"),
    endDateTime: new Date("2026-04-26T20:00:00.000Z"),
    organizerId: "user-reader",
    createdAt: new Date("2026-04-02T12:00:00.000Z"),
    updatedAt: new Date("2026-04-02T12:00:00.000Z"),
  };

  const adminCancellableEvent: Event = {
    id: "event-cancel-2",
    title: "Staff Published Event",
    description: "Admin can cancel this",
    location: "Library",
    category: "Meeting",
    capacity: 50,
    status: "published",
    startDateTime: new Date("2026-04-27T18:00:00.000Z"),
    endDateTime: new Date("2026-04-27T20:00:00.000Z"),
    organizerId: "user-staff",
    createdAt: new Date("2026-04-03T12:00:00.000Z"),
    updatedAt: new Date("2026-04-03T12:00:00.000Z"),
  };

  const eventRepository = CreateInMemoryEventRepository([
    draftEvent,
    organizerPublishedEvent,
    adminCancellableEvent,
  ]);

  const app = createComposedApp().getExpressApp();

  async function loginAsAdmin() {
    const agent = request.agent(app);

    await agent
      .post("/login")
      .type("form")
      .send({
        email: "admin@app.test",
        password: "password123",
      })
      .expect(302);

    return agent;
  }

  async function loginAsUser() {
    const agent = request.agent(app);

    await agent
      .post("/login")
      .type("form")
      .send({
        email: "user@app.test",
        password: "password123",
      })
      .expect(302);

    return agent;
  }

  it("allows the organizer to publish their own draft event", async () => {
    const agent = await loginAsUser();

    const response = await agent
      .post(`/events/${draftEvent.id}/publish`)
      .expect(302);

    expect(response.headers.location).toBe(`/events/${draftEvent.id}`);

    const savedEvent = await eventRepository.findById(draftEvent.id);

    expect(savedEvent).not.toBeNull();
    expect(savedEvent?.status).toBe("published");
  });

  it("allows the organizer to cancel their own published event", async () => {
    const agent = await loginAsUser();

    const response = await agent
      .post(`/events/${organizerPublishedEvent.id}/cancel`)
      .expect(302);

    expect(response.headers.location).toBe(`/events/${organizerPublishedEvent.id}`);

    const savedEvent = await eventRepository.findById(organizerPublishedEvent.id);

    expect(savedEvent).not.toBeNull();
    expect(savedEvent?.status).toBe("cancelled");
  });

  it("allows an admin to cancel another user's published event", async () => {
    const agent = await loginAsAdmin();

    const response = await agent
      .post(`/events/${adminCancellableEvent.id}/cancel`)
      .expect(302);

    expect(response.headers.location).toBe(`/events/${adminCancellableEvent.id}`);

    const savedEvent = await eventRepository.findById(adminCancellableEvent.id);

    expect(savedEvent).not.toBeNull();
    expect(savedEvent?.status).toBe("cancelled");
  });
});
