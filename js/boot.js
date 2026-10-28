// Runs before the page paints (not deferred).
// - Arrived by moving between case studies: skip the black block wipe; the content area
//   slides instead (css/case-nav.css).
// - Hide the case study intro until GSAP plays it (js/case.js), so nothing flashes first.
try {
  if (sessionStorage.getItem("case-swap")) {
    sessionStorage.removeItem("case-swap");
    document.documentElement.classList.add("case-swap");
  }
} catch (e) {}
if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
  document.documentElement.classList.add("intro");
}
// - Keep the sidebar's project filter where it was left, so the list doesn't jump on load.
try {
  const f = sessionStorage.getItem("project-filter");
  if (f && f !== "all") document.documentElement.dataset.projects = f;
} catch (e) {}
