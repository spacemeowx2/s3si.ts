import { App, DEFAULT_OPTS } from "./src/app.ts";
import { showError } from "./src/utils.ts";
import { flags } from "./deps.ts";

const parseArgs = (args: string[]) => {
  const parsed = flags.parse(args, {
    string: ["profilePath", "exporter"],
    boolean: ["help", "noProgress"],
    alias: {
      "help": "h",
      "profilePath": ["p", "profile-path"],
      "exporter": ["e"],
      "noProgress": ["n", "no-progress"],
    },
  });
  return parsed;
};

const app = new App({
  ...DEFAULT_OPTS,
  ...parseArgs(Deno.args),
});
await showError(app.run());
