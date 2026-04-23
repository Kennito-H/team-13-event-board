import request from "supertest";
import { createComposedApp } from "../../src/composition";
import { CreateInMemoryEventRepository } from "../../src/repository/InMemoryEventRepository";
import type { Event } from "../../src/events/Event";

describe("Event search endpoints", () => {
  const now = new Date();
  const future = (days: number) => new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
 
  const publishedTech: Event = {
    id: "search-published-tech",
    title: "JavaScript Study Group",
    description: "Weekly meetup to work through modern JavaScript concepts.",
    location: "Library Room 204",
    category: "Technology",
    status: "published",
    capacity: 20,
    startDateTime: future(2),
    endDateTime: future(3),
    organizerId: "user-staff",
    createdAt: future(-5),
    updatedAt: future(-5),
  };
 
  const publishedOutdoors: Event = {
    id: "search-published-outdoors",
    title: "Spring Hiking Trip",
    description: "A beginner-friendly hike through the local trails.",
    location: "Notch Trail Head, Amherst",
    category: "Outdoors",
    status: "published",
    capacity: 15,
    startDateTime: future(4),
    endDateTime: future(5),
    organizerId: "user-staff",
    createdAt: future(-3),
    updatedAt: future(-3),
  };
 
  const draftEvent: Event = {
    id: "search-draft",
    title: "Secret Draft Event",
    description: "This should never appear in search results.",
    location: "Hidden Room",
    category: "Technology",
    status: "draft",
    startDateTime: future(6),
    endDateTime: future(7),
    organizerId: "user-staff",
    createdAt: future(-1),
    updatedAt: future(-1),
  };
 
  const pastEvent: Event = {
    id: "search-past",
    title: "Old JavaScript Meetup",
    description: "A past event that should not appear in search.",
    location: "Library Room 204",
    category: "Technology",
    status: "published",
    startDateTime: future(-10),
    endDateTime: future(-9),
    organizerId: "user-staff",
    createdAt: future(-20),
    updatedAt: future(-20),
  };
 
  CreateInMemoryEventRepository([
    publishedTech,
    publishedOutdoors,
    draftEvent,
    pastEvent,
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
 
  async function loginAsStaff() {
    const agent = request.agent(app);
    await agent
      .post("/login")
      .type("form")
      .send({ email: "staff@app.test", password: "password123" })
      .expect(302);
    return agent;
  }

  it("returns all published upcoming events when query is empty", async () => {
    const agent = await loginAsUser();
    const response = await agent.get("/events/search").expect(200);
 
    expect(response.text).toContain("JavaScript Study Group");
    expect(response.text).toContain("Spring Hiking Trip");
  });
 
  it("returns matching events when query matches title", async () => {
    const agent = await loginAsUser();
    const response = await agent.get("/events/search?q=JavaScript").expect(200);
 
    expect(response.text).toContain("JavaScript Study Group");
    expect(response.text).not.toContain("Spring Hiking Trip");
  });
 
  it("returns matching events when query matches description", async () => {
    const agent = await loginAsUser();
    const response = await agent.get("/events/search?q=beginner-friendly").expect(200);
 
    expect(response.text).toContain("Spring Hiking Trip");
    expect(response.text).not.toContain("JavaScript Study Group");
  });
 
  it("returns matching events when query matches location", async () => {
    const agent = await loginAsUser();
    const response = await agent.get("/events/search?q=Amherst").expect(200);
 
    expect(response.text).toContain("Spring Hiking Trip");
    expect(response.text).not.toContain("JavaScript Study Group");
  });
 
  it("search is case-insensitive", async () => {
    const agent = await loginAsUser();
    const response = await agent.get("/events/search?q=javascript").expect(200);
 
    expect(response.text).toContain("JavaScript Study Group");
  });
 
  it("returns empty state when query matches nothing", async () => {
    const agent = await loginAsUser();
    const response = await agent.get("/events/search?q=zzznomatch").expect(200);
 
    expect(response.text).not.toContain("JavaScript Study Group");
    expect(response.text).not.toContain("Spring Hiking Trip");
  });

  it("never returns draft events in search results", async () => {
    const agent = await loginAsStaff();
    const response = await agent.get("/events/search?q=Secret Draft").expect(200);
 
    expect(response.text).not.toContain("Secret Draft Event");
  });
 
  it("never returns past events even when query matches", async () => {
    const agent = await loginAsUser();
    const response = await agent.get("/events/search?q=Old JavaScript").expect(200);
 
    expect(response.text).not.toContain("Old JavaScript Meetup");
  });

  it("returns 400 when query exceeds 200 characters", async () => {
    const agent = await loginAsUser();
    const longQuery = "a".repeat(201);
    const response = await agent
      .get(`/events/search?q=${longQuery}`)
      .expect(400);
 
    expect(response.text).toContain("too long");
  });

  it("redirects unauthenticated users to login", async () => {
    const response = await request(app).get("/events/search").expect(302);
    expect(response.headers.location).toBe("/login");
  });

  it("returns a partial response when HX-Request header is set", async () => {
    const agent = await loginAsUser();
    const response = await agent
      .get("/events/search?q=JavaScript")
      .set("HX-Request", "true")
      .expect(200);
 
    // Partial should contain result content but not the full page layout
    expect(response.text).toContain("JavaScript Study Group");
    expect(response.text).not.toContain("<html");
    expect(response.text).not.toContain("<nav");
  });
 
  it("returns partial with empty state when HTMX query matches nothing", async () => {
    const agent = await loginAsUser();
    const response = await agent
      .get("/events/search?q=zzznomatch")
      .set("HX-Request", "true")
      .expect(200);
 
    expect(response.text).not.toContain("JavaScript Study Group");
    expect(response.text).not.toContain("<html");
  });

});