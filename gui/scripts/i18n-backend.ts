import { Application, Router } from "https://deno.land/x/oak@v12.1.0/mod.ts";
import * as path from "https://deno.land/std@0.178.0/path/mod.ts";

const PORT = 1421;
const __dirname = path.dirname(path.fromFileUrl(import.meta.url));
const app = new Application();
const router = new Router();

const keys: Set<string> = new Set();

async function updateFile() {
  delayId = null;
  for (const lng of ["en", 'ja', "zh-CN"]) {
    const translationPath = path.join(
      __dirname,
      `../src/i18n/translation/${lng}.json`,
    );

    let translations: Record<string, string> = {};
    try {
      translations = JSON.parse(await Deno.readTextFile(translationPath));
    } catch (error) {}
    const toAdd = [...keys].filter((k) =>
      !Object.keys(translations).includes(k)
    );

    translations = Object.fromEntries(
      [
        ...Object.entries(translations),
        ...toAdd
          .map((i) => [i, i] as const),
      ]
        .sort(([a], [b]) => a.localeCompare(b)),
    );
    console.log("Add keys:", toAdd, "for", lng);

    await Deno.writeTextFile(
      translationPath,
      JSON.stringify(translations, null, 2),
    );
  }
  keys.clear();
}
let delayId: number | null = null;

router.post("/locales/add/:lng/:ns", async (context) => {
  try {
    // ns, lng is ignored
    const body: Record<string, string> = await context.request.body({
      type: "json",
    }).value;
    for (const key of Object.keys(body)) {
      keys.add(key);
    }

    if (delayId !== null) {
      clearTimeout(delayId);
    }
    delayId = setTimeout(updateFile, 1000);

    context.response.status = 200;
    context.response.body = { message: "Translation added." };
  } catch (error) {
    context.response.status = 500;
    context.response.body = { message: error.message };
  }
});

app.use(router.routes());
app.use(router.allowedMethods());

console.log(`Listening on port ${PORT}...`);
await app.listen({ port: PORT });
