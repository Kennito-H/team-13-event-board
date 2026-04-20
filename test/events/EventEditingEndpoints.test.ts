import request from "supertest";
import { createComposedApp } from "../../src/composition";
import { CreateInMemoryEventRepository } from "../../src/repository/InMemoryEventRepository";
import type { Event } from "../../src/events/Event";

describe("Event editing endpoints", () => {
  const seededEvent: Event = {
    id: "event-edit-1",
    title: "Original Title",
    description: "Original description",
    location: "Campus Center",
    category: "Social",
    capacity: 25,
    status: "published",
    startDateTime: new Date("2026-04-25T18:00:00.000Z"),
    endDateTime: new Date("2026-04-25T20:00:00.000Z"),
    organizerId: "user-staff",
    createdAt: new Date("2026-04-01T12:00:00.000Z"),
    updatedAt: new Date("2026-04-01T12:00:00.000Z"),
  };

  const eventRepository = CreateInMemoryEventRepository([seededEvent]);
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

  it("allows admin to edit a user's published event", async () => {
    const agent = await loginAsAdmin();

    const response = await agent
      .post(`/events/${seededEvent.id}/edit`)
      .type("form")
      .send({
        title: "Updated Title",
        description: "Updated description",
        location: "Student Union",
        category: "Workshop",
        capacity: "40",
        startDateTime: "2026-04-25T19:00",
        endDateTime: "2026-04-25T22:00",
      })
      .expect(302);

    expect(response.headers.location).toBe(`/events/${seededEvent.id}`);

    const savedEvent = await eventRepository.findById(seededEvent.id);

    expect(savedEvent).not.toBeNull();
    expect(savedEvent?.title).toBe("Updated Title");
    expect(savedEvent?.description).toBe("Updated description");
    expect(savedEvent?.location).toBe("Student Union");
    expect(savedEvent?.category).toBe("Workshop");
    expect(savedEvent?.capacity).toBe(40);
  });

  it("allows the organizer to edit their own published event", async () => {
    const organizerOwnedEvent: Event = {
        id: "event-edit-organizer",
        title: "Organizer Original Title",
        description: "Organizer original description",
        location: "Old Hall",
        category: "Meeting",
        capacity: 25,
        status: "published",
        startDateTime: new Date("2026-04-26T18:00:00.000Z"),
        endDateTime: new Date("2026-04-26T20:00:00.000Z"),
        organizerId: "user-reader",
        createdAt: new Date("2026-04-01T12:00:00.000Z"),
        updatedAt: new Date("2026-04-01T12:00:00.000Z"),
    };

    await eventRepository.save(organizerOwnedEvent);

    const agent = await loginAsUser();

    const response = await agent
        .post(`/events/${organizerOwnedEvent.id}/edit`)
        .type("form")
        .send({
        title: "Organizer Updated Title",
        description: "Organizer updated description",
        location: "New Hall",
        category: "Workshop",
        capacity: "30",
        startDateTime: "2026-04-26T19:00",
        endDateTime: "2026-04-26T21:00",
        })
        .expect(302);

    expect(response.headers.location).toBe(`/events/${organizerOwnedEvent.id}`);

    const savedEvent = await eventRepository.findById(organizerOwnedEvent.id);

    expect(savedEvent).not.toBeNull();
    expect(savedEvent?.title).toBe("Organizer Updated Title");
    expect(savedEvent?.description).toBe("Organizer updated description");
    expect(savedEvent?.location).toBe("New Hall");
    expect(savedEvent?.category).toBe("Workshop");
    expect(savedEvent?.capacity).toBe(30);
    });

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

    it("returns 403 when a member tries to edit an event", async () => {
    const agent = await loginAsUser();

    const response = await agent
        .post(`/events/${seededEvent.id}/edit`)
        .type("form")
        .send({
        title: "NA",
        description: "NA",
        location: "NA",
        category: "NA",
        capacity: "10",
        startDateTime: "2026-04-25T19:00",
        endDateTime: "2026-04-25T21:00",
        })
        .expect(403);

    expect(response.text).toContain("Only the organizer or an admin can edit this event.");
    });

    it("returns 404 when editing an event that does not exist", async () => {
    const agent = await loginAsAdmin();

    const response = await agent
        .post("/events/does-not-exist/edit")
        .type("form")
        .send({
        title: "Nonexistent",
        description: "Nonexistent",
        location: "Nonexistent",
        category: "Nonexistent",
        capacity: "10",
        startDateTime: "2026-04-25T19:00",
        endDateTime: "2026-04-25T21:00",
        })
        .expect(404);

    expect(response.text).toContain("Event does not exist.");
});

    it("returns 400 when editing a cancelled event", async () => {
    const cancelledEvent: Event = {
        id: "event-edit-cancelled",
        title: "NA",
        description: "NA",
        location: "Campus Center",
        category: "Social",
        capacity: 10,
        status: "cancelled",
        startDateTime: new Date("2026-04-26T18:00:00.000Z"),
        endDateTime: new Date("2026-04-26T20:00:00.000Z"),
        organizerId: "user-reader",
        createdAt: new Date("2026-04-01T12:00:00.000Z"),
        updatedAt: new Date("2026-04-01T12:00:00.000Z"),
    };

    await eventRepository.save(cancelledEvent);

    const agent = await loginAsAdmin();

    const response = await agent
        .post(`/events/${cancelledEvent.id}/edit`)
        .type("form")
        .send({
        title: "Should Fail",
        description: "Should Fail",
        location: "Nowhere",
        category: "Blocked",
        capacity: "10",
        startDateTime: "2026-04-26T19:00",
        endDateTime: "2026-04-26T21:00",
        })
        .expect(400);

    expect(response.text).toContain("Cancelled and past events cannot be edited.");
});

    it("returns 400 when edit input is invalid", async () => {
    const agent = await loginAsAdmin();

    const response = await agent
        .post(`/events/${seededEvent.id}/edit`)
        .type("form")
        .send({
        title: "",
        description: "Updated description",
        location: "Student Union",
        category: "Workshop",
        capacity: "40",
        startDateTime: "2026-04-25T21:00",
        endDateTime: "2026-04-25T19:00",
        })
        .expect(400);

    expect(response.text).toContain("Title is required.");
    });
});