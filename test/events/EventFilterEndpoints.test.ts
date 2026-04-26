import request from "supertest";
import { createComposedApp } from "../../src/composition";
import { prisma } from "../../src/lib/prisma";
import type { Event } from "../../src/events/Event";

const soon = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
const soonEnd = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000);
const later = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
const laterEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000);

const publishedMusicSoon: Event = {
  id: "event-filter-music-soon",
  title: "Music Soon",
  description: "Published music event soon",
  location: "Hall A",
  category: "Music",
  capacity: 50,
  status: "published",
  startDateTime: soon,
  endDateTime: soonEnd,
  organizerId: "user-reader",
  createdAt: new Date("2026-04-01T12:00:00.000Z"),
  updatedAt: new Date("2026-04-01T12:00:00.000Z"),
};

const publishedWorkshopSoon: Event = {
  id: "event-filter-workshop-soon",
  title: "Workshop Soon",
  description: "Published workshop event soon",
  location: "Hall B",
  category: "Workshop",
  capacity: 30,
  status: "published",
  startDateTime: soon,
  endDateTime: soonEnd,
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
  startDateTime: later,
  endDateTime: laterEnd,
  organizerId: "user-reader",
  createdAt: new Date("2026-04-01T12:00:00.000Z"),
  updatedAt: new Date("2026-04-01T12:00:00.000Z"),
};

const seededEvents = [publishedMusicSoon, publishedWorkshopSoon, publishedMusicLater];
const seededIds = seededEvents.map((e) => e.id);

beforeAll(async () => {
  await prisma.rSVP.deleteMany({ where: { eventId: { in: seededIds } } });
  await prisma.event.deleteMany({ where: { id: { in: seededIds } } });
  await prisma.event.createMany({ data: seededEvents });
});

afterAll(async () => {
  await prisma.rSVP.deleteMany({ where: { eventId: { in: seededIds } } });
  await prisma.event.deleteMany({ where: { id: { in: seededIds } } });
});

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

describe("Event filter endpoints", () => {
  it("returns all published events when no filters are applied", async () => {
    const agent = await loginAsUser();
    const response = await agent.get("/events").expect(200);

    expect(response.text).toContain("Music Soon");
    expect(response.text).toContain("Workshop Soon");
    expect(response.text).toContain("Music Later");
  });

  it("filters by category only", async () => {
    const agent = await loginAsUser();
    const response = await agent.get("/events?category=Music").expect(200);

    expect(response.text).toContain("Music Soon");
    expect(response.text).toContain("Music Later");
    expect(response.text).not.toContain("Workshop Soon");
  });

  it("filters by timeframe only", async () => {
    const agent = await loginAsUser();
    const response = await agent.get("/events?timeframe=upcoming").expect(200);

    expect(response.text).toContain("Music Soon");
    expect(response.text).toContain("Workshop Soon");
    expect(response.text).toContain("Music Later");
  });

  it("combines category and timeframe filters", async () => {
    const agent = await loginAsUser();
    const response = await agent
      .get("/events?category=Music&timeframe=upcoming")
      .expect(200);

    expect(response.text).toContain("Music Soon");
    expect(response.text).toContain("Music Later");
    expect(response.text).not.toContain("Workshop Soon");
  });

  it("rejects an unknown timeframe value with a 400 and a clear message", async () => {
    const agent = await loginAsUser();
    const response = await agent.get("/events?timeframe=yesterday").expect(400);

    expect(response.text).toContain("Unknown timeframe");
  });

  it("rejects an overly long category value", async () => {
    const agent = await loginAsUser();
    const longCategory = "a".repeat(101);
    const response = await agent
      .get(`/events?category=${longCategory}`)
      .expect(400);

    expect(response.text).toContain("too long");
  });
});
