import { Webview } from "./deps.ts";
import { Command, WorkerChannel } from "./ipc.ts";

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

async function main() {
  const worker = new Worker(new URL("worker.ts", import.meta.url), {
    type: "module",
  });
  const channel = new WorkerChannel<Command>(worker);
  await channel.recvType("workerLoaded");
  channel.send({ type: "startWorker", isDev: true });
  const { url } = await channel.recvType("serverReady");

  const webview = new Webview();
  webview.init(PAGE_INIT);
  webview.navigate(url);

  webview.bind("onLogin", (url: string) => {
    console.log(url);
  });

  webview.run();
  // on macOS, the webview close will terminate the process, so the code below
  // will never be executed.

  worker.terminate();
}

main();
