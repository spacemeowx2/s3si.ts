// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use std::{
    sync::{Arc, Mutex},
    time::Duration,
};
use tauri::{window::WindowBuilder, WindowEvent};
use tokio::time::sleep;

const INIT_SCRIPT: &str = r#"
function onSelectUserClick(e) {
  const element = document.getElementById('authorize-switch-approval-link');
  if (!element) {
      return;
  }
  e.preventDefault();

  // very hacky way...
  window.ipc.postMessage(JSON.stringify({
    "cmd":"tauri",
    "callback":0,
    "error":0,
    "__tauriModule":"Event",
    "message":{"cmd":"emit","event":"login","payload":{"url":element.href}}
  }))
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
"#;

#[tauri::command]
async fn open_splatnet(app: tauri::AppHandle, gtoken: String, lang: Option<String>) -> Option<()> {
    let ui_lang = lang.unwrap_or_else(|| "en-US".to_string());
    let _window = WindowBuilder::new(
        &app,
        "splatnet3",
        tauri::WindowUrl::App(format!("https://api.lp1.av5ja.srv.nintendo.net/?lang={ui_lang}").into()),
    )
    .title("Splatnet3")
    .center()
    .inner_size(400.0, 700.0)
    .initialization_script(&format!(
        r##"
const gtoken = "_gtoken={gtoken}";
if (!document.cookie.includes(gtoken)) {{
    document.cookie = gtoken;
    window.location.reload();
}}
document.addEventListener("DOMContentLoaded", () => {{
    // insert css
    const style = document.createElement('style');
    style.innerHTML = `
        [class^="App_App_"] , [class^="InAppContent_children_"] , [class^="SwipableView_swipableViewItem_"] ,
        [class^="MainWrapper_wrapper_"] , [class^="FriendList_wrapper_"] {{
            overflow: auto;
        }}
    `;
    document.head.appendChild(style);
}});
    "##
    ))
    .build()
    .ok()?;

    None
}

#[tauri::command]
async fn open_login_window(app: tauri::AppHandle, url: String) -> Option<String> {
    let encoded = urlencoding::encode(&url);
    let window = WindowBuilder::new(
        &app,
        "login",
        tauri::WindowUrl::App(format!("/redirect?url={encoded}").into()),
    )
    .title("Login")
    .center()
    .inner_size(1040.0, 960.0)
    .initialization_script(INIT_SCRIPT)
    .build()
    .ok()?;
    let result: Arc<Mutex<Option<String>>> = Arc::new(Mutex::new(None));
    let r2 = result.clone();
    let r3 = result.clone();

    window.listen("login", move |e| {
        let mut result = r2.lock().unwrap();
        *result = e.payload().map(ToString::to_string);
    });
    window.on_window_event(move |e| {
        if let WindowEvent::Destroyed = e {
            let mut result = r3.lock().unwrap();
            if result.is_none() {
                *result = Some("".to_string());
            }
        }
    });

    loop {
        sleep(Duration::from_millis(100)).await;
        let result = result.lock().unwrap();
        if result.is_some() {
            window.close().ok();
            return result.clone();
        }
    }
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![open_login_window, open_splatnet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
