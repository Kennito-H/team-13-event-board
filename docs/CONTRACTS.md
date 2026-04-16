# Interface Contracts

All service methods shared across features are documented here.
Return types use `Result<T, E>` from `src/lib/result.ts`.

---

## IEventService

Shared by: Event Edit (F2), Publish/Cancel (F3), RSVP Toggle (F4), Event Search (F5), My RSVPs (F7), Past Event Archiving (F6).

### `getEventById(eventId, requestingUserId?)`

```ts
getEventById(eventId: string, requestingUserId?: string): Promise<Result<Event, EventError>>
```

- **Success:** Returns the `Event` object.
- **Errors:** `NotFoundError` if event does not exist; `UnauthorizedError` if requesting user is not the organizer.

### `updateEvent(eventId, updates, userId)`

```ts
updateEvent(eventId: string, updates: UpdateEventInput, userId: string): Promise<Result<Event, EventError>>
```

- **Success:** Returns the updated `Event`.
- **Errors:** `NotFoundError`, `UnauthorizedError` if user is not the organizer, `ValidationError` for invalid fields, `InvalidStateError` if event is not in `draft` status.

### `publishEvent(eventId, userId)`

```ts
publishEvent(eventId: string, userId: string): Promise<Result<Event, EventError>>
```

- **Success:** Returns the `Event` with status `published`.
- **Errors:** `NotFoundError`, `UnauthorizedError`, `InvalidStateError` if event is not in `draft` status.

### `cancelEvent(eventId, userId, userRole)`

```ts
cancelEvent(eventId: string, userId: string, userRole: UserRole): Promise<Result<Event, EventError>>
```

- **Success:** Returns the `Event` with status `cancelled`.
- **Errors:** `NotFoundError`, `UnauthorizedError`, `InvalidStateError` if event is already cancelled or past.

### `listEvents(filters)`

```ts
listEvents(filters: EventFilters): Promise<Result<Event[], never>>
```

- **Success:** Returns array of `Event` objects matching the filters. Never fails.
- **Errors:** None.

### `searchEvents(input)`

```ts
searchEvents(input: SearchEventsInput): Promise<Result<Event[], EventError>>
```

- **Success:** Returns array of matching `Event` objects.
- **Errors:** `ValidationError` if query is invalid.

### `getArchivedEvents(input)`

```ts
getArchivedEvents(input: GetArchivedEventsInput): Promise<Result<Event[], EventError>>
```

- **Success:** Returns array of `Event` objects with status `past`, optionally filtered by category.
- **Errors:** None expected.

### `getArchivedCategories()`

```ts
getArchivedCategories(): Promise<Result<string[], EventError>>
```

- **Success:** Returns array of distinct category strings from past events.
- **Errors:** None expected.

### `transitionExpiredEvents()`

```ts
transitionExpiredEvents(): Promise<Result<number, EventError>>
```

- **Success:** Returns the count of events transitioned to `past` status.
- **Errors:** None expected.

---

## IRSVPService

Shared by: RSVP Toggle (F4), My RSVPs (F7).

### `toggleRSVP(eventId, userId)`

```ts
toggleRSVP(eventId: string, userId: string): Promise<Result<RSVP, EventNotFoundError | InvalidRSVPStateError>>
```

- **Success:** Returns the created or updated `RSVP`. Status will be `going`, `waitlisted`, or `cancelled` depending on current state and event capacity.
- **Errors:** `EventNotFoundError` if event does not exist; `InvalidRSVPStateError` if event is not published or has already ended.

### `getUserRSVPs(userId)`

```ts
getUserRSVPs(userId: string): Promise<Result<RSVPWithEvent[], never>>
```

- **Success:** Returns array of `{ rsvp: RSVP, event: EventStub }` sorted upcoming first, then by `createdAt`. Never fails.
- **Errors:** None.

### `cancelRSVPWithPromotion(rsvpId, userId)`

```ts
cancelRSVPWithPromotion(rsvpId: string, userId: string): Promise<Result<{ cancelled: RSVP; promoted?: RSVP }, EventNotFoundError | UnauthorizedError>>
```

- **Success:** Returns the cancelled RSVP and optionally a promoted RSVP if a waitlisted user was moved to `going`.
- **Errors:** `EventNotFoundError`, `UnauthorizedError` if user does not own the RSVP.

### `getWaitlistPosition(eventId, userId)`

```ts
getWaitlistPosition(eventId: string, userId: string): Promise<Result<number | null, EventNotFoundError>>
```

- **Success:** Returns the user's 1-based waitlist position, or `null` if not waitlisted.
- **Errors:** `EventNotFoundError` if event does not exist.

---

## IEventRepository

Shared by: `IEventService` (all event features) and `IRSVPService` (replaces stub in Sprint 3).

### Method signatures

```ts
findById(id: string): Promise<Event | null>
save(event: Event): Promise<Event>
findAll(): Promise<Event[]>
findByStatus(status: EventStatus): Promise<Event[]>
updateStatus(id: string, status: EventStatus): Promise<Event | null>
```

---

## RSVPRepository

Used exclusively by `IRSVPService`.

### Method signatures

```ts
findByEventAndUser(eventId: string, userId: string): Promise<RSVP | null>
findById(id: string): Promise<RSVP | null>
findByUserId(userId: string): Promise<RSVP[]>
findFirstWaitlistedByEvent(eventId: string): Promise<RSVP | null>
create(input: CreateRSVPInput): Promise<RSVP>
update(id: string, updates: Partial<RSVP>): Promise<RSVP | null>
countActiveByEvent(eventId: string): Promise<number>
countWaitlistedBeforeByEvent(eventId: string, before: Date): Promise<number>
```
