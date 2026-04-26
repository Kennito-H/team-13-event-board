import request from "supertest";
import { createComposedApp } from "../../src/composition";
import { prisma } from "../../src/lib/prisma";
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

  const testEventIds = [
    seededEvent.id,
    "event-edit-organizer",
    "event-edit-cancelled",
  ];

  beforeAll(async () => {
    await prisma.rSVP.deleteMany({ where: { eventId: { in: testEventIds } } });
    await prisma.event.deleteMany({ where: { id: { in: testEventIds } } });

    await prisma.event.create({
      data: {
        ...seededEvent,
        capacity: seededEvent.capacity ?? null,
      },
    });
  });

  afterAll(async () => {
    await prisma.rSVP.deleteMany({ where: { eventId: { in: testEventIds } } });
    await prisma.event.deleteMany({ where: { id: { in: testEventIds } } });
  });


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

    const savedEvent = await prisma.event.findUnique({
      where: { id: seededEvent.id },
    });


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

    await prisma.event.create({
      data: {
        ...organizerOwnedEvent,
        capacity: organizerOwnedEvent.capacity ?? null,
      },
    });

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

    const savedEvent = await prisma.event.findUnique({
      where: { id: organizerOwnedEvent.id },
    });


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

    await prisma.event.create({
      data: {
        ...cancelledEvent,
        capacity: cancelledEvent.capacity ?? null,
      },
    });

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