export class NotFoundError extends Error {
  constructor(message = 'Event not found.') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends Error {
  constructor(message = 'You are not allowed to access this event.') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ValidationError extends Error {
  constructor(message = 'Invalid event input.') {
    super(message);
    this.name = 'ValidationError';
  }
}

export class InvalidStateError extends Error {
  constructor(message = 'Event is not in a valid state for this action.') {
    super(message);
    this.name = 'InvalidStateError';
  }
}