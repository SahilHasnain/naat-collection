#!/usr/bin/env bash
#
# sync-family.sh
#
# One-way sync of SHARED code from the canonical family repo to the sibling
# naat apps. Each repo is a clone of the same codebase with only brand-specific
# files differing (app identity, Appwrite project IDs, keystores, assets, env).
#
# Canonical repo:  ./ (the repo this script lives in)
# Sibling repos:   configured below via FAMILY_REPOS (absolute or ~ paths)
#
# Usage:
#   ./scripts/sync-family.sh            # real sync
#   ./scripts/sync-family.sh --dry-run  # show what would change
#   ./scripts/sync-family.sh --help
#
# Brand-specific files are NEVER overwritten (see BRAND_FILES below).
set -euo pipefail

# ── Family members ────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CANONICAL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Add sibling repos here (the order matters only for output).
FAMILY_REPOS=(
  "D:/Projects/naat-production"
  "D:/Projects/anas-raza-attari"
)

# ── Shared paths that are synced recursively (relative to repo root) ─────────
# These directories contain pure shared code. They are rsynced with --delete so
# files deleted in the canonical repo are also removed from the siblings.
SHARED_DIRS=(
  "apps/mobile/app"
  "apps/mobile/components"
  "apps/mobile/contexts"
  "apps/mobile/hooks"
  "apps/mobile/services"
  "apps/mobile/utils"
  "apps/mobile/types"
  "apps/mobile/constants"
  "apps/mobile/patches"
  "apps/mobile/scripts"
  "apps/mobile/tests"
  "apps/web/app"
  "apps/web/components"
  "apps/web/lib"
  "packages"
  "functions"
  "infra"
  "docker"
  "scripts"
  "patches"
  "docs"
  "ref"
  "tests"
  "training-data"
)

# Shared single files that are always overwritten.
SHARED_FILES=(
  "apps/mobile/babel.config.js"
  "apps/mobile/metro.config.js"
  "apps/mobile/global.css"
  "apps/mobile/expo-env.d.ts"
  "apps/mobile/app.config.example.js"
  "apps/web/next.config.mjs"
  "apps/web/package.json"
  "apps/web/postcss.config.mjs"
  "apps/web/eslint.config.mjs"
  "apps/web/README.md"
)

# Brand-specific paths: skipped even if they live inside a SHARED_DIR.
# These must NEVER be overwritten during a sync.
BRAND_PATHS=(
  # App identity / store config
  "apps/mobile/app.config.js"
  "apps/mobile/eas.json"
  "apps/mobile/credentials.json"
  "apps/mobile/upload_certificate.pem"
  "apps/mobile/*.jks"
  # Per-repo Appwrite project IDs
  "apps/mobile/config/appwrite.ts"
  "apps/mobile/.env.local"
  "apps/mobile/.env"
  "apps/mobile/.env.*"
  "apps/web/.env.local"
  "apps/web/.env"
  "apps/web/.env.*"
  # Native build output / package dirs
  "apps/mobile/android"
  "apps/mobile/ios"
  "apps/mobile/assets"
  # Entry / build config that differs per repo
  "apps/mobile/index.js"
  "apps/mobile/bootstrap.js"
  "apps/mobile/bootstrap.native.js"
  "apps/mobile/bootstrap.web.js"
  "apps/mobile/package.json"
  "apps/mobile/tsconfig.json"
  "apps/mobile/tailwind.config.js"
  "apps/mobile/eslint.config.js"
  "apps/mobile/nativewind-env.d.ts"
  "apps/mobile/sentry.properties"
  "apps/web/tsconfig.json"
  "apps/web/next-env.d.ts"
  # Root-level per-repo config
  "package.json"
  "tsconfig.json"
  "babel.config.js"
  "metro.config.js"
  "eslint.config.js"
)

# ── helpers ───────────────────────────────────────────────────────────────────

log()  { printf "\033[1;34m[sync-family]\033[0m %s\n" "$*"; }
warn() { printf "\033[1;33m[sync-family]\033[0m %s\n" "$*"; }

build_rsync_args() {
  local args=(-a --delete --exclude=".git" --exclude="node_modules" --exclude=".expo"
              --exclude="dist" --exclude=".next" --exclude="*.jks" --exclude=".env.local"
              --exclude=".env" --exclude=".env.*")
  # Convert brand paths into rsync --exclude filters (anchored at repo root).
  local p
  for p in "${BRAND_PATHS[@]}"; do
    # "apps/mobile/*.jks" style globs -> keep as-is; plain dirs -> trailing slash.
    if [[ "$p" == *"*"* ]]; then
      args+=(--exclude="$p")
    else
      args+=(--exclude="/$p/")
      args+=(--exclude="/$p")
    fi
  done
  printf '%s\n' "${args[@]}"
}

sync_one() {
  local repo="$1"
  local dry="$2"

  if [[ ! -d "$repo/.git" ]]; then
    warn "Skipping '$repo' (not a git repo)."
    return
  fi

  log "Syncing -> $repo"

  local arg
  for arg in "${SHARED_FILES[@]}"; do
    if [[ ! -e "$CANONICAL_DIR/$arg" ]]; then
      continue
    fi
    mkdir -p "$(dirname "$repo/$arg")"
    if [[ -n "$dry" ]]; then
      if [[ ! -e "$repo/$arg" ]] || ! diff -q "$CANONICAL_DIR/$arg" "$repo/$arg" >/dev/null 2>&1; then
        log "  would update file: $arg"
      fi
    else
      cp "$CANONICAL_DIR/$arg" "$repo/$arg"
    fi
  done

  local dir
  for dir in "${SHARED_DIRS[@]}"; do
    if [[ ! -d "$CANONICAL_DIR/$dir" ]]; then
      continue
    fi
    mkdir -p "$repo/$dir"

    local args=()
    # shellcheck disable=SC2207
    args=($(build_rsync_args))

    if [[ -n "$dry" ]]; then
      log "  [dry-run] rsync $dir"
      # shellcheck disable=SC2046
      rsync -a --dry-run "${args[@]}" "$CANONICAL_DIR/$dir/" "$repo/$dir/" 2>/dev/null \
        | head -40 || true
    else
      # shellcheck disable=SC2046
      rsync -a "${args[@]}" "$CANONICAL_DIR/$dir/" "$repo/$dir/"
    fi
  done
}

# ── main ──────────────────────────────────────────────────────────────────────

DRY=""
case "${1:-}" in
  --help|-h)
    sed -n '2,20p' "${BASH_SOURCE[0]}"
    exit 0
    ;;
  --dry-run|-n)
    DRY="1"
    ;;
esac

if [[ -n "$DRY" ]]; then
  log "DRY RUN - no files will be written."
fi

for repo in "${FAMILY_REPOS[@]}"; do
  sync_one "$repo" "$DRY"
done

log "Done."
