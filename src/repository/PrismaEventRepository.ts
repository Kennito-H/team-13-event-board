import type { Event, EventStatus } from '../events/Event';
import type { IEventRepository } from './EventRepository';
import { prisma } from '../lib/prisma';

function toEvent(row: {
  id: string;
  title: string;
  description: string;
  location: string;
  category: string;
  capacity: number | null;
  status: string;
  startDateTime: Date;
  endDateTime: Date;
  organizerId: string;
  createdAt: Date;
  updatedAt: Date;
}): Event {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    location: row.location,
    category: row.category,
    capacity: row.capacity ?? undefined,
    status: row.status as EventStatus,
    startDateTime: row.startDateTime,
    endDateTime: row.endDateTime,
    organizerId: row.organizerId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class PrismaEventRepository implements IEventRepository {
  async findById(id: string): Promise<Event | null> {
    const row = await prisma.event.findUnique({ where: { id } });
    return row ? toEvent(row) : null;
  }

  async save(event: Event): Promise<Event> {
    const row = await prisma.event.upsert({
      where: { id: event.id },
      update: {
        title: event.title,
        description: event.description,
        location: event.location,
        category: event.category,
        capacity: event.capacity ?? null,
        status: event.status,
        startDateTime: event.startDateTime,
        endDateTime: event.endDateTime,
        organizerId: event.organizerId,
      },
      create: {
        id: event.id,
        title: event.title,
        description: event.description,
        location: event.location,
        category: event.category,
        capacity: event.capacity ?? null,
        status: event.status,
        startDateTime: event.startDateTime,
        endDateTime: event.endDateTime,
        organizerId: event.organizerId,
        createdAt: event.createdAt,
      },
    });
    return toEvent(row);
  }

  async findAll(): Promise<Event[]> {
    const rows = await prisma.event.findMany();
    return rows.map(toEvent);
  }

  async findByStatus(status: EventStatus): Promise<Event[]> {
    const rows = await prisma.event.findMany({ where: { status } });
    return rows.map(toEvent);
  }

  async updateStatus(id: string, status: EventStatus): Promise<Event | null> {
    try {
      const row = await prisma.event.update({
        where: { id },
        data: { status },
      });
      return toEvent(row);
    } catch {
      return null;
    }
  }

  async findByOrganizer(organizerId: string): Promise<Event[]> {
    const rows = await prisma.event.findMany({ where: { organizerId } });
    return rows.map(toEvent);
  }
}

export function CreatePrismaEventRepository(): IEventRepository {
  return new PrismaEventRepository();
}
