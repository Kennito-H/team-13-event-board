import request from "supertest";
import { createComposedApp } from "../../src/composition";
import { CreateInMemoryEventRepository } from "../../src/repository/InMemoryEventRepository";
import type { Event } from "../../src/events/Event";

describe("Event detail page endpoints", () => {
  const organizerId = "user-staff-id";

    const publishedEvent: Event = {
        id: "detail-published-1",
        title: "Published Event",
        description: "A published event anyone can see.",
        location: "Main Hall",
        category: "Social",
        status: "published",
        startDateTime: new Date("2027-06-01T18:00:00.000Z"),
        endDateTime: new Date("2027-06-01T21:00:00.000Z"),
        organizerId,
        createdAt: new Date("2026-04-01T12:00:00.000Z"),
        updatedAt: new Date("2026-04-01T12:00:00.000Z"),
    };

    const draftEvent: Event = {
        id: "detail-draft-1",
        title: "Draft Event",
        description: "A draft only the organizer can see.",
        location: "Back Room",
        category: "Educational",
        status: "draft",
        startDateTime: new Date("2027-07-01T18:00:00.000Z"),
        endDateTime: new Date("2027-07-01T21:00:00.000Z"),
        organizerId,
        createdAt: new Date("2026-04-01T12:00:00.000Z"),
        updatedAt: new Date("2026-04-01T12:00:00.000Z"),
    };

    const eventRepository = CreateInMemoryEventRepository([publishedEvent, draftEvent]);
    const app = createComposedApp().getExpressApp();

    async function loginAsStaff() {
        const agent = request.agent(app);
        await agent.post("/login").type("form")
        .send({ email: "staff@app.test", password: "password123" }).expect(302);
        return agent;
    }

    async function loginAsUser() {
        const agent = request.agent(app);
        await agent.post("/login").type("form")
        .send({ email: "user@app.test", password: "password123" }).expect(302);
        return agent;
    }

    async function loginAsAdmin() {
        const agent = request.agent(app);
        await agent.post("/login").type("form")
        .send({ email: "admin@app.test", password: "password123" }).expect(302);
        return agent;
    }


    it("renders a published event for any authenticated user", async () => {
        const agent = await loginAsUser();
        const response = await agent.get(`/events/${publishedEvent.id}`).expect(200);
        expect(response.text).toContain("Published Event");
        expect(response.text).toContain("Main Hall");
    });

    it("renders a draft event for its organizer (staff)", async () => {
        const agent = await loginAsStaff();
        const response = await agent.get(`/events/${draftEvent.id}`).expect(200);
        expect(response.text).toContain("Draft Event");
    });

    it("renders a published event with no capacity without crashing", async () => {
        const noCapEvent: Event = {
        id: "detail-nocap-1",
        title: "No Cap Event",
        description: "Unlimited spots.",
        location: "Outdoor Field",
        category: "Sports",
        status: "published",
        capacity: undefined,
        startDateTime: new Date("2027-08-01T10:00:00.000Z"),
        endDateTime: new Date("2027-08-01T12:00:00.000Z"),
        organizerId,
        createdAt: new Date("2026-04-01T12:00:00.000Z"),
        updatedAt: new Date("2026-04-01T12:00:00.000Z"),
        };
        await eventRepository.save(noCapEvent);
        const agent = await loginAsUser();
        const response = await agent.get(`/events/${noCapEvent.id}`).expect(200);
        expect(response.text).toContain("No Cap Event");
    });

    //Draft visibility rule
    it("returns 404 when a member requests a draft event", async () => {
        const agent = await loginAsUser();
        await agent.get(`/events/${draftEvent.id}`).expect(404);
    });

    it("returns 404 when a non-owning staff user requests a draft", async () => {
        const otherDraft: Event = {
        id: "detail-draft-other",
        title: "Someone Else Draft",
        description: "Not yours.",
        location: "Somewhere",
        category: "Arts",
        status: "draft",
        startDateTime: new Date("2027-09-01T18:00:00.000Z"),
        endDateTime: new Date("2027-09-01T21:00:00.000Z"),
        organizerId: "some-other-organizer-id",
        createdAt: new Date("2026-04-01T12:00:00.000Z"),
        updatedAt: new Date("2026-04-01T12:00:00.000Z"),
        };
        await eventRepository.save(otherDraft);
        // staff@app.test is NOT the organizer of this draft
        const agent = await loginAsStaff();
        await agent.get(`/events/${otherDraft.id}`).expect(404);
    });

    //Not found
    it("returns 404 for a non-existent event ID", async () => {
        const agent = await loginAsUser();
        await agent.get("/events/does-not-exist").expect(404);
    });

    //Unauthenticated
    it("redirects unauthenticated users to login", async () => {
        const response = await request(app)
        .get(`/events/${publishedEvent.id}`).expect(302);
        expect(response.headers.location).toBe("/login");
    });

    //Admin access
    it("allows admin to view any published event", async () => {
        const agent = await loginAsAdmin();
        const response = await agent.get(`/events/${publishedEvent.id}`).expect(200);
        expect(response.text).toContain("Published Event");
    });
});