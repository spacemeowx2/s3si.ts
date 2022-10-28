import { RankTracker } from "./RankTracker.ts";
import { assertEquals } from "../dev_deps.ts";

Deno.test("RankTracker", () => {
  const tracker = new RankTracker();
  assertEquals(tracker, new RankTracker());
});
