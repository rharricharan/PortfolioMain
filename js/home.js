// Home: the launch sequence and the project previews.
// Launch: the bio rises in line by line, the menu settles, then "select a project of mine"
// writes itself in and the arrow draws its loop toward the list, ending in a small nudge.
// Previews: hovering (or focusing) a project in the menu swaps the arrow for a window playing
// that project, sized to its video and drifting to sit beside the row.
(() => {
  const home = document.querySelector(".home");
  if (!home) return;
  const root = document.documentElement;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const { gsap, SplitText } = window;
  const hint = home.querySelector("[data-home-hint]");
  const line = hint.querySelector(".home-arrow-line");
  const head = hint.querySelector(".home-arrow-head");
  const label = hint.querySelector(".home-hint-text");
  let launched = !gsap || reduceMotion;

  // --- Launch ---------------------------------------------------------------------
  const launch = () => {
    const ease = "expo.out";
    const bio = home.querySelector(".home-bio");
    // The bio's lines rise into place behind a mask, as text does on the case studies. It's
    // split into words (splitting by line re-wraps the text around the grey tags), then each
    // word takes its line's timing, so every line rises together
    const split = SplitText ? SplitText.create(bio, { type: "words", mask: "words" }) : null;
    const tops = split ? [...new Set(split.words.map((w) => Math.round(w.getBoundingClientRect().top)))] : [];
    const lineOf = (w) => tops.indexOf(Math.round(w.getBoundingClientRect().top));
    const menuParts = document.querySelectorAll(".home-page .menu-inner > *");
    const len = (p) => p.getTotalLength();
    // Hidden until drawn: round line caps would otherwise show as dots before the draw starts
    gsap.set([line, head], { strokeDasharray: (i, el) => len(el), strokeDashoffset: (i, el) => len(el), opacity: 0 });
    const chars = SplitText ? SplitText.create(label, { type: "chars" }).chars : [label];

    const delay = (root.classList.contains("case-swap") ? 0.55 : 0.35) + (window.introDelay || 0);
    const tl = gsap.timeline({ delay, onComplete: () => { launched = true; idle(); } });
    // Each piece starts hidden through its own tween (immediateRender), so nothing flashes
    if (split) {
      bio.classList.add("is-rising"); // the grey tags wait until their words have landed
      tl.from(split.words, { yPercent: 110, duration: 1.1, ease, stagger: (i, w) => lineOf(w) * 0.08, onComplete: () => { split.revert(); bio.classList.remove("is-rising"); } }, 0);
    }
    else tl.from(bio, { y: 16, opacity: 0, duration: 1.1, ease, clearProps: "transform" }, 0);
    tl
      .from(".home-about", { y: 14, opacity: 0, duration: 0.9, ease, clearProps: "transform,opacity" }, 0.45)
      .from(menuParts, { y: 12, opacity: 0, duration: 0.9, ease, stagger: 0.08, clearProps: "transform,opacity" }, 0.2)
      .from(chars, { opacity: 0, y: 6, duration: 0.5, ease: "power2.out", stagger: 0.025 }, 0.9)
      .set(line, { opacity: 1 }, 1.15)
      .to(line, { strokeDashoffset: 0, duration: 1.5, ease: "power2.inOut" }, 1.15)
      .set(head, { opacity: 1 }, 2.55)
      .to(head, { strokeDashoffset: 0, duration: 0.4, ease: "power2.out" }, 2.55);
    root.classList.add("intro-ready");

    // Back home with the menu hidden: it ripples open again from its top-right corner
    if (root.classList.contains("nav-reopen")) {
      const menu = document.getElementById("right-side-menu");
      gsap.fromTo(menu, { clipPath: "circle(0% at 100% 0%)" },
        { clipPath: "circle(150% at 100% 0%)", duration: 1.1, ease: "expo.inOut", delay: delay * 0.5,
          onComplete: () => { root.classList.remove("nav-reopen"); gsap.set(menu, { clearProps: "clipPath" }); } });
    }
  };

  // The arrow's cadence: a rest, a nudge toward the list, another rest, then it takes off (the
  // line erases from its tail toward the tip and the head flies on), redraws from the start
  // into the same loop, and lands pointing at the projects again. Paused during previews.
  let nudge = null;
  const idle = () => {
    if (reduceMotion || !gsap) return;
    const len = line.getTotalLength();
    const headLen = head.getTotalLength();
    const drawn = () => gsap.set([line, head], { strokeDashoffset: 0, opacity: 1, x: 0, y: 0 });
    nudge = gsap.timeline({ repeat: -1, onRepeat: drawn })
      .add(drawn)
      .to(head, { x: 7, y: -5, duration: 0.45, ease: "power2.out" }, 3.2)
      .to(head, { x: 0, y: 0, duration: 0.8, ease: "elastic.out(1, 0.5)" }, ">")
      // take off
      .to(line, { strokeDashoffset: -len, duration: 1, ease: "power2.in" }, 7.4)
      .to(line, { opacity: 0, duration: 0.18, ease: "power1.in" }, 8.2)
      .to(head, { x: 26, y: -20, opacity: 0, duration: 0.45, ease: "power2.in" }, 7.95)
      // and back: drawn again from the start, the head snapping on at the end
      .set(line, { strokeDashoffset: len, opacity: 0 }, 8.75)
      .set(head, { x: 0, y: 0, strokeDashoffset: headLen, opacity: 0 }, 8.75)
      .to(line, { strokeDashoffset: 0, duration: 1.4, ease: "power2.inOut" }, 8.8)
      .to(line, { opacity: 1, duration: 0.12 }, 8.86)
      .set(head, { opacity: 1 }, 10.15)
      .to(head, { strokeDashoffset: 0, duration: 0.35, ease: "power2.out" }, 10.15)
      .to({}, { duration: 0.6 });
  };

  if (!launched) Promise.all([window.pageRevealed, document.fonts ? document.fonts.ready : null]).then(launch);
  else root.classList.add("intro-ready");

  // --- Previews ---------------------------------------------------------------------
  const canHover = matchMedia("(hover: hover) and (pointer: fine) and (min-width: 781px)").matches;
  const list = document.querySelector(".menu-projects");
  const preview = home.querySelector("[data-home-preview]");
  if (!canHover || !list || !preview || !gsap) return;

  const frame = preview.querySelector("[data-preview-frame]");
  const nameEl = preview.querySelector("[data-preview-name]");
  const metaEl = preview.querySelector("[data-preview-meta]");
  const videos = new Map();
  let current = null, visible = false, hideTimer = 0;

  const videoFor = (slug) => {
    if (videos.has(slug)) return videos.get(slug);
    const v = document.createElement("video");
    v.muted = true;
    v.loop = true;
    v.playsInline = true;
    v.preload = "auto";
    v.setAttribute("aria-hidden", "true");
    v.poster = `assets/previews/${slug}.webp`;
    v.src = `assets/previews/${slug}.mp4`;
    frame.append(v);
    videos.set(slug, v);
    return v;
  };

  // The open space: below the intro, left of the menu
  const intro = home.querySelector(".home-intro");
  const space = () => {
    const area = home.getBoundingClientRect();
    const top = intro.getBoundingClientRect().bottom + 32;
    return { left: area.left, width: area.width, top, bottom: innerHeight - 24 };
  };

  // The window's size follows the video's shape (wide for sites, tall for the phone app) and
  // fits the open space with its caption
  const sizeFor = (ratio) => {
    const s = space();
    const maxW = Math.min(480, s.width * 0.6);
    const maxH = Math.max(160, Math.min(520, s.bottom - s.top - 34));
    let w = maxW, h = w / ratio;
    if (h > maxH) { h = maxH; w = h * ratio; }
    return { w: Math.round(w), h: Math.round(h) };
  };

  // Level with the hovered row where there's room, always inside the open space, centered
  const placeFor = (row, { w, h }) => {
    const s = space();
    const r = row.getBoundingClientRect();
    const total = h + 34; // window and caption
    const y = Math.max(s.top, Math.min(s.bottom - total, r.top + r.height / 2 - total / 2));
    return { x: s.left + (s.width - w) / 2, y };
  };

  const show = (row) => {
    clearTimeout(hideTimer);
    const slug = row.dataset.preview;
    const size = sizeFor(Number(row.dataset.ratio) || 1.6);
    const { x, y } = placeFor(row, size);
    const ease = "expo.out";

    if (!visible) {
      visible = true;
      gsap.set(preview, { x, y: y + 16, visibility: "visible" });
      gsap.set(frame, { width: size.w, height: size.h });
      gsap.to(preview, { opacity: 1, y, scale: 1, duration: 0.7, ease, overwrite: "auto", startAt: { scale: 0.94 } });
      gsap.to(hint, { opacity: 0, scale: 0.97, duration: 0.35, ease: "power2.out", overwrite: "auto" });
      nudge?.pause();
    } else {
      gsap.to(preview, { x, y, duration: 0.7, ease, overwrite: "auto" });
      gsap.to(frame, { width: size.w, height: size.h, duration: 0.6, ease });
    }
    if (slug === current) return;
    const next = videoFor(slug);
    const prev = current && videos.get(current);
    current = slug;
    nameEl.textContent = row.querySelector(".menu-row-name").textContent;
    metaEl.textContent = row.querySelector(".menu-row-meta").textContent;
    next.currentTime = 0;
    next.play().catch(() => {});
    gsap.to(next, { opacity: 1, duration: 0.45, ease: "power2.out", overwrite: true });
    if (prev) gsap.to(prev, { opacity: 0, duration: 0.45, ease: "power2.out", overwrite: true, onComplete: () => prev.pause() });
  };

  const hide = () => {
    hideTimer = setTimeout(() => {
      if (!visible) return;
      visible = false;
      gsap.to(preview, { opacity: 0, scale: 0.96, duration: 0.35, ease: "power2.in", overwrite: "auto",
        onComplete: () => {
          gsap.set(preview, { visibility: "hidden" });
          videos.forEach((v) => { v.pause(); gsap.set(v, { opacity: 0 }); });
          current = null;
        } });
      gsap.to(hint, { opacity: 1, scale: 1, duration: 0.6, ease: "expo.out", delay: 0.1, overwrite: "auto" });
      if (launched) nudge?.restart(true);
    }, 160);
  };

  list.addEventListener("pointerover", (e) => { const row = e.target.closest(".menu-row"); if (row) show(row); });
  list.addEventListener("pointerleave", hide);
  list.addEventListener("focusin", (e) => { const row = e.target.closest(".menu-row"); if (row) show(row); });
  list.addEventListener("focusout", (e) => { if (!list.contains(e.relatedTarget)) hide(); });
  // Warm the first few previews once the page has settled
  addEventListener("load", () => setTimeout(() => {
    [...list.querySelectorAll(".menu-row")].slice(0, 3).forEach((r) => { const v = videoFor(r.dataset.preview); v.preload = "metadata"; });
  }, 2500));
})();
