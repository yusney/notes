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
    match keyring().get_password(ACCOUNT) {
        Ok(Some(token)) => Ok(Some(token)),
        Ok(None) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![save_token, load_token, delete_token])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
