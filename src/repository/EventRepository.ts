import type { Event } from '../events/Event';

export interface IEventRepository {
  findById(id: string): Promise<Event | null>;
  save(event: Event): Promise<Event>;
  findAll(): Promise<Event[]>
}