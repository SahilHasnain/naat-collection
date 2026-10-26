const { Client, Databases, Query } = require("node-appwrite");
require("dotenv").config({ path: "D:/Projects/naat-collection/.env.local" });
const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);
const db = new Databases(client);
const DB = process.env.APPWRITE_DATABASE_ID, COL = process.env.APPWRITE_NAATS_COLLECTION_ID;
const TARGET = "ef13eab1b1f1c4a0c1154dc22976049ee2fe4bc3";
async function count(queries){
  let total=0, offset=0;
  while(true){
    const r = await db.listDocuments(DB, COL, [...queries, Query.limit(100), Query.offset(offset)]);
    total += r.documents.length;
    offset += r.documents.length;
    if (r.documents.length < 100) break;
  }
  return total;
}
(async () => {
  const total = await count([]);
  const done = await count([Query.equal("cutModelVersion", [TARGET])]);
  const cutDone = await count([Query.equal("cutStatus", ["done"])]);
  const haveAudio = await count([Query.isNotNull("audioId")]);
  const remaining = await count([Query.or([Query.isNull("cutModelVersion"), Query.notEqual("cutModelVersion",[TARGET])])]);
  console.log(JSON.stringify({ total, audioId_present: haveAudio, cutModelVersion_done: done, cutStatus_done: cutDone, remaining_older_or_absent: remaining }, null, 2));
})().catch(e => { console.error(e.message); process.exit(1); });