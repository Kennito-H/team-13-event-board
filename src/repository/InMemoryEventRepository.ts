import type { Event, EventStatus } from '../events/Event';
import type { IEventRepository } from './EventRepository';

const now = new Date();
const d = (offsetDays: number, hour = 12): Date => {
  const dt = new Date(now);
  dt.setDate(dt.getDate() + offsetDays);
  dt.setHours(hour, 0, 0, 0);
  return dt;
};
 
export const SEED_EVENTS: Event[] = [
  {
    id: 'event-1',
    title: 'JavaScript Study Group',
    description: 'Weekly meetup to work through modern JavaScript concepts together. Bring your laptop and questions.',
    location: 'Library Room 204',
    category: 'Technology',
    status: 'published',
    capacity: 20,
    startDateTime: d(2, 14),
    endDateTime: d(2, 16),
    organizerId: 'user-staff',
    createdAt: d(-10),
    updatedAt: d(-10),
  },
  {
    id: 'event-2',
    title: 'Spring Hiking Trip',
    description: 'A beginner-friendly hike through the local trails. Roughly 5 miles round trip. Bring water and snacks.',
    location: 'Notch Trail Head, Amherst',
    category: 'Outdoors',
    status: 'published',
    capacity: 15,
    startDateTime: d(5, 9),
    endDateTime: d(5, 14),
    organizerId: 'user-staff',
    createdAt: d(-8),
    updatedAt: d(-8),
  },
  {
    id: 'event-3',
    title: 'Board Game Night',
    description: 'Come play a variety of board games from classic strategy to modern Euro games. All skill levels welcome.',
    location: 'Student Union, Room 12',
    category: 'Social',
    status: 'published',
    startDateTime: d(1, 18),
    endDateTime: d(1, 22),
    organizerId: 'user-admin',
    createdAt: d(-5),
    updatedAt: d(-5),
  },
  {
    id: 'event-4',
    title: 'Photography Walk Downtown',
    description: 'Grab your camera or phone and join us for a guided photo walk through downtown. Tips shared along the way.',
    location: 'Downtown Amherst, Town Common',
    category: 'Arts',
    status: 'published',
    capacity: 25,
    startDateTime: d(3, 10),
    endDateTime: d(3, 12),
    organizerId: 'user-staff',
    createdAt: d(-3),
    updatedAt: d(-3),
  },
  {
    id: 'event-5',
    title: 'Introduction to Python Workshop',
    description: 'Hands-on workshop covering Python basics: variables, loops, functions, and simple data structures. No prior experience needed.',
    location: 'Computer Lab B, Engineering Hall',
    category: 'Technology',
    status: 'published',
    capacity: 30,
    startDateTime: d(7, 13),
    endDateTime: d(7, 17),
    organizerId: 'user-admin',
    createdAt: d(-7),
    updatedAt: d(-7),
  },
  {
    id: 'event-6',
    title: 'Community Garden Volunteer Day',
    description: 'Help plant, weed, and water at the campus community garden. Tools provided. Great way to spend a morning outdoors.',
    location: 'Campus Community Garden',
    category: 'Outdoors',
    status: 'published',
    capacity: 40,
    startDateTime: d(4, 8),
    endDateTime: d(4, 11),
    organizerId: 'user-staff',
    createdAt: d(-6),
    updatedAt: d(-6),
  },
  {
    id: 'event-7',
    title: 'Film Screening: Local Shorts',
    description: 'Screening of short films made by local filmmakers followed by a Q&A panel with the directors.',
    location: 'Fine Arts Cinema',
    category: 'Arts',
    status: 'published',
    startDateTime: d(6, 19),
    endDateTime: d(6, 21),
    organizerId: 'user-admin',
    createdAt: d(-4),
    updatedAt: d(-4),
  },
  {
    id: 'event-8',
    title: 'Yoga in the Park',
    description: 'A relaxing all-levels outdoor yoga session. Bring a mat or towel. We will focus on breath and gentle movement.',
    location: 'Town Park, East Lawn',
    category: 'Health',
    status: 'published',
    capacity: 50,
    startDateTime: d(2, 8),
    endDateTime: d(2, 9),
    organizerId: 'user-staff',
    createdAt: d(-2),
    updatedAt: d(-2),
  },
  // Draft
  {
    id: 'event-9',
    title: 'TypeScript Deep Dive',
    description: 'Advanced session on TypeScript generics, utility types, and declaration merging.',
    location: 'TBD',
    category: 'Technology',
    status: 'draft',
    capacity: 20,
    startDateTime: d(14, 14),
    endDateTime: d(14, 17),
    organizerId: 'user-staff',
    createdAt: d(-1),
    updatedAt: d(-1),
  },
  // Cancelled
  {
    id: 'event-10',
    title: 'Road Trip Planning Session',
    description: 'This event was cancelled due to low interest.',
    location: 'Online',
    category: 'Social',
    status: 'cancelled',
    startDateTime: d(10, 15),
    endDateTime: d(10, 17),
    organizerId: 'user-admin',
    createdAt: d(-15),
    updatedAt: d(-2),
  },
  // Past
  {
    id: 'event-11',
    title: 'Winter Code Sprint',
    description: 'A focused two-hour coding session. Participants chose a small project and worked alongside each other.',
    location: 'Library Room 204',
    category: 'Technology',
    status: 'past',
    capacity: 20,
    startDateTime: d(-14, 13),
    endDateTime: d(-14, 15),
    organizerId: 'user-staff',
    createdAt: d(-30),
    updatedAt: d(-14),
  },
  {
    id: 'event-12',
    title: 'Holiday Potluck Dinner',
    description: 'Annual potluck. Everyone brought a dish to share. A great time was had by all.',
    location: 'Student Union Ballroom',
    category: 'Social',
    status: 'past',
    startDateTime: d(-30, 18),
    endDateTime: d(-30, 21),
    organizerId: 'user-admin',
    createdAt: d(-45),
    updatedAt: d(-30),
  },
  {
    id: 'event-13',
    title: 'Nature Photography Workshop',
    description: 'Techniques for capturing wildlife and landscapes. Held at the arboretum.',
    location: 'Campus Arboretum',
    category: 'Arts',
    status: 'past',
    capacity: 15,
    startDateTime: d(-7, 9),
    endDateTime: d(-7, 12),
    organizerId: 'user-staff',
    createdAt: d(-20),
    updatedAt: d(-7),
  },
  {
    id: 'event-14',
    title: 'Morning Run Club',
    description: 'A casual 3-mile group run around campus. Suitable for all paces.',
    location: 'Athletic Fields, North Entrance',
    category: 'Health',
    status: 'past',
    startDateTime: d(-3, 7),
    endDateTime: d(-3, 8),
    organizerId: 'user-staff',
    createdAt: d(-10),
    updatedAt: d(-3),
  },
];

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