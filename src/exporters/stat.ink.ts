import {
  AGENT_NAME,
  S3SI_VERSION,
  SPLATNET3_STATINK_MAP,
  USERAGENT,
} from "../constant.ts";
import {
  CoopInfo,
  GameExporter,
  PlayerGear,
  StatInkAbility,
  StatInkCoopPostBody,
  StatInkGear,
  StatInkGears,
  StatInkPlayer,
  StatInkPostBody,
  StatInkPostResponse,
  StatInkStage,
  StatInkWeapon,
  VsHistoryDetail,
  VsInfo,
  VsPlayer,
} from "../types.ts";
import { base64, msgpack, Mutex } from "../../deps.ts";
import { APIError } from "../APIError.ts";
import { cache, gameId, s3siGameId } from "../utils.ts";

const UA = {
  "User-Agent": USERAGENT,
};

/**
 * Decode ID and get number after '-'
 */
function b64Number(id: string): number {
  const text = new TextDecoder().decode(base64.decode(id));
  const [_, num] = text.split("-");
  return parseInt(num);
}

class StatInkAPI {
  FETCH_LOCK = new Mutex();
  cache: Record<string, unknown> = {};

  constructor(private statInkApiKey: string) {
    if (statInkApiKey.length !== 43) {
      throw new Error("Invalid stat.ink API key");
    }
  }
  requestHeaders() {
    return {
      "User-Agent": USERAGENT,
      "Authorization": `Bearer ${this.statInkApiKey}`,
    };
  }

  async uuidList(): Promise<string[]> {
    return await (await fetch("https://stat.ink/api/v3/s3s/uuid-list", {
      headers: this.requestHeaders(),
    })).json();
  }

  async postBattle(body: StatInkPostBody) {
    const resp = await fetch("https://stat.ink/api/v3/battle", {
      method: "POST",
      headers: {
        ...this.requestHeaders(),
        "Content-Type": "application/x-msgpack",
      },
      body: msgpack.encode(body),
    });

    const json: StatInkPostResponse = await resp.json().catch(() => ({}));

    if (resp.status !== 200 && resp.status !== 201) {
      throw new APIError({
        response: resp,
        message: "Failed to export battle",
        json,
      });
    }

    if (json.error) {
      throw new APIError({
        response: resp,
        message: "Failed to export battle",
        json,
      });
    }

    return json;
  }

  async postCoop(body: StatInkCoopPostBody) {
    const resp = await fetch("https://stat.ink/api/v3/battle", {
      method: "POST",
      headers: {
        ...this.requestHeaders(),
        "Content-Type": "application/x-msgpack",
      },
      body: msgpack.encode(body),
    });

    const json: StatInkPostResponse = await resp.json().catch(() => ({}));

    if (resp.status !== 200 && resp.status !== 201) {
      throw new APIError({
        response: resp,
        message: "Failed to export battle",
        json,
      });
    }

    if (json.error) {
      throw new APIError({
        response: resp,
        message: "Failed to export battle",
        json,
      });
    }

    return json;
  }

  async _getCached<T>(url: string): Promise<T> {
    const release = await this.FETCH_LOCK.acquire();
    try {
      if (this.cache[url]) {
        return this.cache[url] as T;
      }
      const resp = await fetch(url, {
        headers: this.requestHeaders(),
      });
      const json = await resp.json();
      this.cache[url] = json;
      return json;
    } finally {
      release();
    }
  }

  getWeapon = () =>
    this._getCached<StatInkWeapon>("https://stat.ink/api/v3/weapon?full=1");
  getAbility = () =>
    this._getCached<StatInkAbility>("https://stat.ink/api/v3/ability?full=1");
  getStage = () =>
    this._getCached<StatInkStage>("https://stat.ink/api/v3/stage");
}

export type NameDict = {
  gearPower: Record<string, number | undefined>;
};

/**
 * Exporter to stat.ink.
 *
 * This is the default exporter. It will upload each battle detail to stat.ink.
 */
export class StatInkExporter implements GameExporter {
  name = "stat.ink";
  private api: StatInkAPI;
  private uploadMode: string;

