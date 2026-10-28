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

  const bars = $$(".bar-fill");
  const fillBars = () => bars.forEach((b) => { b.style.width = `${b.dataset.v}%`; });

  // Text-bearing leaves inside a block (so nested lists don't rise twice)
  const leaves = (el) => {
    const all = [...el.querySelectorAll("p, h3, li, dt, dd")];
    return all.filter((n) => !all.some((m) => m !== n && n.contains(m)));
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

    // Every piece of text arrives the same way as the title: its lines rise into place behind a
    // mask. Text is split when it animates (so lines match the current width) and restored after.
    const rise = (els, { stagger = 0.08, gap = 0.1 } = {}) => {
      const tl = gsap.timeline();
      els.filter(Boolean).forEach((el, i) => {
        const split = SplitText.create(el, { type: "lines", mask: "lines" });
        gsap.set(el, { opacity: 1 });
        tl.from(split.lines, { yPercent: 110, duration: 1.1, ease, stagger, onComplete: () => split.revert() }, i * gap);
      });
      return tl;
    };

    // Intro: waits for the wipe, or for the previous story to slide out when moving between case studies.
    const delay = root.classList.contains("case-swap") ? 0.6 : 0.4;
    const hero = story.querySelector(".story-header + .story-figure");
    const intro = gsap.timeline({ delay });
    intro
      .add(rise([story.querySelector(".story-title")]))
      .add(rise([story.querySelector(".story-lead"), story.querySelector(".story-role")], { stagger: 0.05, gap: 0.12 }), 0.25)
      .add(rise($$(".story-facts dt, .story-facts dd"), { stagger: 0.04, gap: 0.035 }), 0.5);
    if (hero) {
      const media = hero.querySelector(".story-mat > *");
      intro
        .fromTo(hero, { opacity: 0, y: 32 }, { opacity: 1, y: 0, duration: 1.2, ease, clearProps: "transform" }, 0.65)
        .from(media, { scale: 1.04, duration: 1.4, ease, clearProps: "transform" }, "<")
        .add(rise([hero.querySelector("figcaption")]), "-=0.9");
    }
    root.classList.add("intro-ready"); // GSAP owns the intro now; drop the CSS fallback

    // Progressive reveal: each section's heading, then its paragraphs, line by line; each figure's
    // mat opens from the bottom while the recording settles, then the caption rises in.
    $$(".story-section").forEach((section) => {
      const parts = [section.querySelector("h2"), ...section.querySelectorAll(":scope > p, .story-list li")].filter(Boolean);
      gsap.set(parts, { opacity: 0 });
      ScrollTrigger.create({
        trigger: section,
        start: "top 85%",
        once: true,
        onEnter: () => rise(parts, { stagger: 0.06, gap: 0.12 }),
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
          const tl = gsap.timeline({ defaults: { ease } })
            .to(mat, { clipPath: "inset(0% 0% 0% 0% round 20px)", opacity: 1, duration: 1.2, clearProps: "clipPath" })
            .to(media, { scale: 1, y: 0, duration: 1.4, clearProps: "transform" }, "<");
          if (caption) tl.add(rise([caption]), "-=0.9");
        },
      });
    });

    // Blocks between sections (pairs, notes, steps, stats): their text rises in like the rest
    $$(".story-block, .story-stats").forEach((blockEl) => {
      const parts = leaves(blockEl);
      gsap.set(parts, { opacity: 0 });
      ScrollTrigger.create({
        trigger: blockEl,
        start: "top 88%",
        once: true,
        onEnter: () => rise(parts, { stagger: 0.05, gap: 0.05 }),
      });
    });

    // Content on a mat (bars, quotes, flow, tiers): text rises after the mat opens; bars grow to their value
    $$(".story-figure.is-block").forEach((figure) => {
      // Never split a bar row itself: reverting the split would replace the bar being filled
      const parts = leaves(figure.querySelector(".story-mat")).flatMap((el) => (el.querySelector(".bar-fill") ? [...el.querySelectorAll(".bar-label, .bar-value")] : [el]));
      const fills = [...figure.querySelectorAll(".bar-fill")];
      gsap.set(parts, { opacity: 0 });
      ScrollTrigger.create({
        trigger: figure,
        start: "top 80%",
        once: true,
        onEnter: () => {
          rise(parts, { stagger: 0.04, gap: 0.03 }).delay(0.3);
          gsap.to(fills, { width: (i, el) => `${el.dataset.v}%`, duration: 1.4, ease, stagger: 0.05, delay: 0.45 });
        },
      });
    });

    // Videos and images that load later change the page height
    addEventListener("load", () => ScrollTrigger.refresh());
  };

  if (!reduceMotion && window.gsap && window.ScrollTrigger && window.SplitText) {
    // Once the page is actually shown (it may have been prerendered), and fonts are in, so the
    // title splits into its real lines
    Promise.all([window.pageRevealed, document.fonts ? document.fonts.ready : null]).then(motion);
  } else {
    root.classList.add("intro-ready");
    fillBars();
  }

  // --- Page outline, like Notion's: a dash per section in the left gutter; the one you're
  // reading is darker. Hover (or focus) opens the list of headings; click to jump there. ---
  const headings = [story.querySelector(".story-title"), ...$$(".story h2")].filter(Boolean);
  if (headings.length > 2) {
    const wrapper = document.querySelector(".content-wrapper");
    const scroller = () => (wrapper && wrapper.scrollHeight > wrapper.clientHeight + 1 && getComputedStyle(wrapper).overflowY !== "visible" ? wrapper : null);
    const outline = document.createElement("nav");
    outline.className = "story-outline";
    outline.setAttribute("aria-label", "On this page");
    const list = document.createElement("ol");
    const items = headings.map((h, i) => {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.innerHTML = '<span class="story-outline-dash" aria-hidden="true"></span><span class="story-outline-text"></span>';
      btn.querySelector(".story-outline-text").textContent = i === 0 ? "Overview" : h.textContent.trim();
      btn.addEventListener("click", () => {
        const s = scroller();
        const top = h.getBoundingClientRect().top - (s ? s.getBoundingClientRect().top : 0) + (s ? s.scrollTop : scrollY) - (i === 0 ? 40 : 96);
        (s || window).scrollTo({ top: Math.max(0, top), behavior: reduceMotion ? "auto" : "smooth" });
      });
      li.append(btn);
      list.append(li);
      return li;
    });
    outline.append(list);
    document.body.append(outline);

    // The section being read: the last heading above 40% of the view
    let active = -1, queued = false;
    const update = () => {
      queued = false;
      const line = innerHeight * 0.4;
      let next = 0;
      headings.forEach((h, i) => { if (h.getBoundingClientRect().top < line) next = i; });
      if (next === active) return;
      items[active]?.classList.remove("is-active");
      items[next].classList.add("is-active");
      items[next].querySelector("button").setAttribute("aria-current", "true");
      items[active]?.querySelector("button").removeAttribute("aria-current");
      active = next;
    };
    const onScroll = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
    (wrapper || window).addEventListener("scroll", onScroll, { passive: true });
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);
    update();
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
