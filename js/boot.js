// Runs before the page paints (not deferred).
// - How the page arrives is decided when it's actually shown (`pagereveal`; pages can be
//   prerendered first). Moving around the site, every page change is the sliding view
//   transition (css/case-nav.css), so the page gets .case-swap. A fresh arrival (first visit of
//   the session) and every arrival on the home page get .launch instead: the rainbow
//   launch (css/transition.css). The black block curtain is kept but switched off (.curtain).
// - window.pageRevealed resolves when the page is shown, so the intros (js/case.js, js/home.js,
//   js/about.js) start then; window.introDelay adds the launch's length when it plays.
// - The case-study intro stays hidden until GSAP plays it, so nothing flashes first.
// - The sidebar's project filter, and whether the menu is hidden, carry between pages. The home
//   page always has the menu open: arriving there resets it, and if it was hidden it ripples
//   back open (.nav-reopen, js/home.js).
(() => {
  const root = document.documentElement;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isHome = /^\/(index(\.html)?)?$/.test(location.pathname);
  if (!reduceMotion) root.classList.add("intro");
  if (document.prerendering) root.classList.add("is-prerendering");

  let firstVisit = false;
  try {
    firstVisit = !sessionStorage.getItem("visited");
    sessionStorage.setItem("visited", "1");
  } catch (e) {}

  // Desktop About slides the side nav closed on arrival, and the page after it slides it back
  // open (js/site.js); the menu is then already on screen, so it doesn't cascade in, and About's
  // intro waits for the slide
  const desktop = matchMedia("(min-width: 781px)").matches && !reduceMotion;
  const isAbout = /^\/about(\.html)?\/?$/.test(location.pathname);
  let navSlides = false;
  try {
    const collapsed = sessionStorage.getItem("nav-collapsed") === "1";
    navSlides = desktop && !isHome && (isAbout ? !collapsed : collapsed && sessionStorage.getItem("nav-auto") === "1");
  } catch (e) {}

  window.introDelay = 0;
  window.pageRevealed = new Promise((resolve) => {
    const shown = (event) => {
      // Home always opens with the launch, so coming back from another page skips the slide
      const launch = !reduceMotion && (firstVisit || isHome);
      // A skipped or interrupted slide rejects these; that's expected, not an error
      if (event && event.viewTransition) [event.viewTransition.updateCallbackDone, event.viewTransition.ready, event.viewTransition.finished].forEach((p) => p.catch(() => {}));
      if (event && event.viewTransition && isHome && launch) event.viewTransition.skipTransition();
      else if (event && event.viewTransition) root.classList.add("case-swap");
      if (launch && !root.classList.contains("case-swap")) {
        root.classList.add("launch");
        window.introDelay = 0.7;
        setTimeout(() => root.classList.remove("launch"), 1500);
      }
      if (navSlides && isAbout) window.introDelay += 0.6;
      // Resolves once the page-change slide has finished (straight away when there wasn't one)
      window.pageSettled = event && event.viewTransition ? event.viewTransition.finished.catch(() => {}) : Promise.resolve();
      root.classList.remove("is-prerendering");
      resolve();
    };
    if ("onpagereveal" in window) addEventListener("pagereveal", shown, { once: true });
    else if (document.prerendering) document.addEventListener("prerenderingchange", () => shown(), { once: true });
    else shown();
  });

  // The menu cascades in on arrival, except moving from one case study to another, where the
  // menu is the same and stays still (js/site.js)
  try {
    const kind = isHome ? "home" : /about/.test(location.pathname) ? "about" : "case";
    const last = sessionStorage.getItem("page-kind");
    sessionStorage.setItem("page-kind", kind);
    if (!reduceMotion && !navSlides && !(kind === "case" && last === "case")) root.classList.add("menu-in");
  } catch (e) {}

  try {
    const f = sessionStorage.getItem("project-filter");
    if (f && f !== "all") root.dataset.projects = f;
    if (sessionStorage.getItem("nav-collapsed") === "1") {
      if (isHome) {
        root.classList.add("nav-reopen");
        sessionStorage.setItem("nav-collapsed", "0");
      } else root.classList.add("nav-collapsed");
    }
  } catch (e) {}
})();
