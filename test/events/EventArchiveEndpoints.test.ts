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

    it("returns all past events when no category filter is applied", async () => {
    const agent = await loginAsUser();
    const response = await agent.get("/events/archive").expect(200);
 
    expect(response.text).toContain("Winter Code Sprint");
    expect(response.text).toContain("Holiday Potluck Dinner");
  });
 
  it("filters archive by category", async () => {
    const agent = await loginAsUser();
    const response = await agent
      .get("/events/archive?category=Technology")
      .expect(200);
 
    expect(response.text).toContain("Winter Code Sprint");
    expect(response.text).not.toContain("Holiday Potluck Dinner");
  });
 
  it("returns empty state when category filter matches nothing", async () => {
    const agent = await loginAsUser();
    const response = await agent
      .get("/events/archive?category=Underwater Basket Weaving")
      .expect(200);
 
    expect(response.text).not.toContain("Winter Code Sprint");
    expect(response.text).not.toContain("Holiday Potluck Dinner");
  });
 
  it("category filter is case-insensitive", async () => {
    const agent = await loginAsUser();
    const response = await agent
      .get("/events/archive?category=technology")
      .expect(200);
 
    expect(response.text).toContain("Winter Code Sprint");
  });

  it("automatically transitions expired published events to past on archive load", async () => {
    const agent = await loginAsUser();
    const response = await agent.get("/events/archive").expect(200);

    expect(response.text).toContain("Expired Published Event");
  });
 
  it("does not transition future published events to past", async () => {
    const agent = await loginAsUser();
    const response = await agent.get("/events/archive").expect(200);

    expect(response.text).not.toContain("Upcoming Workshop");
  });
 
  it("does not show cancelled events in the archive", async () => {
    const agent = await loginAsUser();
    const response = await agent.get("/events/archive").expect(200);
 
    expect(response.text).not.toContain("Cancelled Event");
  });

    it("returns 400 when category filter exceeds 100 characters", async () => {
    const agent = await loginAsUser();
    const longCategory = "a".repeat(101);
    const response = await agent
      .get(`/events/archive?category=${longCategory}`)
      .expect(400);
 
    expect(response.text).toContain("too long");
  });
 
 
  it("redirects unauthenticated users to login", async () => {
    const response = await request(app).get("/events/archive").expect(302);
    expect(response.headers.location).toBe("/login");
  });
 
 
  it("returns a partial response when HX-Request header is set", async () => {
    const agent = await loginAsUser();
    const response = await agent
      .get("/events/archive")
      .set("HX-Request", "true")
      .expect(200);
 
    expect(response.text).toContain("Winter Code Sprint");
    expect(response.text).not.toContain("<html");
    expect(response.text).not.toContain("<nav");
  });
 
  it("returns filtered partial when HTMX request includes category", async () => {
    const agent = await loginAsUser();
    const response = await agent
      .get("/events/archive?category=Technology")
      .set("HX-Request", "true")
      .expect(200);
 
    expect(response.text).toContain("Winter Code Sprint");
    expect(response.text).not.toContain("Holiday Potluck Dinner");
    expect(response.text).not.toContain("<html");
  });
 
 
  it("returns past events in reverse chronological order (most recently ended first)", async () => {
    const agent = await loginAsUser();
    const response = await agent.get("/events/archive").expect(200);
 
    const winterIdx = response.text.indexOf("Winter Code Sprint");
    const potluckIdx = response.text.indexOf("Holiday Potluck Dinner");
 
    expect(winterIdx).toBeGreaterThan(-1);
    expect(potluckIdx).toBeGreaterThan(-1);
    expect(winterIdx).toBeLessThan(potluckIdx);
  });
});