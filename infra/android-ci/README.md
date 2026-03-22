# Android CI/CD Foundation

This folder contains the foundation for building the Android app on a
DigitalOcean droplet with a self-hosted GitHub Actions runner and using the
native Android Fastlane setup in [apps/mobile/android/fastlane](/c:/Users/MD%20SAHIL%20HASNAIN/desktop/projects/naat-collection/apps/mobile/android/fastlane).

## Goal

- Avoid EAS Build limits.
- Avoid Windows local Android build issues.
- Build Android release artifacts on a Linux droplet.
- Use Fastlane to manage Play Store delivery.

## Recommended Architecture

1. Create a dedicated Ubuntu droplet for Android CI.
2. Register it as a GitHub Actions self-hosted runner.
3. Install Java, Android SDK command-line tools, Ruby, Bundler, and Fastlane.
4. Store signing keys and service-account credentials as GitHub secrets.
5. Run the workflow in [.github/workflows/android-self-hosted.yml](/c:/Users/MD%20SAHIL%20HASNAIN/desktop/projects/naat-collection/.github/workflows/android-self-hosted.yml).

## Folder Contents

- `Dockerfile`: optional container image for the runner environment.
- `docker-compose.yml`: optional runner container wiring.
- `.env.example`: variables used by the runner container/bootstrap.
- `scripts/bootstrap-runner.sh`: installs the system dependencies on Ubuntu.
- `scripts/install-android-sdk.sh`: installs Android SDK command-line tooling.
- `scripts/start-runner.sh`: starts the GitHub runner process.

## Current Repo Assumptions

- Fastlane lives in `apps/mobile/android/fastlane`.
- The correct Android project for CI is `apps/mobile/android/`.
- Release signing and Play publishing are not fully wired from CI yet.

## GitHub Secrets To Plan For

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`
- `PLAY_STORE_JSON_KEY_BASE64`
- `SENTRY_AUTH_TOKEN`
- `GH_RUNNER_TOKEN`

## Suggested Next Steps

1. Provision the droplet and install Docker or the runner directly.
2. Create a dedicated GitHub self-hosted runner label like `android-do`.
3. Put the Play service-account JSON into GitHub secrets as base64.
4. Add the GitHub runner to the repo with the `android-do` label.
5. Start with `workflow_dispatch`, then automate push/tag releases later.

## Notes

- The workflow is intentionally conservative and manual-first.
- Release signing now reads from environment variables in Gradle.
