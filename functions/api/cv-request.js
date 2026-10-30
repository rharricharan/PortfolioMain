// POST /api/cv-request: a CV request from the About page (js/about.js), emailed to Ryan
// (functions/_mail.js). Without the WEB3FORMS_KEY secret it answers 503 and the page falls back
// to the visitor's email app.
import { json, isEmail, clean, stamp, deliver } from "../_mail.js";

const LIMITS = { name: 120, email: 200, company: 160, message: 2000 };

export async function onRequestPost({ request, env }) {
  let data;
  try { data = await request.json(); } catch { return json({ error: "bad request" }, 400); }
  if (data.website) return json({ ok: true }); // the hidden field only bots fill in
  const { fields, error } = clean(data, LIMITS);
  if (error) return json({ error }, 400);
  if (!isEmail(fields.email)) return json({ error: "invalid email" }, 400);
  return deliver(env, {
    subject: `CV request: ${fields.name}, ${fields.company}`,
    fromName: "rharricharan.com · CV request",
    replyto: fields.email,
    fields: { Name: fields.name, Email: fields.email, Company: fields.company, "What it’s for": fields.message, Sent: stamp() },
  });
}
