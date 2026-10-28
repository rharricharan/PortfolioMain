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

  // Case study to case study: no wipe; the content area slides (css/case-nav.css, js/boot.js).
  const CASES = ["smartstop", "rays", "halftone", "leadhack", "one", "cinnamon", "gostr"];
  const caseOf = (path) => CASES.includes(path.replace(/^\/|\.html$|\/$/g, ""));

  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[href]");
    if (!link || !isInternalPageLink(link, event)) return;
    const url = new URL(link.href, location.href);
    if (url.pathname === location.pathname) { event.preventDefault(); return; }
    if (caseOf(location.pathname) && caseOf(url.pathname)) {
      try { sessionStorage.setItem("case-swap", "1"); } catch (e) {}
      return;
    }
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
    const tick = () => { clock.textContent = `EST ${format.format(new Date())}`; };
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
  // in sync, remembers the choice for the next page, and lets the rows that appear rise in.
  const filter = document.querySelector(".project-filter");
  if (filter) {
    const root = document.documentElement;
    const rows = [...document.querySelectorAll(".projects-buttons .project[data-type]")];
    const shown = () => rows.filter((r) => r.offsetParent !== null);
    const sync = () => filter.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.filter === (root.dataset.projects || "all"))));
    sync();
    filter.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-filter]");
      if (!btn) return;
      const before = new Set(shown());
      if (btn.dataset.filter === "all") delete root.dataset.projects;
      else root.dataset.projects = btn.dataset.filter;
      try { sessionStorage.setItem("project-filter", btn.dataset.filter); } catch (err) {}
      sync();
      if (reduceMotion) return;
      shown().filter((r) => !before.has(r)).forEach((r, i) => r.animate(
        [{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "none" }],
        { duration: 380, delay: i * 40, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "backwards" },
      ));
    });
  }

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
