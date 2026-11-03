// Shared by the form endpoints in functions/api: one place that turns a form into an email to Ryan.
// Delivery goes through Web3Forms (WEB3FORMS_KEY secret on the Pages project). Fields arrive in the
// email as a table, in the order given, so every message reads the same way.
// Web3Forms' free plan only takes messages sent from the visitor's browser, so `prepare` hands
// the checked message back for the page to send itself; `deliver` sends from the server.
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

// The checked message, ready for the page to post to Web3Forms (its access key is meant to be public)
export function prepare(env, { subject, replyto, fromName, fields }) {
  if (!env.WEB3FORMS_KEY) return json({ error: "not configured" }, 503);
  return json({ submit: { access_key: env.WEB3FORMS_KEY, subject, from_name: fromName, replyto, ...fields } });
}

export async function deliver(env, { subject, replyto, fromName, fields }) {
  if (!env.WEB3FORMS_KEY) return json({ error: "not configured" }, 503);
  const res = await fetch("https://api.web3forms.com/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ access_key: env.WEB3FORMS_KEY, subject, from_name: fromName, replyto, ...fields }),
  });
  // Web3Forms answers { success: true } once it has taken the message; anything else is a failure
  const body = await res.json().catch(() => ({}));
  return res.ok && body.success === true ? json({ ok: true }) : json({ error: "delivery failed" }, 502);
}
