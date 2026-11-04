// Shared Everywear branded loading experience, for the standard (non-scroll) Home.
// Design and gesture lock match video-scroll-test; only asset preparation differs.
const HERO_BACKGROUND = "/brand/hero-rack-hd-2026.webp";
const HERO_POSTER = "/brand/hero-vino-poster-2026.webp";

const curtain = document.getElementById("ew-entry-curtain");
const fill = document.getElementById("ew-entry-fill");
const indicator = document.getElementById("ew-entry-status");
const START = Number(window.__EW_ENTRY_START) || performance.now();
const MIN_VISIBLE_MS = 1750;
const EXIT_MS = 750;

let truePercent = 0;
let displayPercent = 0;
let animating = true;

function report(value) {
  truePercent = Math.max(truePercent, Math.min(100, value));
}
function animateProgress() {
  if (!animating) return;
  const ceiling = Math.min(100, (performance.now() - START) / MIN_VISIBLE_MS * 100);
  const goal = Math.min(truePercent, ceiling);
  displayPercent = Math.min(goal, displayPercent + Math.max(0.3, (goal - displayPercent) * 0.24));
  if (fill) fill.style.width = displayPercent.toFixed(2) + "%";
  if (indicator) indicator.setAttribute("aria-valuenow", String(Math.round(displayPercent)));
  requestAnimationFrame(animateProgress);
}
requestAnimationFrame(animateProgress);

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const homeEntry = !location.hash || location.hash === "#/";

// iOS in-app browsers can scroll the document beneath a fixed overlay despite
// overflow:hidden. Keep the same temporary input lock used by scroll preview.
let entryLocked = true;
function preventLoadingGesture(event) {
  if (entryLocked && event.cancelable) event.preventDefault();
}
function preventLoadingKeys(event) {
  if (entryLocked && ["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " "].includes(event.key)) {
    event.preventDefault();
  }
}
function keepLoadingAtTop() {
  if (entryLocked && homeEntry && window.scrollY > 0) window.scrollTo(0, 0);
}
document.addEventListener("touchmove", preventLoadingGesture, {capture:true, passive:false});
document.addEventListener("wheel", preventLoadingGesture, {capture:true, passive:false});
window.addEventListener("keydown", preventLoadingKeys, {capture:true});
window.addEventListener("scroll", keepLoadingAtTop, {passive:true});

function releaseLoadingLock() {
  if (!entryLocked) return;
  entryLocked = false;
  document.removeEventListener("touchmove", preventLoadingGesture, true);
  document.removeEventListener("wheel", preventLoadingGesture, true);
  window.removeEventListener("keydown", preventLoadingKeys, true);
  window.removeEventListener("scroll", keepLoadingAtTop);
  document.documentElement.classList.remove("ew-entry-locked");
  document.body.classList.remove("ew-entry-locked");
}
function startAtTop() {
  if (!homeEntry) return;
  try { history.scrollRestoration = "manual"; } catch {}
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

// The normal Home has a hero photo, not an image sequence. Warm that actual
// photo without adding any of the experimental frame-loading machinery.
function warmImage(src) {
  return new Promise(resolve => {
    const image = new Image();
    image.decoding = "async";
    image.fetchPriority = "high";
    let done = false;
    const timer = setTimeout(finish, 5000);
    function finish() {
      if (done) return;
      done = true;
      clearTimeout(timer);
      image.onload = null;
      image.onerror = null;
      resolve();
    }
    image.onload = finish;
    image.onerror = finish;
    image.src = src;
    if (image.complete && image.naturalWidth) finish();
  });
}
function prepareHomeImage() {
  if (!homeEntry) { report(70); return Promise.resolve(); }
  return Promise.all([warmImage(HERO_BACKGROUND), warmImage(HERO_POSTER)])
    .then(() => report(70));
}

async function enter() {
  startAtTop();

  // Run loading in parallel. The curtain remains visible on repeated/cached
  // visits for the same minimum duration as the scroll experiment.
  report(5);
  const image = prepareHomeImage();
  const fonts = document.fonts?.ready
    ? Promise.race([document.fonts.ready.catch(() => {}), sleep(3000)])
    : Promise.resolve();
  const app = import("./app.js").then(() => {
    report(90);
  }).catch(error => {
    console.error("Everywear could not initialize:", error);
    report(90);
  });
  await Promise.allSettled([image, fonts, app]);

  report(100);
  const remaining = MIN_VISIBLE_MS - (performance.now() - START);
  if (remaining > 0) await sleep(remaining);
  if (fill) fill.style.width = "100%";
  if (indicator) indicator.setAttribute("aria-valuenow", "100");
  await sleep(140);
  startAtTop();

  animating = false;
  curtain?.classList.add("ew-entry-leaving");
  await sleep(EXIT_MS);
  curtain?.remove();
  startAtTop();
  releaseLoadingLock();
  startAtTop();
  requestAnimationFrame(() => {
    startAtTop();
    requestAnimationFrame(startAtTop);
  });
}
enter();
