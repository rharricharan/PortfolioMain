// Case study pages: figure numbering, arrivals and the small rebuilt demos.
(() => {
  const story = document.querySelector(".story");
  if (!story) return;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Arrivals: anything already on screen stays put; the rest rises in once.
  const onView = (el, fn, margin = "0px 0px -10% 0px") => {
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { io.disconnect(); fn(); }
    }, { rootMargin: margin });
    io.observe(el);
  };
  if (!reduceMotion && "IntersectionObserver" in window) {
    const items = [...story.querySelectorAll("[data-reveal]")].filter((el) => el.getBoundingClientRect().top > innerHeight);
    document.documentElement.classList.add("has-reveal");
    story.querySelectorAll("[data-reveal]").forEach((el) => { if (!items.includes(el)) el.classList.add("is-in"); });
    items.forEach((el) => onView(el, () => el.classList.add("is-in")));
  }

  // Cinnamon: everyone in orbit around you. Tap someone to connect them to the center.
  const orbit = story.querySelector("[data-orbit]");
  if (orbit) {
    const people = [...orbit.querySelectorAll("[data-orbit-person]")];
    const line = orbit.querySelector("[data-orbit-line]");
    const status = orbit.querySelector("[data-orbit-status]");
    let spin = 0, picked = -1, running = false, last = 0;

    const place = () => people.forEach((p, k) => {
      const a = ((Number(p.dataset.angle) + spin * (k % 2 ? -0.7 : 1)) * Math.PI) / 180;
      const r = Number(p.dataset.r) / 2;
      p.style.left = `${50 + Math.cos(a) * r}%`;
      p.style.top = `${50 + Math.sin(a) * r}%`;
      if (k === picked) {
        line.setAttribute("x2", String(100 + Math.cos(a) * r * 2));
        line.setAttribute("y2", String(100 + Math.sin(a) * r * 2));
      }
    });
    const frame = (t) => {
      if (!running) return;
      spin = (spin + (last ? (t - last) / 1000 : 0) * 9) % 360; // one turn every 40s
      last = t;
      place();
      requestAnimationFrame(frame);
    };
    // Only spins while on screen.
    new IntersectionObserver(([e]) => {
      running = e.isIntersecting && !reduceMotion;
      last = 0;
      if (running) requestAnimationFrame(frame);
    }).observe(orbit);

    people.forEach((p, k) => p.addEventListener("click", () => {
      people.forEach((x) => x.classList.remove("is-picked"));
      p.classList.add("is-picked");
      picked = k;
      line.style.opacity = "0";
      place();
      requestAnimationFrame(() => { line.style.opacity = "1"; });
      status.textContent = `Connected to ${p.dataset.name}.`;
    }));
    place();
    onView(orbit, () => { if (!reduceMotion) setTimeout(() => picked < 0 && people[0].click(), 1400); });
  }
})();
