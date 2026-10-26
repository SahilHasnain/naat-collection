# Brand privacy policies

The canonical repo publishes one GitHub Pages site with one policy URL per
brand. Each `apps/mobile/brands/<id>/brand.config.js` defines `privacy.policyUrl`
and `privacy.contactEmail`; `scripts/build-privacy-site.js` renders those values
into pages from `docs/privacy-policy.template.html`.

```sh
npm run build:privacy
```

Generated files go to the ignored `privacy-site/` directory and are not
committed. The Pages workflow uploads only that directory, not the rest of
`docs/`. Routes are `/privacy/<brand-id>/`; the old `/privacy-policy.html`
route redirects to the Owais Raza Qadri page for compatibility.

For each new brand, add a unique HTTPS URL ending in
`/privacy/<brand-id>/` and a contact email to its brand config. The build fails
if either value is missing or the route does not match. Update the app's store
listing to use that brand's policy URL.

The template describes optional Google sign-in/favorites sync and diagnostic
collection because those features exist in the shared app. Review the disclosure
and retention wording against each brand's enabled services and applicable
store/legal requirements before relying on it as a legal document.
