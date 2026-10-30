// The case-study access cookie, shared by functions/_middleware.js and functions/api/unlock.js
// __Host-: only ever set by this site over HTTPS, for the whole site, so nothing else can plant it
const COOKIE = "__Host-case_access";
const DAYS = 30;

const enc = new TextEncoder();
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

// Signed with the password itself, so changing the password locks everyone out again
async function sign(value, secret) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", key, enc.encode(value)));
}
export async function token(secret) {
  const exp = String(Date.now() + DAYS * 864e5);
  return `${exp}.${await sign(exp, secret)}`;
}
export const cookie = (value) => `${COOKIE}=${value}; Path=/; Max-Age=${DAYS * 86400}; HttpOnly; Secure; SameSite=Lax`;

export async function hasAccess(request, secret) {
  if (!secret) return false;
  const m = (request.headers.get("Cookie") || "").match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  if (!m) return false;
  const [exp, sig] = m[1].split(".");
  if (!/^\d{13}$/.test(exp || "") || !/^[0-9a-f]{64}$/.test(sig || "")) return false;
  if (Number(exp) <= Date.now() || Number(exp) > Date.now() + DAYS * 864e5) return false;
  const want = enc.encode(await sign(exp, secret)), got = enc.encode(sig);
  return crypto.subtle.timingSafeEqual ? crypto.subtle.timingSafeEqual(want, got) : want.every((b, i) => b === got[i]);
}

