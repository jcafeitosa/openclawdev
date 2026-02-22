# Encrypted Auth Storage

OpenClaw supports storing API keys and OAuth tokens in an encrypted PostgreSQL database instead of plain-text JSON files. This provides:

- **AES-256-GCM encryption** for all credentials at rest
- **Centralized storage** - all agents share one encrypted store (no desync)
- **Atomic updates** - PostgreSQL advisory locks prevent race conditions
- **Key rotation** - built-in `key_version` tracking for credential re-encryption
- **Audit trail** - `created_at`, `updated_at` timestamps on all credentials

## Quick Start

### 1. Set Up PostgreSQL

```bash
# Local Docker (development)
docker run -d --name openclaw-db \
  -e POSTGRES_USER=openclaw \
  -e POSTGRES_PASSWORD=secret \
  -e POSTGRES_DB=openclaw \
  -p 5432:5432 \
  timescale/timescaledb:latest-pg16

# Apply schema
DATABASE_URL=postgres://openclaw:secret@localhost:5432/openclaw \
  pnpm drizzle-kit push
```

### 2. Generate Encryption Key

```bash
# Generate a 32-byte (256-bit) key
openssl rand -hex 32
# Output: a1b2c3d4e5f6789012345678901234567890123456789012345678901234abcd
```

### 3. Configure Environment

Add to your `.env` or `~/.openclaw/.env`:

```bash
DATABASE_URL=postgres://openclaw:secret@localhost:5432/openclaw
AUTH_ENCRYPTION_KEY=a1b2c3d4e5f6789012345678901234567890123456789012345678901234abcd
```

### 4. Migrate Existing Credentials

```bash
# Dry run first (shows what would be migrated)
AUTH_ENCRYPTION_KEY=... DATABASE_URL=... \
  tsx src/agents/auth-profiles/migrate-to-db.ts --dry-run

# Actual migration
AUTH_ENCRYPTION_KEY=... DATABASE_URL=... \
  tsx src/agents/auth-profiles/migrate-to-db.ts

# With cleanup (removes JSON files after successful migration)
AUTH_ENCRYPTION_KEY=... DATABASE_URL=... \
  tsx src/agents/auth-profiles/migrate-to-db.ts --cleanup
```

### 5. Restart Gateway

```bash
openclaw gateway restart
```

You should see in logs:

```
auth store: using encrypted PostgreSQL backend
```

## How It Works

### Storage Decision

On gateway startup:

```
AUTH_ENCRYPTION_KEY set?
├── No  → Use file backend (auth-profiles.json)
└── Yes → DATABASE_URL reachable?
          ├── No  → Use file backend (with warning)
          └── Yes → Use encrypted DB backend ✓
```

### Encryption Details

- **Algorithm:** AES-256-GCM (authenticated encryption)
- **IV:** 96-bit random (unique per encryption)
- **Auth Tag:** 128-bit (integrity verification)
- **Key Format:** 32 bytes (64 hex chars or 44 base64 chars)

Each credential is encrypted as a JSON blob:

```typescript
{
  encryptedData: "base64...",  // AES-256-GCM ciphertext
  iv: "base64...",              // 12-byte initialization vector
  authTag: "base64...",         // 16-byte authentication tag
  keyVersion: 1                 // For key rotation
}
```

### Database Schema

```sql
-- Encrypted credentials
CREATE TABLE auth_credentials (
  id UUID PRIMARY KEY,
  profile_id TEXT UNIQUE NOT NULL,
  provider TEXT NOT NULL,
  credential_type TEXT NOT NULL,  -- "api_key" | "token" | "oauth"
  encrypted_data TEXT NOT NULL,
  iv TEXT NOT NULL,
  auth_tag TEXT NOT NULL,
  key_version INT DEFAULT 1,
  email TEXT,
  expires_at TIMESTAMP,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Usage statistics (cooldowns, errors)
CREATE TABLE auth_usage_stats (
  profile_id TEXT REFERENCES auth_credentials(profile_id),
  last_used TIMESTAMP,
  error_count INT,
  cooldown_until TIMESTAMP,
  disabled_until TIMESTAMP,
  ...
);

-- Metadata (provider order, last good profile)
CREATE TABLE auth_store_meta (
  key TEXT PRIMARY KEY,  -- "order", "lastGood"
  value JSONB
);
```

## Key Rotation

To rotate the encryption key:

1. Generate new key: `openssl rand -hex 32`
2. Update env: `AUTH_ENCRYPTION_KEY=<new_key>` and `AUTH_KEY_VERSION=2`
3. Run re-encryption script (TODO: implement `rotate-key.ts`)
4. Verify all credentials decrypt correctly
5. Remove old key from backup

## Fallback Behavior

If the database becomes unreachable after startup:

- **Read operations:** Cached credentials continue working
- **Write operations:** Fail with error (logged, not fatal)
- **Gateway restart:** Falls back to file backend if DB still down

## Security Considerations

### Key Management

- **DO NOT** commit `AUTH_ENCRYPTION_KEY` to git
- Store in secure secrets manager (1Password, Vault, AWS Secrets Manager)
- Use different keys per environment (dev/staging/prod)

### File Cleanup

After successful migration:

```bash
# Backup first
cp -r ~/.openclaw/agents/*/agent/auth-profiles.json ~/openclaw-auth-backup/

# Then remove (migration script does this with --cleanup)
find ~/.openclaw -name "auth-profiles.json" -delete
```

### Database Security

- Use TLS for database connections in production
- Restrict database user permissions (SELECT, INSERT, UPDATE on auth tables only)
- Enable PostgreSQL audit logging

## Troubleshooting

### "AUTH_ENCRYPTION_KEY is set but database is not reachable"

Check:

1. `DATABASE_URL` is correct
2. PostgreSQL is running
3. Network allows connection
4. Credentials are valid

### "failed to decrypt credential"

Possible causes:

- Wrong `AUTH_ENCRYPTION_KEY`
- Key rotation without re-encryption
- Corrupted database row

Recovery:

1. Check `key_version` in database matches `AUTH_KEY_VERSION` env
2. If key was changed, restore from backup or re-authenticate providers

### Migration verification failed

The migration script verifies all profiles can be decrypted after insertion. If verification fails:

1. Check errors in output
2. Ensure `AUTH_ENCRYPTION_KEY` hasn't changed mid-migration
3. Try again with `--dry-run` to see what would be migrated

## API Reference

### `initAuthStoreBackend()`

Called automatically on gateway startup. Returns `"db"` or `"file"`.

### `DbAuthStoreBackend`

```typescript
class DbAuthStoreBackend implements AuthStoreBackend {
  constructor(encryptionKey: Buffer, keyVersion?: number);

  async loadAsync(): Promise<AuthProfileStore>;
  async saveAsync(store: AuthProfileStore): Promise<void>;
  async loadWithLock(params: {
    updater: (store: AuthProfileStore) => boolean;
  }): Promise<AuthProfileStore | null>;
}
```

### Encryption Functions

```typescript
// Low-level
encrypt(plaintext: string, key: Buffer): EncryptedPayload;
decrypt(payload: EncryptedPayload, key: Buffer): string;

// JSON helpers
encryptJson(value: unknown, key: Buffer): EncryptedPayload;
decryptJson<T>(payload: EncryptedPayload, key: Buffer): T;

// Key parsing
parseEncryptionKey(envValue?: string): Buffer | null;
```
