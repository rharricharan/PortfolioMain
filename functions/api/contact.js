// POST /api/contact: a message from the contact page (js/contact.js), checked here and handed back
// as the email to Ryan, which the page sends to Web3Forms itself (functions/_mail.js). Without the
// WEB3FORMS_KEY secret it answers 503 and the page shows the error.
import { json, isEmail, clean, stamp, prepare } from "../_mail.js";

const NEEDS = ["App design & build", "Website", "Consulting", "Something else"];
const LIMITS = { need: 40, name: 120, email: 200, message: 4000 };

export async function onRequestPost({ request, env }) {
  let data;
  try { data = await request.json(); } catch { return json({ error: "bad request" }, 400); }
  // The hidden field only bots fill in, and nobody writes a real message in under three seconds
  if (data.website || Number(data.elapsed) < 3000) return json({ ok: true, skip: true });
  const { fields, error } = clean(data, LIMITS);
  if (error) return json({ error }, 400);
  if (!NEEDS.includes(fields.need)) return json({ error: "invalid need" }, 400);
  if (!isEmail(fields.email)) return json({ error: "invalid email" }, 400);
  return prepare(env, {
    subject: `New enquiry: ${fields.need}, from ${fields.name}`,
    fromName: "rharricharan.com · Contact",
    replyto: fields.email,
    fields: {
      "What they need": fields.need,
      Name: fields.name,
      Email: fields.email,
      Message: fields.message,
      Country: request.cf?.country || "Unknown",
      Sent: stamp(),
    },
  });
}
