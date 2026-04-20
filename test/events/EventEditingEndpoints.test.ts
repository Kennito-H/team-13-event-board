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
    organizerId: "user-reader",
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
});
