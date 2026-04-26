import type { RSVP, CreateRSVPInput } from './RSVP';
import type { RSVPRepository } from './RSVPRepository';
import { prisma } from '../lib/prisma';
import type { Event, EventStatus } from '../events/Event';


function toRSVP(row: {
  id: string;
  eventId: string;
  userId: string;
  status: string;
  createdAt: Date;
}): RSVP {
  return {
    id: row.id,
    eventId: row.eventId,
    userId: row.userId,
    status: row.status as RSVP['status'],
    createdAt: row.createdAt,
  };
}

export class PrismaRSVPRepository implements RSVPRepository {
  async findByEventAndUser(eventId: string, userId: string): Promise<RSVP | null> {
    const row = await prisma.rSVP.findUnique({
      where: { eventId_userId: { eventId, userId } },
    });
    return row ? toRSVP(row) : null;
  }

  async create(input: CreateRSVPInput): Promise<RSVP> {
    const row = await prisma.rSVP.create({
      data: {
        eventId: input.eventId,
        userId: input.userId,
        status: input.status,
      },
    });
    return toRSVP(row);
  }

  async update(id: string, updates: Partial<RSVP>): Promise<RSVP | null> {
    try {
      const row = await prisma.rSVP.update({
        where: { id },
        data: updates,
      });
      return toRSVP(row);
    } catch {
      return null;
    }
  }

  async countActiveByEvent(eventId: string): Promise<number> {
    return prisma.rSVP.count({
      where: { eventId, status: 'going' },
    });
  }

  async findByUserId(userId: string): Promise<RSVP[]> {
    const rows = await prisma.rSVP.findMany({ where: { userId } });
    return rows.map(toRSVP);
  }

  async countWaitlistedBeforeByEvent(eventId: string, before: Date): Promise<number> {
    return prisma.rSVP.count({
      where: {
        eventId,
        status: 'waitlisted',
        createdAt: { lt: before },
      },
    });
  }

  async findById(id: string): Promise<RSVP | null> {
    const row = await prisma.rSVP.findUnique({ where: { id } });
    return row ? toRSVP(row) : null;
  }

  async findFirstWaitlistedByEvent(eventId: string): Promise<RSVP | null> {
    const row = await prisma.rSVP.findFirst({
      where: { eventId, status: 'waitlisted' },
      orderBy: { createdAt: 'asc' },
    });
    return row ? toRSVP(row) : null;
  }
  async findByUserIdWithEvents(userId: string): Promise<Array<{ rsvp: RSVP; event: Event }>> {
    const rows = await prisma.rSVP.findMany({
      where: { userId },
      include: { event: true },
    });
    return rows.map((row) => ({
      rsvp: toRSVP(row),
      event: {
        id: row.event.id,
        title: row.event.title,
        description: row.event.description,
        location: row.event.location,
        category: row.event.category,
        capacity: row.event.capacity ?? undefined,
        status: row.event.status as EventStatus,
        startDateTime: row.event.startDateTime,
        endDateTime: row.event.endDateTime,
        organizerId: row.event.organizerId,
        createdAt: row.event.createdAt,
        updatedAt: row.event.updatedAt,
      },
    }));
  }

}

export function CreatePrismaRSVPRepository(): RSVPRepository {
  return new PrismaRSVPRepository();
}
