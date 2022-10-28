import { RankState } from "./state.ts";
import { GameFetcher } from "./GameFetcher.ts";

type RankParam = {
  rank: string;
  pointRange: [number, number];
  entrance: number;
  openWin: number;
  openLose: number;
  rankUp?: boolean;
};

const splusParams = () => {
  const out: RankParam[] = [];

  for (let i = 0; i < 50; i++) {
    const level = i % 10;
    const item: RankParam = {
      rank: `S+${i}`,
      pointRange: [300 + level * 350, 300 + (level + 1) * 350],
      entrance: 160,
      openWin: 8,
      openLose: 5,
    };
    if (level === 9) {
      item.rankUp = true;
    }
    out.push(item);
  }

  out.push({
    rank: "S+50",
    pointRange: [0, 9999],
    entrance: 160,
    openWin: 8,
    openLose: 5,
  });

  return out;
};

export const RANK_PARAMS: RankParam[] = [{
  rank: "C-",
  pointRange: [0, 200],
  entrance: 0,
  openWin: 8,
  openLose: 1,
}, {
  rank: "C",
  pointRange: [200, 400],
  entrance: 20,
  openWin: 8,
  openLose: 1,
}, {
  rank: "C+",
  pointRange: [400, 600],
  entrance: 40,
  openWin: 8,
  openLose: 1,
  rankUp: true,
}, {
  rank: "B-",
  pointRange: [100, 350],
  entrance: 55,
  openWin: 8,
  openLose: 2,
}, {
  rank: "B",
  pointRange: [350, 600],
  entrance: 70,
  openWin: 8,
  openLose: 2,
}, {
  rank: "B+",
  pointRange: [600, 850],
  entrance: 85,
  openWin: 8,
  openLose: 2,
  rankUp: true,
}, {
  rank: "A-",
  pointRange: [200, 500],
  entrance: 100,
  openWin: 8,
  openLose: 3,
}, {
  rank: "A",
  pointRange: [500, 800],
  entrance: 110,
  openWin: 8,
  openLose: 3,
}, {
  rank: "A+",
  pointRange: [800, 1100],
  entrance: 120,
  openWin: 8,
  openLose: 3,
  rankUp: true,
}, {
  rank: "S",
  pointRange: [300, 1000],
  entrance: 150,
  openWin: 8,
  openLose: 4,
  rankUp: true,
}, ...splusParams()];

/**
 * if state is empty, it will not track rank.
 */
export class RankTracker {
  constructor(private state?: RankState) {}
}
