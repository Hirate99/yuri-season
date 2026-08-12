export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export function createId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}
