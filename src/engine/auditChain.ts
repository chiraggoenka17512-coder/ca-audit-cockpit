import { AuditBlock } from '../types';

/**
 * Tamper-Evident Hash Chain using native WebCrypto API
 * Generates an immutable, verifiable audit seal in the browser
 */
export async function createAuditBlock(
  action: string,
  actor: string,
  recordIds: string[],
  previousHash: string = "0000000000000000000000000000000000000000000000000000000000000000",
  index: number = 0
): Promise<AuditBlock> {
  const timestamp = new Date().toISOString();
  const payload = JSON.stringify({ index, timestamp, action, actor, recordIds, previousHash });
  
  const msgBuffer = new TextEncoder().encode(payload);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const blockHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return {
    index,
    timestamp,
    action,
    actor,
    recordIds,
    previousHash,
    blockHash
  };
}
