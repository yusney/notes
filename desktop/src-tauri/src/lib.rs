use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc,
};
use tauri::{Emitter, Manager, RunEvent, WindowEvent};
use tauri_plugin_keyring_store::KeyringStore;

const SERVICE: &str = "dev.donduque.notes";
const ACCOUNT: &str = "refresh_token";

fn keyring() -> KeyringStore {
    KeyringStore::new(SERVICE)
}

/// Saves the refresh token in the OS keychain.
/// macOS → Keychain, Windows → Credential Manager, Linux → Secret Service
#[tauri::command]
fn save_token(token: String) -> Result<(), String> {
    keyring().set_password(ACCOUNT, &token).map_err(|e| e.to_string())
}

/// Loads the refresh token from the OS keychain.
/// Returns None if no token is stored yet.
#[tauri::command]
fn load_token() -> Result<Option<String>, String> {
    keyring().get_password(ACCOUNT).map_err(|e| e.to_string())
}

/// Deletes the refresh token from the OS keychain (called on logout).
#[tauri::command]
fn delete_token() -> Result<(), String> {
    match keyring().delete(ACCOUNT) {
        Ok(_) => Ok(()),
        Err(e) if e.to_string().contains("No credential") => Ok(()),
        Err(e) => Err(e.to_string()),
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
    let mut builder = tauri::Builder::default();
    let should_exit = Arc::new(AtomicBool::new(false));
    let should_exit_for_run = should_exit.clone();

    // Must be registered before other plugins so Linux/Windows can forward
    // deep links from a second spawned process to the already-running app.
    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            // Bring the window to front when a second instance is launched.
            if let Some(window) = app.get_webview_window("main") {
                window.show().ok();
                window.set_focus().ok();
            }
        }));
    }

    builder
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_deep_link::init())
        .manage(should_exit)
        .invoke_handler(tauri::generate_handler![
            save_token,
            load_token,
            delete_token,
            exit_app
        ])
        .setup(move |app| {
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
        .run(move |app_handle, event| match event {
            RunEvent::ExitRequested { api, .. } => {
                // Don't exit when the window closes — keep running in tray.
                // exit_app command sets should_exit=true so the process can exit.
                if !should_exit_for_run.load(Ordering::SeqCst) {
                    api.prevent_exit();
                }
            }
            RunEvent::WindowEvent {
                label,
                event: WindowEvent::CloseRequested { api, .. },
                ..
            } => {
                // Always prevent OS close — frontend handles it via CloseDialog.
                // "Minimize" → window.hide(), "Close" → invoke("exit_app").
                if label == "main" && !should_exit_for_run.load(Ordering::SeqCst) {
                    api.prevent_close();
                    if let Some(window) = app_handle.get_webview_window("main") {
                        window.emit("close-requested-dialog", ()).unwrap_or(());
                    }
                }
            }
            _ => {}
        });
}
