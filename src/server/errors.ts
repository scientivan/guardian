export class ApiError extends Error {
  constructor(message: string, readonly status = 400, readonly check?: number) { super(message); }
}
