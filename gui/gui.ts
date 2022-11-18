import { Webview } from "./deps.ts";

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
    ...(isDeno ? ["run", "-A", Deno.mainModule] : []),
    "--worker",
  ];
}

function main() {
  const worker = Deno.run({
    cmd: workerCmd(),
    stdin: "piped",
    stdout: "piped",
  });

  const webview = new Webview();
  webview.init(PAGE_INIT);
  webview.navigate("");

  webview.bind("onLogin", (url: string) => {
    console.log(url);
  });

  webview.run();
}

function worker() {
  // check if parent is still alive
  Deno.ppid;
}

if (!Deno.args.includes("--worker")) {
  main();
} else {
  worker();
}
