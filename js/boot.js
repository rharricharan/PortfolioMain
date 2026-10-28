// Runs before the page paints (not deferred).
// - How the page arrives is decided when it's actually shown (`pagereveal`; pages can be
//   prerendered first). Moving around the site, every page change is the sliding view
//   transition (css/case-nav.css), so the page gets .case-swap. A fresh arrival (first visit of
//   the session, or landing on the home page from outside) gets .launch instead: the rainbow
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

  window.introDelay = 0;
  window.pageRevealed = new Promise((resolve) => {
    const shown = (event) => {
      if (event && event.viewTransition) root.classList.add("case-swap");
      else if (!reduceMotion && (firstVisit || isHome)) {
        root.classList.add("launch");
        window.introDelay = 0.7;
        setTimeout(() => root.classList.remove("launch"), 1500);
      }
      root.classList.remove("is-prerendering");
      resolve();
    };
    if ("onpagereveal" in window) addEventListener("pagereveal", shown, { once: true });
    else if (document.prerendering) document.addEventListener("prerenderingchange", () => shown(), { once: true });
    else shown();
  });

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
