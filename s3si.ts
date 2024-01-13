import { App, DEFAULT_OPTS } from "./src/app.ts";
import { showError } from "./src/utils.ts";
import { flags } from "./deps.ts";

const parseArgs = (args: string[]) => {
  const parsed = flags.parse(args, {
    string: ["profilePath", "exporter", "skipMode", "listMethod", "nxapiPresenceUrl"],
    boolean: ["help", "noProgress", "monitor", "withSummary"],
    alias: {
      "help": "h",
      "profilePath": ["p", "profile-path"],
      "exporter": ["e"],
      "noProgress": ["n", "no-progress"],
      "monitor": ["m"],
      "skipMode": ["s", "skip-mode"],
      "withSummary": "with-summary",
      "listMethod": "list-method",
      "nxapiPresenceUrl": ["nxapi-presence"]
    },
  });
  return parsed;
};

const opts = parseArgs(Deno.args);
if (opts.help) {
  console.log(
    `Usage: deno run -A ${Deno.mainModule} [options]

Options:
    --profile-path <path>, -p    Path to config file (default: ./profile.json)
    --exporter <exporter>, -e    Exporter list to use (default: stat.ink)
                                 Multiple exporters can be separated by commas
                                 (e.g. "stat.ink,file")
    --list-method                When set to "latest", the latest 50 matches will be obtained.
                                 When set to "all", matches of all modes will be obtained with a maximum of 250 matches (5 modes x 50 matches).
                                 When set to "auto", the latest 50 matches will be obtained. If 50 matches have not been uploaded yet, matches will be obtained from the list of all modes.
                                 "auto" is the default setting.
    --no-progress, -n            Disable progress bar
    --monitor, -m                Monitor mode
    --skip-mode <mode>, -s       Skip mode (default: null)
                                 ("vs", "coop")
    --with-summary               Include summary in the output
    --help                       Show this help message and exit
    --nxapi-presence             Extends monitoring mode to use Nintendo Switch presence from nxapi`,
  );
  Deno.exit(0);
}

const app = new App({
  ...DEFAULT_OPTS,
  ...opts,
});
await showError(app.env, app.run());
