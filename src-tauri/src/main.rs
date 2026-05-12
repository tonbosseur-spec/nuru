#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

use tauri::api::process::{Command, CommandEvent};
use tauri::Manager;

fn main() {
  tauri::Builder::default()
    .setup(|app| {
      // Démarrage du backend Python en tant que Sidecar
      let (mut rx, _child) = Command::new_sidecar("nuru-backend")
        .expect("failed to setup sidecar")
        .spawn()
        .expect("failed to spawn sidecar");

      // On peut écouter les logs du backend si besoin
      tauri::async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
          if let CommandEvent::Stdout(line) = event {
            println!("Backend: {}", line);
          }
        }
      });

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
