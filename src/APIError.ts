export class APIError extends Error {
  response: Response;
  json: unknown;
  constructor(
    { response, json, message }: {
      response: Response;
      json?: unknown;
      message?: string;
    },
  ) {
    super(message);
    this.response = response;
    this.json = json;
  }
}
