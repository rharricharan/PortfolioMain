// About page: the headline rises in line by line, each section's content follows as it scrolls
// into view, and the numbers count up. Starts once the page is actually shown (js/boot.js).
(() => {
  const about = document.querySelector(".about");
  if (!about) return;
  const root = document.documentElement;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const { gsap, ScrollTrigger, SplitText } = window;
  if (reduceMotion || !gsap || !ScrollTrigger || !SplitText) { root.classList.add("intro-ready"); return; }

  const motion = () => {
    gsap.registerPlugin(ScrollTrigger, SplitText);
    const ease = "expo.out";
    const wrapper = document.querySelector(".content-wrapper");
    const scroller = wrapper && wrapper.scrollHeight > wrapper.clientHeight + 1 && getComputedStyle(wrapper).overflowY !== "visible" ? wrapper : window;
    ScrollTrigger.defaults({ scroller });

    // Intro: the photo line, then the headline's lines rising behind a mask
    const title = about.querySelector(".about-title");
    const split = SplitText.create(title, { type: "lines", mask: "lines" });
    const delay = (root.classList.contains("case-swap") ? 0.6 : 0.4) + (window.introDelay || 0);
    gsap.timeline({ delay })
      .set(title, { opacity: 1 }, 0)
      .from(split.lines, { yPercent: 110, duration: 1.1, ease, stagger: 0.08, onComplete: () => split.revert() }, 0.1);
    root.classList.add("intro-ready");

    // Sections: label, then content, rising a little as they come into view
    about.querySelectorAll(".about-section").forEach((section) => {
      const parts = [section.querySelector(".about-label"), ...section.querySelectorAll(".about-copy p, .about-intro-line, .about-experience div, .about-steps li, .about-tools li, .about-numbers div, .about-contact-card")];
      gsap.set(parts, { opacity: 0, y: 18 });
      ScrollTrigger.create({
        trigger: section,
        start: "top 85%",
        once: true,
        onEnter: () => gsap.to(parts, { opacity: 1, y: 0, duration: 0.9, ease, stagger: 0.05, clearProps: "transform" }),
      });
    });

    // Numbers count up to their value
    about.querySelectorAll("[data-count]").forEach((el) => {
      const end = Number(el.textContent);
      const start = end > 1000 ? end - 12 : 0;
      const n = { v: start };
      const suffix = el.dataset.suffix || "";
      el.textContent = start + suffix;
      ScrollTrigger.create({
        trigger: el,
        start: "top 90%",
        once: true,
        onEnter: () => gsap.to(n, { v: end, duration: 1.4, ease: "power3.out", onUpdate: () => { el.textContent = Math.round(n.v) + suffix; } }),
      });
    });

    addEventListener("load", () => ScrollTrigger.refresh());
  };

  Promise.all([window.pageRevealed, document.fonts ? document.fonts.ready : null]).then(motion);
})();
