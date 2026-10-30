// Google Analytics (moved out of the page so the Content-Security-Policy can block inline scripts).
// Stays off when the visitor turned it off on the privacy page (js/privacy.js) or their browser
// sends a Global Privacy Control signal.
const GA_ID = "G-C8KZD5XVSE";
const analyticsOff = (() => { try { return localStorage.getItem("analytics-off") === "1"; } catch { return false; } })() || navigator.globalPrivacyControl === true;
window[`ga-disable-${GA_ID}`] = analyticsOff;
window.dataLayer = window.dataLayer || [];
function gtag() { dataLayer.push(arguments); }
gtag("js", new Date());
gtag("config", GA_ID);
