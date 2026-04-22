import request from 'supertest';
import { createComposedApp } from '../../src/composition';
import { CreateInMemoryEventRepository } from '../../src/repository/InMemoryEventRepository';
import type { Event } from '../../src/events/Event';

const seededEvent: Event = {
  id: 'my-rsvps-test-event',
  title: 'Test Event',
  description: 'A test event',
  location: 'Room 101',
  category: 'Social',
  capacity: 10,
  status: 'published',
  startDateTime: new Date('2027-06-01T18:00:00.000Z'),
  endDateTime: new Date('2027-06-01T20:00:00.000Z'),
  organizerId: 'user-staff',
  createdAt: new Date('2027-01-01T00:00:00.000Z'),
  updatedAt: new Date('2027-01-01T00:00:00.000Z'),
};

CreateInMemoryEventRepository([seededEvent]);


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

describe('GET /my-rsvps', () => {
  it('shows the My RSVPs page for a user', async () => {
    const agent = await loginAsUser();
    const res = await agent.get('/my-rsvps').expect(200);
    expect(res.text).toContain('My RSVPs');
  });

  it('returns 403 for a staff member', async () => {
    const agent = await loginAsStaff();
    const res = await agent.get('/my-rsvps').expect(403);
    expect(res.text).toContain('Only members');
  });

  it('redirects unauthenticated users to login', async () => {
    const res = await request(app).get('/my-rsvps').expect(302);
    expect(res.headers.location).toBe('/login');
  });

  it('shows RSVPd events after toggling', async () => {
    const agent = await loginAsUser();
    await agent.post(`/events/${seededEvent.id}/rsvp`).expect(302);
    const res = await agent.get('/my-rsvps').expect(200);
    expect(res.text).toContain('Test Event');
  });

});
