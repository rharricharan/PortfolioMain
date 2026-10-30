// Password protection for the uLogic and Shift AI case studies and their files. Without a valid
// access cookie, a page answers with the unlock page (unlock.html, named for the project) and a
// file answers 401. The password lives in the CASE_PASSWORD secret on the Pages project; with no
// secret set, nothing unlocks. _routes.json sends only these paths and /api/* through Functions.
import { hasAccess } from "./_access.js";

const PROTECTED = { ulogic: "uLogic", shift: "Shift AI" };

// Which project a path belongs to: the page (/ulogic, /ulogic.html, /ulogic/) or its files
function project(pathname) {
  const m = pathname.match(/^\/(?:assets\/work\/)?([a-z]+)(?:\.html|\/.*)?$/);
  if (!m || !PROTECTED[m[1]]) return null;
  return { slug: m[1], page: !pathname.startsWith("/assets/") };
}

const PRIVATE = { "Cache-Control": "private, no-store", Vary: "Cookie" };

export async function onRequest({ request, env, next }) {
  const url = new URL(request.url);
  const { pathname } = url;
  const p = project(pathname);
  if (!p) return next();
  if (await hasAccess(request, env.CASE_PASSWORD)) {
    const res = await next();
    const out = new Response(res.body, res);
    for (const [k, v] of Object.entries(PRIVATE)) out.headers.set(k, v);
    return out;
  }
  if (!p.page) return new Response("Password protected", { status: 401, headers: PRIVATE });
  const page = await env.ASSETS.fetch(new URL("/unlock", request.url));
  const named = new HTMLRewriter()
    .on("[data-unlock-name]", { element: (el) => el.setInnerContent(PROTECTED[p.slug]) })
    .on("title", { element: (el) => el.setInnerContent(`${PROTECTED[p.slug]} · Password protected`) })
    .on("[data-unlock-next]", { element: (el) => el.setAttribute("value", `/${p.slug}`) })
    .on("[data-unlock-error]", { element: (el) => { if (url.searchParams.has("wrong")) el.setInnerContent("That password didn’t work. Try again."); } })
    .transform(page);
  return new Response(named.body, { status: 401, headers: { "Content-Type": "text/html; charset=utf-8", ...PRIVATE } });
}
