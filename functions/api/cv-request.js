// POST /api/cv-request: a CV request from the About page (js/about.js), emailed to Ryan through
// Web3Forms. Needs the WEB3FORMS_KEY secret on the Pages project; without it, it answers 503 and
// the page falls back to the visitor's email app.
const LIMITS = { name: 120, email: 200, company: 160, message: 2000 };
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

export async function onRequestPost({ request, env }) {
  let data;
  try { data = await request.json(); } catch { return json({ error: "bad request" }, 400); }
  if (data.website) return json({ ok: true }); // the hidden field only bots fill in
  const clean = {};
  for (const [k, max] of Object.entries(LIMITS)) {
    const v = String(data[k] || "").trim();
    if (!v || v.length > max) return json({ error: `invalid ${k}` }, 400);
    clean[k] = v;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean.email)) return json({ error: "invalid email" }, 400);
  if (!env.WEB3FORMS_KEY) return json({ error: "not configured" }, 503);

  const res = await fetch("https://api.web3forms.com/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      access_key: env.WEB3FORMS_KEY,
      subject: `CV request: ${clean.name}, ${clean.company}`,
      from_name: "rharricharan.com",
      replyto: clean.email,
      name: clean.name,
      email: clean.email,
      company: clean.company,
      message: clean.message,
    }),
  });
  return res.ok ? json({ ok: true }) : json({ error: "delivery failed" }, 502);
}
