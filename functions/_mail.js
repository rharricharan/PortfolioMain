// Shared by the form endpoints in functions/api: one place that turns a form into an email to Ryan.
// Delivery goes through Web3Forms (WEB3FORMS_KEY secret on the Pages project). Fields arrive in the
// email as a table, in the order given, so every message reads the same way.
export const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

export const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

// Trims each field and checks it against its limit; optional fields may be empty
export function clean(data, limits, optional = []) {
  const out = {};
  for (const [k, max] of Object.entries(limits)) {
    const v = String(data[k] || "").trim().replace(/\r\n?/g, "\n");
    if ((!v && !optional.includes(k)) || v.length > max) return { error: `invalid ${k}` };
    out[k] = v;
  }
  return { fields: out };
}

// When it was sent, in Ryan's time zone
export const stamp = () => new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "America/New_York" }).format(new Date()) + " ET";

export async function deliver(env, { subject, replyto, fromName, fields }) {
  if (!env.WEB3FORMS_KEY) return json({ error: "not configured" }, 503);
  const res = await fetch("https://api.web3forms.com/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ access_key: env.WEB3FORMS_KEY, subject, from_name: fromName, replyto, ...fields }),
  });
  return res.ok ? json({ ok: true }) : json({ error: "delivery failed" }, 502);
}
