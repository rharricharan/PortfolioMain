// Password protection for the uLogic and Shift AI case studies and everything made from them:
// the pages, their images and videos and the share images. Only the menu's hover previews are public. It runs on every
// request (_routes.json sends /* here), so no path reaches the files without this check.
// Without a valid access cookie a page answers with the unlock page (unlock.html, named for the
// project) and a file answers 401. The password lives in the CASE_PASSWORD secret on the Pages
// project; with no secret set, nothing unlocks.
import { hasAccess, hasCookie, token, cookie, clearCookie } from "./_access.js";
import { SECURITY } from "./_security.js";

const PROTECTED = { ulogic: "uLogic", shift: "Shift AI" };

// Decodes the path until it stops changing, so %75logic, %2575logic and the like are seen as
// ulogic; anything that won't decode is refused rather than passed through
function normalise(raw) {
  let path = raw;
  for (let i = 0; i < 5; i++) {
    const next = decodeURIComponent(path);
    if (next === path) break;
    path = next;
  }
  return path.toLowerCase().replace(/\\/g, "/").replace(/\/{2,}/g, "/");
}

// Every case study, locked or not: moving between these keeps access; any other page ends it
const CASES = new Set(["ulogic", "shift", "smartstop", "rays", "halftone", "leadhack", "one", "cinnamon", "gostr", "ave"]);
const caseSlug = (path) => { const m = path.match(/^\/([a-z0-9]+)(?:\.html)?\/?$/); return m && CASES.has(m[1]) ? m[1] : null; };

// A locked page opens only when the visitor clicked through to it from a case study on this site
// (or straight after entering the password). A reload, a typed address, a bookmark, a restored tab
// or a link from anywhere else asks for the password again.
function clickedThrough(request) {
  const h = request.headers;
  if (h.get("Sec-Fetch-Site") !== "same-origin") return false;
  if (/max-age=0|no-cache/i.test(h.get("Cache-Control") || "") || /no-cache/i.test(h.get("Pragma") || "")) return false; // reload
  let from;
  try { from = new URL(h.get("Referer") || ""); } catch { return false; }
  if (from.origin !== new URL(request.url).origin) return false;
  try { return !!caseSlug(normalise(from.pathname)); } catch { return false; }
}

// Which project a path belongs to: any path segment named for it (with or without an extension),
// so /ulogic, /ulogic.html, /ulogic/, /assets/work/ulogic/x.webp and /assets/previews/ulogic.mp4
// all count. Pages are the top-level ones; everything else is a file.
// The one exception: the menu's hover previews (a short clip and its poster) stay public
const PUBLIC = /^\/assets\/previews\/(ulogic|shift)\.(mp4|webp)$/;

function project(path) {
  if (PUBLIC.test(path)) return null;
  const segs = path.split("/").filter(Boolean);
  for (const seg of segs) {
    // The name followed by anything that isn't a letter or digit: .html, .mp4, ;x, a stray space
    const m = seg.match(/^\s*([a-z0-9]+)(?![a-z0-9])/);
    const stem = m && m[1];
    if (stem && PROTECTED[stem]) return { slug: stem, page: segs.length === 1 };
  }
  return null;
}

// Unlocked pages are never stored, so every visit asks this check again. Unlocked files (images,
// video) are kept a week in that visitor's own browser only ("private": never in a shared cache),
// so scrolling, revisiting and looping videos don't download them again. No Vary: Cookie here:
// Analytics rewrites its cookies on every page, which would throw the cached files away each time.
const PRIVATE_PAGE = { "Cache-Control": "private, no-store, max-age=0" };
const PRIVATE_FILE = { "Cache-Control": "private, max-age=604800" };
// Locked answers are never stored either
const LOCKED_FILE = { ...PRIVATE_PAGE, "X-Robots-Tag": "noindex, nofollow" };
const LOCKED_PAGE = LOCKED_FILE;

// Every response leaves with the site's security headers (static files already have them from
// _headers; Function responses get them here). Copies of the site on *.pages.dev stay out of search.
export async function onRequest(context) {
  const res = await gate(context);
  const missing = Object.entries(SECURITY).filter(([k]) => !res.headers.has(k));
  const offIndex = new URL(context.request.url).hostname.endsWith(".pages.dev");
  if (!missing.length && !offIndex) return res;
  const out = new Response(res.body, res);
  for (const [k, v] of missing) out.headers.set(k, v);
  if (offIndex) out.headers.set("X-Robots-Tag", "noindex, nofollow");
  return out;
}

async function gate({ request, env, next }) {
  const url = new URL(request.url);
  // One address: www goes to rharricharan.com, keeping the path
  if (url.hostname === "www.rharricharan.com") {
    url.hostname = "rharricharan.com";
    return Response.redirect(url.toString(), 301);
  }
  let path;
  try { path = normalise(url.pathname); } catch { return new Response("Bad request", { status: 400, headers: PRIVATE_PAGE }); }
  const p = project(path);
  if (!p) {
    // Opening any page outside the case studies ends access (prefetches don't count)
    const res = await next();
    const isPage = request.method === "GET" && request.headers.get("Sec-Fetch-Dest") === "document" && !request.headers.get("Sec-Purpose");
    if (!isPage || caseSlug(path) || !hasCookie(request)) return res;
    const out = new Response(res.body, res);
    out.headers.append("Set-Cookie", clearCookie);
    return out;
  }

  const access = await hasAccess(request, env.CASE_PASSWORD);
  if (access && (!p.page || clickedThrough(request))) {
    const res = await next();
    const out = new Response(res.body, res);
    for (const [k, v] of Object.entries(p.page ? PRIVATE_PAGE : PRIVATE_FILE)) out.headers.set(k, v);
    out.headers.delete("Vary");
    // Each unlocked page view renews the two-hour token
    if (p.page) out.headers.append("Set-Cookie", cookie(await token(env.CASE_PASSWORD)));
    return out;
  }
  if (!p.page || request.method !== "GET") return new Response("Password protected", { status: 401, headers: LOCKED_FILE });
  const page = await env.ASSETS.fetch(new URL("/unlock", url));
  const named = new HTMLRewriter()
    .on("[data-unlock-name]", { element: (el) => el.setInnerContent(PROTECTED[p.slug]) })
    .on("title", { element: (el) => el.setInnerContent(`${PROTECTED[p.slug]} · Password protected`) })
    .on("[data-unlock-next]", { element: (el) => el.setAttribute("value", `/${p.slug}`) })
    .on("[data-unlock-error]", { element: (el) => { if (url.searchParams.has("wrong")) el.setInnerContent("That password didn’t work. Try again."); } })
    .transform(page);
  const headers = new Headers({ "Content-Type": "text/html; charset=utf-8", ...LOCKED_PAGE });
  if (hasCookie(request)) headers.append("Set-Cookie", clearCookie);
  return new Response(named.body, { status: 401, headers });
}
