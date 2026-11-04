// Everywear experimental scroll hero (video-scroll-test only).
// This module owns no autoplay video; progress maps to one of 97 HD still frames.
export const SCROLL_FRAMES = 97;
// Add ?scrollQuality=720 to compare against the untouched source frames.
const quality = new URLSearchParams(window.location.search).get("scrollQuality") === "720" ? "scroll-frames" : "scroll-frames-hd";
const path = i => window.__EW_SCROLL_FRAMES?.[i] || `/${quality}/frame_${String(i + 1).padStart(3, "0")}.webp`;

export function scrollHeroMarkup() {
  return `<section class="ew-scroll-zone" id="everywear-scroll-experience" aria-label="Editorial Everywear, camina con nuestro estilo">
    <div class="ew-scroll-stage" id="ew-scroll-stage">
      <img id="ew-scroll-frame" class="ew-scroll-frame" src="${path(0)}" alt="Modelo de Everywear caminando con bolsa de la marca" draggable="false" fetchpriority="high" />
      <div class="ew-scroll-tint" aria-hidden="true"></div>
      <div class="ew-scroll-intro" id="ew-scroll-intro"><span class="ew-scroll-kicker">EVERYWEAR / EDICIÓN 01</span><h1>Tu estilo<br/><em>en movimiento.</em></h1><p>Prendas que hablan de ti. Descubre una selección creada para acompañarte a donde vayas.</p><span class="ew-scroll-intro-foot">DESLIZA PARA DESCUBRIR <span aria-hidden="true">↓</span></span></div>
      <div class="ew-scroll-stories" aria-label="Momentos de la colección">
        <article class="ew-scroll-story" data-start=".18" data-end=".39"><span>01 / EVERY DAY</span><h2>Un look,<br/><em>mil posibilidades.</em></h2><p>Para todos esos planes que empiezan sin avisar.</p></article>
        <article class="ew-scroll-story" data-start=".41" data-end=".62"><span>02 / THE DETAILS</span><h2>La magia<br/><em>está en los detalles.</em></h2><p>Piezas especiales, fáciles de hacer tuyas.</p></article>
        <article class="ew-scroll-story" data-start=".64" data-end=".82"><span>03 / CURATED STYLE</span><h2>Every wear.<br/><em>Every version of you.</em></h2><p>Tu acceso a una nueva forma de vestir.</p></article>
        <article class="ew-scroll-story" data-start=".84" data-end="1.01"><span>04 / YOUR NEXT LOOK</span><h2>Tu próximo<br/><em>favorito te espera.</em></h2><p>La colección está a un paso.</p><a class="ew-scroll-action" href="#/catalogo">Explorar catálogo <svg class="ew-scroll-action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M7 17 17 7M8 7h9v9"/></svg></a></article>
      </div>
      <div class="ew-scroll-progress" aria-hidden="true"><div class="ew-scroll-progress-track"><span id="ew-scroll-progress-fill"></span></div></div>
    </div>
  </section>`;
}

