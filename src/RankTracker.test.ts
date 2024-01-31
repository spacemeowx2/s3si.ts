import { RankTracker } from "./RankTracker.ts";
import { assertEquals } from "../dev_deps.ts";
import { BattleListNode } from "./types.ts";
import { base64 } from "../deps.ts";
import { gameId } from "./utils.ts";
import { RankState } from "./state.ts";

const INIT_STATE: RankState = {
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

function genId(id: number, date = "20220101"): string {
  return base64.encodeBase64(
    `VsHistoryDetail-asdf:asdf:${date}T${
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
    });
    id += 1;
  }

  return result;
}

Deno.test("RankTracker don't promo after failed challenge", async () => {
  const tracker = new TestRankTracker(undefined);
  assertEquals(tracker.testGet(), {
    state: undefined,
    deltaMap: new Map(),
  });

  const finalState = await tracker.updateState([{
    xMatchMeasurement: null,
    bankaraMatchChallenge: {
      winCount: 0,
      loseCount: 3,
      maxWinCount: 3,
      maxLoseCount: 3,
      state: "FAILED",
      isPromo: true,
      isUdemaeUp: false,
      udemaeAfter: "B+",
      earnedUdemaePoint: null,
    },
    historyDetails: {
      nodes: [{
        id: genId(1),
        udemae: "B+",
        judgement: "LOSE",
        bankaraMatch: {
          earnedUdemaePoint: null,
        },
      }, {
        id: genId(0),
        udemae: "B+",
        judgement: "LOSE",
        bankaraMatch: {
          earnedUdemaePoint: null,
        },
      }],
    },
  }]);

  assertEquals(finalState, undefined);
});

Deno.test("RankTracker autotrack after promotion", async () => {
  const tracker = new TestRankTracker(undefined);
  assertEquals(tracker.testGet(), {
    state: undefined,
    deltaMap: new Map(),
  });

  const finalState = await tracker.updateState([{
    xMatchMeasurement: null,
    bankaraMatchChallenge: {
      winCount: 3,
      loseCount: 0,
      maxWinCount: 3,
      maxLoseCount: 3,
      state: "SUCCEEDED",
      isPromo: true,
      isUdemaeUp: true,
      udemaeAfter: "A-",
      earnedUdemaePoint: -233,
    },
    historyDetails: {
      nodes: [{
        id: genId(1),
        udemae: "B+",
        judgement: "WIN",
        bankaraMatch: {
          earnedUdemaePoint: null,
        },
      }, {
        id: genId(0),
        udemae: "B+",
        judgement: "WIN",
        bankaraMatch: {
          earnedUdemaePoint: null,
        },
      }],
    },
  }]);

  const gameId1 = await gameId(genId(1));
  assertEquals(finalState, {
    gameId: gameId1,
    rank: "A-",
    rankPoint: 200,
    timestamp: 1640995201,
  });

  assertEquals(await tracker.getRankStateById(genId(1)), {
    before: {
      gameId: await gameId(genId(0)),
      rank: "B+",
      rankPoint: 433,
      timestamp: 1640995200,
    },
    after: {
      gameId: gameId1,
      rank: "A-",
      rankPoint: 200,
      timestamp: 1640995201,
    },
  });
});

Deno.test("RankTracker issue #36", async () => {
  const tracker = new TestRankTracker(undefined);
  assertEquals(tracker.testGet(), {
    state: undefined,
    deltaMap: new Map(),
  });

  const finalState = await tracker.updateState([{
    xMatchMeasurement: null,
    bankaraMatchChallenge: {
      winCount: 3,
      loseCount: 0,
      maxWinCount: 3,
      maxLoseCount: 3,
      state: "SUCCEEDED",
      isPromo: true,
      isUdemaeUp: true,
      udemaeAfter: "S+20",
      earnedUdemaePoint: -3450,
    },
    historyDetails: {
      nodes: [{
        id: genId(2),
        udemae: "S+19",
        judgement: "WIN",
        bankaraMatch: {
          earnedUdemaePoint: null,
        },
      }, {
        id: genId(1),
        udemae: "S+19",
        judgement: "WIN",
        bankaraMatch: {
          earnedUdemaePoint: null,
        },
      }, {
        id: genId(0),
        udemae: "S+19",
        judgement: "WIN",
        bankaraMatch: {
          earnedUdemaePoint: null,
        },
      }],
    },
  }]);

  const gameId2 = await gameId(genId(2));
  assertEquals(finalState, {
    gameId: gameId2,
    rank: "S+20",
    rankPoint: 300,
    timestamp: 1640995202,
  });

  assertEquals(await tracker.getRankStateById(genId(0)), undefined);
  assertEquals(await tracker.getRankStateById(genId(1)), undefined);

  assertEquals(await tracker.getRankStateById(genId(2)), {
    before: {
      gameId: await gameId(genId(1)),
      rank: "S+19",
      rankPoint: 3750,
      timestamp: 1640995201,
    },
    after: {
      gameId: gameId2,
      rank: "S+20",
      rankPoint: 300,
      timestamp: 1640995202,
    },
  });
});

Deno.test("RankTracker tracks promotion, ignoring INPROGRESS", async () => {
  const INIT_STATE = {
    gameId: await gameId(genId(0)),
    rank: "B+",
    rankPoint: 850,
    timestamp: 1640995201,
  };

  const tracker = new TestRankTracker(INIT_STATE);
  assertEquals(tracker.testGet(), {
    state: INIT_STATE,
    deltaMap: new Map(),
  });

  const finalState = await tracker.updateState([{
    xMatchMeasurement: null,
    bankaraMatchChallenge: {
      winCount: 2,
      loseCount: 0,
      maxWinCount: 3,
      maxLoseCount: 3,
      state: "INPROGRESS",
      isPromo: true,
      isUdemaeUp: true,
      udemaeAfter: "A-",
      earnedUdemaePoint: null,
    },
    historyDetails: {
      nodes: [{
        id: genId(1),
        udemae: "B+",
        judgement: "WIN",
        bankaraMatch: {
          earnedUdemaePoint: null,
        },
      }, {
        id: genId(0),
        udemae: "B+",
        judgement: "WIN",
        bankaraMatch: {
          earnedUdemaePoint: null,
        },
      }],
    },
  }]);

  assertEquals(finalState, {
    gameId: await gameId(genId(1)),
    rank: "B+",
    rankPoint: 850,
    timestamp: 1640995201,
  });
});

Deno.test("RankTracker tracks promotion", async () => {
  const INIT_STATE = {
    gameId: await gameId(genId(0)),
    rank: "B+",
    rankPoint: 850,
  };

  const tracker = new TestRankTracker(INIT_STATE);
  assertEquals(tracker.testGet(), {
    state: INIT_STATE,
    deltaMap: new Map(),
  });

  const finalState = await tracker.updateState([{
    xMatchMeasurement: null,
    bankaraMatchChallenge: {
      winCount: 3,
      loseCount: 0,
      maxWinCount: 3,
      maxLoseCount: 3,
      state: "SUCCEEDED",
      isPromo: true,
      isUdemaeUp: true,
      udemaeAfter: "A-",
      earnedUdemaePoint: null,
    },
    historyDetails: {
      nodes: [{
        id: genId(2),
        udemae: "B+",
        judgement: "WIN",
        bankaraMatch: {
          earnedUdemaePoint: null,
        },
      }, {
        id: genId(1),
        udemae: "B+",
        judgement: "WIN",
        bankaraMatch: {
          earnedUdemaePoint: null,
        },
      }, {
        id: genId(0),
        udemae: "B+",
        judgement: "WIN",
        bankaraMatch: {
          earnedUdemaePoint: null,
        },
      }],
    },
  }]);

  assertEquals(finalState, {
    gameId: await gameId(genId(2)),
    rank: "A-",
    rankPoint: 200,
    timestamp: 1640995202,
  });
});

Deno.test("RankTracker tracks challenge charge", async () => {
  const tracker = new TestRankTracker(INIT_STATE);
  assertEquals(tracker.testGet(), {
    state: INIT_STATE,
    deltaMap: new Map(),
  });

  const finalState = await tracker.updateState([{
    xMatchMeasurement: null,
    bankaraMatchChallenge: {
      winCount: 1,
      loseCount: 0,
      maxWinCount: 5,
      maxLoseCount: 3,
      isPromo: false,
      isUdemaeUp: false,
      udemaeAfter: null,
      earnedUdemaePoint: null,
      state: "INPROGRESS",
    },
    historyDetails: {
      nodes: [
        {
          id: genId(2),
          udemae: "B-",
          judgement: "WIN",
          bankaraMatch: {
            earnedUdemaePoint: null,
          },
        },
      ],
    },
  }, {
    xMatchMeasurement: null,
    bankaraMatchChallenge: null,
    historyDetails: {
      nodes: genOpenWins({
        startId: 0,
        count: 1,
        udemae: "B-",
      }),
    },
  }]);

  assertEquals(tracker.testGet().state, INIT_STATE);

  assertEquals(finalState, {
    gameId: await gameId(genId(2)),
    rank: "B-",
    rankPoint: 45,
    timestamp: 1640995202,
  });
});

Deno.test("RankTracker", async () => {
  const tracker = new TestRankTracker(INIT_STATE);
  assertEquals(tracker.testGet(), {
    state: INIT_STATE,
    deltaMap: new Map(),
  });

  const finalState = await tracker.updateState([{
    xMatchMeasurement: null,
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
    timestamp: 1640995218,
  });

  assertEquals((await tracker.getRankStateById(genId(1)))?.after, {
    gameId: await gameId(genId(1)),
    rank: "B-",
    rankPoint: 108,
    timestamp: 1640995201,
  });

  assertEquals((await tracker.getRankStateById(genId(17)))?.after, {
    gameId: await gameId(genId(17)),
    rank: "B-",
    rankPoint: 236,
    timestamp: 1640995217,
  });

  tracker.setState(finalState);

  assertEquals(tracker.testGet().state, finalState);

  // history goes too far
  const finalState2 = await tracker.updateState([{
    xMatchMeasurement: null,
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
    xMatchMeasurement: null,
    bankaraMatchChallenge: null,
    historyDetails: {
      nodes: [...genOpenWins({
        startId: 0,
        count: 30,
        udemae: "B-",
      })].reverse(),
    },
  }]);

  assertEquals((await tracker.getRankStateById(genId(29)))?.after, {
    gameId: await gameId(genId(29)),
    rank: "B-",
    rankPoint: 332,
    timestamp: 1640995229,
  });
});

Deno.test("RankTracker clears state when season changes", async () => {
  const firstDay = new Date("2022-09-09T00:00:00+00:00").getTime() / 1000;
  const firstSeason = {
    ...INIT_STATE,
    timestamp: firstDay,
  };
  const tracker = new TestRankTracker(firstSeason);
  assertEquals(tracker.testGet(), {
    state: firstSeason,
    deltaMap: new Map(),
  });

  const afterState = await tracker.updateState([{
    xMatchMeasurement: null,
    bankaraMatchChallenge: {
      winCount: 3,
      loseCount: 0,
      maxWinCount: 3,
      maxLoseCount: 3,
      state: "SUCCEEDED",
      isPromo: true,
      isUdemaeUp: true,
      udemaeAfter: "B-",
      earnedUdemaePoint: 1,
    },
    historyDetails: {
      nodes: [{
        id: genId(1, "20221209"),
        udemae: "B-",
        judgement: "WIN",
        bankaraMatch: {
          earnedUdemaePoint: 8,
        },
      }, {
        id: genId(0),
        udemae: "B-",
        judgement: "WIN",
        bankaraMatch: {
          earnedUdemaePoint: 8,
        },
      }],
    },
  }]);

  assertEquals(afterState, undefined);
});
