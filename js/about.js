// About page: the headline rises in line by line, each section's content follows as it scrolls
// into view, and the numbers count up. Starts once the page is actually shown (js/boot.js).
(() => {
  const about = document.querySelector(".about");
  if (!about) return;
  const root = document.documentElement;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const { gsap, ScrollTrigger, SplitText } = window;
  if (reduceMotion || !gsap || !ScrollTrigger || !SplitText) { root.classList.add("intro-ready"); return; }

  const motion = () => {
    gsap.registerPlugin(ScrollTrigger, SplitText);
    const ease = "expo.out";
    const wrapper = document.querySelector(".content-wrapper");
    const scroller = wrapper && wrapper.scrollHeight > wrapper.clientHeight + 1 && getComputedStyle(wrapper).overflowY !== "visible" ? wrapper : window;
    ScrollTrigger.defaults({ scroller });

    // Intro: the photo line, then the headline's lines rising behind a mask
    const title = about.querySelector(".about-title");
    const delay = (root.classList.contains("case-swap") ? 0.6 : 0.4) + (window.introDelay || 0);
    if (title) {
      const split = SplitText.create(title, { type: "lines", mask: "lines" });
      gsap.timeline({ delay })
        .set(title, { opacity: 1 }, 0)
        .from(split.lines, { yPercent: 110, duration: 1.1, ease, stagger: 0.08, onComplete: () => split.revert() }, 0.1);
    } else {
      // Contact and Privacy: the intro line, label, text and form rise in turn
      gsap.from(about.querySelectorAll(".page-who, .page-label, .page-title, .page-text, .contact-panel"), { opacity: 0, y: 14, duration: 1, ease, stagger: 0.07, delay, clearProps: "opacity,transform" });
    }
    root.classList.add("intro-ready");

    // Sections: label, then content, rising a little as they come into view
    about.querySelectorAll(".about-section").forEach((section) => {
      const parts = [section.querySelector(".about-label"), ...section.querySelectorAll(".about-copy p, .about-intro-line, .about-sub, .about-sub-small, .about-pair > div, .about-experience div, .about-steps li, .about-toolgroup, .about-numbers div, .about-contact-card")].filter(Boolean);
      gsap.set(parts, { opacity: 0, y: 18 });
      ScrollTrigger.create({
        trigger: section,
        start: "top 85%",
        once: true,
        onEnter: () => gsap.to(parts, { opacity: 1, y: 0, duration: 0.9, ease, stagger: 0.05, clearProps: "transform" }),
      });
    });

    // Numbers count up to their value
    about.querySelectorAll("[data-count]").forEach((el) => {
      // Years since a date (data-since) stay current without a rebuild
      if (el.dataset.since) {
        const since = new Date(`${el.dataset.since}T00:00:00`);
        const now = new Date();
        const years = now.getFullYear() - since.getFullYear() - (now < new Date(now.getFullYear(), since.getMonth(), since.getDate()) ? 1 : 0);
        el.textContent = Math.max(1, years);
      }
      const end = Number(el.textContent);
      const start = end > 1000 ? end - 12 : 0;
      const n = { v: start };
      const suffix = el.dataset.suffix || "";
      el.textContent = start + suffix;
      ScrollTrigger.create({
        trigger: el,
        start: "top 90%",
        once: true,
        onEnter: () => gsap.to(n, { v: end, duration: 1.4, ease: "power3.out", onUpdate: () => { el.textContent = Math.round(n.v) + suffix; } }),
      });
    });

    addEventListener("load", () => ScrollTrigger.refresh());
  };

  Promise.all([window.pageRevealed, document.fonts ? document.fonts.ready : null]).then(motion);
})();

