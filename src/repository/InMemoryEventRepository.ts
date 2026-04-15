import type { Event } from '../events/Event';
import type { IEventRepository } from './EventRepository';

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