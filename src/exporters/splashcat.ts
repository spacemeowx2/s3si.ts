import { AGENT_NAME, S3SI_VERSION, USERAGENT } from "../constant.ts";
import {
  Color,
  ExportResult,
  Game,
  GameExporter,
  Nameplate,
  PlayerGear,
  VsInfo,
  VsPlayer,
  VsTeam,
} from "../types.ts";
import { base64, msgpack, Mutex } from "../../deps.ts";
import { APIError } from "../APIError.ts";
import { Env } from "../env.ts";
import {
  Gear,
  Player,
  Rank,
  SplashcatBattle,
  SplashcatRecentBattleIds,
  Team,
  TeamJudgement,
} from "./splashcat-types.ts";
import { SplashcatUpload } from "./splashcat-types.ts";

async function checkResponse(resp: Response) {
  // 200~299
  if (Math.floor(resp.status / 100) !== 2) {
    const json = await resp.json().catch(() => undefined);
    throw new APIError({
      response: resp,
      json,
      message: "Failed to fetch data from stat.ink",
    });
  }
}

class SplashcatAPI {
  splashcat = "https://splashcat.ink";
  FETCH_LOCK = new Mutex();
  cache: Record<string, unknown> = {};

  constructor(private splashcatApiKey: string, private env: Env) {}

  requestHeaders() {
    return {
      "User-Agent": USERAGENT,
      "Authorization": `Bearer ${this.splashcatApiKey}`,
      "Fly-Prefer-Region": "iad",
    };
  }

  async uuidList(): Promise<string[]> {
    const fetch = this.env.newFetcher();
    const response = await fetch.get({
      url: `${this.splashcat}/battles/api/recent/`,
      headers: this.requestHeaders(),
    });
    await checkResponse(response);

    const recentBattlesData: SplashcatRecentBattleIds = await response.json();
    const recentBattleIds = recentBattlesData.battle_ids;

    if (!Array.isArray(recentBattleIds)) {
      throw new APIError({
        response,
        json: recentBattlesData,
      });
    }

    return recentBattleIds;
  }

  async postBattle(body: SplashcatUpload) {
    const fetch = this.env.newFetcher();
    const resp = await fetch.post({
      url: `${this.splashcat}/battles/api/upload/`,
      headers: {
        ...this.requestHeaders(),
        "Content-Type": "application/x-msgpack",
      },
      body: msgpack.encode(body),
    });

    const json = await resp.json().catch(() => ({}));

    if (resp.status !== 200) {
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
      const fetch = this.env.newFetcher();
      const resp = await fetch.get({
        url,
        headers: this.requestHeaders(),
      });
      await checkResponse(resp);
      const json = await resp.json();
      this.cache[url] = json;
      return json;
    } finally {
      release();
    }
  }
}

export type NameDict = {
  gearPower: Record<string, number | undefined>;
};

/**
 * Exporter to Splashcat.
 */

export class SplashcatExporter implements GameExporter {
  name = "Splashcat";
  private api: SplashcatAPI;
  private uploadMode: string;

  constructor(
    { splashcatApiKey, uploadMode, env }: {
      splashcatApiKey: string;
      uploadMode: string;
      env: Env;
    },
  ) {
    this.api = new SplashcatAPI(splashcatApiKey, env);
    this.uploadMode = uploadMode;
  }
  async exportGame(game: Game): Promise<ExportResult> {
    if (game.type === "VsInfo") {
      const battle = await this.mapBattle(game);
      const body: SplashcatUpload = {
        battle,
        data_type: "splashcat",
        uploader_agent: {
          name: AGENT_NAME,
          version: S3SI_VERSION,
          extra: `Upload Mode: ${this.uploadMode}`,
        },
      };
      const resp = await this.api.postBattle(body);

      return {
        status: "success",
        url: resp.battle_id
          ? `https://splashcat.ink/battles/${resp.battle_id}/`
          : undefined,
      };
    } else {
      return {
        status: "skip",
        reason: "Splashcat does not support Salmon Run",
      };
    }
  }

