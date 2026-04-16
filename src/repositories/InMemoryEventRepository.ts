// // src/repositories/InMemoryEventRepository.ts

// import { randomUUID } from "crypto"
// import { Event } from "../event/Event"

// // In-memory storage
// const events = new Map<string, Event>()

// export const InMemoryEventRepository = {
//   create(eventData: Omit<Event, "id" | "createdAt" | "updatedAt">): Event {
//     const id = randomUUID()
//     const now = new Date()

//     const event: Event = {
//       ...eventData,
//       id,
//       createdAt: now,
//       updatedAt: now,
//     }

//     events.set(id, event)
//     return event
//   },

//   findById(id: string): Event | null {
//     return events.get(id) ?? null
//   },

//   findAll(): Event[] {
//     return Array.from(events.values())
//   }
// }