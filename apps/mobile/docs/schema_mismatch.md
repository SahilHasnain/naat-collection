Schema mismatches found
Brand	Collection.Field	Existing Type	Script Expected	Action Taken
anas-raza-attari	naats.duration	integer	string	Skipped (preserved)
hafiz-tahir-qadri	naats.duration	integer	string	Skipped (preserved)
naat-collection	naats.duration	integer	string	Skipped (preserved)
naat-collection	naats.cutDuration	integer	float/double	Skipped (preserved)
naat-collection	naats.pendingCutDuration	integer	float/double	Skipped (preserved)
naat-production	naats.duration	integer	string	Skipped (preserved)
naat-production	naats.cutDuration	integer	float/double	Skipped (preserved)
user_history was created/provisioned on all 4 brands. naat-production had the most missing attributes/indexes and the script filled them in.
Will this cause problems?
Frontend
- duration (int vs string): If the app expects a formatted string (e.g. "3:45"), integer seconds will render incorrectly unless formatted. If it expects seconds as a number, a string will need parsing. This is brand-dependent right now - some brands store seconds as ints, others may store formatted strings.
- cutDuration / pendingCutDuration (int vs float): These are typically seconds. Storing as integer truncates decimal precision (e.g. 12.7s becomes 12s). If your audio cutting logic relies on fractional seconds, you'd lose precision on those brands. Since the existing data is already stored as integers, changing it now would require a migration of existing documents.
Future
- Cross-brand sync/migrations: Moving data between brands or writing shared utilities will need to handle both types.
- New code assumptions: Any new feature assuming the script's "expected" type will break on brands with the legacy type.
- Schema drift: This will persist until explicitly migrated.
Recommendations
1. Keep as-is for now - The script correctly skips mismatches. Altering existing Appwrite attributes is destructive/risky and not possible to safely "convert" in-place for all cases. This is the right call.
2. Normalize on read - Make the mobile/web code defensive. For example: const dur = typeof n.duration === 'number' ? formatSeconds(n.duration) : n.duration; and for cut durations, coerce to Number() and handle both int/float. This will make all brands compatible regardless of schema drift.
3. Standardize going forward - For new brands, enforce a single schema. For existing brands with integers, either keep them (and normalize) or plan a one-time migration script that backfills/formats values.
4. Don't block on this - The mismatches won't prevent the app from running if reads are normalized. The user_history sync we just added is unaffected by these fields.
Bottom line: No immediate breakage from the provisioning itself (it skipped safely). The real fix is defensive type handling in the frontend/API layer, not forcing schema changes on existing production data.