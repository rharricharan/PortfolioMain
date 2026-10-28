// Runs before the page paints (not deferred).
// - Pages can be prerendered while a link is hovered (speculation-rules.json), so nothing here
//   decides how the page arrives until it is actually shown: `pagereveal` fires at that moment,
//   and carries a view transition only when moving between case studies (css/case-nav.css).
//   Then the black block wipe is skipped and the content area slides instead.
// - Until then the wipe's reveal is held (css/transition.css), so it plays when the page is seen.
// - window.pageRevealed resolves when the page is shown, so the GSAP intro (js/case.js) starts then.
// - Hide the case study intro until GSAP plays it, so nothing flashes first.
// - Keep the sidebar's project filter, and whether the nav is hidden, as they were left.
(() => {
  const root = document.documentElement;
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) root.classList.add("intro");
  if (document.prerendering) root.classList.add("is-prerendering");

  window.pageRevealed = new Promise((resolve) => {
    const shown = (event) => {
      if (event && event.viewTransition) root.classList.add("case-swap");
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
    // The side nav stays hidden across case studies once it's been hidden (css/filter.css)
    if (sessionStorage.getItem("nav-collapsed") === "1") root.classList.add("nav-collapsed");
  } catch (e) {}
})();
