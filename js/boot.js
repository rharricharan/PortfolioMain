// Runs before the page paints (not deferred). When we arrived by moving between case studies,
// skip the black block wipe: the content area slides instead (css/case-nav.css).
try {
  if (sessionStorage.getItem("case-swap")) {
    sessionStorage.removeItem("case-swap");
    document.documentElement.classList.add("case-swap");
  }
} catch (e) {}
