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
      <img id="ew-scroll-animated" class="ew-scroll-animated" alt="" aria-hidden="true" draggable="false" decoding="async" />
      <div class="ew-scroll-tint" aria-hidden="true"></div>
      <div class="ew-scroll-intro" id="ew-scroll-intro"><span class="ew-scroll-kicker">EVERYWEAR / EDICIÓN 01</span><h1>Tu estilo<br/><em>en movimiento.</em></h1><p>Prendas que hablan de ti. Descubre una selección creada para acompañarte a donde vayas.</p><span class="ew-scroll-intro-foot">DESLIZA PARA DESCUBRIR <span aria-hidden="true">↓</span></span></div>
      <div class="ew-scroll-stories" aria-label="Momentos de la colección">
        <article class="ew-scroll-story" data-start=".18" data-end=".39"><span>01 / EVERY DAY</span><h2>Un look,<br/><em>mil posibilidades.</em></h2><p>Para todos esos planes que empiezan sin avisar.</p></article>
        <article class="ew-scroll-story" data-start=".41" data-end=".62"><span>02 / THE DETAILS</span><h2>La magia<br/><em>está en los detalles.</em></h2><p>Piezas especiales, fáciles de hacer tuyas.</p></article>
        <article class="ew-scroll-story" data-start=".64" data-end=".82"><span>03 / CURATED STYLE</span><h2>Every wear.<br/><em>Every version of you.</em></h2><p>Tu acceso a una nueva forma de vestir.</p></article>
        <article class="ew-scroll-story" data-start=".84" data-end="1.01"><span>04 / YOUR NEXT LOOK</span><h2>Tu próximo<br/><em>favorito te espera.</em></h2><p>La colección está a un paso.</p><a class="ew-scroll-action" href="#/catalogo">Explorar catálogo ↗</a></article>
      </div>
      <span id="ew-scroll-load-status" class="ew-scroll-load-status" role="status" aria-live="polite" hidden></span>
      <div class="ew-scroll-progress" aria-hidden="true"><span class="ew-scroll-progress-label">SCROLL TO EXPLORE</span><div class="ew-scroll-progress-track"><span id="ew-scroll-progress-fill"></span></div><span id="ew-scroll-frame-count">01 / 60</span></div>
    </div>
  </section>`;
}




let teardown = null;

// Progressive image-based scroll sequence. The first frame stays behind the
// active layer, so a failed or delayed frame never leaves an empty hero.
export function initScrollHero() {
  if (teardown) { teardown(); teardown = null; }
  const zone = document.getElementById("everywear-scroll-experience");
  const activeImage = document.getElementById("ew-scroll-animated");
  const poster = document.getElementById("ew-scroll-poster");
  if (!zone || !activeImage || !poster) return;

  const intro = document.getElementById("ew-scroll-intro");
  const stories = [...zone.querySelectorAll(".ew-scroll-story")];
  const bar = document.getElementById("ew-scroll-progress-fill");
  const count = document.getElementById("ew-scroll-frame-count");
  const status = document.getElementById("ew-scroll-load-status");
  const motionReduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const controller = new AbortController();
  const cache = new Map();
  const loading = new Map();
  const failures = new Map();
  const maxRequests = slowNetwork ? 2 : 4;
  const maxCached = slowNetwork ? 8 : 14;
  let destroyed = false, requested = 0, displayed = -1, raf = 0, loadErrors = 0;

  function message(value) {
    if (!status) return;
    status.textContent = value || "";
    status.hidden = !value;
  }

  // Keep an independent, actual img element rather than drawing to canvas.
  // This remains visible even if the animation download fails entirely.
  poster.addEventListener("error", () => {
    if (poster.dataset.fallback === "yes") return;
    poster.dataset.fallback = "yes";
    poster.src = "/brand/girl-bag.webp";
  }, { signal: controller.signal });

  activeImage.addEventListener("error", () => {
    activeImage.style.opacity = "0";
    displayed = -1;
  }, { signal: controller.signal });

  function progress() {
    const vh = window.innerHeight || document.documentElement.clientHeight;
    const rect = zone.getBoundingClientRect();
    const range = Math.max(1, rect.height - vh);
    return Math.max(0, Math.min(1, -rect.top / range));
  }

  function show(index) {
    if (destroyed || index === displayed) return;
    const image = cache.get(index);
    if (!image || !image.complete || !image.naturalWidth) return;
    // This URL has already loaded in Image(), so the browser reuses it rather
    // than waiting for another network response.
    activeImage.src = image.src;
    activeImage.style.opacity = "1";
    displayed = index;
  }

  function prune() {
    if (cache.size <= maxCached) return;
    const removals = [...cache.keys()]
      .filter(i => i !== displayed)
      .sort((a,b) => Math.abs(b-requested) - Math.abs(a-requested));
    while (cache.size > maxCached && removals.length) cache.delete(removals.shift());
  }

  function request(index) {
    if (destroyed || motionReduce || index < 0 || index >= SCROLL_FRAMES) return;
    if (cache.has(index) || loading.has(index)) return;
    if (failures.get(index) > Date.now() - 12000) return;
    const image = new Image();
    let useFallback = lowQuality;
    const task = { image, src: path(index) };
    loading.set(index, task);
    image.onload = () => {
      if (destroyed || loading.get(index) !== task) return;
      loading.delete(index);
      cache.set(index, image);
      failures.delete(index);
      prune();
      // Render only what scroll is currently asking for. Stale responses must
      // never force a jump backwards when the visitor scrolls rapidly.
      if (index === requested || displayed === -1) show(index);
      updateFrame();
      schedule();
    };
    image.onerror = () => {
      if (destroyed || loading.get(index) !== task) return;
      if (!useFallback) {
        useFallback = true;
        task.src = fallbackPath(index);
        image.src = task.src;
        return;
      }
      loading.delete(index);
      failures.set(index, Date.now());
      loadErrors++;
      if (loadErrors >= 4) message("Conexión lenta: las imágenes se cargarán a medida que avances.");
      schedule();
    };
    image.decoding = "async";
    image.src = task.src;
  }

  function schedule() {
    if (destroyed || motionReduce) return;
    // Prioritize the exact scroll position. A browser refresh at the end of
    // the page must request frame 60 instead of only frame 1.
    const order = [requested];
    for (let d=1;d<=3;d++) {
      if (requested+d<SCROLL_FRAMES) order.push(requested+d);
      if (requested-d>=0) order.push(requested-d);
    }
    for (const index of order) {
      if (loading.size >= maxRequests) break;
      request(index);
    }
  }

  function updateFrame() {
    if (cache.has(requested)) {
      show(requested);
      return;
    }
    // If the target image has not arrived, keep the current frame; on initial
    // load, show the closest available one. Never blank the layer while waiting.
    if (displayed >= 0) return;
    for (let d=1;d<SCROLL_FRAMES;d++) {
      const back = requested-d, ahead=requested+d;
      if (back>=0 && cache.has(back)) { show(back); return; }
      if (ahead<SCROLL_FRAMES && cache.has(ahead)) { show(ahead); return; }
    }
  }

  function update() {
    raf = 0;
    if (destroyed) return;
    const p = progress();
    requested = Math.round(p*(SCROLL_FRAMES-1));
    if (!motionReduce) {
      updateFrame();
      schedule();
    }

    if (bar) bar.style.transform = "scaleY(" + p + ")";
    if (count) count.textContent = String(requested+1).padStart(2,"0") + " / " + SCROLL_FRAMES;
    const introAlpha = Math.max(0,Math.min(1,(.22-p)/.16));
    if (intro) {
      intro.style.opacity = String(introAlpha);
      intro.style.visibility = introAlpha < .02 ? "hidden" : "visible";
    }
    for (const card of stories) {
      const start=Number(card.dataset.start), end=Number(card.dataset.end);
      const fadeOut = end >= 1 ? 1 : (end-p)/.035;
      const visible=Math.max(0,Math.min(1,(p-start)/.035,fadeOut));
      card.style.opacity=String(visible);
      card.style.visibility=visible<.02?"hidden":"visible";
      card.style.transform="translateY(" + Math.round((1-visible)*18) + "px)";
      card.style.pointerEvents=visible>.8?"auto":"none";
    }
  }

  function tick() {
    if (!destroyed && !raf) raf=requestAnimationFrame(update);
  }

  window.addEventListener("scroll",tick,{passive:true,signal:controller.signal});
  window.addEventListener("resize",tick,{passive:true,signal:controller.signal});
  window.addEventListener("orientationchange",tick,{passive:true,signal:controller.signal});
  // Safari/Chrome sometimes restore scroll after the first paint; monitor it
  // again when the page is restored from back-forward cache.
  window.addEventListener("pageshow",tick,{passive:true,signal:controller.signal});
  // A reload should begin at frame 001, not at an old scroll position from
  // browser restoration (seen on desktop Chrome). Normal navigation is kept.
  if (performance.getEntriesByType?.("navigation")?.[0]?.type === "reload"
      && (location.hash === "" || location.hash === "#/")) {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    window.scrollTo({top:0,left:0,behavior:"instant"});
    window.setTimeout(() => {
      if (!destroyed) { window.scrollTo(0,0); tick(); }
    }, 70);
  }
  tick();

  teardown=()=>{
    destroyed=true;
    controller.abort();
    if (raf) cancelAnimationFrame(raf);
    for (const task of loading.values()) {
      task.image.onload=null;task.image.onerror=null;
    }
    loading.clear();cache.clear();
  };
}
