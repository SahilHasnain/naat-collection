#!/usr/bin/env node

const { google } = require("googleapis");
const http = require("http");
const url = require("url");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");

dotenv.config({ path: path.join(__dirname, "../../.env") });

const PORT = 34567;
const REDIRECT_URI = `http://localhost:${PORT}`;

const SCOPES = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.force-ssl",
];

async function main() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error("Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in .env");
    process.exit(1);
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
  });

  console.log("\nOpening browser for authorization...");
  console.log(`If it doesn't open automatically, visit:\n${authUrl}\n`);

  // Try to open the browser
  try {
    const { execSync } = require("child_process");
    const platform = process.platform;
    if (platform === "win32") {
      execSync(`start "" "${authUrl}"`, { stdio: "ignore" });
    } else if (platform === "darwin") {
      execSync(`open "${authUrl}"`, { stdio: "ignore" });
    } else {
      execSync(`xdg-open "${authUrl}"`, { stdio: "ignore" });
    }
  } catch {}

  const code = await new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      const parsed = url.parse(req.url, true);
      if (parsed.query.code) {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end("<h3>Authorization successful! You can close this tab.</h3>");
        server.close();
        resolve(parsed.query.code);
      } else if (parsed.query.error) {
        res.writeHead(400, { "Content-Type": "text/html" });
        res.end(`<h3>Error: ${parsed.query.error}</h3>`);
        server.close();
        reject(new Error(parsed.query.error));
      } else {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end("<h3>Waiting for authorization...</h3>");
      }
    });
    server.listen(PORT, () => {
      console.log(`Listening for callback on http://localhost:${PORT}...`);
    });
  });

  const { tokens } = await oauth2Client.getToken(code);
  console.log("\n✅ Success! Add this to your .env:\n");
  console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}\n`);

  // Auto-update .env
  const envPath = path.join(__dirname, "../../.env");
  const envContent = fs.readFileSync(envPath, "utf-8");
  if (envContent.includes("GOOGLE_REFRESH_TOKEN=")) {
    const updated = envContent.replace(
      /GOOGLE_REFRESH_TOKEN=.*/,
      `GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`,
    );
    fs.writeFileSync(envPath, updated);
  } else {
    fs.appendFileSync(envPath, `\nGOOGLE_REFRESH_TOKEN=${tokens.refresh_token}\n`);
  }
  console.log("✓ Automatically written to .env");
}

main().catch((err) => {
  console.error("\nError:", err.message);
  process.exit(1);
});
