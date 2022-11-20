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
  const { url } = await channel.recvType("loaded");

  const webview = new Webview();
  webview.init(PAGE_INIT);
  webview.navigate(url);

  webview.bind("onLogin", (url: string) => {
    console.log(url);
  });

  webview.run();
  worker.terminate();
}

main();
