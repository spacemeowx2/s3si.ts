import { serve, Webview } from "./deps.ts";
import { IPC } from "./ipc.ts";

type Command = {
  type: "loaded";
  url: string;
} | {
  type: "test";
};

const PAGE_INIT = `
function onSelectUserClick(e) {
    const element = document.getElementById('authorize-switch-approval-link');
    if (!element) {
        return;
    }
    e.preventDefault();
    if (onLogin) {
        onLogin(element.href);
    }
}
function detectAndInject() {
    const element = document.getElementById('authorize-switch-approval-link');
    if (!element) {
        window.setTimeout(detectAndInject, 100);
        return;
    }
    element.addEventListener('click', onSelectUserClick);
}
detectAndInject();
`;

function workerCmd() {
  const exec = Deno.execPath();
  const isDeno = exec.endsWith("deno") || exec.endsWith("deno.exe");

  return [
    exec,
    ...(isDeno ? ["run", "--unstable", "-A", Deno.mainModule] : []),
    "--worker",
  ];
}

async function main() {
  const worker = Deno.run({
    cmd: workerCmd(),
    stdin: "piped",
    stdout: "piped",
  });
  const ipc = new IPC<Command>({ reader: worker.stdout, writer: worker.stdin });
  console.log("Waiting worker...");
  const { url } = await ipc.recvType("loaded");

  const webview = new Webview();
  webview.init(PAGE_INIT);
  webview.navigate(url);

  webview.bind("onLogin", (url: string) => {
    console.log(url);
  });

  webview.run();
}

async function worker() {
  const ipc = new IPC<Command>({ reader: Deno.stdin, writer: Deno.stdout });

  const port = 18234;
  const handler = (request: Request): Response => {
    const body = `Your user-agent is:\n\n${
      request.headers.get("user-agent") ?? "Unknown"
    }`;

    return new Response(body, { status: 200 });
  };

  await serve(handler, {
    port,
    onListen: () =>
      ipc.send({ type: "loaded", url: `http://127.0.0.1:${port}` }),
  });
}

if (!Deno.args.includes("--worker")) {
  main();
} else {
  worker();
}
