import {
  AGENT_NAME,
  S3SI_NAMESPACE,
  S3SI_VERSION,
  SPLATNET3_STATINK_MAP,
  USERAGENT,
} from "../constant.ts";
import {
  BattleExporter,
  StatInkPlayer,
  StatInkPostBody,
  StatInkStage,
  VsHistoryDetail,
  VsPlayer,
} from "../types.ts";
import { base64, msgpack, uuid } from "../deps.ts";
import { APIError } from "../APIError.ts";
import { cache } from "../utils.ts";

const S3S_NAMESPACE = "b3a2dbf5-2c09-4792-b78c-00b548b70aeb";

/**
 * generate s3s uuid
 *
 * @param id ID from SplatNet3
 * @returns id generated from s3s
 */
function s3sUuid(id: string): Promise<string> {
  const fullId = base64.decode(id);
  const tsUuid = fullId.slice(fullId.length - 52, fullId.length);
  return uuid.v5.generate(S3S_NAMESPACE, tsUuid);
}

function battleId(id: string): Promise<string> {
  return uuid.v5.generate(S3SI_NAMESPACE, new TextEncoder().encode(id));
}

/**
 * Decode ID and get number after '-'
 */
function b64Number(id: string): number {
  const text = new TextDecoder().decode(base64.decode(id));
  const [_, num] = text.split("-");
  return parseInt(num);
}

async function _getStage(): Promise<StatInkStage> {
  const resp = await fetch("https://stat.ink/api/v3/stage");
  const json = await resp.json();
  return json;
}
const getStage = cache(_getStage);

/**
 * Exporter to stat.ink.
 *
 * This is the default exporter. It will upload each battle detail to stat.ink.
 */
export class StatInkExporter implements BattleExporter<VsHistoryDetail> {
  name = "stat.ink";
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
  async exportBattle(detail: VsHistoryDetail) {
    const body = await this.mapBattle(detail);

    const resp = await fetch("https://stat.ink/api/v3/battle", {
      method: "POST",
      headers: {
        ...this.requestHeaders(),
        "Content-Type": "application/x-msgpack",
      },
      body: msgpack.encode(body),
    });

    const json: {
      error?: unknown;
    } = await resp.json().catch(() => ({}));

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

    throw new Error("abort");
  }
  async notExported(list: string[]): Promise<string[]> {
    const uuid = await (await fetch("https://stat.ink/api/v3/s3s/uuid-list", {
      headers: this.requestHeaders(),
    })).json();

    const out: string[] = [];

    for (const id of list) {
      const s3sId = await s3sUuid(id);
      const s3siId = await battleId(id);

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
      const modeId = b64Number(vsDetail.id);
      if (modeId === 6) {
        return "splatfest_open";
      } else if (modeId === 7) {
        return "splatfest_challenge";
      }
    }

    throw new TypeError(`Unknown vsMode ${vsMode}`);
  }
  async mapStage({ vsStage }: VsHistoryDetail): Promise<string> {
    const id = b64Number(vsStage.id).toString();
    const stage = await getStage();

    const result = stage.find((s) => s.aliases.includes(id));

    if (!result) {
      throw new Error("Unknown stage: " + vsStage.name);
    }

    return result.key;
  }
  mapPlayer(player: VsPlayer, index: number): StatInkPlayer {
    const result: StatInkPlayer = {
      me: player.isMyself ? "yes" : "no",
      rank_in_team: index + 1,
      name: player.name,
      number: player.nameId ?? undefined,
      splashtag_title: player.byname,
      weapon: b64Number(player.weapon.id).toString(),
      inked: player.paint,
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
  }
  async mapBattle(vsDetail: VsHistoryDetail): Promise<StatInkPostBody> {
    const {
      knockout,
      vsMode: { mode },
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
      uuid: await battleId(vsDetail.id),
      lobby: this.mapLobby(vsDetail),
      rule: SPLATNET3_STATINK_MAP.RULE[vsDetail.vsRule.rule],
      stage: await this.mapStage(vsDetail),
      result: SPLATNET3_STATINK_MAP.RESULT[vsDetail.judgement],

      weapon: b64Number(self.weapon.id).toString(),
      inked: self.paint,
      rank_in_team: vsDetail.myTeam.players.indexOf(self) + 1,

      medals: vsDetail.awards.map((i) => i.name),

      our_team_players: myTeam.players.map(this.mapPlayer),
      their_team_players: otherTeams.flatMap((i) => i.players).map(
        this.mapPlayer,
      ),

      agent: AGENT_NAME,
      agent_version: S3SI_VERSION,
      agent_variables: undefined,
      automated: "yes",
      start_at: startedAt,
      end_at: startedAt + vsDetail.duration,
    };

    if (self.result) {
      if (!bankaraMatch) {
        throw new TypeError("bankaraMatch is null");
      }
      result.kill_or_assist = self.result.kill;
      result.assist = self.result.assist;
      result.kill = result.kill_or_assist - result.assist;
      result.death = self.result.death;
      result.special = self.result.special;
    }

    if (mode === "FEST") {
      if (!festMatch) {
        throw new TypeError("festMatch is null");
      }
      result.fest_dragon =
        SPLATNET3_STATINK_MAP.DRAGON[festMatch.dragonMatchType];
      result.clout_change = festMatch.contribution;
      result.fest_power = festMatch.myFestPower ?? undefined;
    }
    if (mode === "FEST" || mode === "REGULAR") {
      result.our_team_percent = (myTeam.result.paintRatio ?? 0) * 100;
      result.their_team_percent = (otherTeams?.[0].result.paintRatio ?? 0) *
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
    if (mode === "BANKARA") {
      if (!bankaraMatch) {
        throw new TypeError("bankaraMatch is null");
      }
      result.our_team_count = myTeam.result.score ?? undefined;
      result.their_team_count = otherTeams?.[0].result.score ?? undefined;

      result.knockout = (!knockout || knockout === "NEITHER") ? "no" : "yes";
      result.rank_exp_change = bankaraMatch.earnedUdemaePoint;
    }

    return result;
  }
}
