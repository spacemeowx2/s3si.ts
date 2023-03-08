import { Application, Router } from 'https://deno.land/x/oak@v12.1.0/mod.ts';
import * as path from "https://deno.land/std@0.178.0/path/mod.ts";

const PORT = 1421;
const __dirname = path.dirname(path.fromFileUrl(import.meta.url));
const app = new Application();
const router = new Router();

router.post('/locales/add/:lng/:ns', async (context) => {
  try {
    // ns is ignored
    const { lng } = context.params;
    const body: Record<string,string> = await context.request.body({ type: 'json' }).value;
    const keys = Object.keys(body);

    const translationPath = path.join(__dirname, `../src/i18n/translation/${lng}.json`);

    let translations: Record<string, string> = {};
    try {
      translations = JSON.parse(await Deno.readTextFile(translationPath));
    } catch (error) {}

    translations = Object.fromEntries(
      [...Object.entries(translations), ...keys.map(i => [i, i] as const)].sort(([a], [b]) => a.localeCompare(b)),
    );

    await Deno.writeTextFile(
      translationPath,
      JSON.stringify(translations, null, 2),
    );

    console.log('Add keys:', keys);

    context.response.status = 200;
    context.response.body = { message: 'Translation updated.' };
  } catch (error) {
    context.response.status = 500;
    context.response.body = { message: error.message };
  }
});

app.use(router.routes());
app.use(router.allowedMethods());

console.log(`Listening on port ${PORT}...`)
await app.listen({ port: PORT });
