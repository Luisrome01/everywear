// Everywear experimental scroll hero (video-scroll-test only).
// This module owns no autoplay video; progress maps to one of 60 still frames.
export const SCROLL_FRAMES = 60;
// Automatically prioritize lightweight frames on slow connections. Use ?scrollQuality=720 or ?scrollQuality=hd to compare.
const override = new URLSearchParams(window.location.search).get("scrollQuality");
const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
const slowNetwork = Boolean(connection?.saveData || /^(slow-2g|2g|3g)$/.test(connection?.effectiveType || ""));
const lowQuality = override === "720" || (override !== "hd" && slowNetwork);
const folder = lowQuality ? "scroll-frames" : "scroll-frames-hd";
const path = i => "/" + folder + "/frame_" + String(i + 1).padStart(3, "0") + ".webp";
const fallbackPath = i => "/scroll-frames/frame_" + String(i + 1).padStart(3, "0") + ".webp";

export function scrollHeroMarkup() {
  return `<section class="ew-scroll-zone" id="everywear-scroll-experience" aria-label="Editorial Everywear, camina con nuestro estilo">
    <div class="ew-scroll-stage" id="ew-scroll-stage">
      <img id="ew-scroll-frame" class="ew-scroll-frame" src="/scroll-frames/frame_001.webp" alt="Modelo de Everywear caminando con bolsa de la marca" draggable="false" fetchpriority="high" decoding="async" loading="eager" />
      <div class="ew-scroll-tint" aria-hidden="true"></div>
      <div class="ew-scroll-intro" id="ew-scroll-intro"><span class="ew-scroll-kicker">EVERYWEAR / EDICIÓN 01</span><h1>Tu estilo<br/><em>en movimiento.</em></h1><p>Prendas que hablan de ti. Descubre una selección creada para acompañarte a donde vayas.</p><span class="ew-scroll-intro-foot">DESLIZA PARA DESCUBRIR <span aria-hidden="true">↓</span></span></div>
      <div class="ew-scroll-stories" aria-label="Momentos de la colección">
        <article class="ew-scroll-story" data-start=".18" data-end=".39"><span>01 / EVERY DAY</span><h2>Un look,<br/><em>mil posibilidades.</em></h2><p>Para todos esos planes que empiezan sin avisar.</p></article>
        <article class="ew-scroll-story" data-start=".41" data-end=".62"><span>02 / THE DETAILS</span><h2>La magia<br/><em>está en los detalles.</em></h2><p>Piezas especiales, fáciles de hacer tuyas.</p></article>
        <article class="ew-scroll-story" data-start=".64" data-end=".82"><span>03 / CURATED STYLE</span><h2>Every wear.<br/><em>Every version of you.</em></h2><p>Tu acceso a una nueva forma de vestir.</p></article>
        <article class="ew-scroll-story" data-start=".84" data-end="1.01"><span>04 / YOUR NEXT LOOK</span><h2>Tu próximo<br/><em>favorito te espera.</em></h2><p>La colección está a un paso.</p><a class="ew-scroll-action" href="#/catalogo">Explorar catálogo ↗</a></article>
      </div>
      <button id="ew-scroll-skip" class="ew-scroll-skip" type="button">Saltar animación <span aria-hidden="true">↓</span></button>
      <span id="ew-scroll-load-status" class="ew-scroll-load-status" role="status" aria-live="polite" hidden></span>
      <div class="ew-scroll-progress" aria-hidden="true"><span class="ew-scroll-progress-label">SCROLL TO EXPLORE</span><div class="ew-scroll-progress-track"><span id="ew-scroll-progress-fill"></span></div><span id="ew-scroll-frame-count">01 / 60</span></div>
    </div>
  </section>`;
}


let teardown = null;

