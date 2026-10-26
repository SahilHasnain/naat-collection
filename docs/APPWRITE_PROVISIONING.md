# Appwrite provisioning

The root provisioning command creates or fills in the resources used by the
canonical mobile app and its Appwrite Functions. It is safe to rerun: existing
resources and data are not deleted or overwritten.

```sh
# Preview the selected brand's plan (no writes)
npm run provision:appwrite -- --project naat-collection

# Create missing resources
npm run provision:appwrite -- --project naat-collection --apply
```

Replace `naat-collection` with `naat-production` or `anas-raza-attari` as
needed. Select the project explicitly; the command does not default to a brand.
It loads project credentials from `APPWRITE_API_KEY` (or
`APPWRITE_SECRET_KEY`), shell variables, or the selected brand's env file. The
selected brand's `brand.config.js` supplies the Appwrite endpoint, project ID,
database ID, and collection IDs. Optional collection/bucket IDs can be
overridden with their corresponding `APPWRITE_*_ID` variables.

The API key needs database, collection, attribute, index, bucket, and file
management scopes. Provisioning covers the database, six document collections
(including attributes and indexes), the `voice_variants` TablesDB table, and
the audio/cut-audio storage buckets. Public-facing collections and buckets get
read-only public permissions; job/cache resources are private. Existing
resource permissions are not changed.

Create the Appwrite project and API key in the Appwrite Console first. Function
deployment, function secrets/schedules, Auth providers, and external services
such as YouTube API credentials are intentionally separate from this schema
provisioner.

The cookie-based audio downloader also requires an explicit brand selection:

```sh
npm run download:audio -- --project naat-production --limit=10 --test
```

Keep each brand's Appwrite API key in `.env.<brand>` or
`apps/mobile/.env.<brand>` (or supply it in the shell). The downloader does not
load a generic `.env.local`, and it stores logs and temporary audio in
brand-specific directories to avoid mixing project runs.
