export class RSVPNotFoundError extends Error {
    constructor(message = 'RSVP not found') {
      super(message);
      this.name = 'RSVPNotFoundError';
    }
  }
  
export class InvalidRSVPStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidRSVPStateError';
  }
}

export class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}