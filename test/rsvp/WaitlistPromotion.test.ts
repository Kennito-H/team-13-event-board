import { InMemoryRSVPRepository } from '../../src/rsvp/InMemoryRSVPRepository';
import { RSVPService } from '../../src/rsvp/RSVPService';
import { CreateInMemoryEventRepository } from '../../src/repository/InMemoryEventRepository';
import type { IEventRepository } from '../../src/repository/EventRepository';
import type { Event } from '../../src/events/Event';
import type { RSVP } from '../../src/rsvp/RSVP';

const futureStart = new Date('2027-06-01T18:00:00.000Z');
const futureEnd = new Date('2027-06-01T20:00:00.000Z');

function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: 'event-1',
    title: 'Waitlist Test Event',
    description: 'An event for testing waitlist promotion',
    location: 'Room 101',
    category: 'Social',
    capacity: 1,
    status: 'published',
    startDateTime: futureStart,
    endDateTime: futureEnd,
    organizerId: 'user-organizer',
    createdAt: new Date('2027-01-01T00:00:00.000Z'),
    updatedAt: new Date('2027-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function seedRSVP(
  repo: InMemoryRSVPRepository,
  rsvp: Omit<RSVP, 'id'> & { id?: string },
): RSVP {
  const id = rsvp.id ?? String(repo.currentId++);
  const record: RSVP = { ...rsvp, id };
  repo.rsvps.set(id, record);
  return record;
}

const event = makeEvent({ id: 'event-1', capacity: 1 });
const eventRepo: IEventRepository = CreateInMemoryEventRepository([event]);

describe('RSVPService: waitlist promotion on cancel', () => {
  let rsvpRepo: InMemoryRSVPRepository;
  let service: RSVPService;

  beforeEach(() => {
    rsvpRepo = new InMemoryRSVPRepository();
    service = new RSVPService(rsvpRepo, eventRepo);
  });

  it('promotes the earliest waitlisted member when an attending member cancels', async () => {
  });

  it('does not promote anyone when the waitlist is empty', async () => {
  });

  it('promotes only one person per cancellation (the earliest waitlisted)', async () => {
  });
});

describe('RSVPService: getWaitlistPosition', () => {
  let rsvpRepo: InMemoryRSVPRepository;
  let service: RSVPService;

  beforeEach(() => {
    rsvpRepo = new InMemoryRSVPRepository();
    service = new RSVPService(rsvpRepo, eventRepo);
  });

  it('returns position 1 for the earliest waitlisted user', async () => {
  });

  it('returns position 2 for the second waitlisted user', async () => {
  });

  it('reflects the new position after an earlier waitlisted member is promoted', async () => {
  });
});
