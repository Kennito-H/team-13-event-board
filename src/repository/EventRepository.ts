import type { Event, EventStatus } from '../events/Event';

export interface PublishedEventFilters {
  category?: string;
  startAfter?: Date;
  startBefore?: Date;
}

export interface IEventRepository {
  findById(id: string): Promise<Event | null>;
  save(event: Event): Promise<Event>;
  searchPublished(query: string, after: Date): Promise<Event[]>;
  findAll(): Promise<Event[]>;
  findByStatus(status: EventStatus): Promise<Event[]>;
  updateStatus(id: string, status: EventStatus): Promise<Event | null>;
  findByOrganizer(organizerId: string): Promise<Event[]>;
  findPublishedFiltered(filters: PublishedEventFilters): Promise<Event[]>;
}