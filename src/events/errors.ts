export type EventError =
  | { name: "NotFoundError"; message: string }
  | { name: "UnauthorizedError"; message: string }
  | { name: "ValidationError"; message: string }
  | { name: "InvalidStateError"; message: string };

export const NotFoundError = (message: string): EventError => ({
  name: "NotFoundError",
  message,
});

export const UnauthorizedError = (message: string): EventError => ({
  name: "UnauthorizedError",
  message,
});

export const ValidationError = (message: string): EventError => ({
  name: "ValidationError",
  message,
});

export const InvalidStateError = (message: string): EventError => ({
  name: "InvalidStateError",
  message,
});