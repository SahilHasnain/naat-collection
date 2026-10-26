# Runtime configuration

`config/brand.ts` reads the project selected by `APP_PROJECT_ID` from Expo's
embedded manifest. `config/appwrite.ts` adapts that brand's Appwrite settings
and static fallback URLs for the shared API client.

Project definitions and assets live in `apps/mobile/brands/<project-id>/`.
See [`../BRANDS.md`](../BRANDS.md) for selecting a project, adding one, and
setting up its EAS environment.

Do not store server secrets in `brand.config.js` or Expo `extra`; anything
embedded in a mobile app is visible to its users.
