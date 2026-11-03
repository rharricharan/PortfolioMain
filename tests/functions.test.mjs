// npm test: the form checks and the middleware's response headers, with
// Web3Forms and the static files stubbed, so nothing is sent and no server runs.
import test from "node:test";
import assert from "node:assert/strict";
import { onRequestPost as contact } from "../functions/api/contact.js";
import { onRequest as middleware } from "../functions/_middleware.js";

const env = { WEB3FORMS_KEY: "test-key", CASE_PASSWORD: "test-password" };
const message = { need: "Website", name: "Test Person", email: "test@example.com", message: "Hello there", website: "", elapsed: 5000 };
const post = (body) => new Request("https://rharricharan.com/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
const withFetch = async (stub, run) => { const real = globalThis.fetch; globalThis.fetch = stub; try { return await run(); } finally { globalThis.fetch = real; } };

test("contact: a good message comes back as the email for the page to send", async () => {
  const never = async () => { throw new Error("the server never sends"); };
  const res = await withFetch(never, () => contact({ request: post(message), env }));
  assert.equal(res.status, 200);
  const { submit: sent } = await res.json();
  assert.equal(sent.access_key, "test-key");
  assert.equal(sent.replyto, "test@example.com");
  assert.equal(sent.subject, "New enquiry: Website, from Test Person");
  assert.deepEqual(Object.keys(sent).filter((k) => /^[A-Z]/.test(k)), ["What they need", "Name", "Email", "Message", "Country", "Sent"]);
});

test("contact: no key set answers 503, and bots and bad input never get the email back", async () => {
  const never = async () => { throw new Error("should not send"); };
  assert.equal((await withFetch(never, () => contact({ request: post(message), env: {} }))).status, 503);
  for (const bot of [{ website: "spam" }, { elapsed: 500 }]) assert.deepEqual(await (await contact({ request: post({ ...message, ...bot }), env })).json(), { ok: true, skip: true });
  assert.equal((await withFetch(never, () => contact({ request: post({ ...message, email: "nope" }), env }))).status, 400);
});

const page = (url, init) => middleware({ request: new Request(url, init), env, next: async () => new Response("ok", { headers: { "Content-Type": "text/html" } }) });

test("headers: rharricharan.com is never noindexed; *.pages.dev always is", async () => {
  for (const path of ["/", "/about", "/smartstop", "/contact"]) {
    assert.equal((await page(`https://rharricharan.com${path}`)).headers.get("X-Robots-Tag"), null, path);
    assert.match((await page(`https://rharricharan-portfolio.pages.dev${path}`)).headers.get("X-Robots-Tag"), /noindex/, path);
  }
});

test("headers: locked files and Function responses carry the security set, once", async () => {
  const locked = await page("https://rharricharan.com/assets/work/ulogic/account.webp");
  const api = await page("https://rharricharan.com/api/lock", { method: "POST" });
  assert.equal(locked.status, 401);
  for (const res of [locked, api]) {
    for (const h of ["Content-Security-Policy", "Strict-Transport-Security", "X-Content-Type-Options", "X-Frame-Options", "Referrer-Policy", "Permissions-Policy", "Cross-Origin-Opener-Policy"]) {
      assert.ok(res.headers.get(h), h);
      assert.ok(!res.headers.get(h).includes(", " + res.headers.get(h)), `${h} doubled`);
    }
  }
});
