Plan: Consolidate the family apps for N projects
1. Inventory and preserve
- Audit the three repos and identify shared mobile code, project-specific changes, and main-only files.
- Treat ai-service, docker, YouTube uploads, and reel uploads as main-project-only; keep them.
- Record each project’s app IDs, Appwrite project, EAS project, assets, static exports, and required functions/infra.
2. Define project configuration
- Make one mobile codebase select a project by ID, such as APP_BRAND=<project-id>.
- Store each project’s app settings and assets separately, with validation for missing IDs and files.
- Keep each project’s EAS setup, credentials, and store listing separate. Use reusable build profiles rather than a copied app or one profile per project.
3. Consolidate mobile code
- Use the current main repo as the source of truth for shared mobile code.
- Move only genuine project-specific values and assets into per-project configuration.
- Build and test each existing project from the consolidated source before retiring its old repo.
4. Classify backend, infrastructure, and scripts
- Split functions into shared functions and explicitly project-specific variants; keep differences explicit rather than silently syncing over them.
- Classify infra and scripts similarly: shared, project-specific, or main-only.
- Clean up scripts as part of this classification, preserving main-only YouTube/reel tools.
- Remove the web app only after confirming no remaining dependencies; keep the unrelated main-only directories.
5. Keep static exports separate
- Preserve a distinct static-export destination and URL for each project.
- Ensure exports include the fields the mobile app needs, such as best and exclude.
- Avoid sharing one project’s export or fallback data with another.
6. Automate and validate
- Add a project-aware CI matrix to validate Expo config, assets, and mobile builds for every configured project.
- Test a pilot project, then migrate the remaining projects and verify IDs, assets, data sources, and EAS update/build separation.
- Once all builds use the consolidated source, retire sync-family.sh and document how to add a new project.
This keeps the main repo’s special tooling intact while making shared mobile maintenance a single change, with a repeatable onboarding path for additional projects.