// Request CV: the button under the experience list opens a dialog over a frosted page. It closes
// from the close button, Cancel, Escape or a click outside. Requests go to /api/cv-request
// (functions/api/cv-request.js), which emails them to Ryan; the visitor sees that it was sent, or
// that it wasn't and can try again.
(() => {
  const dialog = document.querySelector(".cv-dialog");
  const opener = document.querySelector("[data-cv-open]");
  if (!dialog || !opener) return;
  const form = dialog.querySelector("[data-cv-form]");
  const done = dialog.querySelector("[data-cv-done]");
  const status = dialog.querySelector("[data-cv-status]");
  const submit = dialog.querySelector("[data-cv-submit]");
  const panel = dialog.querySelector(".cv-panel");
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const sheet = () => matchMedia("(max-width: 600px)").matches;
  const { gsap } = window;
  let closing = false;

  const open = () => {
    dialog.showModal();
    if (gsap && !reduceMotion) {
      gsap.fromTo(dialog, sheet() ? { yPercent: 100 } : { y: 18, scale: 0.98, opacity: 0 },
        { yPercent: 0, y: 0, scale: 1, opacity: 1, duration: sheet() ? 0.5 : 0.45, ease: "expo.out", clearProps: "transform,opacity" });
    }
    if (!matchMedia("(pointer: coarse)").matches) form.elements.name.focus();
  };

  const reset = () => {
    form.reset();
    form.hidden = false;
    done.hidden = true;
    status.textContent = "";
    form.querySelectorAll("[aria-invalid]").forEach((f) => f.removeAttribute("aria-invalid"));
    form.querySelectorAll(".cv-error").forEach((e) => (e.textContent = ""));
  };

  const close = () => {
    if (closing || !dialog.open) return;
    const finish = () => { closing = false; dialog.close(); if (!done.hidden) reset(); opener.focus(); };
    if (!gsap || reduceMotion) return finish();
    closing = true;
    gsap.to(dialog, { ...(sheet() ? { yPercent: 100 } : { y: 12, opacity: 0 }), duration: 0.25, ease: "power2.in", onComplete: () => { gsap.set(dialog, { clearProps: "all" }); finish(); } });
  };

  opener.addEventListener("click", open);
  dialog.querySelectorAll("[data-cv-close]").forEach((b) => b.addEventListener("click", close));
  dialog.addEventListener("cancel", (e) => { e.preventDefault(); close(); }); // Escape
  // A click on the frosted page around the panel closes it
  dialog.addEventListener("click", (e) => {
    if (e.target !== dialog) return;
    const r = panel.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) close();
  });

  // Validation: checked on send, then each field clears its message as it's fixed
  const fields = ["name", "email", "company", "message"].map((n) => form.elements[n]);
  const valid = (f) => (f.type === "email" ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.value.trim()) : f.value.trim().length > 1);
  const mark = (f, ok) => {
    const err = document.getElementById(f.getAttribute("aria-describedby"));
    if (ok) { f.removeAttribute("aria-invalid"); err.textContent = ""; }
    else { f.setAttribute("aria-invalid", "true"); err.textContent = err.dataset.error; }
  };
  fields.forEach((f) => f.addEventListener("input", () => { if (f.hasAttribute("aria-invalid") && valid(f)) mark(f, true); }));

  const showDone = (title, text) => {
    form.hidden = true;
    done.hidden = false;
    done.querySelector("[data-cv-done-title]").textContent = title;
    done.querySelector("[data-cv-done-text]").textContent = text;
    done.querySelector("[data-cv-done-title]").focus();
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    status.textContent = "";
    const bad = fields.filter((f) => !valid(f));
    fields.forEach((f) => mark(f, !bad.includes(f)));
    if (bad.length) { bad[0].focus(); return; }

    const data = Object.fromEntries(["name", "email", "company", "message", "website"].map((n) => [n, form.elements[n].value.trim()]));
    const first = data.name.split(/\s+/)[0];
    submit.setAttribute("aria-busy", "true");
    submit.textContent = "Sending…";
    try {
      const res = await fetch("/api/cv-request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (res.ok) return showDone("Request sent.", `Thanks, ${first}. I’ll email my CV to ${data.email}.`);
      throw new Error(res.status);
    } catch {
      status.textContent = "That didn’t send. Nothing went through, so try again in a moment.";
    } finally {
      submit.removeAttribute("aria-busy");
      submit.textContent = "Send request";
    }
  });
})();
