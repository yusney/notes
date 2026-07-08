use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc,
};
use tauri::{Emitter, Manager, RunEvent, WindowEvent};
use tauri_plugin_stronghold::stronghold::Stronghold;

mod vault;

// 32-byte key required by iota_stronghold's KeyProvider (NCKey::load).
// Embedded in the binary — acceptable for v1.0 single-user desktop/mobile.
// Machine-specific keying is a v1.1 hardening task.
const VAULT_PASSWORD: [u8; 32] = [0xA5; 32];

/// Lazily creates and manages the `Stronghold` vault on first access.
///
/// We deliberately do NOT register `tauri_plugin_stronghold` as a Tauri
/// plugin (its `register()` manages `StrongholdCollection` + password-hash
/// fn, not a single `Stronghold` instance). Instead, we instantiate
/// `Stronghold` directly and manage it via `app.manage()` on first use.
/// This avoids a setup-vs-frontend race: the webview can start loading
/// before `setup()` finishes, and `app.state::<Stronghold>()` would panic
/// if the state isn't ready yet.
fn get_stronghold(app: &tauri::AppHandle) -> Result<&Stronghold, String> {
    if let Some(state) = app.try_state::<Stronghold>() {
        return Ok(state.inner());
    }
    let snapshot_path = app
        .path()
        .app_local_data_dir()
        .map_err(|e| format!("resolve app_local_data_dir: {e}"))?
        .join("stronghold.hold");
    if let Some(parent) = snapshot_path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| format!("create vault dir: {e}"))?;
    }
    let sh = Stronghold::new(&snapshot_path, VAULT_PASSWORD.to_vec())
        .map_err(|e| format!("init stronghold: {e}"))?;
    app.manage(sh);
    Ok(app
        .try_state::<Stronghold>()
        .ok_or_else(|| "failed to manage Stronghold".to_string())?
        .inner())
}

/// Saves the refresh token in the encrypted Stronghold vault.
#[tauri::command]
fn save_token(app: tauri::AppHandle, token: String) -> Result<(), String> {
    let sh = get_stronghold(&app)?;
    vault::vault_save(sh, vault::VAULT_KEY_REFRESH_TOKEN, &token)
}

/// Loads the refresh token from the encrypted Stronghold vault.
/// Returns `None` if no token has been persisted yet.
#[tauri::command]
fn load_token(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let sh = get_stronghold(&app)?;
    vault::vault_load(sh, vault::VAULT_KEY_REFRESH_TOKEN)
        .map(|opt| opt.and_then(|b| String::from_utf8(b).ok()))
}

/// Deletes the refresh token from the encrypted Stronghold vault.
/// Idempotent — never errors on a missing entry.
#[tauri::command]
fn delete_token(app: tauri::AppHandle) -> Result<(), String> {
    let sh = get_stronghold(&app)?;
    vault::vault_delete(sh, vault::VAULT_KEY_REFRESH_TOKEN)
}

/// Called by the frontend when the user chooses "Minimize to tray".
/// Hides the window so the process keeps running in the system tray.
#[tauri::command]
fn hide_to_tray(app: tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        window.hide().unwrap_or(());
    }
}

/// Called by the frontend when the user explicitly chooses "Close completely".
/// Sets the exit flag so ExitRequested doesn't prevent the shutdown.
#[tauri::command]
fn exit_app(app: tauri::AppHandle, should_exit: tauri::State<Arc<AtomicBool>>) {
    should_exit.store(true, Ordering::SeqCst);
    app.exit(0);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let should_exit = Arc::new(AtomicBool::new(false));
    let should_exit_for_run = should_exit.clone();
    let builder = tauri::Builder::default();

    // Must be registered before other plugins so Linux/Windows can forward
    // deep links from a second spawned process to the already-running app.
    #[cfg(desktop)]
    let builder = builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            // Bring the window to front when a second instance is launched.
            if let Some(window) = app.get_webview_window("main") {
                window.show().ok();
                window.set_focus().ok();
            }
        }));

    builder
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_deep_link::init())
        .manage(should_exit)
        .invoke_handler(tauri::generate_handler![
            save_token,
            load_token,
            delete_token,
            hide_to_tray,
            exit_app
        ])
        .setup(move |app| {
            // Stronghold vault is lazily initialised by `get_stronghold()` on
            // first command invocation — no eager registration needed here.

            // Register deep-link schemes so `notes://...` opens this executable.
            // macOS handles this via Info.plist (no manual registration needed).
            #[cfg(any(target_os = "linux", target_os = "windows"))]
            {
                use tauri_plugin_deep_link::DeepLinkExt;
                app.deep_link().register_all()?;
            }

            #[cfg(desktop)]
            {
                use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};

                let quit_i = MenuItem::with_id(app, "quit", "Salir", true, None::<&str>)?;
                let show_i = MenuItem::with_id(app, "show", "Mostrar", true, None::<&str>)?;
                let separator = PredefinedMenuItem::separator(app)?;

                let menu = Menu::with_items(app, &[&show_i, &separator, &quit_i])?;

                let _tray = tauri::tray::TrayIconBuilder::new()
                    .icon(app.default_window_icon().unwrap().clone())
                    .menu(&menu)
                    .show_menu_on_left_click(false)
                    .on_menu_event(move |app_handle, event| match event.id.as_ref() {
                        "quit" => {
                            // Tray "Salir" bypasses the dialog and exits directly
                            if let Some(s) = app_handle.try_state::<Arc<AtomicBool>>() {
                                s.store(true, Ordering::SeqCst);
                            }
                            app_handle.exit(0);
                        }
                        "show" => {
                            if let Some(window) = app_handle.get_webview_window("main") {
                                window.show().unwrap();
                                window.set_focus().unwrap();
                            }
                        }
                        _ => {}
                    })
                    .on_tray_icon_event(|tray_handle, event| {
                        if let tauri::tray::TrayIconEvent::Click {
                            button: tauri::tray::MouseButton::Left,
                            ..
                        } = event
                        {
                            let app = tray_handle.app_handle();
                            if let Some(window) = app.get_webview_window("main") {
                                window.show().unwrap();
                                window.set_focus().unwrap();
                            }
                        }
                    })
                    .build(app)?;
            }
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(move |_app_handle, event| match event {
            RunEvent::ExitRequested { api: _api, .. } => {
                // Don't exit when the window closes — keep running in tray.
                // exit_app command sets should_exit=true so the process can exit.
                if !should_exit_for_run.load(Ordering::SeqCst) {
                    _api.prevent_exit();
                }
            }
            RunEvent::WindowEvent {
                label,
                event: WindowEvent::CloseRequested { api: _api, .. },
                ..
            } => {
                // Desktop-only: keep the window alive in the system tray and
                // emit the React-side CloseDialog event. Android uses its own
                // back-stack lifecycle and never receives this event, so
                // guarding it out keeps the mobile binary small and avoids
                // referencing the desktop-only "main" window contract.
                #[cfg(desktop)]
                {
                    if label == "main" && !should_exit_for_run.load(Ordering::SeqCst) {
                        _api.prevent_close();
                        if _app_handle.get_webview_window("main").is_some() {
                            _app_handle.emit("close-requested-dialog", ()).unwrap_or(());
                        }
                    }
                }
                #[cfg(not(desktop))]
                {
                    let _ = label; // silence unused-warning on mobile
                }
            }
            _ => {}
        });
}
