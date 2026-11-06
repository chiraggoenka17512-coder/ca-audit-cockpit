//! On-Device AES-256-GCM Storage & Client Isolation
//! Complies with GEMINI.md Step 2: "Encrypt sensitive columns or the file with AES-256-GCM. Fresh random 96-bit nonce for every encryption."

use aes_gcm::{
    aead::{Aead, KeyInit, OsRng},
    Aes256Gcm, Nonce, Key
};
use aes_gcm::aead::rand_core::RngCore;
use std::path::{Path, PathBuf};
use std::fs;
use std::sync::Mutex;
use thiserror::Error;
use rusqlite::{Connection, params};
use crate::engine::money::validate_gstin;

#[derive(Error, Debug)]
pub enum StorageError {
    #[error("Encryption error: {0}")]
    EncryptionFailed(String),

    #[error("Decryption error (invalid key or corrupted payload): {0}")]
    DecryptionFailed(String),

    #[error("Database error: {0}")]
    DatabaseError(#[from] rusqlite::Error),

    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),

    #[error("Invalid key length: expected 32 bytes (256 bits), got {0}")]
    InvalidKeyLength(usize),

    #[error("Path traversal security violation: invalid client directory '{0}'")]
    PathTraversal(String),

    #[error("Client GSTIN validation error: {0}")]
    InvalidClientGstin(String),
}

/// AES-GCM-256 Engine with Pre-Computed Key Schedule and 96-bit Nonce Generation
pub struct EncryptedStore {
    cipher: Aes256Gcm,
}

impl EncryptedStore {
    /// Initialize with a 32-byte (256-bit) encryption key
    pub fn new(key_bytes: &[u8]) -> Result<Self, StorageError> {
        if key_bytes.len() != 32 {
            return Err(StorageError::InvalidKeyLength(key_bytes.len()));
        }
        let key = Key::<Aes256Gcm>::from_slice(key_bytes);
        let cipher = Aes256Gcm::new(key);
        Ok(Self { cipher })
    }

    /// Encrypts plaintext bytes using AES-256-GCM.
    /// Prepends the randomly generated 12-byte (96-bit) nonce to the ciphertext output.
    pub fn encrypt(&self, plaintext: &[u8]) -> Result<Vec<u8>, StorageError> {
        let mut nonce_bytes = [0u8; 12];
        OsRng.fill_bytes(&mut nonce_bytes);
        let nonce = Nonce::from_slice(&nonce_bytes);

        let ciphertext = self.cipher
            .encrypt(nonce, plaintext)
            .map_err(|e| StorageError::EncryptionFailed(format!("{:?}", e)))?;

        // Format: [12 bytes nonce] + [ciphertext + 16 bytes tag]
        let mut out = Vec::with_capacity(12 + ciphertext.len());
        out.extend_from_slice(&nonce_bytes);
        out.extend_from_slice(&ciphertext);
        Ok(out)
    }

    /// Decrypts payload produced by `encrypt`.
    /// Extracts the prepended 12-byte nonce and verifies the Poly1305 authentication tag.
    pub fn decrypt(&self, payload: &[u8]) -> Result<Vec<u8>, StorageError> {
        if payload.len() < 12 {
            return Err(StorageError::DecryptionFailed("Payload too short to contain nonce".into()));
        }
        let (nonce_bytes, ciphertext) = payload.split_at(12);
        let nonce = Nonce::from_slice(nonce_bytes);

        self.cipher
            .decrypt(nonce, ciphertext)
            .map_err(|e| StorageError::DecryptionFailed(format!("{:?}", e)))
    }
}

/// Manages per-client encrypted SQLite workspaces with strict path isolation
pub struct ClientWorkspace {
    pub client_gstin: String,
    pub base_dir: PathBuf,
    pub db_path: PathBuf,
    conn: Mutex<Connection>,
    store: EncryptedStore,
}

impl ClientWorkspace {
    /// Opens or creates an isolated workspace database for a client
    pub fn init(base_dir: &Path, client_gstin: &str, key_bytes: &[u8]) -> Result<Self, StorageError> {
        // Enforce strict GSTIN validation & eliminate path traversal
        validate_gstin(client_gstin)
            .map_err(|e| StorageError::InvalidClientGstin(e.to_string()))?;

        if Path::new(client_gstin).components().count() != 1 {
            return Err(StorageError::PathTraversal(client_gstin.to_string()));
        }

        let store = EncryptedStore::new(key_bytes)?;
        let client_dir = base_dir.join(client_gstin);
        fs::create_dir_all(&client_dir)?;

        let db_path = client_dir.join("workspace.db");
        let conn = Connection::open(&db_path)?;

        // Initialize schema with encrypted payload columns
        conn.execute(
            "CREATE TABLE IF NOT EXISTS client_records (
                id TEXT PRIMARY KEY,
                record_type TEXT NOT NULL,
                encrypted_payload BLOB NOT NULL,
                created_at INTEGER NOT NULL
            )",
            [],
        )?;