  static getGameId(id: string) {
    const plainText = new TextDecoder().decode(base64.decodeBase64(id));

    return plainText.split(":").at(-1);
  }
  async notExported(
    { type, list }: { list: string[]; type: Game["type"] },
  ): Promise<string[]> {
    if (type !== "VsInfo") return [];
    const uuid = await this.api.uuidList();

    const out: string[] = [];

    for (const id of list) {
      const gameId = SplashcatExporter.getGameId(id)!;

      if (
        !uuid.includes(gameId)
      ) {
        out.push(id);
      }
    }

    return out;
  }
  mapPlayer = (
    player: VsPlayer,
    _index: number,
  ): Player => {
    const result: Player = {
      badges: (player.nameplate as Nameplate).badges.map((i) =>
        i
          ? Number(
            new TextDecoder().decode(base64.decodeBase64(i.id)).split("-")[1],
          )
          : null
      ),
      splashtagBackgroundId: Number(
        new TextDecoder().decode(
          base64.decodeBase64((player.nameplate as Nameplate).background.id),
        ).split("-")[1],
      ),
      clothingGear: this.mapGear(player.clothingGear),
      headGear: this.mapGear(player.headGear),
      shoesGear: this.mapGear(player.shoesGear),
      disconnected: player.result ? false : true,
      isMe: player.isMyself,
      name: player.name,
      nameId: player.nameId ?? "",
      nplnId: new TextDecoder().decode(base64.decodeBase64(player.id)).split(
        ":",
      ).at(
        -1,
      )!,
      paint: player.paint,
      species: player.species,
      weaponId: Number(
        new TextDecoder().decode(base64.decodeBase64(player.weapon.id)).split(
          "-",
        )[1],
      ),
      assists: player.result?.assist,
      deaths: player.result?.death,
      kills: player.result?.kill,
      specials: player.result?.special,
      noroshiTry: player.result?.noroshiTry ?? undefined,
      title: player.byname,
    };
    return result;
  };
  mapBattle(
    {
      detail: vsDetail,
      rankState,
    }: VsInfo,
  ): SplashcatBattle {
    const {
      myTeam,
      otherTeams,
    } = vsDetail;

    const self = myTeam.players.find((i) => i.isMyself);
    if (!self) {
      throw new Error("Self not found");
    }

    if (otherTeams.length === 0) {
      throw new Error(`Other teams is empty`);
    }

    let anarchyMode: "OPEN" | "SERIES" | undefined;
    if (vsDetail.bankaraMatch?.mode) {
      anarchyMode = vsDetail.bankaraMatch.mode === "OPEN" ? "OPEN" : "SERIES";
    }

    const rank = rankState?.rank.substring(0, 2) ?? undefined;
    const sPlusNumber = rankState?.rank.substring(2) ?? undefined;

    const result: SplashcatBattle = {
      splatnetId: SplashcatExporter.getGameId(vsDetail.id)!,
      duration: vsDetail.duration,
      judgement: vsDetail.judgement,
      playedTime: new Date(vsDetail.playedTime).toISOString()!,
      vsMode: vsDetail.vsMode.mode === "LEAGUE"
        ? "CHALLENGE"
        : vsDetail.vsMode.mode,
      vsRule: vsDetail.vsRule.rule,
      vsStageId: Number(
        new TextDecoder().decode(base64.decodeBase64(vsDetail.vsStage.id))
          .split(
            "-",
          )[1],
      ),
      anarchy: vsDetail.vsMode.mode === "BANKARA"
        ? {
          mode: anarchyMode,
          pointChange: vsDetail.bankaraMatch?.earnedUdemaePoint ?? undefined,
          power: vsDetail.bankaraMatch?.bankaraPower?.power ?? undefined,
          points: rankState?.rankPoint ?? undefined,
          rank: rank as Rank,
          sPlusNumber: sPlusNumber ? Number(sPlusNumber) : undefined,
        }
        : undefined,
      knockout: vsDetail.knockout ?? undefined,
      splatfest: vsDetail.vsMode.mode === "FEST"
        ? {
          cloutMultiplier: vsDetail.festMatch?.dragonMatchType === "NORMAL"
            ? "NONE"
            : (vsDetail.festMatch?.dragonMatchType ?? undefined),
          power: vsDetail.festMatch?.myFestPower ?? undefined,
        }
        : undefined,
      xBattle: vsDetail.vsMode.mode === "X_MATCH"
        ? {
          xPower: vsDetail.xMatch?.lastXPower ?? undefined,
        }
        : undefined,
      challenge: vsDetail.vsMode.mode === "LEAGUE"
        ? {
          id: new TextDecoder().decode(
            base64.decodeBase64(vsDetail.leagueMatch?.leagueMatchEvent?.id!),
          ).split("-")[1],
          power: vsDetail.leagueMatch?.myLeaguePower ?? undefined,
        }
        : undefined,
      teams: [],
      awards: vsDetail.awards.map((i) => i.name),
    };

    const teams: VsTeam[] = [vsDetail.myTeam, ...vsDetail.otherTeams];

    for (const team of teams) {
      const players = team.players.map(this.mapPlayer);
      const teamResult: Team = {
        players,
        color: team.color,
        isMyTeam: team.players.find((i) => i.isMyself) !== undefined,
        judgement: team.judgement as TeamJudgement,
        order: team.order,
        festStreakWinCount: team.festStreakWinCount,
        festTeamName: team.festTeamName ?? undefined,
        festUniformBonusRate: team.festUniformBonusRate,
        festUniformName: team.festUniformName,
        noroshi: team.result?.noroshi ?? undefined,
        paintRatio: team.result?.paintRatio ?? undefined,
        score: team.result?.score ?? undefined,
        tricolorRole: team.tricolorRole ?? undefined,
      };
      result.teams.push(teamResult);
    }

    return result;
  }
  mapColor(color: Color): string | undefined {
    const float2hex = (i: number) =>
      Math.round(i * 255).toString(16).padStart(2, "0");
    // rgba
    const numbers = [color.r, color.g, color.b, color.a];
    return numbers.map(float2hex).join("");
  }

  mapGear(gear: PlayerGear): Gear {
    return {
      name: gear.name,
      primaryAbility: gear.primaryGearPower.name,
      secondaryAbilities: gear.additionalGearPowers.map((i) => i.name),
    };
  }
}