let teardown = null;
export function initScrollHero() {
  if (teardown) { teardown(); teardown = null; }
  const zone = document.getElementById('everywear-scroll-experience');
  let frame = document.getElementById('ew-scroll-frame');
  const stage = document.getElementById('ew-scroll-stage');
  if (!zone || !frame || !stage) return;

  const intro = document.getElementById('ew-scroll-intro');
  const stories = [...zone.querySelectorAll('.ew-scroll-story')];
  const bar = document.getElementById('ew-scroll-progress-fill');
  const images = Array.from({length: SCROLL_FRAMES}, (_, i) => path(i));
  const mobile = window.matchMedia('(max-width: 760px)').matches;
  const maxDecoded = mobile ? 7 : 13;
  const maxParallel = mobile ? 2 : 3;
  const decoded = new Map();
  const pending = new Map();
  const failed = new Set();
  const abort = new AbortController();
  const {signal} = abort;
  let active = -1, desired = 0, lastScrollY = 0, lastWidth = window.innerWidth;
  let frameRaf = 0, destroyed = false;
  let sceneStart = 0, sceneDistance = 1;

  // Telegram's in-app WebView animates its browser chrome, changing innerHeight
  // during touch scrolling. Freeze the document-space scene geometry instead
  // of mapping frames against an unstable live viewport height.
  function scrollY() {
    return Math.max(0, window.scrollY ?? document.documentElement.scrollTop ?? 0);
  }
  function refreshGeometry() {
    const currentScroll = scrollY();
    sceneStart = currentScroll + zone.getBoundingClientRect().top;
    const stickyTop = Number.parseFloat(getComputedStyle(stage).top) || 0;
    const stableHeight = stage.offsetHeight + stickyTop;
    sceneDistance = Math.max(1, zone.offsetHeight - stableHeight);
    lastWidth = window.innerWidth;
  }
  function progress() {
    return Math.max(0, Math.min(1, (scrollY() - sceneStart) / sceneDistance));
  }

  const warmed = window.__EW_WARM_IMAGES || [];
  for (let i = 0; i < Math.min(SCROLL_FRAMES, 9); i++) {
    const image = warmed.find(img => img?.src === images[i] && img.complete && img.naturalWidth);
    if (image) decoded.set(i, image);
  }
  if (frame.complete && frame.naturalWidth) decoded.set(0, frame);
  frame.addEventListener('load', () => {
    if (!destroyed && frame.src === images[0] && frame.naturalWidth) {
      decoded.set(0, frame);
      requestTick();
    }
  }, {signal});

  function trim() {
    if (decoded.size <= maxDecoded) return;
    const removable = [...decoded.keys()]
      .filter(i => i !== active)
      .sort((a,b) => Math.abs(b-desired) - Math.abs(a-desired));
    for (const i of removable) {
      if (decoded.size <= maxDecoded) break;
      decoded.delete(i);
    }
  }
  function requestImage(i) {
    if (destroyed || i < 0 || i >= SCROLL_FRAMES ||
        decoded.has(i) || pending.has(i) || failed.has(i)) return;
    const img = new Image();
    pending.set(i,img);
    let complete = false;
    async function finish(ok) {
      if (complete) return;
      complete = true;
      if (ok && img.naturalWidth && typeof img.decode === 'function') {
        try { await img.decode(); } catch { /* use the loaded image anyway */ }
      }
      pending.delete(i);
      img.onload = null;
      img.onerror = null;
      if (destroyed) return;
      if (ok && img.naturalWidth) decoded.set(i, img);
      else failed.add(i);
      trim();
      requestTick();
      schedule();
    }
    img.decoding = 'async';
    img.onload = () => { void finish(true); };
    img.onerror = () => { void finish(false); };
    img.src = images[i];
    if (img.complete && img.naturalWidth) void finish(true);
  }
  function schedule() {
    if (destroyed) return;
    // Warm only a small moving neighborhood. Never decode all 97 frames in a
    // single uninterrupted queue, which causes WKWebView memory/scroll stalls.
    const direction = scrollY() >= lastScrollY ? 1 : -1;
    const candidates = [desired];
    for (let n=1;n<=4;n++) {
      candidates.push(desired + n * direction, desired - n * direction);
    }
    for (const i of candidates) {
      if (pending.size >= maxParallel) break;
      requestImage(i);
    }
    trim();
  }
  function closestReady(index) {
    if (decoded.has(index)) return index;
    // Preserve the current image until the requested image is decoded.
    if (active >= 0) return active;
    for (let d=1;d<SCROLL_FRAMES;d++) {
      if (decoded.has(index-d)) return index-d;
      if (decoded.has(index+d)) return index+d;
    }
    return -1;
  }
  function render() {
    frameRaf = 0;
    if (destroyed) return;
    const p = progress();
    desired = Math.round(p * (SCROLL_FRAMES - 1));
    const index = closestReady(desired);
    if (index >= 0 && index !== active) {
      // Reuse a fully loaded image element instead of assigning its URL to
      // another img, which would force repeated decoding during quick swipes.
      const replacement = decoded.get(index);
      if (replacement && replacement !== frame) {
        frame.removeAttribute('id');
        frame.removeAttribute('class');
        replacement.id = 'ew-scroll-frame';
        replacement.className = 'ew-scroll-frame';
        replacement.alt = 'Modelo de Everywear caminando con bolsa de la marca';
        replacement.draggable = false;
        frame.replaceWith(replacement);
        frame = replacement;
      }
      active = index;
    }
    if (bar) bar.style.transform = 'scaleY(' + p + ')';
    const introAlpha = Math.max(0, Math.min(1, (.22-p)/.16));
    if (intro) {
      intro.style.opacity = String(introAlpha);
      intro.style.visibility = introAlpha < .02 ? 'hidden' : 'visible';
    }
    for (const card of stories) {
      const a = Number(card.dataset.start), b = Number(card.dataset.end);
      const fadeOut = b >= 1 ? 1 : (b-p)/.035;
      const visible = Math.max(0, Math.min(1, (p-a)/.035, fadeOut));
      card.style.opacity = String(visible);
      card.style.visibility = visible < .02 ? 'hidden' : 'visible';
      card.style.transform = 'translateY(' + Math.round((1-visible)*18) + 'px)';
      card.style.pointerEvents = visible > .8 ? 'auto' : 'none';
    }
    schedule();
    lastScrollY = scrollY();
  }
  function requestTick() {
    if (!destroyed && !frameRaf) frameRaf = requestAnimationFrame(render);
  }
  function onResize() {
    // Ignore toolbar-only height changes; a rotation/width change is real.
    if (Math.abs(window.innerWidth - lastWidth) > 2) refreshGeometry();
    requestTick();
  }
  refreshGeometry();
  window.addEventListener('scroll', requestTick, {passive:true,signal});
  window.addEventListener('resize', onResize, {passive:true,signal});
  window.addEventListener('orientationchange', () => {
    refreshGeometry();
    requestTick();
  }, {passive:true,signal});
  window.addEventListener('pageshow', requestTick, {passive:true,signal});
  requestTick();
  teardown = () => {
    destroyed = true;
    abort.abort();
    if (frameRaf) cancelAnimationFrame(frameRaf);
    for (const img of pending.values()) {
      img.onload = null;
      img.onerror = null;
    }
    pending.clear();
    decoded.clear();
  };
}
