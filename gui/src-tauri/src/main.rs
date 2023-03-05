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

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
async fn open_login_window(app: tauri::AppHandle, url: String) -> Option<String> {
    let window = WindowBuilder::new(&app, "login", tauri::WindowUrl::App("/".into()))
        .title("Login")
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
    window
        .eval(&format!("window.location.href = '{}'", url))
        .ok()?;

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
        .invoke_handler(tauri::generate_handler![open_login_window])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
