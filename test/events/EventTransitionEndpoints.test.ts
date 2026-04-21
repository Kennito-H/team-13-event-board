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

  async function loginAsStaff() {
    const agent = request.agent(app);

    await agent
        .post("/login")
        .type("form")
        .send({
        email: "staff@app.test",
        password: "password123",
        })
        .expect(302);

    return agent;
    }

    it("returns 403 when a non-owner user tries to publish another user's draft event", async () => {
    const otherUsersDraftEvent: Event = {
        id: "event-publish-forbidden",
        title: "Staff Draft Event",
        description: "Only the organizer should publish this",
        location: "Campus Center",
        category: "Social",
        capacity: 20,
        status: "draft",
        startDateTime: new Date("2026-04-28T18:00:00.000Z"),
        endDateTime: new Date("2026-04-28T20:00:00.000Z"),
        organizerId: "user-staff",
        createdAt: new Date("2026-04-04T12:00:00.000Z"),
        updatedAt: new Date("2026-04-04T12:00:00.000Z"),
    };

    await eventRepository.save(otherUsersDraftEvent);

    const agent = await loginAsUser();

    const response = await agent
        .post(`/events/${otherUsersDraftEvent.id}/publish`)
        .expect(403);

    expect(response.text).toContain("Only the organizer can publish this event.");
    });

    it("returns 404 when publishing an event that does not exist", async () => {
    const agent = await loginAsUser();

    const response = await agent
        .post("/events/does-not-exist/publish")
        .expect(404);

    expect(response.text).toContain("Event does not exist.");
    });

    it("returns 403 when a non-owner non-admin tries to cancel another user's published event", async () => {
    const staffPublishedEvent: Event = {
        id: "event-cancel-forbidden",
        title: "Staff Published Event",
        description: "Only the organizer or admin should cancel this",
        location: "Library",
        category: "Meeting",
        capacity: 50,
        status: "published",
        startDateTime: new Date("2026-04-29T18:00:00.000Z"),
        endDateTime: new Date("2026-04-29T20:00:00.000Z"),
        organizerId: "user-staff",
        createdAt: new Date("2026-04-05T12:00:00.000Z"),
        updatedAt: new Date("2026-04-05T12:00:00.000Z"),
    };

    await eventRepository.save(staffPublishedEvent);

    const agent = await loginAsUser();

    const response = await agent
        .post(`/events/${staffPublishedEvent.id}/cancel`)
        .expect(403);

    expect(response.text).toContain("Only the organizer or an admin can cancel this event.");
    });

    it("returns 404 when cancelling an event that does not exist", async () => {
    const agent = await loginAsAdmin();

    const response = await agent
        .post("/events/does-not-exist/cancel")
        .expect(404);

    expect(response.text).toContain("Event does not exist.");
    });

    it("returns 400 when publishing an already published event", async () => {
        const alreadyPublishedEvent: Event = {
            id: "event-publish-already-published",
            title: "Already Published",
            description: "This event is already published",
            location: "Campus Center",
            category: "Social",
            capacity: 20,
            status: "published",
            startDateTime: new Date("2026-04-28T18:00:00.000Z"),
            endDateTime: new Date("2026-04-28T20:00:00.000Z"),
            organizerId: "user-reader",
            createdAt: new Date("2026-04-04T12:00:00.000Z"),
            updatedAt: new Date("2026-04-04T12:00:00.000Z"),
        };

        await eventRepository.save(alreadyPublishedEvent);

        const agent = await loginAsUser();

        const response = await agent
            .post(`/events/${alreadyPublishedEvent.id}/publish`)
            .expect(400);

        expect(response.text).toContain("Only draft events can be published.");
    });

    it("returns 400 when publishing a cancelled event", async () => {
        const cancelledEvent: Event = {
            id: "event-publish-cancelled",
            title: "Cancelled Event",
            description: "This event was cancelled",
            location: "Student Union",
            category: "Workshop",
            capacity: 15,
            status: "cancelled",
            startDateTime: new Date("2026-04-29T18:00:00.000Z"),
            endDateTime: new Date("2026-04-29T20:00:00.000Z"),
            organizerId: "user-reader",
            createdAt: new Date("2026-04-05T12:00:00.000Z"),
            updatedAt: new Date("2026-04-05T12:00:00.000Z"),
        };

        await eventRepository.save(cancelledEvent);

        const agent = await loginAsUser();

        const response = await agent
            .post(`/events/${cancelledEvent.id}/publish`)
            .expect(400);

        expect(response.text).toContain("Only draft events can be published.");
    });

    it("returns 400 when cancelling a draft event", async () => {
    const draftEvent: Event = {
        id: "event-cancel-draft",
        title: "Draft Event",
        description: "This event is still a draft",
        location: "Library",
        category: "Meeting",
        capacity: 30,
        status: "draft",
        startDateTime: new Date("2026-04-30T18:00:00.000Z"),
        endDateTime: new Date("2026-04-30T20:00:00.000Z"),
        organizerId: "user-reader",
        createdAt: new Date("2026-04-06T12:00:00.000Z"),
        updatedAt: new Date("2026-04-06T12:00:00.000Z"),
    };

    await eventRepository.save(draftEvent);

    const agent = await loginAsUser();

    const response = await agent
        .post(`/events/${draftEvent.id}/cancel`)
        .expect(400);

    expect(response.text).toContain("Only published events can be cancelled.");
    });

    it("returns 400 when cancelling an already cancelled event", async () => {
    const cancelledEvent: Event = {
        id: "event-cancel-already-cancelled",
        title: "Already Cancelled",
        description: "This event is already cancelled",
        location: "Campus Center",
        category: "Social",
        capacity: 10,
        status: "cancelled",
        startDateTime: new Date("2026-05-01T18:00:00.000Z"),
        endDateTime: new Date("2026-05-01T20:00:00.000Z"),
        organizerId: "user-reader",
        createdAt: new Date("2026-04-07T12:00:00.000Z"),
        updatedAt: new Date("2026-04-07T12:00:00.000Z"),
    };

    await eventRepository.save(cancelledEvent);

    const agent = await loginAsUser();

    const response = await agent
        .post(`/events/${cancelledEvent.id}/cancel`)
        .expect(400);

    expect(response.text).toContain("Only published events can be cancelled.");
    });

    it("returns 400 when cancelling a past event", async () => {
    const pastEvent: Event = {
        id: "event-cancel-past",
        title: "Past Event",
        description: "This event has already ended",
        location: "Old Chapel",
        category: "Lecture",
        capacity: 40,
        status: "past",
        startDateTime: new Date("2026-04-01T18:00:00.000Z"),
        endDateTime: new Date("2026-04-01T20:00:00.000Z"),
        organizerId: "user-reader",
        createdAt: new Date("2026-03-20T12:00:00.000Z"),
        updatedAt: new Date("2026-04-02T12:00:00.000Z"),
    };

    await eventRepository.save(pastEvent);

    const agent = await loginAsUser();

    const response = await agent
        .post(`/events/${pastEvent.id}/cancel`)
        .expect(400);

    expect(response.text).toContain("Only published events can be cancelled.");
    });
});