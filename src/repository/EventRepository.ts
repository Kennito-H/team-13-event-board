import type { Event, EventStatus } from '../events/Event';

export interface IEventRepository {
  findById(id: string): Promise<Event | null>;
  save(event: Event): Promise<Event>;

  findAll(): Promise<Event[]>;
  findByStatus(status: EventStatus): Promise<Event[]>;
  updateStatus(id: string, status: EventStatus): Promise<Event | null>;
  findByOrganizer(organizerId: string): Promise<Event[]>;
}