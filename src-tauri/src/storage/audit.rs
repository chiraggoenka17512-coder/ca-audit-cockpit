//! Tamper-Evident SHA-256 Hash-Chained Audit Ledger
//! Complies with GEMINI.md Step 3: "Append-only table. Entry hash = SHA-256 over canonical serialization plus previous hash. verify_chain() recomputes every hash."

use sha2::{Sha256, Digest};
use rusqlite::{Connection, params};
use std::path::Path;
use thiserror::Error;
use serde::{Serialize, Deserialize};

pub const GENESIS_HASH: &str = "0000000000000000000000000000000000000000000000000000000000000000";

#[derive(Error, Debug, PartialEq)]
pub enum AuditError {
    #[error("Database error: {0}")]
    DbError(String),

    #[error("Audit chain integrity broken at block #{index}. Expected hash '{expected}', found '{actual}'")]
    IntegrityBroken {
        index: i64,
        expected: String,
        actual: String,
    },

    #[error("Audit chain link severed at block #{index}. Previous hash '{actual_prev}' does not match block #{prior_index} hash '{expected_prev}'")]
    LinkSevered {
        index: i64,
        prior_index: i64,
        expected_prev: String,
        actual_prev: String,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct AuditEntry {
    pub id: i64,
    pub timestamp: String,
    pub actor: String,
    pub action: String,
    pub record_id: String,
    pub payload_hash: String,
    pub previous_hash: String,
    pub entry_hash: String,
}

pub struct AuditLedger {
    conn: Connection,
}

impl AuditLedger {
    /// Opens or initializes the tamper-evident audit ledger
    pub fn open(db_path: &Path) -> Result<Self, AuditError> {
        let conn = Connection::open(db_path).map_err(|e| AuditError::DbError(e.to_string()))?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS audit_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                actor TEXT NOT NULL,
                action TEXT NOT NULL,
                record_id TEXT NOT NULL,
                payload_hash TEXT NOT NULL,
                previous_hash TEXT NOT NULL,
                entry_hash TEXT NOT NULL
            )",
            [],
        ).map_err(|e| AuditError::DbError(e.to_string()))?;

        Ok(Self { conn })
    }

    /// Computes canonical SHA-256 hash for an audit entry
    pub fn compute_entry_hash(
        id: i64,
        timestamp: &str,
        actor: &str,
        action: &str,
        record_id: &str,
        payload_hash: &str,
        previous_hash: &str,
    ) -> String {
        let mut hasher = Sha256::new();
        // Canonical serialization format: "id|timestamp|actor|action|record_id|payload_hash|previous_hash"
        let canonical = format!(
            "{}|{}|{}|{}|{}|{}|{}",
            id, timestamp, actor, action, record_id, payload_hash, previous_hash
        );
        hasher.update(canonical.as_bytes());
        format!("{:x}", hasher.finalize())
    }

    /// Appends a new audit block to the immutable chain
    pub fn append(
        &mut self,
        actor: &str,
        action: &str,
        record_id: &str,
        payload: &[u8],
    ) -> Result<AuditEntry, AuditError> {
        let tx = self.conn.transaction().map_err(|e| AuditError::DbError(e.to_string()))?;

        // 1. Get the last entry's ID and hash
        let mut stmt = tx.prepare("SELECT id, entry_hash FROM audit_log ORDER BY id DESC LIMIT 1")
            .map_err(|e| AuditError::DbError(e.to_string()))?;

        let mut rows = stmt.query([]).map_err(|e| AuditError::DbError(e.to_string()))?;
        let (next_id, previous_hash) = if let Some(row) = rows.next().map_err(|e| AuditError::DbError(e.to_string()))? {
            let last_id: i64 = row.get(0).map_err(|e| AuditError::DbError(e.to_string()))?;
            let last_hash: String = row.get(1).map_err(|e| AuditError::DbError(e.to_string()))?;
            (last_id + 1, last_hash)
        } else {
            (1, GENESIS_HASH.to_string())
        };

        // 2. Hash payload
        let mut p_hasher = Sha256::new();
        p_hasher.update(payload);
        let payload_hash = format!("{:x}", p_hasher.finalize());

        let timestamp = chrono::Utc::now().to_rfc3339();

        // 3. Compute entry hash
        let entry_hash = Self::compute_entry_hash(
            next_id,
            &timestamp,
            actor,
            action,
            record_id,
            &payload_hash,
            &previous_hash,
        );

        // 4. Insert into database
        tx.execute(
            "INSERT INTO audit_log (id, timestamp, actor, action, record_id, payload_hash, previous_hash, entry_hash)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![next_id, timestamp, actor, action, record_id, payload_hash, previous_hash, entry_hash],
        ).map_err(|e| AuditError::DbError(e.to_string()))?;

        tx.commit().map_err(|e| AuditError::DbError(e.to_string()))?;

        Ok(AuditEntry {
            id: next_id,
            timestamp,
            actor: actor.to_string(),
            action: action.to_string(),
            record_id: record_id.to_string(),
            payload_hash,
            previous_hash,
            entry_hash,
        })
    }

