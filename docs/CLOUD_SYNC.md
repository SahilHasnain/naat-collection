# Cloud Sync

When a user is signed in, the mobile app syncs user-specific data to Appwrite.

## Synced data

### Favorites
Collection: `user_favorites` (per-document security, created via client with `Role.users()` create permission)

- `userId` (string)
- `naatId` (string)
- `isFavorite` (boolean, tombstoned as `false` on unfavorite)
- `clientUpdatedAt` (ISO datetime) — used for last-write-wins
- `deviceId` (string)
- `updatedAt` (ISO datetime)

Sync is triggered on:
- App launch if a session exists
- Native Google sign-in
- Toggle while signed in (debounced via `cloudSyncService`)
- Before sign-out (flush)

### Watch history
Collection: `user_history` (per-document security, created via client with `Role.users()` create permission)

- `userId` (string)
- `naatId` (string) — use `"*"` for a clear-all marker
- `watchedAt` (integer, epoch ms) — watch time or clear time
- `isRemoved` (boolean)
- `clientUpdatedAt` (ISO datetime)
- `deviceId` (string)
- `updatedAt` (ISO datetime)

Behavior:
- Adding/removing/clearing history enqueues events and schedules a debounced sync (1500ms)
- Clear-all writes a wildcard record (`naatId = "*"`) with `watchedAt = clearedAt`; events with `watchedAt <= clearedAt` are dropped during merge
- Sync is two-way with last-write-wins and tombstones
- If `user_history` is missing (404), sync is skipped gracefully and local queue is preserved
- Local history is rewritten from merged cloud state without re-enqueuing

## Provisioning

Run:
```bash
npm run provision:appwrite -- --project naat-collection --apply
```

Ensure the Appwrite API key has database/collection/attribute/index scopes.