  constructor(
    { statInkApiKey, uploadMode }: {
      statInkApiKey: string;
      uploadMode: string;
    },
  ) {
    this.api = new StatInkAPI(statInkApiKey);
    this.uploadMode = uploadMode;
  }
  isTriColor({ vsMode }: VsHistoryDetail): boolean {
    return vsMode.mode === "FEST" && b64Number(vsMode.id) === 8;
  }
  async exportGame(game: VsInfo | CoopInfo) {
    if (game.type === "VsInfo" && this.isTriColor(game.detail)) {
      // TODO: support coop and tri-color fest
      return {};
    }

    if (game.type === "VsInfo") {
      const body = await this.mapBattle(game);
      const { url } = await this.api.postBattle(body);

      return {
        url,
      };
    } else {
      const body = await this.mapCoop(game);
      const { url } = await this.api.postCoop(body);

      return {
        url,
      };
    }
  }
  async notExported({ list }: { list: string[] }): Promise<string[]> {
    const uuid = await this.api.uuidList();

    const out: string[] = [];

    for (const id of list) {
      const s3sId = await gameId(id);
      const s3siId = await s3siGameId(id);

      if (!uuid.includes(s3sId) && !uuid.includes(s3siId)) {
        out.push(id);
      }
    }

    return out;
  }
  mapLobby(vsDetail: VsHistoryDetail): StatInkPostBody["lobby"] {
    const { mode: vsMode } = vsDetail.vsMode;
    if (vsMode === "REGULAR") {
      return "regular";
    } else if (vsMode === "BANKARA") {
      const { mode } = vsDetail.bankaraMatch ?? { mode: "UNKNOWN" };
      const map = {
        OPEN: "bankara_open",
        CHALLENGE: "bankara_challenge",
        UNKNOWN: "",
      } as const;
      const result = map[mode];
      if (result) {
        return result;
      }
    } else if (vsMode === "PRIVATE") {
      return "private";
    } else if (vsMode === "FEST") {
      const modeId = b64Number(vsDetail.vsMode.id);
      if (modeId === 6) {
        return "splatfest_open";
      } else if (modeId === 7) {
        return "splatfest_challenge";
      } else if (modeId === 8) {
        throw new Error("Tri-color battle is not supported");
      }
    }

    throw new TypeError(`Unknown vsMode ${vsMode}`);
  }
  async mapStage({ vsStage }: VsHistoryDetail): Promise<string> {
    const id = b64Number(vsStage.id).toString();
    const stage = await this.api.getStage();

    const result = stage.find((s) => s.aliases.includes(id));

    if (!result) {
      throw new Error("Unknown stage: " + vsStage.name);
    }

    return result.key;
  }
  async mapGears(
    { headGear, clothingGear, shoesGear }: VsPlayer,
  ): Promise<StatInkGears> {
    const amap = (await this.api.getAbility()).map((i) => ({
      ...i,
      names: Object.values(i.name),
    }));
    const mapAbility = ({ name }: { name: string }): string | null => {
      const result = amap.find((a) => a.names.includes(name));
      if (!result) {
        return null;
      }
      return result.key;
    };
    const mapGear = (
      { primaryGearPower, additionalGearPowers }: PlayerGear,
    ): StatInkGear => {
      const primary = mapAbility(primaryGearPower);
      if (!primary) {
        throw new Error("Unknown ability: " + primaryGearPower.name);
      }
      return {
        primary_ability: primary,
        secondary_abilities: additionalGearPowers.map(mapAbility),
      };
    };
    return {
      headgear: mapGear(headGear),
      clothing: mapGear(clothingGear),
      shoes: mapGear(shoesGear),
    };
  }
  mapPlayer = async (
    player: VsPlayer,
    index: number,
  ): Promise<StatInkPlayer> => {
    const result: StatInkPlayer = {
      me: player.isMyself ? "yes" : "no",
      rank_in_team: index + 1,
      name: player.name,
      number: player.nameId ?? undefined,
      splashtag_title: player.byname,
      weapon: b64Number(player.weapon.id).toString(),
      inked: player.paint,
      gears: await this.mapGears(player),
      disconnected: player.result ? "no" : "yes",
    };
    if (player.result) {
      result.kill_or_assist = player.result.kill;
      result.assist = player.result.assist;
      result.kill = result.kill_or_assist - result.assist;
      result.death = player.result.death;
      result.special = player.result.special;
    }
    return result;
  };
  async mapBattle(
    {
      challengeProgress,
      bankaraMatchChallenge,
      listNode,
      detail: vsDetail,
      rankBeforeState,
      rankState,
    }: VsInfo,
  ): Promise<StatInkPostBody> {
    const {
      knockout,
      vsRule: { rule },
      myTeam,
      otherTeams,
      bankaraMatch,
      festMatch,
      playedTime,
    } = vsDetail;

    const self = vsDetail.myTeam.players.find((i) => i.isMyself);
    if (!self) {
      throw new Error("Self not found");
    }
    const startedAt = Math.floor(new Date(playedTime).getTime() / 1000);

    const result: StatInkPostBody = {
      uuid: await gameId(vsDetail.id),
      lobby: this.mapLobby(vsDetail),
      rule: SPLATNET3_STATINK_MAP.RULE[vsDetail.vsRule.rule],
      stage: await this.mapStage(vsDetail),
      result: SPLATNET3_STATINK_MAP.RESULT[vsDetail.judgement],

      weapon: b64Number(self.weapon.id).toString(),
      inked: self.paint,
      rank_in_team: vsDetail.myTeam.players.indexOf(self) + 1,

      medals: vsDetail.awards.map((i) => i.name),

      our_team_players: await Promise.all(myTeam.players.map(this.mapPlayer)),
      their_team_players: await Promise.all(
        otherTeams.flatMap((i) => i.players).map(
          this.mapPlayer,
        ),
      ),

      agent: AGENT_NAME,
      agent_version: S3SI_VERSION,
      agent_variables: {
        "Upload Mode": this.uploadMode,
      },
      automated: "yes",
      start_at: startedAt,
      end_at: startedAt + vsDetail.duration,
    };

    if (self.result) {
      result.kill_or_assist = self.result.kill;
      result.assist = self.result.assist;
      result.kill = result.kill_or_assist - result.assist;
      result.death = self.result.death;
      result.special = self.result.special;
    }

    if (festMatch) {
      result.fest_dragon =
        SPLATNET3_STATINK_MAP.DRAGON[festMatch.dragonMatchType];
      result.clout_change = festMatch.contribution;
      result.fest_power = festMatch.myFestPower ?? undefined;
    }
    if (rule === "TURF_WAR") {
      result.our_team_percent = (myTeam?.result?.paintRatio ?? 0) * 100;
      result.their_team_percent = (otherTeams?.[0]?.result?.paintRatio ?? 0) *
        100;
      result.our_team_inked = myTeam.players.reduce(
        (acc, i) => acc + i.paint,
        0,
      );
      result.their_team_inked = otherTeams?.[0].players.reduce(
        (acc, i) => acc + i.paint,
        0,
      );
    }
    if (knockout) {
      result.knockout = knockout === "NEITHER" ? "no" : "yes";
    }
    result.our_team_count = myTeam?.result?.score ?? undefined;
    result.their_team_count = otherTeams?.[0]?.result?.score ?? undefined;
    result.rank_exp_change = bankaraMatch?.earnedUdemaePoint ?? undefined;
    if (listNode) {
      [result.rank_before, result.rank_before_s_plus] = parseUdemae(
        listNode.udemae,
      );
    }
    if (bankaraMatchChallenge && challengeProgress) {
      result.rank_up_battle = bankaraMatchChallenge.isPromo ? "yes" : "no";

      if (challengeProgress.index === 0 && bankaraMatchChallenge.udemaeAfter) {
        [result.rank_after, result.rank_after_s_plus] = parseUdemae(
          bankaraMatchChallenge.udemaeAfter,
        );
        result.rank_exp_change = bankaraMatchChallenge.earnedUdemaePoint ??
          undefined;
      } else {
        result.rank_after = result.rank_before;
        result.rank_after_s_plus = result.rank_before_s_plus;
      }

      result.challenge_win = challengeProgress.winCount;
      result.challenge_lose = challengeProgress.loseCount;
    }

    if (rankBeforeState && rankState) {
      result.rank_before_exp = rankBeforeState.rankPoint;
      result.rank_after_exp = rankState.rankPoint;

      // splatnet returns null, so we need to calculate it.
      // don't calculate if it's a promotion battle.
      if (
        !bankaraMatchChallenge?.isUdemaeUp &&
        result.rank_exp_change === undefined
      ) {
        result.rank_exp_change = result.rank_after_exp - result.rank_before_exp;
      }

      if (!result.rank_after) {
        [result.rank_after, result.rank_after_s_plus] = parseUdemae(
          rankState.rank,
        );
      }
    }

    return result;
  }
  async mapCoopWeapon({ name }: { name: string }): Promise<string> {
    await this.api.getWeapon();
    return "";
  }
  async mapCoop(
    {
      detail,
    }: CoopInfo,
  ): Promise<StatInkCoopPostBody> {
    const {
      dangerRate,
      resultWave,
      bossResult,
      myResult,
      memberResults,
      scale,
      playedTime,
    } = detail;

    const startedAt = Math.floor(new Date(playedTime).getTime() / 1000);
    const golden_eggs = myResult.goldenDeliverCount +
      memberResults.reduce((acc, i) => acc + i.goldenDeliverCount, 0);
    const power_eggs = myResult.deliverCount +
      memberResults.reduce((p, i) => p + i.deliverCount, 0);

    const result: StatInkCoopPostBody = {
      test: "yes",
      uuid: await gameId(detail.id),
      big_run: "no",
      stage: "",
      weapon: await this.mapCoopWeapon(myResult.weapons[0]),
      danger_rate: dangerRate * 100,
      clear_waves: resultWave,
      king_salmonid: "",
      clear_extra: bossResult?.hasDefeatBoss ? "yes" : "no",
      // title_after: detail.afterGrade,
      title_exp_after: detail.afterGradePoint,
      golden_eggs,
      power_eggs,
      gold_scale: scale.gold,
      silver_scale: scale.silver,
      bronze_scale: scale.bronze,
      job_point: detail.jobPoint,
      job_score: detail.jobScore,
      job_rate: detail.jobRate,
      job_bonus: detail.jobBonus,
      waves: [],
      players: [],
      bosses: {},
      agent: AGENT_NAME,
      agent_version: S3SI_VERSION,
      agent_variables: {
        "Upload Mode": this.uploadMode,
      },
      automated: "yes",
      start_at: startedAt,
    };
    throw new Error("WIP");
  }
}

function parseUdemae(udemae: string): [string, number | undefined] {
  const [rank, rankNum] = udemae.split(/([0-9]+)/);
  return [
    rank.toLowerCase(),
    rankNum === undefined ? undefined : parseInt(rankNum),
  ];
}
