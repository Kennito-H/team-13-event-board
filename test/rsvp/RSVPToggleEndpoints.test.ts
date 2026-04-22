import request from 'supertest';
import { createComposedApp } from '../../src/composition';
import { CreateInMemoryEventRepository } from '../../src/repository/InMemoryEventRepository';
import { CreateInMemoryRSVPRepository } from '../../src/rsvp/InMemoryRSVPRepository';
import type { Event } from '../../src/events/Event';

const futureStart = new Date('2027-06-01T18:00:00.000Z');
const futureEnd = new Date('2027-06-01T20:00:00.000Z');

const publishedEvent: Event = {
  id: 'rsvp-toggle-event-1',
  title: 'Test Event',
  description: 'A test event',
  location: 'Room 101',
  category: 'Social',
  capacity: 10,
  status: 'published',
  startDateTime: futureStart,
  endDateTime: futureEnd,
  organizerId: 'user-staff',
  createdAt: new Date('2027-01-01T00:00:00.000Z'),
  updatedAt: new Date('2027-01-01T00:00:00.000Z'),
};

const ownEvent: Event = {
  id: 'rsvp-toggle-own-event',
  title: 'My Own Event',
  description: 'Organized by the user',
  location: 'Room 202',
  category: 'Meeting',
  capacity: 10,
  status: 'published',
  startDateTime: futureStart,
  endDateTime: futureEnd,
  organizerId: 'user-reader',
  createdAt: new Date('2027-01-01T00:00:00.000Z'),
  updatedAt: new Date('2027-01-01T00:00:00.000Z'),
};

const draftEvent: Event = {
  id: 'rsvp-toggle-draft-event',
  title: 'Draft Event',
  description: 'Not published yet',
  location: 'Room 303',
  category: 'Workshop',
  capacity: 10,
  status: 'draft',
  startDateTime: futureStart,
  endDateTime: futureEnd,
  organizerId: 'user-staff',
  createdAt: new Date('2027-01-01T00:00:00.000Z'),
  updatedAt: new Date('2027-01-01T00:00:00.000Z'),
};

const fullEvent: Event = {
  id: 'rsvp-toggle-full-event',
  title: 'Full Event',
  description: 'At capacity',
  location: 'Room 404',
  category: 'Social',
  capacity: 1,
  status: 'published',
  startDateTime: futureStart,
  endDateTime: futureEnd,
  organizerId: 'user-staff',
  createdAt: new Date('2027-01-01T00:00:00.000Z'),
  updatedAt: new Date('2027-01-01T00:00:00.000Z'),
};

CreateInMemoryEventRepository([publishedEvent, ownEvent, draftEvent, fullEvent]);
CreateInMemoryRSVPRepository([
  {
    id: 'rsvp-seed-1',
    eventId: 'rsvp-toggle-full-event',
    userId: 'user-staff',
    status: 'going',
    createdAt: new Date('2027-01-01T00:00:00.000Z'),
  },
]);

const app = createComposedApp().getExpressApp();

async function loginAsUser() {
  const agent = request.agent(app);
  await agent.post('/login').type('form').send({ email: 'user@app.test', password: 'password123' }).expect(302);
  return agent;
}

async function loginAsStaff() {
  const agent = request.agent(app);
  await agent.post('/login').type('form').send({ email: 'staff@app.test', password: 'password123' }).expect(302);
  return agent;
}

describe('POST /events/:id/rsvp', () => {
  it('redirects to event page after RSVP', async () => {
    const agent = await loginAsUser();
    const res = await agent.post(`/events/${publishedEvent.id}/rsvp`).expect(302);
    expect(res.headers.location).toBe(`/events/${publishedEvent.id}`);
  });

  it('toggles RSVP off (cancel) on second POST', async () => {
    const agent = await loginAsUser();
    await agent.post(`/events/${publishedEvent.id}/rsvp`).expect(302);
    const res = await agent.post(`/events/${publishedEvent.id}/rsvp`).expect(302);
    expect(res.headers.location).toBe(`/events/${publishedEvent.id}`);
  });

  it('returns rsvp-button partial for HTMX request', async () => {
    const agent = await loginAsUser();
    const res = await agent
      .post(`/events/${publishedEvent.id}/rsvp`)
      .set('HX-Request', 'true')
      .expect(200);
      expect(res.text).toContain(`/events/${publishedEvent.id}/rsvp`);
    });

  it('redirects with error when organizer tries to RSVP to own event', async () => {
    const agent = await loginAsUser();
    const res = await agent.post(`/events/${ownEvent.id}/rsvp`).expect(302);
    expect(res.headers.location).toContain('rsvpError=');
    expect(res.headers.location).toContain(ownEvent.id);
  });

  it('redirects with error when RSVPing to a draft event', async () => {
    const agent = await loginAsUser();
    const res = await agent.post(`/events/${draftEvent.id}/rsvp`).expect(302);
    expect(res.headers.location).toContain('rsvpError=');
  });

  it('returns 403 when a staff member tries to RSVP', async () => {
    const agent = await loginAsStaff();
    const res = await agent.post(`/events/${publishedEvent.id}/rsvp`).expect(403);
    expect(res.text).toContain('Only members can RSVP');
  });

  it('waitlists user when event is at capacity', async () => {
    const agent = await loginAsUser();
    const res = await agent
      .post(`/events/${fullEvent.id}/rsvp`)
      .set('HX-Request', 'true')
      .expect(200);
    expect(res.text).toContain('Leave Waitlist');
  });
});
