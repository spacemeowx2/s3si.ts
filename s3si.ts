import { App, DEFAULT_OPTS } from "./src/app.ts";
import { runDaemon } from "./src/daemon.ts";
import { showError } from "./src/utils.ts";
import { flags } from "./deps.ts";

const parseArgs = (args: string[]) => {
  const parsed = flags.parse(args, {
    string: ["profilePath", "exporter", "skipMode"],
    boolean: ["help", "noProgress", "monitor", "withSummary", "daemon"],
    alias: {
      "help": "h",
      "profilePath": ["p", "profile-path"],
      "exporter": ["e"],
      "noProgress": ["n", "no-progress"],
      "monitor": ["m"],
      "skipMode": ["s", "skip-mode"],
      "withSummary": "with-summary",
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
    --no-progress, -n            Disable progress bar
    --monitor, -m                Monitor mode
    --skip-mode <mode>, -s       Skip mode (default: null)
                                 ("vs", "coop")
    --with-summary               Include summary in the output
    --help                       Show this help message and exit`,
  );
  Deno.exit(0);
}
if (opts.daemon) {
  await runDaemon();

  Deno.exit(0);
}

const app = new App({
  ...DEFAULT_OPTS,
  ...opts,
});
await showError(app.env, app.run());
