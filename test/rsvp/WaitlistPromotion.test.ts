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
    const going = seedRSVP(rsvpRepo, {
      eventId: event.id,
      userId: 'user-going',
      status: 'going',
      createdAt: new Date('2027-01-01T10:00:00.000Z'),
    });

    const firstWaitlisted = seedRSVP(rsvpRepo, {
      eventId: event.id,
      userId: 'user-waitlist-1',
      status: 'waitlisted',
      createdAt: new Date('2027-01-01T11:00:00.000Z'),
    });

    seedRSVP(rsvpRepo, {
      eventId: event.id,
      userId: 'user-waitlist-2',
      status: 'waitlisted',
      createdAt: new Date('2027-01-01T12:00:00.000Z'),
    });

    const result = await service.cancelRSVPWithPromotion(going.id, 'user-going');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.cancelled.status).toBe('cancelled');
    expect(result.value.promoted?.id).toBe(firstWaitlisted.id);
    expect(result.value.promoted?.status).toBe('going');
  });

  it('does not promote anyone when the waitlist is empty', async () => {
    const going = seedRSVP(rsvpRepo, {
      eventId: event.id,
      userId: 'user-going',
      status: 'going',
      createdAt: new Date('2027-01-01T10:00:00.000Z'),
    });

    const result = await service.cancelRSVPWithPromotion(going.id, 'user-going');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.cancelled.status).toBe('cancelled');
    expect(result.value.promoted).toBeUndefined();
  });

  it('promotes only one person per cancellation (the earliest waitlisted)', async () => {
    const going = seedRSVP(rsvpRepo, {
      eventId: event.id,
      userId: 'user-going',
      status: 'going',
      createdAt: new Date('2027-01-01T10:00:00.000Z'),
    });

    const first = seedRSVP(rsvpRepo, {
      eventId: event.id,
      userId: 'user-waitlist-1',
      status: 'waitlisted',
      createdAt: new Date('2027-01-01T11:00:00.000Z'),
    });

    const second = seedRSVP(rsvpRepo, {
      eventId: event.id,
      userId: 'user-waitlist-2',
      status: 'waitlisted',
      createdAt: new Date('2027-01-01T12:00:00.000Z'),
    });

    await service.cancelRSVPWithPromotion(going.id, 'user-going');

    const firstAfter = await rsvpRepo.findById(first.id);
    const secondAfter = await rsvpRepo.findById(second.id);
    expect(firstAfter?.status).toBe('going');
    expect(secondAfter?.status).toBe('waitlisted');
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
    seedRSVP(rsvpRepo, {
      eventId: event.id,
      userId: 'user-waitlist-1',
      status: 'waitlisted',
      createdAt: new Date('2027-01-01T11:00:00.000Z'),
    });

    seedRSVP(rsvpRepo, {
      eventId: event.id,
      userId: 'user-waitlist-2',
      status: 'waitlisted',
      createdAt: new Date('2027-01-01T12:00:00.000Z'),
    });

    const result = await service.getWaitlistPosition(event.id, 'user-waitlist-1');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toBe(1);
  });

  it('returns position 2 for the second waitlisted user', async () => {
    seedRSVP(rsvpRepo, {
      eventId: event.id,
      userId: 'user-waitlist-1',
      status: 'waitlisted',
      createdAt: new Date('2027-01-01T11:00:00.000Z'),
    });

    seedRSVP(rsvpRepo, {
      eventId: event.id,
      userId: 'user-waitlist-2',
      status: 'waitlisted',
      createdAt: new Date('2027-01-01T12:00:00.000Z'),
    });

    seedRSVP(rsvpRepo, {
      eventId: event.id,
      userId: 'user-waitlist-3',
      status: 'waitlisted',
      createdAt: new Date('2027-01-01T13:00:00.000Z'),
    });

    const result = await service.getWaitlistPosition(event.id, 'user-waitlist-2');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toBe(2);
  });

  it('reflects the new position after an earlier waitlisted member is promoted', async () => {
    const going = seedRSVP(rsvpRepo, {
      eventId: event.id,
      userId: 'user-going',
      status: 'going',
      createdAt: new Date('2027-01-01T10:00:00.000Z'),
    });

    seedRSVP(rsvpRepo, {
      eventId: event.id,
      userId: 'user-waitlist-1',
      status: 'waitlisted',
      createdAt: new Date('2027-01-01T11:00:00.000Z'),
    });

    seedRSVP(rsvpRepo, {
      eventId: event.id,
      userId: 'user-waitlist-2',
      status: 'waitlisted',
      createdAt: new Date('2027-01-01T12:00:00.000Z'),
    });

    const before = await service.getWaitlistPosition(event.id, 'user-waitlist-2');
    expect(before.ok).toBe(true);
    if (!before.ok) return;
    expect(before.value).toBe(2);

    await service.cancelRSVPWithPromotion(going.id, 'user-going');

    const after = await service.getWaitlistPosition(event.id, 'user-waitlist-2');
    expect(after.ok).toBe(true);
    if (!after.ok) return;
    expect(after.value).toBe(1);
  });
});
