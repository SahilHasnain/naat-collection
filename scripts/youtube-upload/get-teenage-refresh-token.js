#!/usr/bin/env node

const { google } = require("googleapis");
const http = require("http");
const url = require("url");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");

const envPath = path.join(__dirname, "../../.env");
dotenv.config({ path: envPath });

const PORT = 34568;
const TOKEN_ENV_KEY = "GOOGLE_REFRESH_TOKEN_TEENAGE";
const REDIRECT_URI = `http://localhost:${PORT}`;
const SCOPES = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.force-ssl",
];

async function main() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in .env");
  }

  const oauth = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);
  const authUrl = oauth.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
  });

  console.log("Authorize the Google account/channel for the teenage-voice channel.");
  console.log(`If the browser does not open, visit:\n${authUrl}\n`);
  try {
    if (process.platform === "win32") execSync(`start "" "${authUrl}"`, { stdio: "ignore" });
    else if (process.platform === "darwin") execSync(`open "${authUrl}"`, { stdio: "ignore" });
    else execSync(`xdg-open "${authUrl}"`, { stdio: "ignore" });
  } catch {}

  const code = await new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const parsed = url.parse(req.url, true);
      if (parsed.query.code) {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end("<h3>Authorization successful. You can close this tab.</h3>");
        server.close();
        resolve(parsed.query.code);
      } else if (parsed.query.error) {
        res.writeHead(400, { "Content-Type": "text/html" });
        res.end("<h3>Authorization failed. You can close this tab.</h3>");
        server.close();
        reject(new Error(String(parsed.query.error)));
      } else {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end("<h3>Waiting for Google authorization...</h3>");
      }
    });
    server.listen(PORT, "127.0.0.1", () => {
      console.log(`Waiting for OAuth callback on ${REDIRECT_URI}`);
    });
    server.on("error", reject);
  });

  const { tokens } = await oauth.getToken(code);
  if (!tokens.refresh_token) {
    throw new Error("Google did not return a refresh token. Revoke this app's access and authorize again.");
  }

  let envText = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
  const tokenLine = `${TOKEN_ENV_KEY}=${tokens.refresh_token}`;
  const tokenPattern = new RegExp(`^${TOKEN_ENV_KEY}=.*$`, "m");
  envText = tokenPattern.test(envText)
    ? envText.replace(tokenPattern, tokenLine)
    : `${envText}${envText && !envText.endsWith("\n") ? "\n" : ""}${tokenLine}\n`;
  fs.writeFileSync(envPath, envText);
  console.log(`Saved ${TOKEN_ENV_KEY} to .env. The existing channel refresh token was left unchanged.`);
}

main().catch((err) => {
  console.error("Teenage channel authorization failed:", err.message);
  process.exit(1);
});
