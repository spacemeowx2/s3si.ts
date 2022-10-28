import { RankTracker } from "./RankTracker.ts";
import { assertEquals } from "../dev_deps.ts";
import { BattleListNode } from "./types.ts";
import { base64 } from "../deps.ts";
import { gameId } from "./utils.ts";

const INIT_STATE = {
  gameId: await gameId(genId(0)),
  rank: "B-",
  rankPoint: 100,
};

class TestRankTracker extends RankTracker {
  testGet() {
    const { state, deltaMap } = this;
    return {
      state,
      deltaMap,
    };
  }
}

function genId(id: number): string {
  return base64.encode(
    `VsHistoryDetail-asdf:asdf:20220101T${
      id.toString().padStart(6, "0")
    }_------------------------------------`,
  );
}

function genOpenWins(
  { startId, count, udemae }: {
    startId: number;
    count: number;
    udemae: string;
  },
) {
  const result: BattleListNode[] = [];
  let id = startId;

  for (let i = 0; i < count; i++) {
    result.push({
      id: genId(id),
      udemae,
      judgement: "WIN",
      bankaraMatch: {
        earnedUdemaePoint: 8,
      },
      nextHistoryDetail: null,
      previousHistoryDetail: null,
    });
    id += 1;
  }

  return result;
}

Deno.test("RankTracker", async () => {
  const tracker = new TestRankTracker(INIT_STATE);
  assertEquals(tracker.testGet(), {
    state: INIT_STATE,
    deltaMap: new Map(),
  });

  const finalState = await tracker.updateState([{
    bankaraMatchChallenge: null,
    historyDetails: {
      nodes: [...genOpenWins({
        startId: 0,
        count: 19,
        udemae: "B-",
      })].reverse(),
    },
  }]);

  assertEquals(tracker.testGet().state, INIT_STATE);

  assertEquals(finalState, {
    gameId: await gameId(genId(18)),
    rank: "B-",
    rankPoint: 244,
  });

  assertEquals(await tracker.getRankStateById(genId(1)), {
    gameId: await gameId(genId(1)),
    rank: "B-",
    rankPoint: 108,
  });

  assertEquals(await tracker.getRankStateById(genId(17)), {
    gameId: await gameId(genId(17)),
    rank: "B-",
    rankPoint: 236,
  });

  tracker.setState(finalState);

  assertEquals(tracker.testGet().state, finalState);

  // history goes too far
  const finalState2 = await tracker.updateState([{
    bankaraMatchChallenge: null,
    historyDetails: {
      nodes: [...genOpenWins({
        startId: 30,
        count: 1,
        udemae: "B-",
      })].reverse(),
    },
  }]);
  assertEquals(finalState2, undefined);

  await tracker.updateState([{
    bankaraMatchChallenge: null,
    historyDetails: {
      nodes: [...genOpenWins({
        startId: 0,
        count: 30,
        udemae: "B-",
      })].reverse(),
    },
  }]);

  assertEquals(await tracker.getRankStateById(genId(29)), {
    gameId: await gameId(genId(29)),
    rank: "B-",
    rankPoint: 332,
  });
});
