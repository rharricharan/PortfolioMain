// POST /api/unlock: checks the case-study password (js/unlock.js) and, if it matches, sets the
// access cookie that functions/_middleware.js looks for. Works as a plain form post too.
import { token, cookie } from "../_access.js";
import { json } from "../_mail.js";

const SAFE = /^\/(ulogic|shift)$/;

// Compares in constant time, so the answer's timing gives nothing away
async function same(a, b) {
  const [x, y] = await Promise.all([a, b].map((s) => crypto.subtle.digest("SHA-256", new TextEncoder().encode(s))));
  const u = new Uint8Array(x), v = new Uint8Array(y);
  let diff = 0;
  for (let i = 0; i < u.length; i++) diff |= u[i] ^ v[i];
  return diff === 0;
}

export async function onRequestPost({ request, env }) {
  const isForm = !(request.headers.get("Content-Type") || "").includes("application/json");
  let data;
  try { data = isForm ? Object.fromEntries(await request.formData()) : await request.json(); } catch { return json({ error: "bad request" }, 400); }
  const to = SAFE.test(String(data.next || "")) ? data.next : "/";
  const ok = !!env.CASE_PASSWORD && (await same(String(data.password || ""), env.CASE_PASSWORD));
  if (!ok) {
    await new Promise((r) => setTimeout(r, 600)); // slows guessing
    return isForm ? Response.redirect(new URL(`${to}?wrong=1`, request.url), 303) : json({ error: "wrong password" }, 401);
  }
  const headers = { "Set-Cookie": cookie(await token(env.CASE_PASSWORD)), "Cache-Control": "no-store" };
  if (isForm) return new Response(null, { status: 303, headers: { ...headers, Location: to } });
  return new Response(JSON.stringify({ ok: true, next: to }), { status: 200, headers: { ...headers, "Content-Type": "application/json" } });
}
