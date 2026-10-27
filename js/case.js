// Case study pages: GSAP intro, progressive reveal on scroll, and the small rebuilt demos.
(() => {
  const story = document.querySelector(".story");
  if (!story) return;
  const root = document.documentElement;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $$ = (sel, el = story) => [...el.querySelectorAll(sel)];

  const onView = (el, fn, margin = "0px 0px -10% 0px") => {
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { io.disconnect(); fn(); }
    }, { rootMargin: margin });
    io.observe(el);
  };

  // --- Motion -------------------------------------------------------------------------
  const motion = () => {
    const { gsap, ScrollTrigger, SplitText } = window;
    gsap.registerPlugin(ScrollTrigger, SplitText);
    const ease = "expo.out";

    // Whichever element actually scrolls: the content column on desktop, the window on phones.
    const wrapper = document.querySelector(".content-wrapper");
    const scroller = wrapper && wrapper.scrollHeight > wrapper.clientHeight + 1 && getComputedStyle(wrapper).overflowY !== "visible" ? wrapper : window;
    ScrollTrigger.defaults({ scroller });

    // Intro: waits for the wipe, or for the previous story to slide out when moving between case studies.
    const delay = root.classList.contains("case-swap") ? 0.6 : 0.4;
    const hero = story.querySelector(".story-header + .story-figure");
    const title = story.querySelector(".story-title");
    const lines = SplitText.create(title, { type: "lines", mask: "lines", linesClass: "story-title-line" });
    const intro = gsap.timeline({ delay, defaults: { ease }, onComplete: () => lines.revert() });
    intro
      .from(lines.lines, { yPercent: 110, duration: 1.1, stagger: 0.08 })
      .fromTo(".story-lead", { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 1, clearProps: "transform" }, "-=0.85")
      .fromTo(".story-facts > div", { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.9, stagger: 0.06, clearProps: "transform" }, "<0.05")
      .fromTo(".story-role", { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 1, clearProps: "transform" }, "-=0.6");
    if (hero) {
      const media = hero.querySelector(".story-mat > *");
      intro
        .fromTo(hero, { opacity: 0, y: 32 }, { opacity: 1, y: 0, duration: 1.2, clearProps: "transform" }, "-=0.8")
        .from(media, { scale: 1.04, duration: 1.4, clearProps: "transform" }, "<");
    }
    root.classList.add("intro-ready"); // GSAP owns the intro now; drop the CSS fallback

    // Progressive reveal: each section's heading, then its paragraphs; each figure's mat opens
    // from the bottom while the recording settles, then the caption.
    $$(".story-section").forEach((section) => {
      const parts = [section.querySelector("h2"), ...section.querySelectorAll(":scope > p, .story-list li")].filter(Boolean);
      gsap.set(parts, { opacity: 0, y: 16 });
      ScrollTrigger.create({
        trigger: section,
        start: "top 85%",
        once: true,
        onEnter: () => gsap.to(parts, { opacity: 1, y: 0, duration: 0.9, ease, stagger: 0.08, clearProps: "transform" }),
      });
    });

    $$(".story-figure").filter((f) => f !== hero).forEach((figure) => {
      const mat = figure.querySelector(".story-mat");
      const media = mat.firstElementChild;
      const caption = figure.querySelector("figcaption");
      gsap.set(mat, { clipPath: "inset(14% 0% 0% 0% round 20px)", opacity: 0 });
      gsap.set(media, { scale: 1.05, y: 24 });
      if (caption) gsap.set(caption, { opacity: 0 });
      ScrollTrigger.create({
        trigger: figure,
        start: "top 88%",
        once: true,
        onEnter: () => {
          gsap.timeline({ defaults: { ease } })
            .to(mat, { clipPath: "inset(0% 0% 0% 0% round 20px)", opacity: 1, duration: 1.2, clearProps: "clipPath" })
            .to(media, { scale: 1, y: 0, duration: 1.4, clearProps: "transform" }, "<")
            .to(caption, { opacity: 1, duration: 0.8 }, "-=0.9");
        },
      });
    });

    // Videos and images that load later change the page height
    addEventListener("load", () => ScrollTrigger.refresh());
  };

  if (!reduceMotion && window.gsap && window.ScrollTrigger && window.SplitText) {
    // Fonts first, so the title splits into its real lines
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(motion);
  } else {
    root.classList.add("intro-ready");
  }

  // --- Cinnamon: everyone in orbit around you. Tap someone to connect them to the center. ---
  const orbit = story.querySelector("[data-orbit]");
  if (orbit) {
    const people = [...orbit.querySelectorAll("[data-orbit-person]")];
    const line = orbit.querySelector("[data-orbit-line]");
    const status = orbit.querySelector("[data-orbit-status]");
    let spin = 0, picked = -1, running = false, last = 0;

    const place = () => people.forEach((p, k) => {
      const a = ((Number(p.dataset.angle) + spin * (k % 2 ? -0.7 : 1)) * Math.PI) / 180;
      const r = Number(p.dataset.r) / 2;
      p.style.left = `${50 + Math.cos(a) * r}%`;
      p.style.top = `${50 + Math.sin(a) * r}%`;
      if (k === picked) {
        line.setAttribute("x2", String(100 + Math.cos(a) * r * 2));
        line.setAttribute("y2", String(100 + Math.sin(a) * r * 2));
      }
    });
    const frame = (t) => {
      if (!running) return;
      spin = (spin + (last ? (t - last) / 1000 : 0) * 9) % 360; // one turn every 40s
      last = t;
      place();
      requestAnimationFrame(frame);
    };
    // Only spins while on screen.
    new IntersectionObserver(([e]) => {
      running = e.isIntersecting && !reduceMotion;
      last = 0;
      if (running) requestAnimationFrame(frame);
    }).observe(orbit);

    people.forEach((p, k) => p.addEventListener("click", () => {
      people.forEach((x) => x.classList.remove("is-picked"));
      p.classList.add("is-picked");
      picked = k;
      line.style.opacity = "0";
      place();
      requestAnimationFrame(() => { line.style.opacity = "1"; });
      status.textContent = `Connected to ${p.dataset.name}.`;
    }));
    place();
    onView(orbit, () => { if (!reduceMotion) setTimeout(() => picked < 0 && people[0].click(), 1400); });
  }
})();
