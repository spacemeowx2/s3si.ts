import { loginManually } from "./iksm.ts";
import { flags } from "./deps.ts";
import { DEFAULT_STATE, State } from "./state.ts";

type Opts = {
  configPath: string;
  help?: boolean;
};

const DEFAULT_OPTS = {
  configPath: "./config.json",
  help: false,
};

class App {
  state: State = DEFAULT_STATE;
  constructor(public opts: Opts) {
    if (this.opts.help) {
      console.log(
        `Usage: deno run --allow-net --allow-read --allow-write ${Deno.mainModule} [options]

Options:
    --config-path <path>    Path to config file (default: ./config.json)
    --help                  Show this help message and exit`,
      );
      Deno.exit(0);
    }
  }
  async writeState() {
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(this.state, undefined, 2));
    await Deno.writeFile(this.opts.configPath + ".swap", data);
    await Deno.rename(this.opts.configPath + ".swap", this.opts.configPath);
  }
  async readState() {
    const decoder = new TextDecoder();
    try {
      const data = await Deno.readFile(this.opts.configPath);
      const json = JSON.parse(decoder.decode(data));
      this.state = json;
    } catch (e) {
      console.warn(
        `Failed to read config file, create new config file. (${e})`,
      );
      await this.writeState();
    }
  }
  async run() {
    await this.readState();
    if (!this.state.loginState?.sessionToken) {
      const { sessionToken } = await loginManually();
      this.state.loginState = {
        ...this.state.loginState,
        sessionToken,
      };
      await this.writeState();
    }
  }
}

const parseArgs = (args: string[]) => {
  const parsed = flags.parse(args, {
    string: ["configPath"],
    boolean: ["help"],
    alias: {
      "help": "h",
      "configPath": ["c", "config-path"],
    },
  });
  return parsed;
};

const app = new App({
  ...DEFAULT_OPTS,
  ...parseArgs(Deno.args),
});
await app.run();
