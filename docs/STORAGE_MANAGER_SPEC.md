# Kabijwe Storage Manager — Implementation Specification

Status: Approved product configuration / implementation plan
Repository: `kabijwe/PersonalDiary-`
Branch: `spec/storage-manager-local-first`

## 1. Approved defaults

- Primary storage: **Local device storage**
- Backup frequency: **Manual only**
- Client-side encryption: **Enabled by default**
- Cloud providers: optional destinations; none connected or used by default
- Cloud sync: **Not part of this milestone**. Backup/restore is file-based and user-initiated.
- No Kabijwe-hosted diary database, application server, account system, or mandatory cloud dependency.

These settings must be applied on first launch and preserved through migrations unless the user explicitly changes them.

## 2. Storage principles

1. The app remains fully usable offline for diary, poetry, calendar, memories, Letterpad, templates, and settings.
2. Local data is authoritative. A cloud backup is a portable encrypted archive, not a live database and not a second write target.
3. No upload occurs automatically. The user chooses a provider, authenticates, selects a destination, and explicitly starts each backup.
4. Disconnecting or revoking a provider never deletes local data.
5. A failed, unavailable, or unsupported provider must not block local app functionality.
6. Do not describe browser storage as permanent. Browser/site-data clearing, private browsing, storage eviction, or uninstall may remove local data. Encourage external backups.
7. No secret, OAuth refresh token, password, encryption key, or diary content may be logged.

## 3. Local persistence

- Preserve the existing `kabijwe.v1` data and provide a versioned migration path.
- Keep a small settings/bootstrap record in localStorage for compatibility with the current app.
- Use IndexedDB for larger and binary data: photos, attachments, template artwork, backup metadata, and location/weather history. Avoid large base64 photos in localStorage.
- Introduce a versioned repository/storage layer so UI features do not directly depend on localStorage.
- Request persistent browser storage where supported (`navigator.storage.persist()`), but handle denial gracefully.
- Detect quota errors and show a clear Nepali warning with export guidance. Never silently discard older entries.
- Android installed PWA and desktop browser each have their own origin/device storage. There is no implicit cross-device sharing.

Suggested stores: `appMeta`, `entries`, `events`, `memories`, `templates`, `attachments`, `locationHistory`, `weatherSnapshots`, `settings`, `backupJobs`.

## 4. Backup archive

Use a documented, versioned archive format. JSON-only backup remains supported; ZIP is preferred when binary attachments exist.

Suggested ZIP layout:

```
kabijwe-backup/
  manifest.json
  data.json
  media/
    <attachment-id>.<ext>
  checksums.json
```

The manifest must include format identifier, schema version, app version, creation timestamp (UTC and Nepal display context), export scope, encryption metadata, and attachment count/size. The data payload must include diary entries and their immutable context snapshots, poetry, calendar events, memories, photos, Letterpad documents, saved templates and their snapshots, settings, location history, weather snapshots, and relevant metadata.

Backup scopes:
- Full backup (all user data and attachments)
- Date-range backup (include records whose creation/entry date falls within the selected inclusive range; include referenced media and required template/snapshot metadata)
- Monthly backup (Nepal calendar month selection; store the exact AD range and BS label used for the selection)

Every export must show a summary, destination, approximate size, encryption status, and explicit confirmation before writing/uploading.

## 5. Client-side encryption

Encryption is enabled by default for every backup file, including files sent to cloud providers.

- Use Web Crypto API; do not implement cryptographic primitives manually.
- Generate a random per-backup salt and a fresh random AES-GCM 256-bit data-encryption key (DEK).
- Derive a key-encryption key from a user passphrase with PBKDF2-SHA-256 and a high, benchmarked iteration count (initial target 600,000; tune for supported Android devices). Use the KEK to wrap the DEK; encrypt archive payload with AES-256-GCM and a fresh 96-bit nonce.
- Store algorithm identifiers, salt, iteration count, nonce, wrapped DEK, and format version in the manifest. Never store the passphrase or plaintext DEK in the archive.
- Require passphrase confirmation on first encrypted export and passphrase entry for restore. Explain clearly that losing the passphrase means the encrypted backup cannot be recovered by Kabijwe.
- Do not store the passphrase in localStorage, IndexedDB, URL parameters, logs, or provider metadata. Keep derived key material in memory only for the active operation.
- Use authenticated encryption and verify authentication/checksums before import. Reject tampered, truncated, malformed, or unsupported archives without modifying current data.
- Provide an explicit per-export option to create an unencrypted portable backup only after a strong warning and a second confirmation. The default remains encrypted.
- If Web Crypto is unavailable, stop encrypted export and explain the limitation; never silently downgrade to plaintext.

## 6. Provider architecture (optional adapters)

Define a provider interface such as:
- `connect()`
- `disconnect()`
- `listBackupDestinations()`
- `uploadBackup(file, destination)`
- `listBackups(destination)`
- `downloadBackup(backupId)`
- `deleteBackup(backupId)` (only after explicit user confirmation)

Initial optional providers:
1. Google Drive
2. Microsoft OneDrive
3. Dropbox
4. Custom WebDAV / user-managed NAS

