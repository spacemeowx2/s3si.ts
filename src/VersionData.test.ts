import { getSeason, SEASONS } from "./VersionData.ts";
import { assertEquals } from "../dev_deps.ts";

Deno.test("Seasons are continuous", () => {
  let curDate: Date | undefined;
  for (const season of SEASONS) {
    if (!curDate) {
      curDate = season.end;
    } else {
      assertEquals(curDate, season.start);
      curDate = season.end;
    }
  }
});

Deno.test("getSeason", () => {
  const season1 = getSeason(new Date("2022-09-09T00:00:00+00:00"));

  assertEquals(season1?.id, "season202209");

  const season2 = getSeason(new Date("2022-12-09T00:00:00+00:00"));

  assertEquals(season2?.id, "season202212");

  const season3 = getSeason(new Date("2023-03-01T00:00:00+00:00"));

  assertEquals(season3?.id, "season202303");

  const nonExist = getSeason(new Date("2022-06-09T00:00:00+00:00"));

  assertEquals(nonExist, undefined);
});
