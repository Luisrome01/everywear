// A standalone loading curtain for the Everywear scroll test.
// The stable scroll engine is imported only AFTER this loader is prepared.
const curtain = document.getElementById("ew-entry-curtain");
const fill = document.getElementById("ew-entry-fill");
const indicator = document.getElementById("ew-entry-status");
const START = Number(window.__EW_ENTRY_START) || performance.now();
const MIN_VISIBLE_MS = 1750;
const MAX_FETCH_MS = 12000;
const EXIT_MS = 750;
const FRAME_COUNT = 97;

let truePercent = 0;
let displayPercent = 0;
let animating = true;

function report(p) {
  truePercent = Math.max(truePercent, Math.min(100, p));
}

function animateProgress() {
  if (!animating) return;
  const ceiling = Math.min(100, ((performance.now() - START) / MIN_VISIBLE_MS) * 100);
  const goal = Math.min(truePercent, ceiling);
  displayPercent = Math.min(goal, displayPercent + Math.max(0.3, (goal - displayPercent) * 0.24));
  if (fill) fill.style.width = displayPercent.toFixed(2) + "%";
  if (indicator) indicator.setAttribute("aria-valuenow", String(Math.round(displayPercent)));
  requestAnimationFrame(animateProgress);
}
requestAnimationFrame(animateProgress);

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const homeEntry = !location.hash || location.hash === "#/";

function startAtTop() {
  if (!homeEntry) return;
  try { history.scrollRestoration = "manual"; } catch {}
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

function unpack(data) {
  if (data.byteLength < 8 + FRAME_COUNT * 4) throw new Error("Invalid frame package");
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  if (String.fromCharCode(...data.slice(0, 4)) !== "EWFR" ||
      view.getUint32(4, true) !== FRAME_COUNT) {
    throw new Error("Incorrect frame package header");
  }
  let offset = 8 + FRAME_COUNT * 4;
  const urls = [];
  try {
    for (let i = 0; i < FRAME_COUNT; i++) {
      const length = view.getUint32(8 + i * 4, true);
      if (length < 100 || offset + length > data.byteLength) throw new Error("Corrupt frame");
      urls.push(URL.createObjectURL(new Blob(
        [data.slice(offset, offset + length)], { type: "image/webp" }
      )));
      offset += length;
    }
    if (offset !== data.byteLength) throw new Error("Incorrect frame package size");
    return urls;
  } catch (error) {
    urls.forEach(url => URL.revokeObjectURL(url));
    throw error;
  }
}

async function downloadPack(folder, signal) {
  const response = await fetch("/" + folder + "/sequence.pack", {
    signal, cache: "force-cache"
  });
  if (!response.ok) throw new Error("Frame package unavailable: " + response.status);
  const total = Number(response.headers.get("content-length")) || 0;
  if (!response.body || !response.body.getReader) {
    const data = new Uint8Array(await response.arrayBuffer());
    report(90);
    return unpack(data);
  }
  const reader = response.body.getReader();
  const chunks = [];
  let received = 0;
  while (true) {
    const result = await reader.read();
    if (result.done) break;
    chunks.push(result.value);
    received += result.value.byteLength;
    if (total) report(3 + Math.min(87, 87 * received / total));
  }
  const data = new Uint8Array(received);
  let cursor = 0;
  for (const chunk of chunks) {
    data.set(chunk, cursor);
    cursor += chunk.length;
  }
  report(90);
  return unpack(data);
}

function warmOne(url) {
  return new Promise(resolve => {
    const image = new Image();
    let done = false;
    const timer = setTimeout(() => finish(false), 3500);
    function finish(success) {
      if (done) return;
      done = true;
      clearTimeout(timer);
      image.onload = null;
      image.onerror = null;
      resolve(success ? image : null);
    }
    image.onload = async () => {
      try { if (image.decode) await image.decode(); } catch {}
      finish(image.naturalWidth > 0);
    };
    image.onerror = () => finish(false);
    image.src = url;
  });
}

async function prepare() {
  const override = new URLSearchParams(location.search).get("scrollQuality");
  const smallDevice = matchMedia("(max-width: 760px)").matches;
  const saveData = navigator.connection?.saveData;
  const use720 = override === "720" ||
    (override !== "hd" && (smallDevice || saveData));
  const options = use720
    ? ["scroll-frames"]
    : ["scroll-frames-hd", "scroll-frames"];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MAX_FETCH_MS);
  let urls = null;
  try {
    for (const folder of options) {
      try {
        urls = await downloadPack(folder, controller.signal);
        break;
      } catch (error) {
        if (controller.signal.aborted) break;
      }
    }
  } finally {
    clearTimeout(timeout);
  }
  if (!urls) return false;
  report(93);
  const indexes = smallDevice ? [0,1,2,3,4,5] : [0,1,2,3,4,5,6,7];
  const warmed = await Promise.all(indexes.map(i => warmOne(urls[i])));
  if (!warmed[0]) {
    urls.forEach(url => URL.revokeObjectURL(url));
    return false;
  }
  // The existing, known-working scroll code uses these URLs unchanged.
  window.__EW_SCROLL_FRAMES = urls;
  window.__EW_WARM_IMAGES = warmed.filter(Boolean);
  report(97);
  return true;
}

async function enter() {
  startAtTop();
  try {
    await prepare();
  } catch (error) {
    console.warn("Everywear: loading original frame URLs instead.", error);
  }

  // The HTML app is mounted behind the curtain before it moves away.
  try {
    await import("./app.js");
  } catch (error) {
    console.error("Everywear could not initialize:", error);
    // Never leave an endless full-screen curtain on an application error.
  }

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
  document.body.classList.remove("ew-entry-locked");
  startAtTop();
  // Recheck scroll restoration after the browser's first layout.
  requestAnimationFrame(() => {
    startAtTop();
    requestAnimationFrame(startAtTop);
  });
}
enter();
