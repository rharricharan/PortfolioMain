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
    const split = SplitText.create(title, { type: "lines", mask: "lines" });
    const delay = (root.classList.contains("case-swap") ? 0.6 : 0.4) + (window.introDelay || 0);
    gsap.timeline({ delay })
      .set(title, { opacity: 1 }, 0)
      .from(split.lines, { yPercent: 110, duration: 1.1, ease, stagger: 0.08, onComplete: () => split.revert() }, 0.1);
    root.classList.add("intro-ready");

    // Sections: label, then content, rising a little as they come into view
    about.querySelectorAll(".about-section").forEach((section) => {
      const parts = [section.querySelector(".about-label"), ...section.querySelectorAll(".about-copy p, .about-intro-line, .about-sub, .about-sub-small, .about-pair > div, .about-experience div, .about-steps li, .about-toolgroup, .about-numbers div, .about-contact-card")];
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
// (functions/api/cv-request.js); until that can deliver, the visitor's email app opens with the
// request written out instead.
(() => {
  const dialog = document.querySelector(".cv-dialog");
  const opener = document.querySelector("[data-cv-open]");
  if (!dialog || !opener) return;
  const form = dialog.querySelector("[data-cv-form]");
  const done = dialog.querySelector("[data-cv-done]");
  const status = dialog.querySelector("[data-cv-status]");
  const submit = dialog.querySelector("[data-cv-submit]");
  const panel = dialog.querySelector(".cv-panel");
  const EMAIL = "rharricharandesigns@gmail.com";
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
      if (res.status !== 503 && res.status !== 404 && res.status !== 405) throw new Error(res.status);
      // Not set up to deliver yet: hand it to the visitor's email app, written out
      const body = `Hi Ryan,\n\nI’d like to request your CV.\n\nName: ${data.name}\nEmail: ${data.email}\nCompany: ${data.company}\n\n${data.message}\n`;
      location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(`CV request: ${data.name}, ${data.company}`)}&body=${encodeURIComponent(body)}`;
      showDone("Almost there.", `Your email app should open with the request written out. Press send, and I’ll reply to ${data.email} with my CV.`);
    } catch {
      status.innerHTML = `That didn’t send. Try again, or email me at <a href="mailto:${EMAIL}">${EMAIL}</a>.`;
    } finally {
      submit.removeAttribute("aria-busy");
      submit.textContent = "Send request";
    }
  });
})();
