// STUB: This will be replaced when Features 1-2 are complete

export interface EventStub {
    id: string;
    status: 'draft' | 'published' | 'cancelled' | 'past';
    capacity?: number;
    endDateTime: Date;
    title: string;
    location: string;
    startDateTime: Date;
  }
  
  export interface EventRepositoryStub {
    findById(id: string): Promise<EventStub | null>;
  }
  
  export class InMemoryEventRepositoryStub implements EventRepositoryStub {
    private events: Map<string, EventStub> = new Map([
      [
        '1',
        {
          id: '1',
          title: 'Community Cleanup Day',
          location: 'Central Park',
          status: 'published',
          capacity: 10,
          startDateTime: new Date(Date.now() + 86400000), // Tomorrow
          endDateTime: new Date(Date.now() + 90000000), // Day after tomorrow
        },
      ],
      [
        '2',
        {
          id: '2',
          title: 'Open Mic Night',
          location: 'Coffee House',
          status: 'published',
          capacity: undefined, // No capacity limit
          startDateTime: new Date(Date.now() + 86400000),
          endDateTime: new Date(Date.now() + 90000000),
        },
      ],
    ]);
  
    async findById(id: string): Promise<EventStub | null> {
      return this.events.get(id) ?? null;
    }
  }