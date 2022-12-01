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

  const gameId1 = await gameId(genId(1));
  assertEquals(finalState, {
    gameId: gameId1,
    rank: "A-",
    rankPoint: 200,
  });

  assertEquals(await tracker.getRankStateById(genId(1)), {
    before: {
      gameId: await gameId(genId(0)),
      rank: "B+",
      rankPoint: -1,
    },
    after: {
      gameId: gameId1,
      rank: "A-",
      rankPoint: 200,
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
      earnedUdemaePoint: null,
    },
    historyDetails: {
      nodes: [{
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

  const gameId1 = await gameId(genId(1));
  assertEquals(finalState, {
    gameId: gameId1,
    rank: "S+20",
    rankPoint: 300,
  });

  assertEquals(await tracker.getRankStateById(genId(0)), undefined);

  assertEquals(await tracker.getRankStateById(genId(1)), {
    before: {
      gameId: await gameId(genId(0)),
      rank: "S+19",
      rankPoint: -1,
    },
    after: {
      gameId: gameId1,
      rank: "S+20",
      rankPoint: 300,
    },
  });
});

Deno.test("RankTracker tracks promotion, ignoring INPROGRESS", async () => {
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
  });

  assertEquals((await tracker.getRankStateById(genId(1)))?.after, {
    gameId: await gameId(genId(1)),
    rank: "B-",
    rankPoint: 108,
  });

  assertEquals((await tracker.getRankStateById(genId(17)))?.after, {
    gameId: await gameId(genId(17)),
    rank: "B-",
    rankPoint: 236,
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
  });
});
