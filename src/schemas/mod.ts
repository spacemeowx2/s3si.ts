import { ErrorObject } from "../../deps.ts";

export class SchemaError extends Error {
  errors: ErrorObject[];
  constructor({ message, errors }: { message: string; errors: ErrorObject[] }) {
    super(message);
    this.errors = errors;
  }
}
