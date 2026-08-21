/**
 * Generate admin/top-naats.html from live Appwrite data.
 *
 * Usage:  node admin/generate.js
 *         (reads .env / .env.local from repo root)
 *
 * Output: admin/top-naats.html
 */

const fs = require('fs');
const path = require('path');
const { Client, Databases, Query } = require('node-appwrite');

// ── env ────────────────────────────────────────────────────────────────────
// .env.local has DB/collection IDs – load it first, then .env as fallback
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const ENDPOINT  = process.env.APPWRITE_ENDPOINT  || 'https://sgp.cloud.appwrite.io/v1';
const PROJECT   = process.env.APPWRITE_PROJECT_ID;
const API_KEY   = process.env.APPWRITE_API_KEY;
const DB_ID     = process.env.APPWRITE_DATABASE_ID;
const NAATS_ID  = process.env.APPWRITE_NAATS_COLLECTION_ID;

if (!PROJECT || !API_KEY || !DB_ID || !NAATS_ID) {
  console.error('Missing env vars – need APPWRITE_PROJECT_ID, APPWRITE_API_KEY, APPWRITE_DATABASE_ID, APPWRITE_NAATS_COLLECTION_ID');
  process.exit(1);
}

// ── appwrite client ─────────────────────────────────────────────────────────
const client = new Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT)
  .setKey(API_KEY);

const db = new Databases(client);

// ── fetch top 50 by appView descending ─────────────────────────────────────
async function fetchTop50() {
  const all = [];
  let offset = 0;
  const limit = 100;

  // fetch until we have 50 non-excluded docs sorted by appView desc
  // Appwrite doesn't support sort-by-attribute in all SDKs the same way,
  // so we query descending by appView using orderDesc.
  while (all.length < 50) {
    const batch = await db.listDocuments(DB_ID, NAATS_ID, [
      Query.orderDesc('appView'),
      Query.limit(limit),
      Query.offset(offset),
    ]);
    if (batch.documents.length === 0) break;
    all.push(...batch.documents);
    offset += limit;
    // safety: stop if we fetched a full page and still have < 50 after filtering
    if (batch.documents.length < limit) break;
  }

  // exclude Tayyiba Production (isOther channel)
  return all.filter(d => d.channelName !== 'Tayyiba Production').slice(0, 50);
}

// ── helpers ─────────────────────────────────────────────────────────────────
function fmtDur(s) {
  if (!s) return '0:00';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return h + ':' + String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
  return m + ':' + String(sec).padStart(2, '0');
}

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const CHANNEL_COLORS = {
  'Baghdadi Sound & Video': { bg: 'rgba(6,78,59,0.4)',  text: '#6ee7b7', border: 'rgba(6,122,80,0.5)' },
  'Owais Raza Qadri':      { bg: 'rgba(30,58,138,0.4)', text: '#93c5fd', border: 'rgba(59,130,246,0.5)' },
  'Ubaid e Raza':           { bg: 'rgba(88,28,135,0.4)', text: '#d8b4fe', border: 'rgba(147,51,234,0.5)' },
  'Tayyiba Production':     { bg: 'rgba(153,27,27,0.4)', text: '#fca5a5', border: 'rgba(220,38,38,0.5)' },
};

// ── build HTML ──────────────────────────────────────────────────────────────
function buildRow(n, rank) {
  const cc = CHANNEL_COLORS[n.channelName] || { bg: 'rgba(55,65,81,0.4)', text: '#9ca3af', border: 'rgba(75,85,99,0.5)' };
  const rankColor = rank === 1 ? '#fbbf24' : rank === 2 ? '#d1d5db' : rank === 3 ? '#d97706' : rank <= 10 ? '#9ca3af' : '#6b7280';
  const rankSize  = rank <= 3 ? '22px' : rank <= 10 ? '18px' : '14px';
  const views     = n.appView || 0;
  const vid       = n.youtubeId || '';

  return `<div style="background:#111827;border:1px solid #1f2937;border-radius:12px;padding:16px;display:flex;align-items:flex-start;gap:16px;transition:border-color 0.2s" onmouseover="this.style.borderColor='#374151'" onmouseout="this.style.borderColor='#1f2937'">
  <span style="color:${rankColor};font-size:${rankSize};font-weight:${rank<=10?'800':'600'};width:32px;text-align:center;flex-shrink:0;padding-top:2px;align-self:center">${rank}</span>
  <img src="https://img.youtube.com/vi/${vid}/mqdefault.jpg" alt="" style="width:112px;height:80px;border-radius:8px;object-fit:cover;flex-shrink:0" loading="lazy" />
  <div style="min-width:0;flex:1">
    <a href="https://youtube.com/watch?v=${vid}" target="_blank" style="font-size:14px;font-weight:500;color:#f3f4f6;text-decoration:none;line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${esc(n.title)}</a>
    <div style="display:flex;align-items:center;gap:8px;margin-top:8px;flex-wrap:wrap">
      <span style="font-size:11px;padding:2px 8px;border-radius:9999px;background:${cc.bg};color:${cc.text};border:1px solid ${cc.border}">${esc(n.channelName)}</span>
      <span style="font-size:11px;color:#6b7280">${fmtDur(n.duration)}</span>
      ${n.cutAudio ? '<span style="font-size:10px;color:#f59e0b">✂ cut</span>' : ''}
    </div>
  </div>
  <div style="text-align:right;flex-shrink:0">
    <div style="font-size:28px;font-weight:900;color:#fff;line-height:1">${views}</div>
    <div style="font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em">views</div>
  </div>
</div>`;
}

function buildHtml(rows) {
  const today = new Date().toISOString().slice(0, 10);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Top 50 Naats - Admin</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; background: #030712; color: #f3f4f6; min-height: 100vh; }
  </style>
</head>
<body>
  <div style="max-width:960px;margin:0 auto;padding:32px 24px">
    <div style="margin-bottom:32px">
      <h1 style="font-size:30px;font-weight:700;color:#fff">Top 50 Naats by App Views</h1>
      <p style="color:#9ca3af;margin-top:4px">Ranked by in-app view count &middot; Updated ${today}</p>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(420px,1fr));gap:12px">
${rows}
    </div>
  </div>
</body>
</html>`;
}

// ── main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('Fetching top 50 naats by appView…');
  const naats = await fetchTop50();
  console.log(`Got ${naats.length} documents`);

  const rows = naats.map((n, i) => buildRow(n, i + 1)).join('\n');
  const html = buildHtml(rows);

  const out = path.join(__dirname, 'top-naats.html');
  fs.writeFileSync(out, html);
  console.log(`Written ${out} (${(html.length / 1024).toFixed(1)} KB)`);
}

main().catch(err => { console.error(err); process.exit(1); });
