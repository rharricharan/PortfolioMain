// Unlock page (served in place of uLogic and Shift AI by functions/_middleware.js): checks the
// password with /api/unlock and reloads into the case study. Without JS the form posts normally.
(() => {
  const form = document.querySelector("[data-unlock-form]");
  if (!form) return;
  const input = form.elements.password;
  const error = form.querySelector("[data-unlock-error]");
  const submit = form.querySelector("[data-unlock-submit]");
  const next = form.elements.next;
  if (!next.value) next.value = location.pathname.replace(/\.html$|\/$/, "");
  const fail = (text) => {
    error.textContent = text;
    input.setAttribute("aria-invalid", "true");
    input.select();
    window.gsap?.fromTo(input, { x: -6 }, { x: 0, duration: 0.5, ease: "elastic.out(1, 0.3)" });
  };
  input.addEventListener("input", () => { input.removeAttribute("aria-invalid"); error.textContent = ""; });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!input.value) return fail("Enter the password to continue.");
    submit.setAttribute("aria-busy", "true");
    submit.textContent = "Checking…";
    try {
      const res = await fetch("/api/unlock", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: input.value, next: next.value }) });
      if (res.ok) { submit.textContent = "Opening…"; location.replace(next.value); return; }
      fail(res.status === 401 ? "That password didn’t work. Try again." : "Something went wrong. Try again in a moment.");
    } catch {
      fail("Something went wrong. Try again in a moment.");
    }
    submit.removeAttribute("aria-busy");
    submit.textContent = "View case study";
  });
})();
