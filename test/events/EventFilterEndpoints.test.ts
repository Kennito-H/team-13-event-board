import request from "supertest";
import { createComposedApp } from "../../src/composition";
import { CreateInMemoryEventRepository } from "../../src/repository/InMemoryEventRepository";
import type { Event } from "../../src/events/Event";

describe("Event filter endpoints", () => {
  const publishedMusicThisWeek: Event = {
    id: "event-filter-music",
    title: "Music This Week",
    description: "Published music event within this week",
    location: "Hall A",
    category: "Music",
    capacity: 50,
    status: "published",
    startDateTime: new Date(),
    endDateTime: new Date(),
    organizerId: "user-reader",
    createdAt: new Date("2026-04-01T12:00:00.000Z"),
    updatedAt: new Date("2026-04-01T12:00:00.000Z"),
  };

  const publishedWorkshopThisWeekend: Event = {
    id: "event-filter-workshop",
    title: "Workshop This Weekend",
    description: "Published workshop event this weekend",
    location: "Hall B",
    category: "Workshop",
    capacity: 30,
    status: "published",
    startDateTime: new Date(),
    endDateTime: new Date(),
    organizerId: "user-reader",
    createdAt: new Date("2026-04-01T12:00:00.000Z"),
    updatedAt: new Date("2026-04-01T12:00:00.000Z"),
  };

  const publishedMusicLater: Event = {
    id: "event-filter-music-later",
    title: "Music Later",
    description: "Published music event further in the future",
    location: "Hall C",
    category: "Music",
    capacity: 100,
    status: "published",
    startDateTime: new Date(),
    endDateTime: new Date(),
    organizerId: "user-reader",
    createdAt: new Date("2026-04-01T12:00:00.000Z"),
    updatedAt: new Date("2026-04-01T12:00:00.000Z"),
  };

  const draftMusic: Event = {
    id: "event-filter-draft",
    title: "Draft Music",
    description: "Should never appear in any filtered list",
    location: "Hall D",
    category: "Music",
    capacity: 20,
    status: "draft",
    startDateTime: new Date(),
    endDateTime: new Date(),
    organizerId: "user-reader",
    createdAt: new Date("2026-04-01T12:00:00.000Z"),
    updatedAt: new Date("2026-04-01T12:00:00.000Z"),
  };

  const eventRepository = CreateInMemoryEventRepository([
    publishedMusicThisWeek,
    publishedWorkshopThisWeekend,
    publishedMusicLater,
    draftMusic,
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

  it("returns all published events when no filters are applied", async () => {
  });

  it("filters by category only", async () => {
  });

  it("filters by timeframe=upcoming", async () => {
  });

  it("filters by timeframe=this-week", async () => {
  });

  it("filters by timeframe=this-weekend", async () => {
  });

  it("combines category and timeframe filters", async () => {
  });

  it("never returns draft events in any filtered response", async () => {
  });

  it("rejects an unknown timeframe value with a 400 and a clear message", async () => {
  });

  it("rejects an overly long category value", async () => {
  });

  it("returns only the list partial when the request is an HTMX request", async () => {
  });

  it("returns the full page when the request is not an HTMX request", async () => {
  });
});
