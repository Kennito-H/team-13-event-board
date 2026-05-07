import type { Event, EventStatus } from '../events/Event';
import type { IEventRepository, PublishedEventFilters, EventAnalyticsRow } from './EventRepository';

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

  async searchPublished(query: string, after: Date): Promise<Event[]> {
    const lower = query.toLowerCase();
    const published = Array.from(this.events.values()).filter(
      (e) => e.status === 'published' && e.startDateTime > after,
    );
 
    const matched =
      lower.length === 0
        ? published
        : published.filter(
            (e) =>
              e.title.toLowerCase().includes(lower) ||
              e.description.toLowerCase().includes(lower) ||
              e.location.toLowerCase().includes(lower),
          );
 
    return matched
      .sort((a, b) => a.startDateTime.getTime() - b.startDateTime.getTime())
      .map((e) => this.clone(e));
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

  async getOrganizerAnalytics(organizerId: string): Promise<EventAnalyticsRow[]> {
    return Array.from(this.events.values())
      .filter((e) => e.organizerId === organizerId)
      .map((e) => ({
        eventId: e.id,
        title: e.title,
        status: e.status,
        capacity: e.capacity,
        goingCount: 0,
        waitlistedCount: 0,
        startDateTime: e.startDateTime,
        category: e.category,
      }));
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