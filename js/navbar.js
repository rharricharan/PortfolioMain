// The bars shown while the side menu is hidden (css/navbar.css).
// Showing them: each bar grows out of a single drop into its full width while the buttons come
// into focus from the centre out. Projects: the list grows out of the bar like a drop pulling
// down (the goo filter melts the two shapes together on the way), rows rise in.
// Hiding: the same motion, backwards and quicker.
(() => {
  const init = () => {
    const navbar = document.querySelector("[data-navbar]");
    const { gsap } = window;
    if (!navbar) return;
    const root = document.documentElement;
    const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const items = navbar.querySelector("[data-navbar-items]");
    const bar = navbar.querySelector('[data-shape="bar"]');
    const panelShape = navbar.querySelector('[data-shape="panel"]');
    const panel = navbar.querySelector("[data-navbar-panel]");
    const projects = navbar.querySelector("[data-navbar-projects]");
    const rows = [...panel.querySelectorAll(".navbar-row")];
    const clock = document.querySelector(".navbar-clock");
    const pager = document.querySelector("[data-pager]");
    const pagerShape = pager?.querySelector(".pager-shape");
    const pagerLinks = pager ? [...pager.querySelectorAll(".pager-link")] : [];
    const homeBtn = navbar.querySelector(".navbar-home");
    const phone = matchMedia("(max-width: 780px)");
    const ease = "expo.out";
    let shown = false, open = false, showTl = null, panelTl = null;
    // The frosted blur comes on once the shapes stop moving (a filtered layer can't blur behind it)
    const settle = (on) => navbar.classList.toggle("is-settled", on);

    const size = () => ({ W: items.offsetWidth, H: items.offsetHeight });
    const fitBar = () => { const { W, H } = size(); gsap?.set(bar, { width: W, height: H, x: 0, y: 0 }); };

    // --- The bars ---------------------------------------------------------------------
    const show = (animate) => {
      if (shown) return;
      shown = true;
      [navbar, clock, pager].forEach((el) => el && (el.style.visibility = "visible"));
      if (!gsap) return;
      showTl?.kill();
      const { W, H } = size();
      gsap.set(bar, { width: W, height: H, x: 0 });
      if (!animate || reduceMotion) { gsap.set([...items.children, ...pagerLinks, clock, pagerShape, homeBtn].filter(Boolean), { clearProps: "all" }); settle(true); return; }
      settle(false);
      showTl = gsap.timeline({ onComplete: () => settle(true) })
        .fromTo(bar, { width: H, x: (W - H) / 2 }, { width: W, x: 0, duration: 0.8, ease })
        .fromTo(items.children, { opacity: 0, scale: 0.8, filter: "blur(4px)" },
          { opacity: 1, scale: 1, filter: "blur(0px)", duration: 0.55, ease, stagger: { each: 0.05, from: "center" }, clearProps: "filter,transform" }, 0.12)
        .fromTo(clock, { opacity: 0, y: -6 }, { opacity: 1, y: 0, duration: 0.6, ease, clearProps: "transform" }, 0.2);
      if (homeBtn) showTl.fromTo(homeBtn, { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.6, ease: "back.out(2)", clearProps: "transform" }, 0.3);
      if (pager) {
        showTl.fromTo(pagerShape, { scaleX: 0.25, opacity: 0 }, { scaleX: 1, opacity: 1, duration: 0.8, ease, clearProps: "transform" }, 0.1)
          .fromTo(pagerLinks, { opacity: 0, y: 8, filter: "blur(4px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.55, ease, stagger: 0.06, clearProps: "filter,transform" }, 0.22);
      }
    };

    const hide = () => {
      if (!shown) return;
      shown = false;
      settle(false);
      closePanel(false);
      const done = () => [navbar, clock, pager].forEach((el) => el && (el.style.visibility = "hidden"));
      if (!gsap || reduceMotion) { done(); return; }
      showTl?.kill();
      const { W, H } = size();
      showTl = gsap.timeline({ onComplete: done })
        .to(items.children, { opacity: 0, scale: 0.85, filter: "blur(4px)", duration: 0.25, ease: "power2.in", stagger: { each: 0.03, from: "edges" } })
        .to(bar, { width: H, x: (W - H) / 2, opacity: 0, duration: 0.4, ease: "power3.in" }, 0.05)
        .to(clock, { opacity: 0, duration: 0.25 }, 0);
      if (pager) showTl.to(pagerLinks, { opacity: 0, y: 6, duration: 0.25, ease: "power2.in" }, 0).to(pagerShape, { scaleX: 0.25, opacity: 0, duration: 0.4, ease: "power3.in" }, 0.05);
      if (homeBtn) showTl.to(homeBtn, { opacity: 0, scale: 0.6, duration: 0.3, ease: "power2.in" }, 0);
      showTl.add(() => gsap.set([bar, ...items.children, clock, pagerShape, ...pagerLinks, homeBtn].filter(Boolean), { clearProps: "opacity,transform,filter" }));
    };

    // --- Projects panel -----------------------------------------------------------------
    const openPanel = () => {
      if (open) return;
      open = true;
      projects.setAttribute("aria-expanded", "true");
      panel.classList.add("is-open");
      if (!gsap) return;
      panelTl?.kill();
      const { W, H } = size();
      const PH = panel.offsetHeight;
      if (reduceMotion) { gsap.set(panelShape, { x: 0, y: H - 24, width: W, height: PH + 24, opacity: 1 }); return; }
      settle(false);
      panelTl = gsap.timeline({ onComplete: () => settle(true) })
        .fromTo(panelShape, { x: (W - H) / 2, y: H / 2, width: H, height: H, opacity: 1 },
          { x: 0, y: H - 24, width: W, height: PH + 24, duration: 0.75, ease })
        .fromTo(rows, { opacity: 0, y: -8 }, { opacity: 1, y: 0, duration: 0.5, ease, stagger: 0.035, clearProps: "transform" }, 0.15);
    };

    function closePanel(animate = true) {
      if (!open) return;
      open = false;
      projects.setAttribute("aria-expanded", "false");
      const done = () => { panel.classList.remove("is-open"); gsap?.set(panelShape, { opacity: 0 }); gsap?.set(rows, { clearProps: "opacity,transform" }); if (shown) settle(true); };
      if (!gsap || reduceMotion || !animate) { panelTl?.kill(); done(); return; }
      panelTl?.kill();
      settle(false);
      const { W, H } = size();
      panelTl = gsap.timeline({ onComplete: done })
        .to(rows, { opacity: 0, y: -6, duration: 0.2, ease: "power2.in", stagger: { each: 0.02, from: "end" } })
        .to(panelShape, { x: (W - H) / 2, y: H / 2, width: H, height: H, duration: 0.45, ease: "power3.in" }, 0.08);
    }

    projects.addEventListener("click", () => (open ? closePanel() : openPanel()));
    // With a mouse, the list opens on hovering Projects and closes once the pointer leaves the bar
    const hover = matchMedia("(hover: hover) and (pointer: fine)");
    let leaveTimer = 0;
    projects.addEventListener("pointerenter", () => { if (hover.matches) { clearTimeout(leaveTimer); openPanel(); } });
    navbar.addEventListener("pointerenter", () => clearTimeout(leaveTimer));
    navbar.addEventListener("pointerleave", () => { if (hover.matches && open) leaveTimer = setTimeout(() => closePanel(), 180); });
    addEventListener("keydown", (e) => { if (e.key === "Escape" && open) { closePanel(); projects.focus(); } });
    document.addEventListener("pointerdown", (e) => { if (open && !navbar.contains(e.target)) closePanel(); });
    navbar.addEventListener("focusout", (e) => { if (open && !navbar.contains(e.relatedTarget)) closePanel(); });

    // --- Let’s chat: book a call or email --------------------------------------------------
    const chat = navbar.querySelector("[data-navbar-chat]");
    const chatMenu = navbar.querySelector("[data-navbar-chat-menu]");
    let chatOpen = false;
    const openChat = () => {
      if (chatOpen) return;
      closePanel();
      chatOpen = true;
      chat.setAttribute("aria-expanded", "true");
      // Under the pill, right edges lined up
      chatMenu.style.right = `${navbar.getBoundingClientRect().right - chat.getBoundingClientRect().right}px`;
      chatMenu.hidden = false;
      if (gsap && !reduceMotion) gsap.fromTo(chatMenu, { opacity: 0, y: -6, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.45, ease, overwrite: true });
    };
    const closeChat = (animate = true) => {
      if (!chatOpen) return;
      chatOpen = false;
      chat.setAttribute("aria-expanded", "false");
      const done = () => { chatMenu.hidden = true; gsap?.set(chatMenu, { clearProps: "opacity,transform" }); };
      if (!gsap || reduceMotion || !animate) { gsap?.killTweensOf(chatMenu); done(); return; }
      gsap.to(chatMenu, { opacity: 0, y: -4, scale: 0.97, duration: 0.2, ease: "power2.in", overwrite: true, onComplete: done });
    };
    if (chat && chatMenu) {
      chat.addEventListener("click", () => (chatOpen ? closeChat() : openChat()));
      projects.addEventListener("click", () => closeChat(false));
      projects.addEventListener("pointerenter", () => { if (hover.matches) closeChat(false); });
      chatMenu.addEventListener("click", (e) => { if (e.target.closest("a")) closeChat(false); });
      addEventListener("keydown", (e) => { if (e.key === "Escape" && chatOpen) { closeChat(); chat.focus(); } });
      document.addEventListener("pointerdown", (e) => { if (chatOpen && !chat.contains(e.target) && !chatMenu.contains(e.target)) closeChat(); });
      navbar.addEventListener("focusout", (e) => { if (chatOpen && !navbar.contains(e.relatedTarget)) closeChat(); });
      addEventListener("pageshow", (e) => { if (e.persisted) closeChat(false); });
      addEventListener("navchange", () => closeChat(false));
    }

    // --- Follow the hide / show toggle (js/site.js) ----------------------------------------
    // Desktop: shown while the side menu is hidden. Phones: always the navigation.
    addEventListener("navchange", (e) => { if (!phone.matches) (e.detail.collapsed ? show(true) : hide()); });
    if (root.classList.contains("nav-collapsed") || phone.matches) {
      Promise.resolve(window.pageRevealed).then(() => show(!root.classList.contains("case-swap")));
    }
    phone.addEventListener("change", () => {
      if (phone.matches) show(false);
      else if (!root.classList.contains("nav-collapsed")) hide();
    });
    if ("ResizeObserver" in window) new ResizeObserver(() => { if (shown && !showTl?.isActive()) fitBar(); }).observe(items);
    addEventListener("pageshow", (e) => { if (e.persisted) closePanel(false); });
  };
  addEventListener("DOMContentLoaded", init); // after GSAP, which loads later in the page
})();