// Fail-open loading: no full-sequence preload, no scroll locking, and a permanent skip link.
// Only a small, local window of frames is held in memory on mobile.
export function initScrollHero() {
  if (teardown) { teardown(); teardown = null; }
  const zone = document.getElementById("everywear-scroll-experience");
  const frame = document.getElementById("ew-scroll-frame");
  if (!zone || !frame) return;

  const intro = document.getElementById("ew-scroll-intro");
  const stories = Array.from(zone.querySelectorAll(".ew-scroll-story"));
  const bar = document.getElementById("ew-scroll-progress-fill");
  const counter = document.getElementById("ew-scroll-frame-count");
  const skip = document.getElementById("ew-scroll-skip");
  const status = document.getElementById("ew-scroll-load-status");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const maxConcurrent = slowNetwork ? 1 : 2;
  const radius = slowNetwork ? 2 : 3;
  const maxCachedFrames = 12;
  const cache = new Map();
  const abort = new AbortController();
  let dead = false, started = false, inflight = 0, desired = 0, shown = -1, raf = 0, failed = 0, observer = null;

  function showStatus(message) {
    if (!status) return;
    status.hidden = !message;
    status.textContent = message || "";
  }

  skip?.addEventListener("click", () => {
    const after = zone.nextElementSibling || document.getElementById("personal-shopper");
    after?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  }, { signal: abort.signal });

  // The small poster is visible immediately. Should the media server fail,
  // use a real, local brand image rather than a blank page.
  let posterFallback = false;
  frame.addEventListener("error", () => {
    if (!posterFallback) {
      posterFallback = true;
      frame.src = "/brand/girl-bag.webp";
      showStatus("Imagen estática disponible. Puedes seguir explorando.");
    } else {
      frame.style.opacity = "0";
      showStatus("La animación no está disponible. Puedes continuar hacia el catálogo.");
    }
  }, { signal: abort.signal });

  function progress() {
    const vh = window.innerHeight || document.documentElement.clientHeight;
    return Math.max(0, Math.min(1, -zone.getBoundingClientRect().top / Math.max(1, zone.offsetHeight - vh)));
  }
  function requestTick() {
    if (!dead && !raf) raf = requestAnimationFrame(update);
  }
  function trim() {
    if (cache.size <= maxCachedFrames) return;
    const evict = Array.from(cache.entries())
      .filter(entry => entry[1].state !== "loading" && entry[0] !== shown)
      .sort((a,b) => Math.abs(b[0]-desired)-Math.abs(a[0]-desired));
    for (const item of evict) {
      if (cache.size <= maxCachedFrames) break;
      cache.delete(item[0]);
    }
  }
  function load(index) {
    if (dead || cache.has(index)) return;
    const image = new Image();
    const entry = { image: image, state: "loading", src: path(index) };
    cache.set(index,entry);
    inflight++;
    let triedFallback = lowQuality;
    image.onload = async () => {
      try { if (image.decode) await image.decode(); } catch {}
      if (dead || cache.get(index) !== entry) return;
      entry.state = "ready";
      inflight--;
      trim();
      requestTick();
      pump();
    };
    image.onerror = () => {
      if (dead || cache.get(index) !== entry) return;
      if (!triedFallback) {
        triedFallback = true;
        entry.src = fallbackPath(index);
        image.src = entry.src;
        return;
      }
      entry.state = "failed";
      inflight--;
      failed++;
      if (failed >= 3) showStatus("Algunas fotos no cargaron. Puedes continuar o saltar la animación.");
      pump();
    };
    image.src = entry.src;
  }
  function pump() {
    if (!started || dead || reduced) return;
    const candidates = [desired];
    for (let d = 1; d <= radius; d++) {
      if (desired+d < SCROLL_FRAMES) candidates.push(desired+d);
      if (desired-d >= 0) candidates.push(desired-d);
    }
    for (const i of candidates) {
      if (inflight >= maxConcurrent) break;
      if (!cache.has(i)) load(i);
    }
  }
  function update() {
    raf = 0;
    if (dead) return;
    const p = progress();
    desired = Math.round(p * (SCROLL_FRAMES - 1));
    if (started && !reduced) {
      let chosen = cache.get(desired)?.state === "ready" ? desired : -1;
      for (let d=1;chosen<0 && d<=radius;d++) {
        for (const n of [desired-d,desired+d]) {
          if (n>=0 && n<SCROLL_FRAMES && cache.get(n)?.state === "ready") {
            chosen = n; break;
          }
        }
      }
      if (chosen >= 0 && chosen !== shown) {
        shown = chosen;
        frame.src = cache.get(chosen).src;
        frame.style.opacity = "1";
        if (!failed) showStatus("");
      }
      pump();
    }
    if (bar) bar.style.transform = "scaleY(" + p + ")";
    if (counter) counter.textContent = String(desired+1).padStart(2,"0") + " / " + SCROLL_FRAMES;
    const introOpacity = Math.max(0,Math.min(1,(.22-p)/.16));
    if (intro) {
      intro.style.opacity = String(introOpacity);
      intro.style.visibility = introOpacity < .02 ? "hidden" : "visible";
    }
    for (const card of stories) {
      const start = Number(card.dataset.start), end = Number(card.dataset.end);
      const visible = Math.max(0, Math.min(1, (p-start)/.035, (end-p)/.035));
      card.style.opacity = String(visible);
      card.style.visibility = visible < .02 ? "hidden" : "visible";
      card.style.transform = "translateY(" + Math.round((1-visible)*18) + "px)";
      card.style.pointerEvents = visible > .8 ? "auto" : "none";
    }
  }
  if (!reduced) {
    if ("IntersectionObserver" in window) {
      observer = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          started = true;
          observer.disconnect();
          observer = null;
          requestTick();
          pump();
        }
      }, { rootMargin: "350px 0px" });
      observer.observe(zone);
    } else {
      started = true;
      pump();
    }
  }
  window.addEventListener("scroll", requestTick, { passive: true, signal: abort.signal });
  window.addEventListener("resize", requestTick, { passive: true, signal: abort.signal });
  window.addEventListener("orientationchange", requestTick, { passive: true, signal: abort.signal });
  requestTick();

  teardown = () => {
    dead = true;
    abort.abort();
    observer?.disconnect();
    if (raf) cancelAnimationFrame(raf);
    for (const entry of cache.values()) {
      entry.image.onload = null;
      entry.image.onerror = null;
    }
    cache.clear();
  };
}
