// Privacy page: the Analytics switch. Off is remembered in this browser (localStorage
// "analytics-off") and read by js/analytics.js on every page; a Global Privacy Control signal
// keeps it off with no switch to flip.
(() => {
  const box = document.querySelector("[data-analytics-toggle]");
  if (!box) return;
  const state = box.querySelector("[data-analytics-state]");
  const button = box.querySelector("[data-analytics-button]");
  const gpc = navigator.globalPrivacyControl === true;
  const read = () => { try { return localStorage.getItem("analytics-off") === "1"; } catch { return false; } };
  const render = () => {
    const off = gpc || read();
    state.textContent = gpc ? "off (Global Privacy Control)" : off ? "off" : "on";
    button.textContent = off ? "Turn it on" : "Turn it off";
    button.hidden = gpc;
  };
  button.addEventListener("click", () => {
    const off = !read();
    try { off ? localStorage.setItem("analytics-off", "1") : localStorage.removeItem("analytics-off"); } catch {}
    window["ga-disable-G-C8KZD5XVSE"] = off;
    render();
  });
  render();
})();
