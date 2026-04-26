import type { Event, EventStatus } from '../events/Event';
import type { IEventRepository, PublishedEventFilters } from './EventRepository';

class InMemoryEventRepository implements IEventRepository {
  private readonly events: Map<string, Event>;

  constructor(seedEvents: Event[] = []) {
    this.events = new Map(seedEvents.map((event) => [event.id, this.clone(event)]));
  }

  async findById(id: string): Promise<Event | null> {
    const event = this.events.get(id);
    return event ? this.clone(event) : null;
  }

  async save(event: Event): Promise<Event> {
    this.events.set(event.id, this.clone(event));
    return this.clone(event);
  }

  async findAll(): Promise<Event[]> {
    return Array.from(this.events.values()).map((e) => this.clone(e));
  }
 
  async findByStatus(status: EventStatus): Promise<Event[]> {
    return Array.from(this.events.values())
      .filter((e) => e.status === status)
      .map((e) => this.clone(e));
  }
 
  async updateStatus(id: string, status: EventStatus): Promise<Event | null> {
    const event = this.events.get(id);
    if (!event) return null;
    const updated: Event = { ...event, status, updatedAt: new Date() };
    this.events.set(id, this.clone(updated));
    return this.clone(updated);
  }
  async findByOrganizer(organizerId: string): Promise<Event[]> {
    return Array.from(this.events.values())
      .filter((e) => e.organizerId === organizerId)
      .map((e) => this.clone(e));
  }

  async findPublishedFiltered(filters: PublishedEventFilters): Promise<Event[]> {
    return Array.from(this.events.values())
      .filter((e) => {
        if (e.status !== 'published') return false;
        if (filters.category && e.category !== filters.category) return false;
        if (filters.startAfter && e.startDateTime < filters.startAfter) return false;
        if (filters.startBefore && e.startDateTime > filters.startBefore) return false;
        return true;
      })
      .map((e) => this.clone(e))
      .sort((a, b) => a.startDateTime.getTime() - b.startDateTime.getTime());
  }

  private clone(event: Event): Event {
    return {
      ...event,
      startDateTime: new Date(event.startDateTime),
      endDateTime: new Date(event.endDateTime),
      createdAt: new Date(event.createdAt),
      updatedAt: new Date(event.updatedAt),
    };
  }
}

let repositoryInstance: IEventRepository | null = null;

export function CreateInMemoryEventRepository(
  seedEvents: Event[] = [],
): IEventRepository {
  if (repositoryInstance === null) {
    repositoryInstance = new InMemoryEventRepository(seedEvents);
  }

  return repositoryInstance;
}