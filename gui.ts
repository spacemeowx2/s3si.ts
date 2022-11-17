import { Webview } from "./gui_deps.ts";
import { loginManually } from "./src/iksm.ts";

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

function loginWebview() {
  return loginManually((url) =>
    new Promise<string>((resolve) => {
      const webview = new Webview();
      webview.init(PAGE_INIT);
      webview.navigate(url);

      webview.bind("onLogin", (url: string) => {
        resolve(url);
      });

      webview.run();
      console.log("after run");
    })
  );
}

const token = await loginWebview();
console.log("TOKEN", token);
