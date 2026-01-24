import { getSeason } from "./VersionData.ts";
import { assertEquals, fail } from "../dev_deps.ts";

Deno.test("Seasons are continuous", () => {
  let season = getSeason(new Date("2022-09-09T00:00:00+00:00"));
  let curDate: Date | undefined;
  for (let i = 0; i < 16; i++) {
    if (!season) {
      fail("Next season is missing");
    }

    if (!curDate) {
      curDate = season.end;
    } else {
      assertEquals(curDate, season.start);
      curDate = season.end;
    }

    season = getSeason(curDate);
  }
});

Deno.test("getSeason", () => {
  const season1 = getSeason(new Date("2022-09-09T00:00:00+00:00"));

  assertEquals(season1?.id, "season202209");
  assertEquals(season1?.name, "Drizzle Season 2022");
  assertEquals(season1?.start, new Date("2022-09-01T00:00:00+00:00"));
  assertEquals(season1?.end, new Date("2022-12-01T00:00:00+00:00"));

  const season2 = getSeason(new Date("2022-12-09T00:00:00+00:00"));

  assertEquals(season2?.id, "season202212");
  assertEquals(season2?.name, "Chill Season 2022");
  assertEquals(season2?.start, new Date("2022-12-01T00:00:00+00:00"));
  assertEquals(season2?.end, new Date("2023-03-01T00:00:00+00:00"));

  const season3 = getSeason(new Date("2023-03-01T00:00:00+00:00"));

  assertEquals(season3?.id, "season202303");
  assertEquals(season3?.name, "Fresh Season 2023");
  assertEquals(season3?.start, new Date("2023-03-01T00:00:00+00:00"));
  assertEquals(season3?.end, new Date("2023-06-01T00:00:00+00:00"));

  const season4 = getSeason(new Date("2023-06-01T00:00:00+00:00"));

  assertEquals(season4?.id, "season202306");
  assertEquals(season4?.name, "Sizzle Season 2023");
  assertEquals(season4?.start, new Date("2023-06-01T00:00:00+00:00"));
  assertEquals(season4?.end, new Date("2023-09-01T00:00:00+00:00"));

  const nonExist = getSeason(new Date("2022-06-09T00:00:00+00:00"));

  assertEquals(nonExist, undefined);
});
