export class RSVPNotFoundError extends Error {
    constructor(message = 'RSVP not found') {
      super(message);
      this.name = 'RSVPNotFoundError';
    }
  }
  
  export class InvalidStateError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'InvalidStateError';
    }
  }