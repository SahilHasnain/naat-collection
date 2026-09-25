const { Client, Databases, Query } = require("node-appwrite");
require("dotenv").config({ path: "D:/Projects/naat-collection/.env.local" });
const c = new Client().setEndpoint(process.env.APPWRITE_ENDPOINT).setProject(process.env.APPWRITE_PROJECT_ID).setKey(process.env.APPWRITE_API_KEY);
const db = new Databases(c);
const DB = process.env.APPWRITE_DATABASE_ID, COL = process.env.APPWRITE_NAATS_COLLECTION_ID;
async function count(q){let t=0,o=0;while(true){const r=await db.listDocuments(DB,COL,[...q,Query.limit(100),Query.offset(o)]);t+=r.documents.length;o+=r.documents.length;if(r.documents.length<100)break;}return t;}
(async()=>{
  const noPlay = await count([Query.isNotNull("cutSegments"), Query.isNull("cutAudio"), Query.isNull("audioId")]);
  const segNoAudioId = await count([Query.isNotNull("cutSegments"), Query.isNull("audioId")]);
  const cutDoneNoAudio = await count([Query.equal("cutStatus",["done"]), Query.isNull("cutAudio")]);
  const cutDoneNoFileId = await count([Query.equal("cutStatus",["done"]), Query.isNull("audioId"), Query.isNull("cutAudio")]);
  const doneAndNoAudio = await count([Query.isNotNull("cutSegments"), Query.equal("cutStatus",["done"]), Query.isNull("audioId")]);
  console.log(JSON.stringify({segments_no_cutAudio_no_audioId:noPlay, segments_audioId_null_any:segNoAudioId, cutStatus_done_but_no_cutAudio:cutDoneNoAudio, done_no_audioId_no_cutAudio:cutDoneNoFileId, segments_done_no_audioId:doneAndNoAudio},null,2));
})().catch(e=>{console.error(e.message);process.exit(1);});