    /// Cryptographically verifies the entire chain from Genesis to latest block.
    /// Returns Ok(()) if untampered, or an error detailing the exact corrupted block.
    pub fn verify_chain(&self) -> Result<usize, AuditError> {
        let mut stmt = self.conn.prepare(
            "SELECT id, timestamp, actor, action, record_id, payload_hash, previous_hash, entry_hash
             FROM audit_log ORDER BY id ASC"
        ).map_err(|e| AuditError::DbError(e.to_string()))?;

        let rows = stmt.query_map([], |row| {
            Ok(AuditEntry {
                id: row.get(0)?,
                timestamp: row.get(1)?,
                actor: row.get(2)?,
                action: row.get(3)?,
                record_id: row.get(4)?,
                payload_hash: row.get(5)?,
                previous_hash: row.get(6)?,
                entry_hash: row.get(7)?,
            })
        }).map_err(|e| AuditError::DbError(e.to_string()))?;

        let mut expected_previous = GENESIS_HASH.to_string();
        let mut last_id = 0;
        let mut count = 0;

        for entry_res in rows {
            let entry = entry_res.map_err(|e| AuditError::DbError(e.to_string()))?;
            count += 1;

            // Check link to previous hash
            if entry.previous_hash != expected_previous {
                return Err(AuditError::LinkSevered {
                    index: entry.id,
                    prior_index: last_id,
                    expected_prev: expected_previous,
                    actual_prev: entry.previous_hash,
                });
            }

            // Recompute this block's hash
            let computed = Self::compute_entry_hash(
                entry.id,
                &entry.timestamp,
                &entry.actor,
                &entry.action,
                &entry.record_id,
                &entry.payload_hash,
                &entry.previous_hash,
            );

            if entry.entry_hash != computed {
                return Err(AuditError::IntegrityBroken {
                    index: entry.id,
                    expected: computed,
                    actual: entry.entry_hash,
                });
            }

            expected_previous = entry.entry_hash;
            last_id = entry.id;
        }

        Ok(count)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::NamedTempFile;

    #[test]
    fn test_valid_chain_creation_and_verification() {
        let tmp = NamedTempFile::new().unwrap();
        let mut ledger = AuditLedger::open(tmp.path()).unwrap();

        ledger.append("Chirag (Partner)", "APPROVE_MATCH", "INV-101", b"Matched with GSTR-2B").unwrap();
        ledger.append("System Rulebook", "FLAG_TDS_THRESHOLD", "INV-102", b"Threshold 194C exceeded").unwrap();
        ledger.append("Rajveer (Audit Lead)", "CONFIRM_JUSTIFICATION", "INV-102", b"Form 15G verified").unwrap();

        let verified_blocks = ledger.verify_chain().unwrap();
        assert_eq!(verified_blocks, 3);
    }

    #[test]
    fn test_tampering_with_past_block_detected() {
        let tmp = NamedTempFile::new().unwrap();
        let mut ledger = AuditLedger::open(tmp.path()).unwrap();

        ledger.append("Chirag", "APPROVE", "INV-1", b"Data A").unwrap();
        ledger.append("Chirag", "APPROVE", "INV-2", b"Data B").unwrap();
        ledger.append("Chirag", "APPROVE", "INV-3", b"Data C").unwrap();

        assert_eq!(ledger.verify_chain().unwrap(), 3);

        // Tamper with Block #2 actor in raw database
        ledger.conn.execute(
            "UPDATE audit_log SET actor = 'Malicious Actor' WHERE id = 2",
            [],
        ).unwrap();

        let verify_result = ledger.verify_chain();
        match verify_result {
            Err(AuditError::IntegrityBroken { index, .. }) => {
                assert_eq!(index, 2);
            }
            other => panic!("Expected IntegrityBroken at block #2, got {:?}", other),
        }
    }

    #[test]
    fn test_deletion_of_block_detected() {
        let tmp = NamedTempFile::new().unwrap();
        let mut ledger = AuditLedger::open(tmp.path()).unwrap();

        ledger.append("Chirag", "APPROVE", "INV-1", b"Data A").unwrap();
        ledger.append("Chirag", "APPROVE", "INV-2", b"Data B").unwrap();
        ledger.append("Chirag", "APPROVE", "INV-3", b"Data C").unwrap();

        // Delete Block #2
        ledger.conn.execute("DELETE FROM audit_log WHERE id = 2", []).unwrap();

        let verify_result = ledger.verify_chain();
        match verify_result {
            Err(AuditError::LinkSevered { index, .. }) => {
                assert_eq!(index, 3);
            }
            other => panic!("Expected LinkSevered at block #3, got {:?}", other),
        }
    }
}
