# Mobile projects

The mobile app is shared; each project keeps its own configuration and native
assets in `brands/<project-id>/`. Project configs are discovered from that
directory. Metro resolves a small set of static asset aliases to only the
selected project's files, so other projects' logos are not included in its
bundle.

Select a project by ID for local work:

```sh
npm run project:config -- naat-collection
npm run project:config -- naat-production
npm run project:config -- anas-raza-attari
npm run project:config -- hafiz-tahir-qadri
npm run project:build -- naat-production --profile production --platform android
```

For a new project, add `brands/<id>/brand.config.js` and its assets under
`brands/<id>/assets/`. Required images are `images/android-icon-foreground.png`,
`images/splash-icon.png`, `images/google.png`, `images/headphone-v1.png`, and
`images/gumbad.png`; the adaptive icon path may also be set in its config.
Configure that project's EAS environment/secrets and credentials in its own
EAS project. Set `APP_PROJECT_ID=<id>` in that EAS project's build environment
so remote builds use the same selection. Static exports live in the canonical
repo at `static-exports/<id>/`; the main project's root export files are kept
only for YouTube/reel tooling.

`APP_PROJECT_ID` defaults to `naat-collection` when omitted. Validate project
config with `npm run project:config -- <project-id>` before building. Do not
put project-specific Appwrite values in shared `eas.json` profiles; project
settings are sourced from the selected brand config.

Each brand config also defines its public `privacy.policyUrl` and contact
email. The GitHub Pages workflow renders every registered brand's policy from
`docs/privacy-policy.template.html` at that URL. For a new project, set its
policy URL/contact in `brand.config.js`; the workflow then publishes it with
the other policies.

The current `naat-production` config has an empty EAS project ID from its
source repository; populate it before attempting EAS builds for that project.
