# Maintenance & Cleanup

This doc tracks deprecated / stale files that can be removed to keep the repo
easy to maintain. Items marked **[DONE]** have been deleted already.

## Removed — Expo Web (2026-08-29)

Mobile app is Android-only (EAS builds). Expo web was never built or deployed
(real web app is `apps/web`, a Next.js app). Deleted:

- All platform-specific web files: `app/*.web.tsx`, `app/_layout.web.tsx`,
  `components/*.web.tsx`, `contexts/AudioContext.web.tsx`,
  `hooks/useAudioPlayer.web.ts`, `hooks/useNaatPlayback.web.ts`,
  `services/audioDownload.web.ts`
- `web` config block in `apps/mobile/app.config.js`
- `web` npm script in `apps/mobile/package.json` + `mobile:web` in root `package.json`
- `apps/mobile/assets/images/favicon.png` (only used by web config)
- Local web build artifact `apps/mobile/dist/`

**[DONE]**

## Removed — vm-audio-worker / wsl-scripts (2026-08-29)

- `vm-audio-worker/` — unused audio worker. Also dropped the dangling refs:
  `worker:audio` npm script, `vm-audio-worker/cookies.txt` in `.gitignore` and
  `scripts/sync-family.sh`.
- `wsl-scripts/` — unused Android/WSL helper scripts.
- Deleted by user; refs cleaned up in this pass.

**[DONE]**

## Removed — one-off cleanup scripts

- `cleanup-non-owais-naats.js` and `non-owais-naats-report.json` (root) — one-off
  data cleanup, no longer needed.

**[DONE]**

## Flagged — safe to remove

| Path | Reason |
|---|---|
| `apps/mobile/components/_archive/` | 6 stale filter-bar components, superseded by `UnifiedFilterBar.tsx`. Nothing imports them. |
| `apps/mobile/components/archive/BackToTopButton.tsx` | Stale duplicate of `_archive`; nothing imports it. |
| `apps/mobile/tests/test-audio-player.html`, `tests/test-audio-server.js`, `tests/test-ytdlp.js` | Old web/debug test harnesses, not jest tests, not run anywhere. |
| `scripts/audio-processing/__pycache__/upload-to-huggingface.cpython-313.pyc` | Compiled bytecode committed to git. |
| `tests/error.txt`, `tests/soona-jangal.json`, `tests/test.md` | Junk test artifacts. |
| `ref/build-failed.md` | One-off debugging notes. Keep `ref/index.md`, `ref/localAi.md`, `ref/STYLING_GUIDE.md` if still referenced. |
| `scripts/youtube-upload/progress.json`, `progress-shorts.json`, `reels-progress.json` | Runtime state that keeps dirtying git. Move to `.gitignore`. |
| `apps/mobile/tests/test-ytdlp.js` | Debug script. |

## Flagged — dependencies (optional)

Web-only deps in `apps/mobile/package.json` that are now unused after removing
Expo web support. Safe to uninstall, but requires lockfile regen:

```
npm uninstall --workspace=mobile react-dom react-native-web react-native-web-webview
```

Only do this if you're sure nobody runs `expo start --web`.

## Flagged — review before deleting (may still be used)

- `docker/live-radio/` — separate live-radio deployment (Do App Platform). Confirm
  it's still deployed before removing.
- `inspiration/` — gitignored reference copies, not tracked.
- `docs/PHASE_1_COMPLETE_OLD.md`, `docs/PHASE_2_COMPLETE_OLD.md`, `docs/alt.md`,
  `docs/cmds.md`, `docs/todo/` — obsolete phase docs. Confirm before deleting.
- `.amazonq/`, `.kiro/`, `.code-review-graph/` — AI-assistant config dirs; keep if
  you still use those tools.