// Contact page form: checked in place, then sent to /api/contact (functions/api/contact.js), which
// emails it to Ryan. The visitor sees that it was sent, or that it wasn't and can try again.
(() => {
  const form = document.querySelector("[data-contact-form]");
  if (!form) return;
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

  const swap = (from, to) => {
    const { gsap } = window;
    const show = () => { from.hidden = true; to.hidden = false; to.querySelector("h2")?.focus(); };
    if (!gsap || matchMedia("(prefers-reduced-motion: reduce)").matches) { show(); if (to === form) form.elements.name.focus(); return; }
    gsap.to(from, { opacity: 0, y: -8, duration: 0.25, ease: "power2.in", onComplete: () => {
      show();
      gsap.set(from, { clearProps: "all" });
      gsap.fromTo(to, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.7, ease: "expo.out", clearProps: "all" });
      if (to === form) form.elements.name.focus();
    } });
  };
  const showDone = (title, text) => {
    done.querySelector("[data-contact-done-title]").textContent = title;
    done.querySelector("[data-contact-done-text]").textContent = text;
    swap(form, done);
  };
  done.querySelector("[data-contact-again]").addEventListener("click", () => { form.reset(); swap(done, form); });

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
      const res = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (res.ok) return showDone("Message sent.", `Thanks, ${first}. It’s in my inbox, and I’ll reply to ${data.email}.`);
      throw new Error(res.status);
    } catch {
      status.textContent = "That didn’t send. Nothing went through, so try again in a moment.";
    } finally {
      submit.removeAttribute("aria-busy");
      submit.textContent = "Send";
    }
  });
})();
