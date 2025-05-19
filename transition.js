document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM loaded");
  const ease = "power4.inOut";

  // Handle initial page load transition
  revealTransition().then(() => {
    gsap.set(".block", { visibility: "hidden" });
  });

  function revealTransition() {
    return new Promise((resolve) => {
      gsap.set(".block", { scaleY: 1 });
      gsap.to(".block", {
        scaleY: 0,
        duration: 1,
        stagger: {
          each: 0.1,
          from: "start",
          grid: "auto",
          axis: "x",
        },
        ease: ease,
        onComplete: resolve,
      });
    });
  }

  // Handle link clicks
  document.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", (event) => {
      const href = link.getAttribute("href");
      // Don't handle external links or hash links
      if (href && !href.startsWith("#") && !href.startsWith("http") && !href.startsWith("mailto:") && href !== window.location.pathname) {
        event.preventDefault();
        animateTransition().then(() => {
          window.location.href = href;
        });
      }
    });
  });

  // Handle browser back/forward navigation
  window.addEventListener('popstate', (event) => {
    revealTransition();
  });

  function animateTransition() {
    return new Promise((resolve) => {
      gsap.set(".block", { visibility: "visible", scaleY: 0 });
      gsap.to(".transition", {
        duration: 1,
        transform: 'translateY(-100%)',
        ease: "power4.inOut",
      });
      gsap.to(".block", {
        scaleY: 1,
        duration: 1,
        stagger: {
          each: 0.1,
          from: "start",
          grid: [2, 5],
          axis: "x",
        },
        ease: ease,
        onComplete: resolve,
      });
    });
  }
});