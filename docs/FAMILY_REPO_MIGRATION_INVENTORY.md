# Family repo migration inventory

**Reviewed:** 2026-10-26  
**Scope:** `naat-collection` (canonical), `naat-production`, and `anas-raza-attari`.  
This is a read-only comparison of sibling repos; no sibling repo was changed.

## Decisions at a glance

| Classification | Decision |
| --- | --- |
| Shared mobile/backend source | Keep one canonical source and configure/deploy it separately for each Appwrite project. Never share project credentials or data. |
| Main-only operations and assets | Keep in the canonical repo, but do not treat them as family-synced files. |
| Brand/project-specific operations | Keep isolated under a project-specific path or require an explicit project selection before use. |
| Unsafe, stale, or incompatible utilities | Do not migrate until reviewed, corrected, and tested against each project's schema. |
| Retired web implementation | Do not restore; the share handoff and web audio stream endpoint were explicitly retired. |

## Appwrite functions

### Already common to all three repos

These function sources are present in all three repos and are the shared baseline:

- `ab-audio-export`
- `auto-queue-ai-jobs-cron`
- `create-voice-transform-job`
- `cut-audio-cron`
- `delete-original-audio-cron`
- `increment-naat-view`
- `ingest-playlists`
- `tests/extract-audio.test.js` and `tests/ingest-videos.test.js`

The `auto-queue-ai-jobs-cron/tsconfig.json` differs between repos. The canonical
repo also has a `delete-original-audio-cron/tsconfig.json` absent from siblings.
Keep project configuration and function deployment IDs/secrets separate even
when deploying the same source to multiple Appwrite projects.

### Sibling-only source: shared candidates, not yet imported

Present in both sibling repos but absent from canonical:

- `extract-audio`: good shared-function candidate. It takes Appwrite database,
  collection, bucket, and API credentials from environment variables. Deploy
  separately with each brand's values. Do **not** copy `cookies.txt`; Anas has
  an ignored local cookie file, which is a credential, not source. Supply
  `YTDLP_COOKIES`/`YTDLP_COOKIES_PATH` through a secret if the target deployment
  needs YouTube cookies.
- `cleanup-stale-listeners`: shared intent, but not safe to deploy as-is. It
  hardcodes the collection ID and queries `lastHeartbeat`; the sibling
  `setup-full-project.js` creates `live_radio_listeners.lastPing` instead.
  Resolve the collection/attribute contract and make the ID configurable first.
- `semantic-search`: potentially shared only for projects that enable it and
  provision their own OpenAI and Supabase credentials. The sibling batch
  embedder uses Groq `nomic-embed-text-v1.5`, while this search function creates
  OpenAI `text-embedding-3-small` vectors. Those models/dimensions are not
  interchangeable; align the embedding pipeline, schema, and RPC before
  enabling this function. Current brand feature flags keep semantic search off.
- `tools/export-youtube-cookies.js`: project-neutral operator utility, not an
  Appwrite function. Keep it only if the shared extract-audio workflow needs
  it; never commit exported cookie contents.
- `tools/Dockerfile`: auxiliary cookie/export tooling, not runtime app code.
  Retain only if the operator utility is adopted; it is not required for app
  builds.

### Sibling-only source: do not share unchanged

- `ingest-videos`: source is identical in the siblings, but its non-official
  channel filter explicitly accepts Owais/Qadri spellings and rejects other
  performers. It would silently exclude Anas content. Make performer/filter
  policy project-configurable before using it as a shared function.
- `stream-audio`: do not migrate. This is the retired web audio-streaming
  endpoint, and the user chose to retire all web features.

### Function packaging note

`functions/package.json` is named `ingest-videos` although it sits at the
functions root and many deployable functions have their own packages. Treat
each Appwrite function directory as an independently packaged/deployed unit;
do not use that root manifest as the family-wide deployment contract without
first correcting its ownership and dependencies.

## Scripts

The existing common script trees are substantially identical across all three
repos. The extra sibling files fall into these groups:

### Reusable operator tooling, after project selection is made explicit