        Ok(Self {
            client_gstin: client_gstin.to_string(),
            base_dir: base_dir.to_path_buf(),
            db_path,
            conn: Mutex::new(conn),
            store,
        })
    }

    /// Stores a sensitive record after encrypting with AES-256-GCM
    pub fn insert_record(&self, id: &str, record_type: &str, plaintext: &[u8]) -> Result<(), StorageError> {
        let encrypted = self.store.encrypt(plaintext)?;
        let now = chrono::Utc::now().timestamp();
        let conn = self.conn.lock().unwrap();

        conn.execute(
            "INSERT OR REPLACE INTO client_records (id, record_type, encrypted_payload, created_at)
             VALUES (?1, ?2, ?3, ?4)",
            params![id, record_type, encrypted, now],
        )?;

        Ok(())
    }

    /// Retrieves and decrypts a record
    pub fn get_record(&self, id: &str) -> Result<Option<Vec<u8>>, StorageError> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT encrypted_payload FROM client_records WHERE id = ?1")?;
        let mut rows = stmt.query(params![id])?;

        if let Some(row) = rows.next()? {
            let encrypted: Vec<u8> = row.get(0)?;
            let decrypted = self.store.decrypt(&encrypted)?;
            Ok(Some(decrypted))
        } else {
            Ok(None)
        }
    }

    /// Deletes the client workspace securely, strictly verifying path safety
    pub fn delete_workspace(self) -> Result<(), StorageError> {
        let client_dir = self.base_dir.join(&self.client_gstin);
        if client_dir.exists() && client_dir.starts_with(&self.base_dir) && client_dir != self.base_dir {
            fs::remove_dir_all(&client_dir)?;
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_encryption_and_decryption_cycle() {
        let key = [7u8; 32];
        let store = EncryptedStore::new(&key).unwrap();

        let secret = b"Client: Tata Motors Ltd, PAN: AAATT1234T, GSTIN: 27AAATT1234T1Z5";
        let encrypted = store.encrypt(secret).unwrap();
        assert_ne!(&encrypted[12..], secret);

        let decrypted = store.decrypt(&encrypted).unwrap();
        assert_eq!(decrypted, secret);
    }

    #[test]
    fn test_fresh_nonce_per_encryption() {
        let key = [42u8; 32];
        let store = EncryptedStore::new(&key).unwrap();

        let data = b"Invoice #INV-2024-001 Rs 4,50,000";
        let enc1 = store.encrypt(data).unwrap();
        let enc2 = store.encrypt(data).unwrap();

        assert_ne!(enc1, enc2);
        assert_ne!(&enc1[0..12], &enc2[0..12]);
    }

    #[test]
    fn test_wrong_key_fails_decryption() {
        let key1 = [1u8; 32];
        let key2 = [2u8; 32];

        let store1 = EncryptedStore::new(&key1).unwrap();
        let store2 = EncryptedStore::new(&key2).unwrap();

        let encrypted = store1.encrypt(b"Confidential financial statement").unwrap();
        let result = store2.decrypt(&encrypted);
        assert!(result.is_err());
    }

    #[test]
    fn test_client_workspace_isolation() {
        let dir = tempdir().unwrap();
        let key = [99u8; 32];
        let ws = ClientWorkspace::init(dir.path(), "27AABCA1234F1Z5", &key).unwrap();

        ws.insert_record("inv_01", "invoice", b"Vendor: Reliance, Tax: 18000").unwrap();
        let rec = ws.get_record("inv_01").unwrap().unwrap();
        assert_eq!(rec, b"Vendor: Reliance, Tax: 18000");

        let raw_db_bytes = fs::read(&ws.db_path).unwrap();
        let search_target = b"Vendor: Reliance";
        assert!(
            !raw_db_bytes.windows(search_target.len()).any(|w| w == search_target),
            "Plaintext leak found in SQLite raw file!"
        );
    }
}