Provider integrations must be direct browser-to-provider API calls using supported OAuth authorization-code flow with PKCE. Register and configure provider app credentials separately; do not embed client secrets in frontend code. Request minimum scopes, use state/nonce protections, validate redirect handling, and support token revocation/disconnect. Do not introduce a Kabijwe backend just to proxy OAuth or store tokens. If a provider requires a backend secret or unsupported redirect model, mark it unsupported until a secure client-only approach is verified.

Cloud destinations contain encrypted backup files only. Use provider app-specific/private application folders where supported (for example Drive appDataFolder when appropriate); otherwise clearly show the user-selected folder. Do not expose file names or diary metadata unnecessarily.

WebDAV/NAS credentials must be entered by the user and kept only for the active session unless a future secure platform credential store is implemented. Warn that WebDAV servers may not provide end-to-end encryption; Kabijwe's encrypted archive is the protection layer.

## 7. Restore and conflict safety

Restore options:
- **Merge**: add new records by stable IDs; never silently overwrite a different existing record. For same-ID divergent records, show a conflict review and let the user choose local, backup, or keep both (assign a new ID).
- **Replace**: replace all selected app data only after a clear destructive-action confirmation and a verified safety backup of current local data.
- Validate archive format, schema version, record shapes, IDs, attachment references, file sizes, checksums, and encryption authentication before any write.
- Stage and validate the full import before committing. Use an IndexedDB transaction or recoverable staged migration so partial restore cannot leave the diary corrupted.
- Preserve unknown optional fields where possible for forward compatibility. Reject unsupported future schema versions with an actionable message.
- Keep migrations idempotent and test against a copy of the existing v1 data.
- Show a pre-restore summary: source, date, record counts, media count, estimated storage, merge/replace choice, and conflicts.

## 8. UI / Nepali-first Storage Manager

Add a Storage Manager section under Settings with:
- Primary storage: Device (fixed default for this milestone; local-first).
- Backup frequency: Manual (default). No scheduled background upload.
- Encryption: Enabled (default).
- Provider connection cards: Google Drive, OneDrive, Dropbox, WebDAV/NAS; each shows disconnected/connected status and last user-initiated backup.
- Actions: Create full backup, date-range backup, monthly backup, restore from file/provider, disconnect provider, and manage backup files.
- Explain that app-open reminders or in-app schedules may be added later, but app-closed dependable background scheduling is not promised by a browser/PWA.
- Display local storage usage/quota when supported, last backup time, and an offline indicator.
- All sensitive actions require clear Nepali confirmation. Use accessible mobile-friendly controls.

## 9. Privacy and data-flow boundaries

Allowed external requests are limited to explicitly invoked provider authentication and backup file transfer, plus existing user-triggered data services such as weather/calendar feeds. No diary entry, photo, location history, or Letterpad content may be transmitted except as part of an explicitly confirmed encrypted backup/restore workflow. Panchang/weather retrieval must not be confused with diary synchronization.

## 10. Compatibility and migration

- Existing diary, poetry, calendar, memories, Letterpad Studio, templates, settings, import/export, and PWA behavior must continue to work.
- Migrate current `kabijwe.v1` localStorage data without data loss.
- Keep legacy JSON import support and add versioned archive import.
- Ensure service worker does not cache OAuth tokens, private backup responses, or user backup contents.
- Storage schema changes must be backward-compatible where practical and have tested rollback/recovery behavior.

## 11. Acceptance tests

- First launch selects local storage, manual backup, encryption enabled, and no connected cloud provider.
- All core features create/read/update data offline.
- Existing v1 data migrates with record counts and content intact.
- Photos and Letterpad artwork survive full backup and restore.
- Full, date-range, and Nepal-month backup scopes include correct records and referenced media.
- Encrypted archive cannot be inspected as plaintext; correct passphrase restores; wrong passphrase and tampered archive are rejected.
- Merge preserves existing data and surfaces conflicts; replace requires confirmation and a safety backup.
- No provider network request occurs before explicit user connection/backup action.
- Disconnecting a provider leaves local data intact.
- Provider failure, offline mode, quota exhaustion, and unsupported browser APIs show useful Nepali errors without data loss.
- Test Android PWA and desktop browsers separately; confirm local data is not automatically shared between devices.
- Run existing engine/UI tests and add storage migration, archive, crypto, provider-adapter, and restore tests.

## 12. Delivery sequence

1. Introduce storage abstraction and migrate v1 data to IndexedDB safely.
2. Implement versioned JSON/ZIP backup, attachment collection, validation, and restore merge/replace.
3. Implement Web Crypto encryption and recovery UX.
4. Build Nepali-first Storage Manager UI with local/manual/encrypted defaults.
5. Add and test Google Drive adapter.
6. Add and test OneDrive adapter.
7. Add Dropbox and WebDAV/NAS adapters after provider security and browser compatibility review.
8. Run automated and real-device tests; document provider setup and limitations.

**Important:** This document records the approved specification. It does not claim that cloud integrations, encryption, or the new Storage Manager UI have already been implemented.
