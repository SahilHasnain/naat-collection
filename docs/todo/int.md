Deployment steps (aapko manually karni hain)

  # 1. Collection banao
  node scripts/setup/setup-naats-metadata-cache.js
  # 2. Cron function deploy karo
  cd functions/sync-naats-metadata && npm install
  # 3. Appwrite Console mein cron set karo: har 6 ghante
  # 4. Pehli sync manually trigger karo taake cache populate ho

  Cron chalne se pehle client expensive fallback use karega (direct 5000 naats fetch) — is liye pehli sync zaroor chalao.

  Koi specific part test karna ho ya deployment mein help chahiye ho to bata dena.