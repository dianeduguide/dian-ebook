// The small server side of the book page.
//
// The PDF is not a public file. A student signs up, this saves the signup to the
// Google Sheet, and only then hands back a download link that stops working after
// an hour. Everything else on the site (the page, images, styles) is served
// straight from public/ and never reaches this code.

import bookPdf from "../book/250-in-JAMB-A1-in-WAEC-Joshua-John.pdf";

const FILE_NAME = "250-in-JAMB-A1-in-WAEC-Joshua-John.pdf";
const LINK_LIFETIME_SECONDS = 60 * 60;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const NO_INDEX = { "X-Robots-Tag": "noindex, nofollow", "Cache-Control": "no-store" };

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/signup") {
      if (request.method !== "POST") return json({ ok: false, error: "method" }, 405);
      return signup(request, env, url);
    }

    if (url.pathname === "/download") {
      if (request.method !== "GET" && request.method !== "HEAD") return json({ ok: false, error: "method" }, 405);
      return download(request, env, url);
    }

    // Old public address of the book (and any other PDF path): gone for good,
    // which also tells search engines to drop it.
    if (url.pathname.toLowerCase().endsWith(".pdf")) {
      return new Response("This file has moved. Get the book at " + url.origin + "/", { status: 410, headers: NO_INDEX });
    }

    return new Response("Not found", { status: 404, headers: NO_INDEX });
  },
};

async function signup(request, env, url) {
  if (!env.DOWNLOAD_SECRET || !env.SIGNUP_URL) {
    console.error("Missing setting: DOWNLOAD_SECRET (secret) and SIGNUP_URL (wrangler.jsonc) are both required.");
    return json({ ok: false, error: "not_configured" }, 500);
  }

  // Only our own page may submit the form.
  const origin = request.headers.get("Origin");
  if (origin && origin !== url.origin) return json({ ok: false, error: "origin" }, 403);

  let input;
  try {
    input = await request.json();
  } catch {
    return json({ ok: false, error: "invalid" }, 400);
  }

  const name = clean(input.name, 60);
  const email = clean(input.email, 120).toLowerCase();
  if (!name || !EMAIL_RE.test(email)) return json({ ok: false, error: "invalid" }, 400);
  // Bots fill in the hidden field. Give them nothing.
  if (clean(input.company, 60)) return json({ ok: false, error: "invalid" }, 400);

  let saved = false;
  try {
    const res = await fetch(env.SIGNUP_URL, {
      method: "POST",
      body: new URLSearchParams({
        name,
        email,
        source: clean(input.source, 60),
        campaign: clean(input.campaign, 60),
        page: clean(input.page, 100),
      }),
    });
    const data = await res.json();
    saved = Boolean(data && data.ok);
  } catch (err) {
    console.error("Saving the signup failed:", err);
  }
  if (!saved) return json({ ok: false, error: "save_failed" }, 502);

  const expires = Math.floor(Date.now() / 1000) + LINK_LIFETIME_SECONDS;
  const signature = await sign(env.DOWNLOAD_SECRET, expires);
  return json({ ok: true, url: `/download?e=${expires}&s=${signature}`, expires });
}

async function download(request, env, url) {
  const expires = Number(url.searchParams.get("e"));
  const signature = url.searchParams.get("s") || "";
  const valid =
    env.DOWNLOAD_SECRET &&
    Number.isInteger(expires) &&
    expires > Date.now() / 1000 &&
    (await verify(env.DOWNLOAD_SECRET, expires, signature));

  // No link, a made-up link or an old link: back to the form.
  if (!valid) return new Response(null, { status: 302, headers: { ...NO_INDEX, Location: "/?link=expired#get-book" } });

  return new Response(request.method === "HEAD" ? null : bookPdf, {
    headers: {
      ...NO_INDEX,
      "Content-Type": "application/pdf",
      "Content-Length": String(bookPdf.byteLength),
      "Content-Disposition": `attachment; filename="${FILE_NAME}"`,
    },
  });
}

// ── helpers ──────────────────────────────────────────────────────────────────

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...NO_INDEX, "Content-Type": "application/json" },
  });
}

function clean(value, max) {
  return String(value ?? "").replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}

function hmacKey(secret) {
  return crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}

const message = (expires) => new TextEncoder().encode(`book:${expires}`);

async function sign(secret, expires) {
  const bytes = new Uint8Array(await crypto.subtle.sign("HMAC", await hmacKey(secret), message(expires)));
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function verify(secret, expires, signature) {
  if (!/^[0-9a-f]{64}$/.test(signature)) return false;
  const bytes = new Uint8Array(signature.match(/../g).map((h) => parseInt(h, 16)));
  return crypto.subtle.verify("HMAC", await hmacKey(secret), bytes, message(expires));
}
