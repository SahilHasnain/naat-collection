#!/usr/bin/env bash
#
# sync-family.sh
#
# One-way sync of SHARED code from the canonical family repo to the sibling
# naat apps. Each repo is a clone of the same codebase. The ONLY file that
# differs between repos is apps/mobile/brand.config.js (plus native signing
# keystores, assets and local env). Everything else is kept identical here.
#
# Canonical repo:  ./ (the repo this script lives in)
# Sibling repos:   configured below via FAMILY_REPOS (absolute or ~ paths)
#
# Uses GNU tar (bundled with Git for Windows) to copy directories — no rsync
# required. Works in Git Bash / WSL / Linux / macOS.
#
# Semantics: ADD/OVERWRITE only. Files present in the canonical repo are copied
# over the sibling versions; files unique to a sibling (e.g. production-only web
# admin pages) are kept. It does NOT delete sibling-only files, so a removed
# canonical file is not auto-removed from siblings.
#
# Usage:
#   ./scripts/sync-family.sh            # real sync
#   ./scripts/sync-family.sh --dry-run  # show what would change
#   ./scripts/sync-family.sh --help
#
# Brand-specific files are NEVER overwritten (see BRAND_PATHS below).
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
# These directories contain pure shared code. They are mirrored add/overwrite.
SHARED_DIRS=(
  "apps/mobile/app"
  "apps/mobile/components"
  "apps/mobile/contexts"
  "apps/mobile/hooks"
  "apps/mobile/services"
  "apps/mobile/utils"
  "apps/mobile/types"
  "apps/mobile/constants"
  "apps/mobile/config"
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
  "tests"
)

# Shared single files that are always overwritten.
SHARED_FILES=(
  "apps/mobile/app.config.js"
  "apps/mobile/babel.config.js"
  "apps/mobile/metro.config.js"
  "apps/mobile/global.css"
  "apps/mobile/expo-env.d.ts"
  "apps/web/next.config.mjs"
  "apps/web/package.json"
  "apps/web/postcss.config.mjs"
  "apps/web/eslint.config.mjs"
  "apps/web/README.md"
)

# Brand-specific paths: skipped even if they live inside a SHARED_DIR.
# These must NEVER be overwritten during a sync.
BRAND_PATHS=(
  # ── THE single source of brand differences ──
  "apps/mobile/brand.config.js"
  # Native signing / store secrets
  "apps/mobile/*.jks"
  "apps/mobile/credentials.json"
  "apps/mobile/upload_certificate.pem"
  "apps/mobile/google-services.json"
  "apps/mobile/GoogleService-Info.plist"
  # Local env / secrets
  ".env"
  ".env.local"
  ".env.*"
  "apps/mobile/.env"
  "apps/mobile/.env.local"
  "apps/mobile/.env.*"
  "apps/web/.env"
  "apps/web/.env.local"
  "apps/web/.env.*"
  # Native build output / assets
  "apps/mobile/android"
  "apps/mobile/ios"
  "apps/mobile/assets"
  # Entry point / bootstrap (real code fork between repos)
  "apps/mobile/index.js"
  "apps/mobile/bootstrap.js"
  "apps/mobile/bootstrap.native.js"
  "apps/mobile/bootstrap.web.js"
  # Root-level per-repo config
  "package.json"
  "tsconfig.json"
  "babel.config.js"
  "metro.config.js"
  "eslint.config.js"
  # Repo-specific build config that is allowed to diverge
  "apps/mobile/package.json"
  "apps/mobile/tsconfig.json"
  "apps/mobile/tailwind.config.js"
  "apps/mobile/eslint.config.js"
  "apps/mobile/nativewind-env.d.ts"
  "apps/mobile/sentry.properties"
  "apps/web/tsconfig.json"
  "apps/web/next-env.d.ts"
)

# ── helpers ───────────────────────────────────────────────────────────────────

log()  { printf "\033[1;34m[sync-family]\033[0m %s\n" "$*"; }
warn() { printf "\033[1;33m[sync-family]\033[0m %s\n" "$*"; }

# Builds the --exclude list for tar.
build_tar_excludes() {
  local excludes=(
    --exclude=".git"
    --exclude="node_modules"
    --exclude=".expo"
    --exclude="dist"
    --exclude=".next"
    --exclude="*.jks"
    --exclude=".env.local"
    --exclude=".env"
    --exclude=".env.*"
    --exclude="brand.config.js"
  )
  local p
  for p in "${BRAND_PATHS[@]}"; do
    excludes+=(--exclude="$p")
  done
  printf '%s\n' "${excludes[@]}"
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

    if [[ -n "$dry" ]]; then
      # Show per-file diffs without writing anything.
      local excludes=()
      # shellcheck disable=SC2207
      excludes=($(build_tar_excludes))

      local src_list dest_list
      src_list="$(cd "$CANONICAL_DIR" && tar cf - "${excludes[@]}" "./$dir" 2>/dev/null | tar tf - 2>/dev/null | grep -v '/$' || true)"
      dest_list="$(cd "$repo" && tar cf - "${excludes[@]}" "./$dir" 2>/dev/null | tar tf - 2>/dev/null | grep -v '/$' || true)"

      local changed=""
      while IFS= read -r f; do
        [[ -z "$f" ]] && continue
        local rel="${f#./}"
        if [[ ! -e "$repo/$rel" ]]; then
          changed="$changed\n  + $rel"
        elif ! diff -q "$CANONICAL_DIR/$rel" "$repo/$rel" >/dev/null 2>&1; then
          changed="$changed\n  ~ $rel"
        fi
      done <<< "$src_list"

      if [[ -n "$changed" ]]; then
        log "  [dry-run] $dir"
        printf "%b\n" "$changed"
      fi
      continue
    fi

    mkdir -p "$repo/$dir"

    local excludes=()
    # shellcheck disable=SC2207
    excludes=($(build_tar_excludes))

    # Pipe the canonical directory through tar (excluding brand/config files)
    # and extract over the sibling. Add/overwrite only — sibling-only files stay.
    (
      cd "$CANONICAL_DIR"
      tar cf - "${excludes[@]}" "./$dir" 2>/dev/null || true
    ) | (
      cd "$repo"
      tar xf - 2>/dev/null || true
    )
  done
}

# ── main ──────────────────────────────────────────────────────────────────────

DRY=""
case "${1:-}" in
  --help|-h)
    sed -n '2,26p' "${BASH_SOURCE[0]}"
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
