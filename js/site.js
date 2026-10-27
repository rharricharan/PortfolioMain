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

  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[href]");
    if (!link || !isInternalPageLink(link, event)) return;
    const url = new URL(link.href, location.href);
    if (url.pathname === location.pathname) { event.preventDefault(); return; }
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
