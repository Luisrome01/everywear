// Everywear experimental scroll hero (video-scroll-test only).
// This module owns no autoplay video; progress maps to one of 60 still frames.
export const SCROLL_FRAMES = 60;
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
        <article class="ew-scroll-story" data-start=".84" data-end="1.01"><span>04 / YOUR NEXT LOOK</span><h2>Tu próximo<br/><em>favorito te espera.</em></h2><p>La colección está a un paso.</p><a class="ew-scroll-action" href="#/catalogo">Explorar catálogo ↗</a></article>
      </div>
      <div class="ew-scroll-progress" aria-hidden="true"><span class="ew-scroll-progress-label">SCROLL TO EXPLORE</span><div class="ew-scroll-progress-track"><span id="ew-scroll-progress-fill"></span></div><span id="ew-scroll-frame-count">01 / 60</span></div>
    </div>
  </section>`;
}

let teardown = null;
export function initScrollHero() {
  if (teardown) { teardown(); teardown = null; }
  const zone = document.getElementById('everywear-scroll-experience');
  const frame = document.getElementById('ew-scroll-frame');
  if (!zone || !frame) return;
  const intro = document.getElementById('ew-scroll-intro');
  const stories = [...zone.querySelectorAll('.ew-scroll-story')];
  const bar = document.getElementById('ew-scroll-progress-fill');
  const count = document.getElementById('ew-scroll-frame-count');
  const images = Array.from({length: SCROLL_FRAMES}, (_, i) => path(i));
  const ready = new Uint8Array(SCROLL_FRAMES);
  ready[0] = frame.complete && frame.naturalWidth > 0 ? 1 : 0;
  let active = -1, desired = 0, frameRaf = 0, destroyed = false;
  let loading = 0, nextPreload = 1;
  const abort = new AbortController();
  const {signal} = abort;
  // Limited concurrency keeps mobile networks responsive.
  const preload = index => new Promise(resolve => {
    const img = new Image();
    img.onload = async () => { try { if (img.decode) await img.decode(); } catch {} ready[index] = 1; resolve(); requestTick(); };
    img.onerror = () => resolve();
    img.src = images[index];
    if (img.complete && img.naturalWidth > 0) img.onload();
  });
  const queue = () => {
    while (!destroyed && loading < 4 && nextPreload < SCROLL_FRAMES) {
      const i = nextPreload++; loading++;
      preload(i).finally(() => {loading--;queue();});
    }
  };
  // Start loading frames only as the user approaches the scene.
  const watcher = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) { queue(); watcher.disconnect(); }
  }, {rootMargin: '1000px 0px'});
  watcher.observe(zone);
  frame.addEventListener('load', () => { ready[0] = 1; requestTick(); }, {signal});
  function progress() {
    // Use the stable layout viewport rather than visualViewport (Safari toolbars).
    const vh = window.innerHeight || document.documentElement.clientHeight;
    const offset = zone.getBoundingClientRect().top;
    const distance = Math.max(1, zone.offsetHeight - vh);
    return Math.max(0, Math.min(1, -offset / distance));
  }
  function nearest(index) {
    if (ready[index]) return index;
    for (let k=1;k<SCROLL_FRAMES;k++) {
      if (index-k>=0 && ready[index-k]) return index-k;
      if (index+k<SCROLL_FRAMES && ready[index+k]) return index+k;
    }
    return -1;
  }
  function render() {
    frameRaf=0; if(destroyed) return;
    const p=progress(); desired=Math.round(p*(SCROLL_FRAMES-1));
    const index=nearest(desired);
    if(index>=0 && index!==active){ active=index; frame.src=images[index]; }
    if(bar) bar.style.transform=`scaleY(${p})`;
    if(count) count.textContent=`${String(desired+1).padStart(2,'0')} / ${SCROLL_FRAMES}`;
    const introAlpha=Math.max(0,Math.min(1,(.22-p)/.16));
    if(intro){intro.style.opacity=String(introAlpha);intro.style.visibility=introAlpha<.02?'hidden':'visible';}
    for (const c of stories) {
      const a=Number(c.dataset.start),b=Number(c.dataset.end);
      const visible=Math.max(0,Math.min(1,(p-a)/.035,(b-p)/.035));
      c.style.opacity=String(visible);
      c.style.visibility=visible<.02?'hidden':'visible';
      c.style.transform=`translateY(${Math.round((1-visible)*18)}px)`;
      c.style.pointerEvents=visible>.8?'auto':'none';
    }
  }
  function requestTick(){if(!frameRaf&&!destroyed)frameRaf=requestAnimationFrame(render);}
  window.addEventListener('scroll',requestTick,{passive:true,signal});
  window.addEventListener('resize',requestTick,{passive:true,signal});
  window.addEventListener('orientationchange',requestTick,{passive:true,signal});
  requestTick();
  teardown=() => {destroyed=true;abort.abort();watcher.disconnect();if(frameRaf)cancelAnimationFrame(frameRaf);};
}
