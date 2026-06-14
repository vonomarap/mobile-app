import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import crypto from "node:crypto";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function mustEnv(name, fallback) {
  const v = (process.env[name] ?? "").trim();
  return v || fallback;
}

function ensureTrailingSlash(url) {
  return url.endsWith("/") ? url : `${url}/`;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractMetaContent(tokenOrTag) {
  const s = String(tokenOrTag ?? "").trim();
  if (!s) return "";

  // Site Verification API may return a full HTML tag.
  const m = s.match(/content\\s*=\\s*([\"'])(.*?)\\1/i);
  if (m && m[2]) return m[2].trim();

  // Otherwise assume token string.
  return s;
}

async function postForm(url, form) {
  const body = new URLSearchParams(form);
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body
  });
  const json = await res.json().catch(() => ({}));
  return { res, json };
}

async function jsonRequest(url, { method, accessToken, body }) {
  const res = await fetch(url, {
    method,
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json"
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  return { res, text, json };
}

async function put(url, { accessToken }) {
  const res = await fetch(url, {
    method: "PUT",
    headers: { authorization: `Bearer ${accessToken}` }
  });
  const text = await res.text().catch(() => "");
  return { res, text };
}

async function ping(url) {
  try {
    const res = await fetch(url, { method: "GET" });
    return res.status;
  } catch {
    return 0;
  }
}

function run(cmd, args, { cwd }) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${args.join(" ")} exited with code ${code}`));
    });
  });
}

async function getAuthCodeViaLocalhost({ clientId, scopes }) {
  return new Promise((resolve, reject) => {
    const state = crypto.randomBytes(16).toString("hex");

    const server = http.createServer((req, res) => {
      try {
        const url = new URL(req.url || "/", "http://localhost");
        const code = url.searchParams.get("code");
        const returnedState = url.searchParams.get("state");
        const err = url.searchParams.get("error");

        if (err) {
          res.writeHead(400, { "content-type": "text/plain; charset=utf-8" });
          res.end(`OAuth error: ${err}`);
          server.close();
          reject(new Error(`OAuth error: ${err}`));
          return;
        }

        if (!code) {
          res.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
          res.end("Waiting for Google OAuth redirect...");
          return;
        }

        if (returnedState !== state) {
          res.writeHead(400, { "content-type": "text/plain; charset=utf-8" });
          res.end("Invalid OAuth state.");
          server.close();
          reject(new Error("Invalid OAuth state"));
          return;
        }

        res.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
        res.end("Success. You can close this tab and return to Termux.");
        server.close();
        resolve({ code, port: server.address()?.port });
      } catch (e) {
        server.close();
        reject(e);
      }
    });

    server.listen(0, "127.0.0.1", async () => {
      const addr = server.address();
      const port = typeof addr === "object" && addr ? addr.port : null;
      if (!port) {
        server.close();
        reject(new Error("Failed to bind localhost server"));
        return;
      }

      const redirectUri = `http://localhost:${port}`;
      const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      authUrl.searchParams.set("client_id", clientId);
      authUrl.searchParams.set("redirect_uri", redirectUri);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("scope", scopes.join(" "));
      authUrl.searchParams.set("state", state);
      authUrl.searchParams.set("access_type", "offline");
      authUrl.searchParams.set("prompt", "consent");
      authUrl.searchParams.set("include_granted_scopes", "true");

      console.log("\nOpen this URL and approve access (Google will redirect back to localhost):");
      console.log(authUrl.toString());

      // Best-effort: open in Android browser automatically.
      try {
        await run("termux-open-url", [authUrl.toString()], { cwd: process.cwd() });
      } catch {
        // ignore (manual open is fine)
      }

      console.log("\nWaiting for Google OAuth redirect...");
    });
  });
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");

const SITE_URL = ensureTrailingSlash(mustEnv("SEO_SITE_URL", "https://kanokna.org/"));
const FIREBASE_PROJECT_ID = mustEnv("SEO_FIREBASE_PROJECT_ID", "window-door-store-20260215");

// Firebase CLI OAuth client credentials (public, used for localhost redirect auth code flow).
const CLIENT_ID = mustEnv(
  "SEO_GOOGLE_OAUTH_CLIENT_ID",
  "563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com"
);
const CLIENT_SECRET = mustEnv("SEO_GOOGLE_OAUTH_CLIENT_SECRET", "j9iVZfS8kkCEFUPaAeJV0sAi");

const SCOPES = [
  "openid",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/siteverification",
  "https://www.googleapis.com/auth/webmasters"
];

