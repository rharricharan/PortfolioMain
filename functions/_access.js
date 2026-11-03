// The case-study access cookie, shared by functions/_middleware.js, functions/api/unlock.js and
// functions/api/lock.js. Access lasts while the visitor moves between case studies: it's a
// session cookie (gone when the browser closes), each token runs out after two hours, and every
// unlocked page view issues a fresh one.
// __Host-: only ever set by this site over HTTPS, for the whole site, so nothing else can plant it
const COOKIE = "__Host-case_access";
const TTL = 2 * 3600e3;

const enc = new TextEncoder();
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

// Signed with the password itself, so changing the password locks everyone out again
async function sign(value, secret) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", key, enc.encode(value)));
}
export async function token(secret) {
  const exp = String(Date.now() + TTL);
  return `${exp}.${await sign(exp, secret)}`;
}
// No Max-Age or Expires: the browser drops it when it closes
export const cookie = (value) => `${COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax`;
export const clearCookie = `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
export const hasCookie = (request) => new RegExp(`(?:^|;\\s*)${COOKIE}=`).test(request.headers.get("Cookie") || "");

export async function hasAccess(request, secret) {
  if (!secret) return false;
  const m = (request.headers.get("Cookie") || "").match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  if (!m) return false;
  const [exp, sig] = m[1].split(".");
  if (!/^\d{13}$/.test(exp || "") || !/^[0-9a-f]{64}$/.test(sig || "")) return false;
  if (Number(exp) <= Date.now() || Number(exp) > Date.now() + TTL) return false;
  const want = enc.encode(await sign(exp, secret)), got = enc.encode(sig);
  return crypto.subtle.timingSafeEqual ? crypto.subtle.timingSafeEqual(want, got) : want.every((b, i) => b === got[i]);
}