- Training workflow: `scripts/audio-processing/colab-finetune.py`,
  `export-training-data.js`, `upload-to-huggingface.py`, and `RETRAIN.md`.
  These are shared workflow tools, but datasets/models remain separately
  governed. **Do not run the exporter as-is:** it recursively deletes the
  current `training-data/` directory before exporting. Add a guarded,
  project-scoped output directory and explicit overwrite confirmation first.
- `scripts/data-management/list-channels.js`: generic read-only utility, but
  it currently loads the default mobile `.env.local`, which can select the
  main project accidentally. Make its project selection explicit before
  promoting it.
- `scripts/add-channel.js`: broadly reusable YouTube/Appwrite operator flow,
  but it also loads the default mobile env and currently treats unspecified
  channels as official. Make both project selection and official/other flags
  explicit before promotion.
- `scripts/delete-channel.js`: reusable in concept, but destructive; it only
  fetches the first 100 channels, deletes naat documents without deleting
  their audio files, and uses the default mobile env. Keep out of shared
  operator paths until pagination, audio cleanup, dry-run, and project
  confirmation are addressed.
- `scripts/data-management/ingest-playlist.js`: do not treat as generic yet;
  it defaults to the Anas Appwrite project/database and creates the Anas
  `pl_<id>` channel ID convention.

### Explicitly brand/data scoped

- `scripts/data-management/add-anas-channels.js` is Anas-specific and hardcodes
  Anas's Appwrite project, database, channel IDs, and document IDs. If retained,
  place it under a clearly scoped `scripts/projects/anas-raza-attari/` path.
- `scripts/data-management/count-naats-per-channel.js` and
  `delete-all-channels-except-voice-of-ids.js` contain Naat Production channel
  IDs and Voice-of-IDS-specific policy. The latter deletes documents and audio
  files; do not expose it as a generic family operation.

### Project bootstrap and incident artifacts: do not promote blindly

- `scripts/setup/setup-full-project.js` appears in both sibling repos, but
  hardcodes collection/bucket IDs and assumes a particular schema/database
  layout. It can create public permissions and is not a migration for already
  provisioned projects. Reconcile it with each brand's actual Appwrite schema
  before turning it into a canonical bootstrap tool.
- Production-only setup files (`cleanup-appwrite.js`, generated/fixed setup
  scripts, and `appwrite-postmortem.json`/`postmortem-appwrite.js`) are
  project recovery/incident artifacts. In particular, `cleanup-appwrite.js`
  deletes every database and bucket in its selected Appwrite project. Do not
  migrate these into routine shared tooling.

### Main-only media/upload tooling

Keep the canonical repo's YouTube/reel automation and channel assets as
main-only. Do not sync those scripts, profiles, progress files, or channel
assets into either sibling app's project. Browser profiles, cookies, logs,
temp reels, and progress state are runtime/local data, not portable source.

## Infrastructure

- `infra/android-ci` Docker/runner bootstrap code is largely the same across
  the repos, but `.env.example` files describe different runner setups. Keep
  runner credentials and local VM paths out of shared brand config.
- The current Android workflow uses GitHub-hosted `ubuntu-latest` and Expo
  prebuild; it does not consume this Docker/self-hosted runner setup. Treat the
  Docker runner as optional/legacy infrastructure until the workflow is
  intentionally moved back to a self-hosted runner.
- Root `docker/`, `apps/ai-service/`, and main media assets remain canonical
  main-only components per the consolidation requirements.

## Recommended next migration order

1. Add `functions/extract-audio` once its per-project secrets/bucket settings
   and deployment contract are documented; explicitly exclude cookie files.
2. Parameterize and test `cleanup-stale-listeners` against the real listener
   schema before adding it.
3. Decide whether semantic search is enabled per project; first align embedding
   models and vector dimensions, then add the function and batch pipeline.
4. Parameterize ingestion filtering before migrating `ingest-videos`.
5. Leave `stream-audio`, destructive setup/cleanup scripts, and sibling-only
   channel automation excluded unless a new, explicit replacement requirement
   is approved.