console.log(`Site: ${SITE_URL}`);
console.log(`Firebase project: ${FIREBASE_PROJECT_ID}`);

console.log("\nStep 1/5: Google OAuth (localhost redirect)");
const { code, port } = await getAuthCodeViaLocalhost({ clientId: CLIENT_ID, scopes: SCOPES });
const redirectUri = `http://localhost:${port}`;

console.log("\nExchanging auth code for access token...");
const tokenRes = await postForm("https://oauth2.googleapis.com/token", {
  code,
  client_id: CLIENT_ID,
  client_secret: CLIENT_SECRET,
  redirect_uri: redirectUri,
  grant_type: "authorization_code"
});

if (!tokenRes.res.ok || !tokenRes.json.access_token) {
  console.error("Token exchange failed:", tokenRes.json);
  process.exit(1);
}

const accessToken = tokenRes.json.access_token;

console.log("\nStep 2/5: Get Google site verification token (META)");
const tokenResp = await jsonRequest("https://www.googleapis.com/siteVerification/v1/token", {
  method: "POST",
  accessToken,
  body: { site: { type: "SITE", identifier: SITE_URL }, verificationMethod: "META" }
});

if (!tokenResp.res.ok) {
  console.error("Site Verification token request failed:", tokenResp.text);
  process.exit(1);
}

const metaContent = extractMetaContent(tokenResp.json?.token);
if (!metaContent) {
  console.error("Unexpected Site Verification token response:", tokenResp.json);
  process.exit(1);
}

const tokenFilePath = path.join(repoRoot, "seo", "google-site-verification.txt");
fs.mkdirSync(path.dirname(tokenFilePath), { recursive: true });
fs.writeFileSync(tokenFilePath, `${metaContent}\n`, { encoding: "utf8" });

console.log("Token saved into seo/google-site-verification.txt");

console.log("\nStep 3/5: Deploy web (to publish the verification meta tag)");
await run("sh", ["./deploy-web.sh", FIREBASE_PROJECT_ID], { cwd: repoRoot });

console.log("\nStep 4/5: Verify site ownership via Site Verification API");
// Wait until the meta tag is visible on the live site.
for (let attempt = 1; attempt <= 30; attempt++) {
  const page = await fetch(SITE_URL, { method: "GET" }).then((r) => r.text()).catch(() => "");
  const re = new RegExp(
    `<meta\\s+[^>]*name=[\"']google-site-verification[\"'][^>]*content=[\"']${escapeRegExp(metaContent)}[\"']`,
    "i"
  );
  if (re.test(page)) break;
  await sleep(1500);
  if (attempt === 30) {
    console.error("Verification meta tag not detected on the live site. Aborting.");
    process.exit(1);
  }
}

const verifyResp = await jsonRequest("https://www.googleapis.com/siteVerification/v1/webResource?verificationMethod=META", {
  method: "POST",
  accessToken,
  body: { site: { type: "SITE", identifier: SITE_URL } }
});

if (!verifyResp.res.ok) {
  console.error("Site Verification insert failed:", verifyResp.text);
  process.exit(1);
}

console.log("Site verified.");

console.log("\nStep 5/5: Add site to Google Search Console and submit sitemap");
const siteUrlEnc = encodeURIComponent(SITE_URL);
const sitemapUrl = `${SITE_URL}sitemap.xml`;
const sitemapEnc = encodeURIComponent(sitemapUrl);

// Add site property (idempotent).
{
  const { res } = await put(`https://www.googleapis.com/webmasters/v3/sites/${siteUrlEnc}`, { accessToken });
  if (!res.ok && res.status !== 409) console.warn(`Search Console sites.add returned status: ${res.status}`);
}

// Submit sitemap (idempotent).
{
  const { res, text } = await put(`https://www.googleapis.com/webmasters/v3/sites/${siteUrlEnc}/sitemaps/${sitemapEnc}`, { accessToken });
  if (!res.ok) console.warn(`Sitemap submit returned status: ${res.status} ${text || ""}`.trim());
}

// Best-effort ping.
const googlePingStatus = await ping(`https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`);
const bingPingStatus = await ping(`https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`);

console.log("\nDone.");
console.log(`Search Console property: ${SITE_URL}`);
console.log(`Sitemap: ${sitemapUrl}`);
console.log(`Google ping status: ${googlePingStatus || "n/a"}`);
console.log(`Bing ping status: ${bingPingStatus || "n/a"}`);
console.log("\nNote: Search results may take hours to days to update.");

