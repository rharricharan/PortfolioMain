// Product moments rebuilt to try inside the case studies (ported from the 2026 project).
// Each demo plays itself once when it comes into view and stays interactive. Needs GSAP (js/vendor).
(() => {
  const story = document.querySelector(".story");
  if (!story || !window.gsap) return;
  const { gsap } = window;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, r = story) => r.querySelector(s);
  const $$ = (s, r = story) => [...r.querySelectorAll(s)];
  const pad = (n) => String(n).padStart(2, "0");
  const later = (s, fn) => gsap.delayedCall(s, fn);
  const onView = (el, fn) => {
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { io.disconnect(); fn(); }
    }, { rootMargin: "0px 0px -25% 0px" });
    io.observe(el);
  };
  const crossfade = (out, inn) => {
    gsap.to(out, { autoAlpha: 0, y: -6, duration: 0.3, ease: "power2.in" });
    gsap.fromTo(inn, { autoAlpha: 0, y: 6 }, { autoAlpha: 1, y: 0, duration: 0.55, ease: "expo.out", delay: 0.2, clearProps: "transform" });
  };

  // --- Rays: today's hourly UV --------------------------------------------------------------------------
  const uv = $("[data-uv]");
  if (uv) {
    const day = [2, 3, 4, 4, 4, 5, 7, 8, 9, 8, 6, 4]; // 7am to 6pm, illustrative
    const color = (x) => (x >= 8 ? "#e5533b" : x >= 6 ? "#f57c00" : "#f9b000");
    const hour = (h) => `${h % 12 || 12}${h < 12 ? "am" : "pm"}`;
    let at = 0;
    const show = (p) => {
      at = Math.max(0, Math.min(2, p));
      $$("[data-uv-hour]", uv).forEach((el, k) => (el.textContent = hour(7 + at * 4 + k)));
      $("[data-uv-range]", uv).textContent = `${hour(7 + at * 4)} – ${hour(10 + at * 4)}`;
      $$("[data-uv-fill]", uv).forEach((el, k) => {
        const x = day[at * 4 + k];
        const h = `${Math.round((x / 11) * 100)}%`;
        gsap.to(el, { height: h, backgroundColor: color(x), duration: reduce ? 0 : 0.8, ease: "expo.out", delay: k * 0.05 });
        const badge = $(`[data-uv-badge="${k}"]`, uv);
        badge.textContent = String(x);
        gsap.to(badge, { bottom: `calc(${h} + 6px)`, backgroundColor: color(x), duration: reduce ? 0 : 0.8, ease: "expo.out", delay: k * 0.05 });
      });
    };
    $("[data-uv-prev]", uv).addEventListener("click", () => show(at - 1));
    $("[data-uv-next]", uv).addEventListener("click", () => show(at + 1));
    show(0);
    onView(uv, () => { if (!reduce) { later(1.5, () => show(1)); later(3.5, () => show(2)); } });
  }

  // --- Rays: setting up a tanning session -----------------------------------------------------------------
  const timer = $("[data-timer]");
  if (timer) {
    const steps = $$("[data-timer-step]", timer);
    const minsEl = $("[data-timer-mins]", timer);
    const clock = $("[data-timer-clock]", timer);
    const toast = $("[data-timer-toast]", timer);
    const flip = $("[data-timer-flip]", timer);
    let mins = 30, step = 0, run;
    steps.forEach((s, k) => { if (k) gsap.set(s, { autoAlpha: 0 }); s.removeAttribute("data-hidden"); });
    const fmt = (s) => [Math.floor(s / 3600), Math.floor((s % 3600) / 60), Math.floor(s % 60)].map(pad).join(":");
    const start = () => {
      const o = { s: mins * 60 };
      let flipped = false;
      clock.textContent = fmt(o.s);
      if (run) run.kill();
      run = gsap.to(o, {
        s: 0, duration: reduce ? 0 : 8, ease: "none",
        onUpdate: () => {
          clock.textContent = fmt(o.s);
          if (!flipped && flip.checked && o.s <= (mins * 60) / 2) {
            flipped = true;
            gsap.fromTo(toast, { y: -16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: "back.out(2)" });
            gsap.to(toast, { opacity: 0, duration: 0.4, delay: 2 });
          }
        },
        onComplete: () => later(1.2, () => go(0)),
      });
    };
    const go = (k) => {
      if (k === step) return;
      crossfade(steps[step], steps[k]);
      step = k;
      if (k === 2) start();
    };
    $("[data-timer-inc]", timer).addEventListener("click", () => (minsEl.textContent = pad((mins = Math.min(90, mins + 5)))));
    $("[data-timer-dec]", timer).addEventListener("click", () => (minsEl.textContent = pad((mins = Math.max(5, mins - 5)))));
    $$("[data-timer-next]", timer).forEach((b) => b.addEventListener("click", () => go(Number(b.dataset.timerNext))));
    $("[data-timer-end]", timer).addEventListener("click", () => { if (run) run.kill(); go(0); });
    onView(timer, () => { if (!reduce) { later(1.2, () => go(1)); later(2.8, () => go(2)); } });
  }

  // --- Smartstop: the city map's day in congestion -----------------------------------------------------------
  const map = $("[data-map]");
  if (map) {
    const track = $("[data-map-track]", map);
    const head = $("[data-map-head]", map);
    const time = $("[data-map-time]", map);
    const log = $("[data-map-log]", map);
    const icon = $("[data-map-icon]", map);
    const hots = $$("[data-map-hot]", map);
    const m = Object.fromEntries($$("[data-map-m]", map).map((el) => [el.dataset.mapM, el]));
    const items = ["Turned light red on LF-02P", "Traffic pattern change SE", "Sent alert to PD", "Road work started", "Re-connected controller"];

    // A day of congestion, 0 low to 1 high: quiet at night, peaks at the morning and evening rush.
    const N = 96;
    const levels = Array.from({ length: N }, (_, k) => {
      const h = (k / N) * 24;
      const peak = Math.exp(-((h - 8.2) ** 2) / 2) * 0.85 + Math.exp(-((h - 17.6) ** 2) / 3) + Math.exp(-((h - 12.5) ** 2) / 4) * 0.35;
      const noise = (Math.sin(k * 12.9898) * 43758.5453) % 1;
      return Math.max(0, Math.min(1, 0.08 + peak * 0.8 + Math.abs(noise) * 0.18));
    });
    const color = (l) => (l > 0.62 ? "#e5383b" : l > 0.34 ? "#f5b31b" : "#34c759");
    levels.forEach((l) => {
      const s = document.createElement("span");
      s.style.height = `${(40 + l * 60).toFixed(0)}%`;
      s.style.backgroundColor = color(l);
      track.append(s);
    });
    // Nebula steps in at the busiest moments.
    const triggers = [33, 47, 66, 70, 74];
    let p = 0, fired = new Set(), run;
    const fmt = (x) => {
      const mins = Math.round(x * 24 * 60) % (24 * 60);
      const h = Math.floor(mins / 60), mm = pad(mins % 60);
      return `${h % 12 || 12}:${mm} ${h < 12 ? "AM" : "PM"}`;
    };
    const push = (k, at) => {
      const li = document.createElement("li");
      const a = document.createElement("span"), b = document.createElement("span");
      a.textContent = items[k % items.length];
      b.textContent = fmt(at / N);
      li.append(a, b);
      log.prepend(li);
      [...log.children].slice(5).forEach((c) => c.remove());
      if (!reduce) gsap.from(li, { height: 0, opacity: 0, duration: 0.45, ease: "expo.out", clearProps: "height,opacity" });
      const hot = hots[k % hots.length];
      gsap.fromTo(hot, { opacity: 1, scale: 0.4 }, { scale: 1, duration: 0.5, ease: "back.out(3)" });
      gsap.to(hot, { opacity: 0, duration: 0.6, delay: 2.2 });
    };
    const set = (x) => {
      p = Math.max(0, Math.min(0.999, x));
      const k = Math.floor(p * N), l = levels[k];
      head.style.left = `${(p * 100).toFixed(2)}%`;
      time.textContent = fmt(p);
      track.setAttribute("aria-valuenow", String(Math.round(p * 100)));
      m.cong.textContent = `${Math.round(8 + l * 60)}%`;
      m.vel.textContent = (62 - l * 34).toFixed(1);
      m.tp.textContent = (9 + l * 11).toFixed(1);
      m.em.textContent = String(Math.round(90 - l * 30));
      triggers.forEach((t, j) => {
        if (k >= t && !fired.has(t)) { fired.add(t); push(j, t); }
        if (k < t) fired.delete(t);
      });
    };
    const stop = () => { if (run) run.kill(); run = undefined; icon.setAttribute("d", "M6.3 2.84A1.5 1.5 0 0 0 4 4.11v11.78a1.5 1.5 0 0 0 2.3 1.27l9.344-5.891a1.5 1.5 0 0 0 0-2.538L6.3 2.841Z"); };
    const start = () => {
      if (p > 0.98) { set(0); log.replaceChildren(); fired = new Set(); }
      const o = { x: p };
      icon.setAttribute("d", "M5.75 3a.75.75 0 0 0-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 0 0 .75-.75V3.75A.75.75 0 0 0 7.25 3h-1.5ZM12.75 3a.75.75 0 0 0-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 0 0 .75-.75V3.75a.75.75 0 0 0-.75-.75h-1.5Z");
      run = gsap.to(o, { x: 1, duration: 12 * (1 - p), ease: "none", onUpdate: () => set(o.x), onComplete: stop });
    };
    $("[data-map-play]", map).addEventListener("click", () => (run ? stop() : start()));
    const fromPointer = (e) => { const r = track.getBoundingClientRect(); set((e.clientX - r.left) / r.width); };
    track.addEventListener("pointerdown", (e) => { stop(); track.setPointerCapture(e.pointerId); fromPointer(e); });
    track.addEventListener("pointermove", (e) => { if (track.hasPointerCapture(e.pointerId)) fromPointer(e); });
    track.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") { stop(); set(p + (e.key === "ArrowRight" ? 1 : -1) / N); e.preventDefault(); }
    });
    set(0.25);
    onView(map, () => { if (!reduce) start(); });
  }

  // --- Smartstop: retiming a flow ----------------------------------------------------------------------------
  const flow = $("[data-flow]");
  if (flow) {
    const rows = $$("[data-flow-row]", flow);
    const head = $("[data-flow-head]", flow);
    const reds = $$("[data-flow-red]", flow);
    const m = Object.fromEntries($$("[data-flow-m]", flow).map((el) => [el.dataset.flowM, el]));
    const G = "#34c759", Y = "#f5b31b", R = "#e5383b";
    // [label, green seconds] per phase, from the RAH240 flow; each phase ends in yellow then red.
    const plan = [
      [["01", 10], ["02 (R)", 36], ["04", 53], ["03", 21]],
      [["06 (R)", 16], ["05", 9], ["04", 30], ["07", 65]],
    ];
    const segs = plan.map((row, r) => row.flatMap(([label, g]) => [[G, g, label], [Y, 4, ""], [R, 3, ""]].map(([c, w, text]) => {
      const s = document.createElement("span");
      s.style.backgroundColor = c;
      s.style.flex = `${w} 1 0%`;
      s.textContent = text ? `${text}  ${g}s` : "";
      s.dataset.kind = c;
      rows[r].append(s);
      return s;
    })));
    const applied = [false, false];
    const update = () => {
      const d = reduce ? 0 : 1.1;
      const [nw, less] = applied;
      segs.forEach((row, r) => row.forEach((s, k) => {
        const phase = Math.floor(k / 3), kind = s.dataset.kind;
        const g = plan[r][phase][1] * (nw && r === 0 ? 1.18 : nw ? 0.9 : 1);
        gsap.to(s, { flexGrow: kind === G ? g : kind === Y ? 4 : less ? 1.6 : 3, duration: d, ease: "expo.inOut" });
      }));
      const o = { c: parseFloat(m.cong.textContent), t: parseFloat(m.tp.textContent) };
      const c = 42 - (nw ? 9 : 0) - (less ? 5 : 0), t = 21 + (nw ? 4 : 0) + (less ? 2 : 0);
      gsap.to(o, { c, t, duration: d, ease: "expo.inOut", onUpdate: () => { m.cong.textContent = `${Math.round(o.c)}%`; m.tp.textContent = String(Math.round(o.t)); } });
      m.red.textContent = `${(7.9 - (less ? 0.6 : 0)).toFixed(1)}s`;
      reds.forEach((el) => (el.textContent = `${(Number(el.dataset.flowRed) - (less ? 0.2 : 0)).toFixed(1)} s`));
    };
    $$("[data-flow-apply]", flow).forEach((b) => b.addEventListener("click", () => {
      const k = Number(b.dataset.flowApply);
      applied[k] = !applied[k];
      b.textContent = applied[k] ? "Undo" : "Apply";
      b.setAttribute("aria-pressed", String(applied[k]));
      update();
    }));
    let sweep;
    const runBtn = $("[data-flow-run]", flow);
    runBtn.addEventListener("click", () => {
      if (sweep) sweep.kill();
      sweep = gsap.timeline().set(head, { left: "0%", opacity: 1 }).to(head, { left: "100%", duration: reduce ? 0 : 3.2, ease: "none" }).to(head, { opacity: 0, duration: 0.3 });
    });
    onView(flow, () => {
      if (reduce) return;
      const btn = $('[data-flow-apply="0"]', flow);
      gsap.timeline({ delay: 1.2 })
        .to(btn, { scale: 0.9, duration: 0.12, yoyo: true, repeat: 1 })
        .add(() => btn.click())
        .add(() => runBtn.click(), "+=1.3");
    });
  }

  // --- Halftone: an inquiry from Webflow to HubSpot --------------------------------------------------------
  const ff = $("[data-formflow]");
  if (ff) {
    const dot = $("[data-flow-dot]", ff);
    const zap = $("[data-flow-zap]", ff);
    const out = $("[data-flow-result]", ff);
    let tl;
    const para = (cls, text) => { const p = document.createElement("p"); if (cls) p.className = cls; p.textContent = text; return p; };
    const send = (via) => {
      if (tl) tl.kill();
      const ok = via === "zapier";
      zap.style.opacity = ok ? "1" : "0.25";
      out.replaceChildren(para("", "Sending…"));
      tl = gsap.timeline()
        .set(dot, { left: "0%", x: 0, opacity: 1, backgroundColor: "#161615" })
        .to(dot, { left: ok ? "48%" : "60%", duration: reduce ? 0 : 0.7, ease: "power2.inOut" })
        .add(() => {
          if (ok) return;
          gsap.to(dot, { backgroundColor: "#e5383b", x: 4, duration: 0.06, yoyo: true, repeat: 5 });
          out.replaceChildren(para("bad", "Submission failed"), para("", "The form data didn’t match what HubSpot expected, so the inquiry never arrived. This kept happening in testing."));
        });
      if (ok) {
        tl.add(() => out.replaceChildren(para("zapping", "Zapier: mapping fields…")))
          .to(dot, { backgroundColor: "#ff4f00", duration: 0.2 })
          .to(dot, { left: "calc(100% - 12px)", duration: reduce ? 0 : 0.7, ease: "power2.inOut", delay: 0.5 })
          .add(() => {
            const dl = document.createElement("dl");
            [["firstname", "Jordan"], ["lastname", "Lee"], ["email", "jordan@label.co"], ["company", "Label Co."], ["lead_source", "Website form"]].forEach(([k, v]) => {
              const dt = document.createElement("dt"), dd = document.createElement("dd");
              dt.textContent = k; dd.textContent = v;
              dl.append(dt, dd);
            });
            out.replaceChildren(para("ok", "Contact created in HubSpot"), dl);
            if (!reduce) gsap.from(dl.children, { opacity: 0, y: 4, stagger: 0.04, duration: 0.4, clearProps: "transform,opacity" });
          });
      }
    };
    $$("[data-flow-send]", ff).forEach((b) => b.addEventListener("click", () => send(b.dataset.flowSend)));
    onView(ff, () => { if (!reduce) { later(0.8, () => send("direct")); later(3.6, () => send("zapier")); } });
  }

  // --- LeadHack: one-click lead search ----------------------------------------------------------------------
  const leads = $("[data-leads]");
  if (leads) {
    const rows = $$("[data-lead]", leads);
    const run = () => gsap.fromTo(rows, { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: 0.5, ease: "expo.out", stagger: 0.09, clearProps: "transform" });
    $("[data-leads-form]", leads).addEventListener("submit", (e) => { e.preventDefault(); run(); });
    if (!reduce) gsap.set(rows, { opacity: 0 });
    onView(leads, () => (reduce ? gsap.set(rows, { opacity: 1 }) : later(0.5, run)));
  }

  // --- GoSTR: pricing by number of properties -------------------------------------------------------------
  const tiers = $("[data-tiers]");
  if (tiers) {
    const range = $("[data-tiers-range]", tiers);
    const n = $("[data-tiers-n]", tiers);
    const cards = $$("[data-tier]", tiers);
    const set = (v) => {
      n.textContent = String(v);
      const k = cards.findIndex((c) => v <= Number(c.dataset.max));
      cards.forEach((c, j) => c.classList.toggle("is-on", j === k));
    };
    range.addEventListener("input", () => set(Number(range.value)));
    set(Number(range.value));
    onView(tiers, () => {
      if (reduce) return;
      const o = { v: 12 };
      gsap.to(o, { v: 60, duration: 2.4, ease: "power2.inOut", delay: 0.6, yoyo: true, repeat: 1, repeatDelay: 0.6, onUpdate: () => { range.value = String(Math.round(o.v)); set(Math.round(o.v)); } });
    });
  }
})();
