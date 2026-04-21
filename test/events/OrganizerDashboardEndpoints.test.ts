import request from 'supertest';
import { createComposedApp } from '../../src/composition';
import { CreateInMemoryEventRepository } from '../../src/repository/InMemoryEventRepository';
import { CreateInMemoryRSVPRepository } from '../../src/rsvp/InMemoryRSVPRepository';
import type { Event } from '../../src/events/Event';

const futureStart = new Date('2027-08-01T18:00:00.000Z');
const futureEnd = new Date('2027-08-01T20:00:00.000Z');

const staffEvent: Event = {
  id: 'dashboard-staff-event',
  title: 'Staff Organized Event',
  description: 'Created by staff',
  location: 'Room 101',
  category: 'Workshop',
  capacity: 20,
  status: 'published',
  startDateTime: futureStart,
  endDateTime: futureEnd,
  organizerId: 'user-staff',
  createdAt: new Date('2027-01-01T00:00:00.000Z'),
  updatedAt: new Date('2027-01-01T00:00:00.000Z'),
};

const otherEvent: Event = {
  id: 'dashboard-other-event',
  title: 'Other User Event',
  description: 'Created by user-reader',
  location: 'Room 202',
  category: 'Social',
  capacity: 10,
  status: 'published',
  startDateTime: futureStart,
  endDateTime: futureEnd,
  organizerId: 'user-admin',
  createdAt: new Date('2027-01-01T00:00:00.000Z'),
  updatedAt: new Date('2027-01-01T00:00:00.000Z'),
};

CreateInMemoryEventRepository([staffEvent, otherEvent]);
CreateInMemoryRSVPRepository([
  {
    id: 'dashboard-rsvp-1',
    eventId: 'dashboard-staff-event',
    userId: 'user-reader',
    status: 'going',
    createdAt: new Date('2027-01-01T00:00:00.000Z'),
  },
]);

const app = createComposedApp().getExpressApp();

async function loginAsAdmin() {
  const agent = request.agent(app);
  await agent.post('/login').type('form').send({ email: 'admin@app.test', password: 'password123' }).expect(302);
  return agent;
}

async function loginAsStaff() {
  const agent = request.agent(app);
  await agent.post('/login').type('form').send({ email: 'staff@app.test', password: 'password123' }).expect(302);
  return agent;
}

async function loginAsUser() {
  const agent = request.agent(app);
  await agent.post('/login').type('form').send({ email: 'user@app.test', password: 'password123' }).expect(302);
  return agent;
}

describe('GET /dashboard', () => {
  it('redirects unauthenticated users to login', async () => {
    const res = await request(app).get('/dashboard').expect(302);
    expect(res.headers.location).toBe('/login');
  });

  it('shows only their own events to staff', async () => {
    const agent = await loginAsStaff();
    const res = await agent.get('/dashboard').expect(200);
    expect(res.text).toContain('Staff Organized Event');
    expect(res.text).not.toContain('Other User Event');
  });

  it('shows all events to admin', async () => {
    const agent = await loginAsAdmin();
    const res = await agent.get('/dashboard').expect(200);
    expect(res.text).toContain('Staff Organized Event');
    expect(res.text).toContain('Other User Event');
  });

  it('shows empty state when user has no events', async () => {
    const agent = await loginAsUser();
    const res = await agent.get('/dashboard').expect(200);
    expect(res.text).toContain('You have not created any events yet');
  });

  it('shows correct RSVP going count', async () => {
    const agent = await loginAsStaff();
    const res = await agent.get('/dashboard').expect(200);
    expect(res.text).toContain('1');
  });
});
