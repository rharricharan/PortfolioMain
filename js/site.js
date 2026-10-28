// Shared behaviour for every page: page transitions, prefetch, clock, mobile menu, sounds and lazy video.
(() => {
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const transition = document.querySelector(".transition");
  const LEAVE_MS = 520; // keep in sync with the cover animation in css/transition.css

  // --- Page transitions -----------------------------------------------------
  // Only same-tab, same-site page links get the wipe. New tabs, modifier clicks,
  // mailto: and external links behave like normal links.
  function isInternalPageLink(link, event) {
    if (event.defaultPrevented || event.button !== 0) return false;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
    if (link.target && link.target !== "_self") return false;
    if (link.hasAttribute("download")) return false;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin) return false;
    if (url.pathname === location.pathname && url.hash) return false;
    return true;
  }

  // Case study to case study: no wipe; the browser's view transition slides the content area
  // (css/case-nav.css), and js/boot.js skips the wipe on arrival.
  const CASES = ["smartstop", "rays", "halftone", "leadhack", "one", "cinnamon", "gostr", "ave", "about"];
  const caseOf = (path) => CASES.includes(path.replace(/^\/|\.html$|\/$/g, ""));

  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[href]");
    if (!link || !isInternalPageLink(link, event)) return;
    const url = new URL(link.href, location.href);
    if (url.pathname === location.pathname) { event.preventDefault(); return; }
    if (caseOf(location.pathname) && caseOf(url.pathname) && "onpagereveal" in window) return;
    if (reduceMotion || !transition) return;
    event.preventDefault();
    transition.classList.add("is-leaving");
    setTimeout(() => { location.href = url.href; }, LEAVE_MS);
  });

  // Coming back with the back button restores the page from cache: clear the cover.
  addEventListener("pageshow", (event) => {
    if (event.persisted && transition) transition.classList.remove("is-leaving");
  });

  // --- Prefetch the next page on hover/touch so it opens instantly ------------
  const prefetched = new Set();
  function prefetch(event) {
    const link = event.target.closest && event.target.closest("a[href]");
    if (!link) return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin || url.pathname === location.pathname || prefetched.has(url.pathname)) return;
    prefetched.add(url.pathname);
    const hint = document.createElement("link");
    hint.rel = "prefetch";
    hint.href = url.pathname;
    document.head.appendChild(hint);
  }
  document.addEventListener("pointerover", prefetch, { passive: true });
  document.addEventListener("touchstart", prefetch, { passive: true });

  // --- Clock ------------------------------------------------------------------
  const clock = document.getElementById("time-container");
  if (clock) {
    const format = new Intl.DateTimeFormat([], { timeZone: "America/New_York", hour12: true, hour: "numeric", minute: "numeric" });
    const tick = () => { clock.textContent = `${format.format(new Date())} EST`; };
    tick();
    setInterval(tick, 15000);
  }

  // --- Mobile menu (case study pages) -------------------------------------------
  const menu = document.getElementById("right-side-menu");
  if (menu) {
    const open = () => menu.classList.add("open");
    const close = () => menu.classList.remove("open");
    document.getElementById("menu-open")?.addEventListener("click", open);
    document.getElementById("menu-close")?.addEventListener("click", close);
    addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });

    let startX = 0;
    document.addEventListener("touchstart", (e) => { startX = e.touches[0].clientX; }, { passive: true });
    document.addEventListener("touchmove", (e) => {
      const diffX = e.touches[0].clientX - startX;
      if (diffX > 50 && startX < 50) open();
      if (diffX < -50 && menu.classList.contains("open")) close();
    }, { passive: true });
  }

  // --- Hide / show the side nav on case pages (desktop, css/filter.css) -------------------
  const navClose = document.querySelector("[data-nav-close]");
  const navOpen = document.querySelector("[data-nav-open]");
  if (navClose && navOpen) {
    const root = document.documentElement;
    const setNav = (collapsed) => {
      root.classList.toggle("nav-collapsed", collapsed);
      navClose.setAttribute("aria-expanded", String(!collapsed));
      try { sessionStorage.setItem("nav-collapsed", collapsed ? "1" : "0"); } catch (e) {}
      (collapsed ? navOpen : navClose).focus({ preventScroll: true });
      // The story changes width: let scroll-driven reveals re-measure once it settles
      setTimeout(() => window.ScrollTrigger?.refresh(), 650);
    };
    navClose.setAttribute("aria-expanded", String(!root.classList.contains("nav-collapsed")));
    navClose.addEventListener("click", () => setNav(true));
    navOpen.addEventListener("click", () => setNav(false));
  }

  // --- Sounds (home page) -------------------------------------------------------
  // Browsers block audio until the visitor interacts, so failures are expected and ignored.
  const hoverSound = document.getElementById("hoverSound");
  const successSound = document.getElementById("successSound");
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const play = (audio, volume) => {
    if (!audio) return;
    audio.volume = volume;
    audio.currentTime = 0;
    audio.play().catch(() => {});
  };
  document.querySelectorAll(".sound").forEach((el) => {
    if (finePointer) el.addEventListener("mouseenter", () => play(hoverSound, 0.5));
    el.addEventListener("click", () => play(successSound, 0.3));
  });

  // --- Project filter (sidebar) ---------------------------------------------------
  // The CSS in css/filter.css does the hiding from html[data-projects]; this keeps the pills
  // in sync and remembers the choice for the next page. With GSAP, a black pill slides to
  // the chosen category, leaving rows fold away and arriving rows open and rise in,
  // while the Experience list below follows.
  const filter = document.querySelector(".project-filter");
  if (filter) {
    const root = document.documentElement;
    const buttons = [...filter.querySelectorAll("button[data-filter]")];
    const rows = [...document.querySelectorAll(".menu-projects .menu-row[data-type]")];
    const current = () => buttons.find((b) => b.dataset.filter === (root.dataset.projects || "all"));
    const sync = () => buttons.forEach((b) => b.setAttribute("aria-pressed", String(b === current())));
    sync();

    // The pill behind the active button
    const pill = document.createElement("span");
    pill.className = "project-filter-pill";
    pill.setAttribute("aria-hidden", "true");
    filter.prepend(pill);
    const place = (btn) => ({ x: btn.offsetLeft, width: btn.offsetWidth });
    // Placed by GSAP when it's there, so later tweens start from the right spot. Re-placed whenever
    // the filter changes size (fonts loading, the phone menu opening).
    const setPill = () => {
      const { x, width } = place(current());
      if (!width) return;
      filter.classList.add("has-pill");
      if (window.gsap) window.gsap.set(pill, { x, width });
      else { pill.style.transform = `translateX(${x}px)`; pill.style.width = `${width}px`; }
    };
    setPill();
    if ("ResizeObserver" in window) new ResizeObserver(setPill).observe(filter);

    // Leaving rows fold shut while arriving rows open in the same moment, so the list (and the
    // Experience block under it) changes height in one smooth motion. Only individual style
    // properties are set, which the site's CSP allows.
    const shown = (r) => r.offsetParent !== null;
    const gap = parseFloat(getComputedStyle(rows[0].parentElement).rowGap) || 0;
    const closed = { height: 0, paddingTop: 0, paddingBottom: 0, marginBottom: -gap, opacity: 0 };
    let running = null; // the timeline of the last click
    const reset = () => {
      running?.kill();
      running = null;
      rows.forEach((r) => r.classList.remove("is-leaving"));
      window.gsap?.set(rows, { clearProps: "all" });
    };
    filter.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-filter]");
      if (!btn || btn === current()) return;
      const { gsap } = window;
      const animate = !reduceMotion && gsap && rows.some(shown);

      // A click mid-animation: drop the last one and start from the rows as they really are
      reset();
      const before = rows.filter(shown);
      if (btn.dataset.filter === "all") delete root.dataset.projects;
      else root.dataset.projects = btn.dataset.filter;
      try { sessionStorage.setItem("project-filter", btn.dataset.filter); } catch (err) {}
      sync();

      if (!animate) { setPill(); return; }
      const { x, width } = place(btn);
      gsap.to(pill, { x, width, duration: 0.6, ease: "expo.out", overwrite: true });
      gsap.fromTo(btn, { scale: 0.94 }, { scale: 1, duration: 0.5, ease: "back.out(3)", clearProps: "transform" });

      const after = rows.filter(shown);
      const entering = after.filter((r) => !before.includes(r));
      const leaving = before.filter((r) => !after.includes(r));
      leaving.forEach((r) => r.classList.add("is-leaving")); // keep them laid out while they fold

      running = gsap.timeline({ onComplete: reset });
      if (leaving.length) running.to(leaving, { ...closed, y: -4, filter: "blur(3px)", duration: 0.5, ease: "power3.inOut", stagger: 0.025 }, 0);
      if (entering.length) running.fromTo(entering,
        { ...closed, y: 10, filter: "blur(4px)" },
        { height: "auto", paddingTop: "", paddingBottom: "", marginBottom: 0, opacity: 1, y: 0, filter: "blur(0px)", duration: 0.65, ease: "expo.out", stagger: 0.04 },
        0.08);
    });
  }

  // --- "More about me": GSAP hover (css/filter.css) ----------------------------------
  // The underline wipes off to the right and draws back in from the left while the arrow
  // nudges forward; on click the arrow shoots ahead as the page changes.
  document.querySelectorAll(".bio-more").forEach((link) => {
    const line = link.querySelector(".bio-more-line");
    const arrow = link.querySelector(".bio-more-arrow");
    const g = () => (!reduceMotion && window.gsap) || null;
    let wipe = null;
    link.addEventListener("pointerenter", () => {
      const gsap = g();
      if (!gsap) return;
      wipe?.kill();
      wipe = gsap.timeline()
        .to(line, { scaleX: 0, transformOrigin: "right center", duration: 0.28, ease: "power2.in" })
        .set(line, { transformOrigin: "left center" })
        .to(line, { scaleX: 1, duration: 0.55, ease: "expo.out" });
      gsap.to(arrow, { x: 4, duration: 0.5, ease: "expo.out", overwrite: true });
    });
    link.addEventListener("pointerleave", () => {
      g()?.to(arrow, { x: 0, duration: 0.5, ease: "expo.out", overwrite: true });
    });
    link.addEventListener("click", () => {
      g()?.to(arrow, { x: 14, opacity: 0, duration: 0.35, ease: "power2.in", overwrite: true });
    });
  });
  // Restored from the back/forward cache: bring the arrow back
  addEventListener("pageshow", (event) => {
    if (event.persisted && window.gsap) window.gsap.set(".bio-more-arrow", { clearProps: "transform,opacity" });
  });

  // --- Availability pill (css/filter.css) ---------------------------------------------
  // The label rises between "contract" and "full-time" every few seconds; on hover it offers
  // to copy the email, and a click copies it (falling back to a mailto link).
  document.querySelectorAll("[data-available]").forEach((pill) => {
    const wrap = pill.querySelector(".available-text");
    const status = pill.querySelector("[data-available-status]");
    const email = pill.dataset.email;
    const cycle = [wrap.textContent.trim()]; // the label as written; more entries would cycle
    let i = 0, hovering = false, copied = false;
    let current = wrap.querySelector(".available-label");

    const show = (text) => {
      if (current.textContent === text) return;
      const { gsap } = window;
      const next = document.createElement("span");
      next.className = "available-label";
      next.textContent = text;
      wrap.append(next);
      const width = next.offsetWidth;
      const old = current;
      current = next;
      if (!gsap || reduceMotion) { old.remove(); wrap.style.width = `${width}px`; return; }
      gsap.to(wrap, { width, duration: 0.5, ease: "expo.out" });
      gsap.fromTo(next, { yPercent: 100, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.5, ease: "expo.out" });
      gsap.to(old, { yPercent: -100, opacity: 0, duration: 0.35, ease: "power2.in", onComplete: () => old.remove() });
    };
    const resting = () => cycle[i];
    const tick = () => { if (!hovering && !copied) { i = (i + 1) % cycle.length; show(resting()); } };

    pill.classList.add("is-live");
    wrap.style.width = `${current.offsetWidth}px`;
    // Measured again once Inter has loaded, so the label isn't cut to the fallback font's width
    document.fonts?.ready.then(() => { if (!hovering && !copied) wrap.style.width = `${current.offsetWidth}px`; });
    if (!reduceMotion && cycle.length > 1) setInterval(tick, 3200);

    pill.addEventListener("pointerenter", () => { hovering = true; if (!copied) show("Copy my email"); });
    pill.addEventListener("pointerleave", () => { hovering = false; if (!copied) show(resting()); });
    pill.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(email);
      } catch (err) {
        location.href = `mailto:${email}`;
        return;
      }
      copied = true;
      show("Email copied");
      status.textContent = `Copied ${email}`;
      window.gsap?.fromTo(pill, { scale: 0.96 }, { scale: 1, duration: 0.5, ease: "back.out(3)", clearProps: "transform" });
      setTimeout(() => { copied = false; show(hovering ? "Copy my email" : resting()); }, 1800);
    });
  });

  // --- Bio tags: a pulse in the brand's colors on click (css/filter.css) ------------------
  document.querySelectorAll(".bio-tag").forEach((tag) => {
    tag.addEventListener("click", () => {
      tag.classList.remove("is-tapped");
      void tag.offsetWidth; // restart the animation on repeat clicks
      tag.classList.add("is-tapped");
    });
    tag.addEventListener("animationend", (e) => { if (e.target === tag) tag.classList.remove("is-tapped"); });
  });

  // --- Videos: load and play only while on screen -----------------------------------
  const videos = document.querySelectorAll("video[data-lazy]");
  if (videos.length && "IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      for (const { target: video, isIntersecting } of entries) {
        if (isIntersecting) {
          if (video.preload === "none") video.preload = "auto";
          if (!reduceMotion) video.play().catch(() => {});
        } else {
          video.pause();
        }
      }
    }, { rootMargin: "200px 0px", threshold: 0.01 });
    videos.forEach((v) => io.observe(v));
  } else {
    videos.forEach((v) => { v.preload = "auto"; v.play().catch(() => {}); });
  }
})();
