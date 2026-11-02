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
      <img id="ew-scroll-poster" class="ew-scroll-frame" src="/scroll-frames/frame_001.webp" alt="Modelo de Everywear caminando con bolsa de la marca" draggable="false" fetchpriority="high" decoding="async" loading="eager" />
      <canvas id="ew-scroll-canvas" class="ew-scroll-canvas" aria-hidden="true"></canvas>
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

// A permanent poster + canvas make the animation fail-open:
// incomplete/failed frames NEVER hide the last visible scene.
// Scroll and copy remain functional without waiting for network or decoding.
export function initScrollHero() {
  if (teardown) { teardown(); teardown = null; }
  const zone = document.getElementById("everywear-scroll-experience");
  const stage = document.getElementById("ew-scroll-stage");
  const poster = document.getElementById("ew-scroll-poster");
  const canvas = document.getElementById("ew-scroll-canvas");
  if (!zone || !stage || !poster || !canvas) return;

  const ctx = canvas.getContext("2d", { alpha: true });
  const intro = document.getElementById("ew-scroll-intro");
  const stories = Array.from(zone.querySelectorAll(".ew-scroll-story"));
  const bar = document.getElementById("ew-scroll-progress-fill");
  const counter = document.getElementById("ew-scroll-frame-count");
  const skip = document.getElementById("ew-scroll-skip");
  const status = document.getElementById("ew-scroll-load-status");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const abort = new AbortController();
  const signal = abort.signal;
  const cache = new Map();
  const failed = new Set();
  const maxInFlight = slowNetwork ? 1 : 2;
  const cacheLimit = slowNetwork ? 5 : 9;
  let raf = 0, desired = 0, shown = -1, displayedImage = null;
  let inflight = 0, destroyed = false, degraded = false;
  let pixelW = 0, pixelH = 0;

  function tell(message) {
    if (!status) return;
    status.textContent = message || "";
    status.hidden = !message;
  }

  // Never hide the poster; it is independent of the frame downloader.
  poster.addEventListener("error", () => {
    if (poster.dataset.fallback) return;
    poster.dataset.fallback = "1";
    poster.src = "/brand/girl-bag.webp";
  }, { signal });

  skip?.addEventListener("click", () => {
    const next = zone.nextElementSibling || document.getElementById("personal-shopper");
    next?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  }, { signal });

  function progress() {
    const vh = window.innerHeight || document.documentElement.clientHeight;
    const distance = Math.max(1, zone.offsetHeight - vh);
    return Math.max(0, Math.min(1, -zone.getBoundingClientRect().top / distance));
  }

  function request() {
    if (!destroyed && !raf) raf = requestAnimationFrame(update);
  }

  function resizeCanvas() {
    const w = Math.max(1, stage.clientWidth);
    const h = Math.max(1, stage.clientHeight);
    // Cap canvas memory even on Retina displays.
    const scale = Math.min(2, 1920 / w, 1080 / h);
    const cw = Math.max(1, Math.floor(w * scale));
    const ch = Math.max(1, Math.floor(h * scale));
    if (cw !== pixelW || ch !== pixelH) {
      pixelW = cw; pixelH = ch;
      canvas.width = cw;
      canvas.height = ch;
      shown = -1;
      if (displayedImage?.complete && displayedImage.naturalWidth) {
        paint(displayedImage);
      }
    }
  }

  function paint(img) {
    if (!ctx || !img || !img.naturalWidth) return false;
    try {
      resizeCanvasDimensionsIfNeeded();
      const width = canvas.width, height = canvas.height;
      const sourceW = img.naturalWidth, sourceH = img.naturalHeight;
      const scale = Math.max(width/sourceW,height/sourceH);
      const cropW = width/scale, cropH = height/scale;
      const posX = window.innerWidth <= 760 ? 0.49 : 0.5;
      const cropX = Math.max(0,Math.min(sourceW-cropW,(sourceW-cropW)*posX));
      const cropY = (sourceH-cropH)*0.5;
      ctx.clearRect(0,0,width,height);
      ctx.drawImage(img,cropX,cropY,cropW,cropH,0,0,width,height);
      canvas.style.opacity = "1";
      displayedImage = img;
      return true;
    } catch {
      return false; // Poster always remains visible, even if drawing fails.
    }
  }

  function resizeCanvasDimensionsIfNeeded() {
    const w = Math.max(1,stage.clientWidth), h = Math.max(1,stage.clientHeight);
    const scale = Math.min(2,1920/w,1080/h);
    const cw = Math.max(1,Math.floor(w*scale));
    const ch = Math.max(1,Math.floor(h*scale));
    if (cw !== pixelW || ch !== pixelH) {
      pixelW = cw; pixelH = ch;
      canvas.width = cw;
      canvas.height = ch;
      shown = -1;
    }
  }

  function trimCache() {
    if (cache.size <= cacheLimit) return;
    const removable = Array.from(cache.entries())
      .filter(([index,entry]) => entry.state !== "loading" && index !== shown)
      .sort((a,b) => Math.abs(b[0]-desired)-Math.abs(a[0]-desired));
    for (const [index] of removable) {
      if (cache.size <= cacheLimit) break;
      cache.delete(index);
    }
  }

  function load(index) {
    if (destroyed || cache.has(index) || failed.has(index)) return;
    const img = new Image();
    let usingFallback = lowQuality;
    const entry = { img, src:path(index), state:"loading" };
    cache.set(index, entry);
    inflight++;

    img.onload = () => {
      if (destroyed || cache.get(index) !== entry) return;
      entry.state = "ready";
      inflight--;
      request();
      schedule();
    };

    img.onerror = () => {
      if (destroyed || cache.get(index) !== entry) return;
      if (!usingFallback) {
        usingFallback = true;
        entry.src = fallbackPath(index);
        img.src = entry.src;
        return;
      }
      entry.state = "failed";
      inflight--;
      failed.add(index);
      if (failed.size >= 3 && !degraded) {
        degraded = true;
        zone.classList.add("ew-scroll-degraded");
        tell("La animación está limitada en esta conexión. Puedes continuar o saltarla.");
      }
      request();
      schedule();
    };
    img.src = entry.src;
  }

  function schedule() {
    if (destroyed || reduced) return;
    // A small neighborhood is enough: never start all sixty downloads.
    const priority = [desired];
    for (let k=1;k<=2;k++) {
      if (desired+k<SCROLL_FRAMES) priority.push(desired+k);
      if (desired-k>=0) priority.push(desired-k);
    }
    for (const index of priority) {
      if (inflight >= maxInFlight) break;
      if (!cache.has(index) && !failed.has(index)) load(index);
    }
    trimCache();
  }

  function update() {
    raf=0;
    if (destroyed) return;
    const p = progress();
    desired = Math.round(p * (SCROLL_FRAMES - 1));

    if (!reduced) {
      let choice = cache.get(desired)?.state === "ready" ? desired : -1;
      // Display a nearby fully loaded image, otherwise retain the last canvas
      // frame or poster. A failed network request cannot erase the screen.
      for (let d=1;choice<0 && d<=3;d++) {
        for (const i of [desired-d,desired+d]) {
          if (i >= 0 && i < SCROLL_FRAMES && cache.get(i)?.state === "ready") {
            choice = i; break;
          }
        }
      }
      if (choice !== -1 && choice !== shown) {
        const entry = cache.get(choice);
        if (paint(entry.img)) shown = choice;
      }
      schedule();
    }

    if (bar) bar.style.transform = "scaleY(" + p + ")";
    if (counter) counter.textContent = String(desired+1).padStart(2,"0") + " / " + SCROLL_FRAMES;
    const introAlpha = Math.max(0,Math.min(1,(.22-p)/.16));
    if (intro) {
      intro.style.opacity = String(introAlpha);
      intro.style.visibility = introAlpha < .02 ? "hidden" : "visible";
    }
    for (const card of stories) {
      const a=Number(card.dataset.start), b=Number(card.dataset.end);
      // Keep the final CTA visible at the end of the scroll.
      const fadeOut = b >= 1 ? 1 : (b-p)/.035;
      const visible=Math.max(0,Math.min(1,(p-a)/.035,fadeOut));
      card.style.opacity = String(visible);
      card.style.visibility = visible < .02 ? "hidden" : "visible";
      card.style.transform = "translateY(" + Math.round((1-visible)*18) + "px)";
      card.style.pointerEvents = visible > .8 ? "auto" : "none";
    }
  }

  // Start with only two requests and update priorities on every scroll.
  // No IntersectionObserver gate: Safari can miss initial events near sticky sections.
  if (!reduced) schedule();
  window.addEventListener("scroll",request,{passive:true,signal});
  window.addEventListener("resize",() => {
    resizeCanvas();
    request();
  },{passive:true,signal});
  window.addEventListener("orientationchange",request,{passive:true,signal});
  resizeCanvas();
  request();

  teardown = () => {
    destroyed = true;
    abort.abort();
    if (raf) cancelAnimationFrame(raf);
    for (const entry of cache.values()) {
      entry.img.onload=null;
      entry.img.onerror=null;
    }
    cache.clear();
  };
}
