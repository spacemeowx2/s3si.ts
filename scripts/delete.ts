import { USERAGENT } from "../src/constant.ts";
import { readline } from "../src/utils.ts";

const [key, ...params] = Deno.args;
if (!key || params.length === 0) {
  console.log("Usage: delete.ts <key> <uuid> <uuid...>");
  console.log("   or: delete-coop.ts <key> @<stat.ink's id> <count>");
  console.log(
    "       You can find your id at here: https://stat.ink/@YOUR_ID_HERE",
  );
  Deno.exit(1);
}

let deleted = 0;
if (params.length === 2 && params[0].startsWith("@")) {
  const [uid, countStr] = params;
  const count = parseInt(countStr);
  console.warn(`This script will delete your first ${count} battles.`);
  console.warn("Are you sure? (y/N)");
  const answer = await readline({
    skipEmpty: false,
  });
  if (answer !== "y") {
    Deno.exit(0);
  }

  while (true) {
    const res = await (await fetch(`https://stat.ink/${uid}/spl3`)).text();
    const re = /href="\/@\w+\/spl3\/([0-9a-fA-F-]{36})/g;
    const matches = [...res.matchAll(re)].map((m) => m[1]);
    const toDelete = matches.slice(0, count - deleted);

    if (toDelete.length === 0) {
      break;
    }

    await deleteUuids(toDelete);
    deleted += toDelete.length;
  }
} else {
  await deleteUuids(params);
  deleted += params.length;
}

console.log(`Deleted ${deleted} battles.`);

async function deleteUuids(uuids: string[]) {
  for (const uuid of uuids) {
    console.log("Deleting", uuid);
    const resp = await fetch(`https://stat.ink/api/v3/battle/${uuid}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${key}`,
        "User-Agent": USERAGENT,
      },
    });

    console.log(resp.status);
  }
}
