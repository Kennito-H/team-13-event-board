import { InMemoryEventRepository } from "../repositories/InMemoryEventRepository"
import { ok, err } from "../lib/result"
import { Event } from "../event/Event"

class ValidationError extends Error {}

export const EventService = {
  createEvent(data: any, organizerId: string) {
    // basic validation
    if (!data.title || !data.startDatetime || !data.endDatetime) {
      return err(new ValidationError("Missing required fields"))
    }

    const start = new Date(data.startDatetime)
    const end = new Date(data.endDatetime)

    if (end <= start) {
      return err(new ValidationError("End must be after start"))
    }

    const eventInput = {
      title: data.title,
      description: data.description,
      location: data.location,
      category: data.category,
      status: "draft",
      capacity: data.capacity ? Number(data.capacity) : undefined,
      startDatetime: start,
      endDatetime: end,
      organizerId,
    }

    const event = InMemoryEventRepository.create(eventInput)

    return ok(event)
  }
}