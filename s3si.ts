import { App, DEFAULT_OPTS, parseArgs } from "./app.ts";
import { showError } from "./utils.ts";

const app = new App({
  ...DEFAULT_OPTS,
  ...parseArgs(Deno.args),
});
await showError(app.run());
