// Contact page form: checked in place, then sent to /api/contact (functions/api/contact.js), which
// emails it to Ryan. The visitor sees that it was sent, or that it wasn't and can try again.
(() => {
  const form = document.querySelector("[data-contact-form]");
  if (!form) return;
  const EMAIL = "rharricharandesigns@gmail.com";
  const submit = form.querySelector("[data-contact-submit]");
  const status = form.querySelector("[data-contact-status]");
  const done = document.querySelector("[data-contact-done]");
  const opened = Date.now();

  // Validation: checked on send, then each field clears its message as it's fixed
  const fields = ["name", "email", "message"].map((n) => form.elements[n]);
  const valid = (f) => (f.type === "email" ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.value.trim()) : f.value.trim().length > 1);
  const mark = (f, ok) => {
    const err = document.getElementById(f.getAttribute("aria-describedby"));
    if (ok) { f.removeAttribute("aria-invalid"); err.textContent = ""; }
    else { f.setAttribute("aria-invalid", "true"); err.textContent = err.dataset.error; }
  };
  fields.forEach((f) => f.addEventListener("input", () => { if (f.hasAttribute("aria-invalid") && valid(f)) mark(f, true); }));

  // `focus` is off when the form comes back by itself, so a phone's keyboard doesn't pop up
  const swap = (from, to, focus = true) => {
    const { gsap } = window;
    const show = () => { from.hidden = true; to.hidden = false; if (focus) to.querySelector("h2")?.focus(); };
    if (!gsap || matchMedia("(prefers-reduced-motion: reduce)").matches) { show(); if (focus && to === form) form.elements.name.focus(); return; }
    gsap.to(from, { opacity: 0, y: -8, duration: 0.25, ease: "power2.in", onComplete: () => {
      show();
      gsap.set(from, { clearProps: "all" });
      gsap.fromTo(to, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.7, ease: "expo.out", clearProps: "all" });
      if (focus && to === form) form.elements.name.focus();
    } });
  };
  // After a send, the thank-you (with a link to book a call) shows for about five seconds and then
  // the empty form comes back
  let back;
  const again = () => { if (done.hidden) return; form.reset(); swap(done, form, false); };
  const showDone = (title, text) => {
    done.querySelector("[data-contact-done-title]").textContent = title;
    done.querySelector("[data-contact-done-text]").textContent = text;
    swap(form, done);
    clearTimeout(back);
    back = setTimeout(again, 5000);
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    status.textContent = "";
    const bad = fields.filter((f) => !valid(f));
    fields.forEach((f) => mark(f, !bad.includes(f)));
    if (bad.length) { bad[0].focus(); return; }

    const data = Object.fromEntries(["need", "name", "email", "message", "website"].map((n) => [n, String(form.elements[n].value || "").trim()]));
    data.elapsed = Date.now() - opened;
    const first = data.name.split(/\s+/)[0];
    submit.setAttribute("aria-busy", "true");
    submit.textContent = "Sending…";
    try {
      // The site checks the message and returns it as the email; the browser sends it to Web3Forms
      const res = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const checked = await res.json();
      if (!res.ok) throw new Error(res.status);
      if (checked.submit) {
        const sent = await fetch("https://api.web3forms.com/submit", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(checked.submit) });
        if ((await sent.json().catch(() => ({}))).success !== true) throw new Error(sent.status);
      }
      return showDone("Message sent.", `Thanks, ${first}. It’s in my inbox, and I’ll reply to ${data.email}.`);
    } catch {
      status.innerHTML = `Sorry, that one didn’t come through. Email me at <a href="mailto:${EMAIL}">${EMAIL}</a> and I’ll get back to you.`;
    } finally {
      submit.removeAttribute("aria-busy");
      submit.textContent = "Send";
    }
  });
})();
