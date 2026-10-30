// Password protection for the uLogic and Shift AI case studies and everything made from them:
// the pages, their images and videos, the menu previews and the share images. It runs on every
// request (_routes.json sends /* here), so no path reaches the files without this check.
// Without a valid access cookie a page answers with the unlock page (unlock.html, named for the
// project) and a file answers 401. The password lives in the CASE_PASSWORD secret on the Pages
// project; with no secret set, nothing unlocks.
import { hasAccess } from "./_access.js";

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

// Which project a path belongs to: any path segment named for it (with or without an extension),
// so /ulogic, /ulogic.html, /ulogic/, /assets/work/ulogic/x.webp and /assets/previews/ulogic.mp4
// all count. Pages are the top-level ones; everything else is a file.
function project(path) {
  const segs = path.split("/").filter(Boolean);
  for (const seg of segs) {
    // The name followed by anything that isn't a letter or digit: .html, .mp4, ;x, a stray space
    const m = seg.match(/^\s*([a-z0-9]+)(?![a-z0-9])/);
    const stem = m && m[1];
    if (stem && PROTECTED[stem]) return { slug: stem, page: segs.length === 1 };
  }
  return null;
}

const PRIVATE = { "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie" };
// Locked answers also wipe this site's copies from the browser's cache, so a page seen before it
// was protected (or before the access ran out) can't come back with the Back button
const LOCKED = { ...PRIVATE, "Clear-Site-Data": '"cache"', "X-Robots-Tag": "noindex, nofollow" };

export async function onRequest({ request, env, next }) {
  const url = new URL(request.url);
  let path;
  try { path = normalise(url.pathname); } catch { return new Response("Bad request", { status: 400, headers: PRIVATE }); }
  const p = project(path);
  if (!p) return next();

  if (await hasAccess(request, env.CASE_PASSWORD)) {
    const res = await next();
    const out = new Response(res.body, res);
    for (const [k, v] of Object.entries(PRIVATE)) out.headers.set(k, v);
    return out;
  }
  if (!p.page || request.method !== "GET") return new Response("Password protected", { status: 401, headers: LOCKED });
  const page = await env.ASSETS.fetch(new URL("/unlock", url));
  const named = new HTMLRewriter()
    .on("[data-unlock-name]", { element: (el) => el.setInnerContent(PROTECTED[p.slug]) })
    .on("title", { element: (el) => el.setInnerContent(`${PROTECTED[p.slug]} · Password protected`) })
    .on("[data-unlock-next]", { element: (el) => el.setAttribute("value", `/${p.slug}`) })
    .on("[data-unlock-error]", { element: (el) => { if (url.searchParams.has("wrong")) el.setInnerContent("That password didn’t work. Try again."); } })
    .transform(page);
  return new Response(named.body, { status: 401, headers: { "Content-Type": "text/html; charset=utf-8", ...LOCKED } });
}
