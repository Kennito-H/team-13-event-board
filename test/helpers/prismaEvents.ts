import type { Event } from "../../src/events/Event";
import { prisma } from "../../src/lib/prisma";

function eventData(event: Event) {
  return {
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
    updatedAt: event.updatedAt,
  };
}

export async function seedPrismaEvents(events: Event[]): Promise<void> {
  const ids = events.map((event) => event.id);

  await prisma.rSVP.deleteMany({ where: { eventId: { in: ids } } });
  await prisma.event.deleteMany({ where: { id: { in: ids } } });

  if (events.length > 0) {
    await prisma.event.createMany({ data: events.map(eventData) });
  }
}

export async function savePrismaEvent(event: Event): Promise<Event> {
  const row = await prisma.event.upsert({
    where: { id: event.id },
    create: eventData(event),
    update: eventData(event),
  });

  return {
    ...row,
    capacity: row.capacity ?? undefined,
    status: row.status as Event["status"],
  };
}

export async function findPrismaEvent(id: string): Promise<Event | null> {
  const row = await prisma.event.findUnique({ where: { id } });
  if (!row) return null;

  return {
    ...row,
    capacity: row.capacity ?? undefined,
    status: row.status as Event["status"],
  };
}

export async function cleanupPrismaEvents(ids: string[]): Promise<void> {
  await prisma.rSVP.deleteMany({ where: { eventId: { in: ids } } });
  await prisma.event.deleteMany({ where: { id: { in: ids } } });
}
