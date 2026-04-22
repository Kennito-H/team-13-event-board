import request from "supertest";
import { createComposedApp } from "../../src/composition";

describe("Event creation endpoints", () => {
    const app = createComposedApp().getExpressApp();

    async function loginAsStaff(){
        const agent = request.agent(app);
        await agent.post("/login").type("form").send({ email:"staff@app.test", password: "password123" }).expect(302);
        return agent;
    }

    async function loginAsUser(){
        const agent = request.agent(app);
        await agent.post("/login").type("form").send({ email: "user@app.test" , password: "password123" }).expect(302);
        return agent;
    }

    const validForm = {
        title: "Spring Mixer",
        description: "A networking event open to all.",
        location: "Student Union Ballroom",
        category: "Social",
        startDateTime: "2027-06-01T18:00",
        endDateTime: "2027-06-01T21:00",
    };

    it("creates a draft event and redirects to detail page", async() => {
        const agent = await loginAsStaff();
        const response = await agent.post("/events").type("form").send(validForm).expect(302);
        expect(response.headers.location).toMatch(/^\/events\/[a-z0-9-]+$/);
    });

    it("creates an event with no capacity when capacity is omitted", async() =>{
        const agent = await loginAsStaff();
        const response = await agent.post("/events").type("form").send({ ...validForm, title: "No-Cap Event" }).expect(302);
        expect(response.headers.location).toMatch(/^\/events\/[a-z0-9-]+$/);
    });

    //Validation errors
    it("returns 400 when title is missing", async() => {
        const agent = await loginAsStaff();
        const response = await agent.post("/events").type("form").send({ ...validForm, title: ""}).expect(400);
        expect(response.text).toContain("Title is required.");
    });

    it("returns 400 when description is missing", async () => {
        const agent = await loginAsStaff();
        const response = await agent.post("/events").type("form").send({ ...validForm, description: "" }).expect(400);
        expect(response.text).toContain("Description is required.");
    });

    it("returns 400 when location is missing", async() => {
        const agent = await loginAsStaff();
        const response = await agent.post("/events").type("form").send({ ...validForm, location: ""}).expect(400);
        expect(response.text).toContain("Location is required.");
    });

    it("returns 400 when category is missing", async () => {
        const agent = await loginAsStaff();
        const response = await agent.post("/events").type("form").send({ ...validForm, category: ""}).expect(400);
        expect(response.text).toContain("Category is required.");
    });

    it("returns 400 when end is before start", async () => {
        const agent = await loginAsStaff();
        const response = await agent.post("/events").type("form").send({ ...validForm, startDateTime: "2027-06-01T21:00", endDateTime: "2027-06-01T18:00" }).expect(400);
        expect(response.text).toContain("End date/time must be after start date/time.");
    });

    it("returns 400 when capacity is zero", async () => {
        const agent = await loginAsStaff();
        const response = await agent.post("/events").type("form").send({ ...validForm, capacity: "0" }).expect(400);
        expect(response.text).toContain("Capacity must be a positive whole number");
    });

    it("returns 400 when capacity is negative", async () => {
        const agent = await loginAsStaff();
        const response = await agent.post("/events").type("form").send({ ...validForm, capacity: "-5" }).expect(400);
        expect(response.text).toContain("Capacity must be a positive whole number");
    });

})