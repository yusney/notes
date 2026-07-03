//! Encrypted token storage backed by `tauri-plugin-stronghold`.
//!
//! The helpers in this module are pure: they take `&Stronghold` directly,
//! which makes them unit-testable without spinning up a full Tauri runtime.
//! The `#[tauri::command]` wrappers in `lib.rs` resolve the `Stronghold`
//! plugin state via `app.state::<Stronghold>()` and delegate here.

use tauri_plugin_stronghold::stronghold::Stronghold;

/// Key used inside the Stronghold store for the refresh token.
pub const VAULT_KEY_REFRESH_TOKEN: &[u8] = b"refresh_token";

/// Insert a UTF-8 string value into the Stronghold store and persist
/// the snapshot to disk so the write survives process restarts.
pub fn vault_save(sh: &Stronghold, key: &[u8], value: &str) -> Result<(), String> {
    let store = sh.store();
    store
        .insert(key.to_vec(), value.as_bytes().to_vec(), None)
        .map_err(|e| e.to_string())?;
    sh.save().map_err(|e| e.to_string())
}

/// Read a value from the Stronghold store. Returns `Ok(None)` if the key
/// was never written.
pub fn vault_load(sh: &Stronghold, key: &[u8]) -> Result<Option<Vec<u8>>, String> {
    let store = sh.store();
    store.get(key).map_err(|e| e.to_string())
}

/// Delete a value from the Stronghold store. Idempotent: deleting a missing
/// key is treated as success so `delete_token` never errors on a stale entry.
pub fn vault_delete(sh: &Stronghold, key: &[u8]) -> Result<(), String> {
    let store = sh.store();
    // `delete` returns the previous value if any; we ignore it because we
    // only care that the entry is gone afterwards.
    let _ = store.delete(key).map_err(|e| e.to_string())?;
    sh.save().map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::env;
    use std::sync::atomic::{AtomicU64, Ordering};
    use tauri_plugin_stronghold::stronghold::Stronghold;

    static COUNTER: AtomicU64 = AtomicU64::new(0);

    /// Build a brand-new Stronghold instance backed by a unique temp file
    /// so tests don't share state.
    fn fresh_stronghold() -> Stronghold {
        let n = COUNTER.fetch_add(1, Ordering::SeqCst);
        let tmp = env::temp_dir().join(format!(
            "notes-vault-test-{}-{}-{}.hold",
            std::process::id(),
            n,
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map(|d| d.as_nanos())
                .unwrap_or(0)
        ));
        // `Stronghold::new` errors if a snapshot already exists at the path.
        let _ = std::fs::remove_file(&tmp);
        Stronghold::new(tmp, b"unit-test-password".to_vec())
            .expect("failed to construct test Stronghold")
    }

    #[test]
    fn secure_storage_round_trip_saves_and_loads_same_value() {
        let sh = fresh_stronghold();
        vault_save(&sh, VAULT_KEY_REFRESH_TOKEN, "rt-abc-123")
            .expect("vault_save should succeed");
        let loaded = vault_load(&sh, VAULT_KEY_REFRESH_TOKEN)
            .expect("vault_load should succeed");
        assert_eq!(
            loaded.as_deref(),
            Some(&b"rt-abc-123"[..]),
            "loaded bytes should equal the saved bytes"
        );
    }

    #[test]
    fn secure_storage_load_returns_none_for_missing_key() {
        let sh = fresh_stronghold();
        let loaded = vault_load(&sh, VAULT_KEY_REFRESH_TOKEN)
            .expect("vault_load on empty store should succeed");
        assert!(
            loaded.is_none(),
            "load on a fresh stronghold must return None, not error"
        );
    }

    #[test]
    fn secure_storage_delete_then_load_returns_none() {
        let sh = fresh_stronghold();
        vault_save(&sh, VAULT_KEY_REFRESH_TOKEN, "rt-to-be-deleted")
            .expect("vault_save should succeed");
        vault_delete(&sh, VAULT_KEY_REFRESH_TOKEN)
            .expect("vault_delete should succeed");
        let loaded = vault_load(&sh, VAULT_KEY_REFRESH_TOKEN)
            .expect("vault_load after delete should succeed");
        assert!(
            loaded.is_none(),
            "after delete_token, load_token must return None"
        );
    }

    #[test]
    fn secure_storage_delete_is_idempotent_on_missing_key() {
        let sh = fresh_stronghold();
        // Deleting a key that was never written must not error — this matches
        // the previous keyring behaviour where `delete` swallowed "No credential".
        vault_delete(&sh, VAULT_KEY_REFRESH_TOKEN)
            .expect("vault_delete on missing key must be idempotent (Ok)");
    }

    #[test]
    fn secure_storage_overwrite_replaces_previous_value() {
        let sh = fresh_stronghold();
        vault_save(&sh, VAULT_KEY_REFRESH_TOKEN, "first").unwrap();
        vault_save(&sh, VAULT_KEY_REFRESH_TOKEN, "second").unwrap();
        let loaded = vault_load(&sh, VAULT_KEY_REFRESH_TOKEN).unwrap();
        assert_eq!(loaded.as_deref(), Some(&b"second"[..]));
    }
}