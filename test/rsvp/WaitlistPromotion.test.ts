import { PrismaRSVPRepository } from '../../src/rsvp/PrismaRSVPRepository';
import { PrismaEventRepository } from '../../src/repository/PrismaEventRepository';
import { RSVPService } from '../../src/rsvp/RSVPService';
import { prisma } from '../../src/lib/prisma';
import type { Event } from '../../src/events/Event';

const futureStart = new Date('2027-06-01T18:00:00.000Z');
const futureEnd = new Date('2027-06-01T20:00:00.000Z');

const seededEvent: Event = {
  id: 'waitlist-promotion-event-1',
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
};

async function clearRSVPs() {
  await prisma.rSVP.deleteMany({ where: { eventId: seededEvent.id } });
}

async function seedRSVP(input: {
  id: string;
  userId: string;
  status: 'going' | 'waitlisted' | 'cancelled';
  createdAt: Date;
}) {
  return prisma.rSVP.create({
    data: {
      id: input.id,
      eventId: seededEvent.id,
      userId: input.userId,
      status: input.status,
      createdAt: input.createdAt,
    },
  });
}

beforeAll(async () => {
  await prisma.rSVP.deleteMany({ where: { eventId: seededEvent.id } });
  await prisma.event.deleteMany({ where: { id: seededEvent.id } });
  await prisma.event.create({ data: seededEvent });
});

afterAll(async () => {
  await prisma.rSVP.deleteMany({ where: { eventId: seededEvent.id } });
  await prisma.event.deleteMany({ where: { id: seededEvent.id } });
});

beforeEach(async () => {
  await clearRSVPs();
});

const rsvpRepo = new PrismaRSVPRepository();
const eventRepo = new PrismaEventRepository();
const service = new RSVPService(rsvpRepo, eventRepo);

describe('RSVPService: waitlist promotion on cancel (Prisma)', () => {
  it('promotes the earliest waitlisted member when an attending member cancels', async () => {
    const going = await seedRSVP({
      id: 'rsvp-going-1',
      userId: 'user-going',
      status: 'going',
      createdAt: new Date('2027-01-01T10:00:00.000Z'),
    });

    const firstWaitlisted = await seedRSVP({
      id: 'rsvp-waitlist-1',
      userId: 'user-waitlist-1',
      status: 'waitlisted',
      createdAt: new Date('2027-01-01T11:00:00.000Z'),
    });

    await seedRSVP({
      id: 'rsvp-waitlist-2',
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
    const going = await seedRSVP({
      id: 'rsvp-going-solo',
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
    const going = await seedRSVP({
      id: 'rsvp-going-only-one',
      userId: 'user-going',
      status: 'going',
      createdAt: new Date('2027-01-01T10:00:00.000Z'),
    });

    const first = await seedRSVP({
      id: 'rsvp-waitlist-first',
      userId: 'user-waitlist-1',
      status: 'waitlisted',
      createdAt: new Date('2027-01-01T11:00:00.000Z'),
    });

    const second = await seedRSVP({
      id: 'rsvp-waitlist-second',
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

  it('atomicity: cancellation and promotion both persist after a successful call', async () => {
    const going = await seedRSVP({
      id: 'rsvp-going-atomic',
      userId: 'user-going',
      status: 'going',
      createdAt: new Date('2027-01-01T10:00:00.000Z'),
    });

    const waiting = await seedRSVP({
      id: 'rsvp-waitlist-atomic',
      userId: 'user-waitlist-1',
      status: 'waitlisted',
      createdAt: new Date('2027-01-01T11:00:00.000Z'),
    });

    const result = await service.cancelRSVPWithPromotion(going.id, 'user-going');
    expect(result.ok).toBe(true);

    const cancelledRow = await prisma.rSVP.findUnique({ where: { id: going.id } });
    const promotedRow = await prisma.rSVP.findUnique({ where: { id: waiting.id } });

    expect(cancelledRow?.status).toBe('cancelled');
    expect(promotedRow?.status).toBe('going');
  });
});

describe('RSVPService: getWaitlistPosition (Prisma)', () => {
  it('returns position 1 for the earliest waitlisted user', async () => {
    await seedRSVP({
      id: 'rsvp-pos-1',
      userId: 'user-waitlist-1',
      status: 'waitlisted',
      createdAt: new Date('2027-01-01T11:00:00.000Z'),
    });

    await seedRSVP({
      id: 'rsvp-pos-2',
      userId: 'user-waitlist-2',
      status: 'waitlisted',
      createdAt: new Date('2027-01-01T12:00:00.000Z'),
    });

    const result = await service.getWaitlistPosition(seededEvent.id, 'user-waitlist-1');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toBe(1);
  });

  it('returns position 2 for the second waitlisted user', async () => {
    await seedRSVP({
      id: 'rsvp-pos-a',
      userId: 'user-waitlist-1',
      status: 'waitlisted',
      createdAt: new Date('2027-01-01T11:00:00.000Z'),
    });

    await seedRSVP({
      id: 'rsvp-pos-b',
      userId: 'user-waitlist-2',
      status: 'waitlisted',
      createdAt: new Date('2027-01-01T12:00:00.000Z'),
    });

    await seedRSVP({
      id: 'rsvp-pos-c',
      userId: 'user-waitlist-3',
      status: 'waitlisted',
      createdAt: new Date('2027-01-01T13:00:00.000Z'),
    });

    const result = await service.getWaitlistPosition(seededEvent.id, 'user-waitlist-2');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toBe(2);
  });

  it('reflects the new position after an earlier waitlisted member is promoted', async () => {
    const going = await seedRSVP({
      id: 'rsvp-pos-going',
      userId: 'user-going',
      status: 'going',
      createdAt: new Date('2027-01-01T10:00:00.000Z'),
    });

    await seedRSVP({
      id: 'rsvp-pos-w1',
      userId: 'user-waitlist-1',
      status: 'waitlisted',
      createdAt: new Date('2027-01-01T11:00:00.000Z'),
    });

    await seedRSVP({
      id: 'rsvp-pos-w2',
      userId: 'user-waitlist-2',
      status: 'waitlisted',
      createdAt: new Date('2027-01-01T12:00:00.000Z'),
    });

    const before = await service.getWaitlistPosition(seededEvent.id, 'user-waitlist-2');
    expect(before.ok).toBe(true);
    if (!before.ok) return;
    expect(before.value).toBe(2);

    await service.cancelRSVPWithPromotion(going.id, 'user-going');

    const after = await service.getWaitlistPosition(seededEvent.id, 'user-waitlist-2');
    expect(after.ok).toBe(true);
    if (!after.ok) return;
    expect(after.value).toBe(1);
  });
});
