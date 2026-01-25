import { assertEquals } from "../dev_deps.ts";
import { DEFAULT_STATE, Profile, State, StateBackend } from "./state.ts";

function makeNoopEnv() {
  return {
    prompts: {
      promptLogin: async () => "",
      prompt: async () => "",
    },
    logger: {
      debug: () => {},
      log: () => {},
      warn: () => {},
      error: () => {},
    },
    newFetcher: () => ({
      get: async () => new Response(),
      post: async () => new Response(),
    }),
  } as const;
}

class RecordingStateBackend implements StateBackend {
  writes: State[] = [];

  constructor(
    private readonly readResult: { ok: true; value: State } | {
      ok: false;
      error: unknown;
    },
  ) {}

  async read(): Promise<State> {
    if (!this.readResult.ok) throw this.readResult.error;
    return this.readResult.value;
  }

  async write(newState: State): Promise<void> {
    this.writes.push(newState);
  }
}

Deno.test("Profile.readState does not overwrite invalid JSON config", async () => {
  const backend = new RecordingStateBackend({
    ok: false,
    error: new SyntaxError("Unexpected token } in JSON at position 1"),
  });
  const profile = new Profile({
    stateBackend: backend,
    env: makeNoopEnv(),
  });

  let threw = false;
  try {
    await profile.readState();
  } catch {
    threw = true;
  }
  assertEquals(threw, true);
  assertEquals(backend.writes.length, 0);
});

Deno.test("Profile.readState creates new config only when missing", async () => {
  const backend = new RecordingStateBackend({
    ok: false,
    error: new Deno.errors.NotFound("profile.json not found"),
  });
  const profile = new Profile({
    stateBackend: backend,
    env: makeNoopEnv(),
  });

  await profile.readState();
  assertEquals(profile.state, DEFAULT_STATE);
  assertEquals(backend.writes, [DEFAULT_STATE]);
});
