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
    
    <div id="ew-boot" class="ew-boot" role="dialog" aria-modal="true" aria-label="Preparando la experiencia Everywear">
      <div class="ew-boot-content">
        <span class="ew-boot-edition">EVERYWEAR · EDICIÓN 01</span>
        <div class="ew-boot-brand"><span>every</span><em>wear.</em></div>
        <span class="ew-boot-star" aria-hidden="true">*</span>
        <p class="ew-boot-message">Preparando una experiencia hecha para ti</p>
        <div class="ew-boot-line" role="progressbar" aria-label="Carga de la colección" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" id="ew-boot-bar">
          <span id="ew-boot-fill"></span>
        </div>
        <div class="ew-boot-detail"><span id="ew-boot-status">Cargando los detalles...</span><span id="ew-boot-percent">0%</span></div>
        <button type="button" id="ew-boot-continue" class="ew-boot-continue" hidden>Entrar al sitio</button>
      </div>
      <span class="ew-boot-bottom">YOUR ACCESS TO EUROPEAN FASHION</span>
    </div>
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
const sequence = {
  urls: null, promise: null, listeners: new Set(), percentage: 0, enteredOnce: false,
  quality: lowQuality ? "720p" : "1080p", partial: false
};

function notifyProgress(value, text) {
  sequence.percentage = Math.min(100, Math.max(0, Math.round(value)));
  for (const fn of sequence.listeners) fn(sequence.percentage, text || "Cargando la colección...");
}

async function unpackSequence(dir, label) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 14000);
  try {
    const response = await fetch("/" + dir + "/sequence.pack", {
      signal: controller.signal, cache: "force-cache"
    });
    if (!response.ok) throw new Error("Pack HTTP " + response.status);
    const total = Number(response.headers.get("content-length")) || 0;
    const chunks = [];
    let bytes = 0;
    if (response.body?.getReader) {
      const reader = response.body.getReader();
      for (;;) {
        const result = await reader.read();
        if (result.done) break;
        chunks.push(result.value);
        bytes += result.value.byteLength;
        if (total > 0) notifyProgress(Math.min(94, bytes / total * 94), "Descargando fotogramas " + label);
      }
    } else {
      const b = new Uint8Array(await response.arrayBuffer());
      chunks.push(b);
      bytes = b.length;
    }
    const data = new Uint8Array(bytes);
    let at = 0;
    for (const chunk of chunks) { data.set(chunk, at); at += chunk.byteLength; }
    if (data.length < 8) throw new Error("Pack header missing");
    const view = new DataView(data.buffer);
    const magic = String.fromCharCode(data[0],data[1],data[2],data[3]);
    const count = view.getUint32(4, true);
    if (magic !== "EWFR" || count !== SCROLL_FRAMES) throw new Error("Invalid frame manifest");
    let offset = 8 + count * 4;
    const urls = [];
    try {
      for (let i=0;i<count;i++) {
        const length = view.getUint32(8 + i*4, true);
        if (length < 100 || offset + length > data.byteLength) throw new Error("Corrupt frame: " + i);
        const frameBytes = data.subarray(offset, offset + length);
        urls.push(URL.createObjectURL(new Blob([frameBytes], { type:"image/webp" })));
        offset += length;
      }
      if (offset !== data.byteLength) throw new Error("Unexpected trailing data");
      sequence.quality = label;
      return urls;
    } catch (error) {
      urls.forEach(u => URL.revokeObjectURL(u));
      throw error;
    }
  } finally {
    clearTimeout(timer);
  }
}

async function fetchIndividualFrames() {
  const urls = new Array(SCROLL_FRAMES).fill(null);
  let completed = 0, cursor = 0;
  async function worker() {
    while (cursor < SCROLL_FRAMES) {
      const i = cursor++;
      const name = "frame_" + String(i+1).padStart(3,"0") + ".webp";
      for (const dir of [folder,"scroll-frames"]) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 7000);
          let blob;
          try {
            const response = await fetch("/" + dir + "/" + name, {signal:controller.signal,cache:"force-cache"});
            if (!response.ok) throw Error("Frame request failed");
            blob = await response.blob();
          } finally { clearTimeout(timeout); }
          if (blob.size < 100) throw Error("Empty frame");
          urls[i] = URL.createObjectURL(new Blob([blob],{type:"image/webp"}));
          break;
        } catch {}
      }
      completed++;
      notifyProgress(completed / SCROLL_FRAMES * 100, "Preparando las prendas...");
    }
  }
  await Promise.all(Array.from({length:6}, worker));
  sequence.partial = urls.some(u => !u);
  return urls;
}

function loadSequence() {
  if (sequence.promise) return sequence.promise;
  sequence.promise = (async () => {
    let urls;
    try {
      urls = await unpackSequence(folder, sequence.quality);
    } catch {
      notifyProgress(1,"Ajustando calidad para tu conexión...");
      try {
        urls = await unpackSequence("scroll-frames", "720p");
      } catch {
        notifyProgress(1,"Preparando una versión alternativa...");
        urls = await fetchIndividualFrames();
      }
    }
    sequence.urls = urls;
    notifyProgress(100,"Fotogramas preparados");
    return urls;
  })();
  return sequence.promise;
}

// Frame decoding is limited to a local window so mobile Safari does not
// allocate hundreds of megabytes for sixty decoded 1080p images.
export function initScrollHero() {
  if (teardown) { teardown(); teardown = null; }
  const zone = document.getElementById("everywear-scroll-experience");
  const image = document.getElementById("ew-scroll-animated");
  const poster = document.getElementById("ew-scroll-poster");
  const loader = document.getElementById("ew-boot");
  if (!zone || !image || !poster || !loader) return;

  const intro = document.getElementById("ew-scroll-intro");
  const stories = [...zone.querySelectorAll(".ew-scroll-story")];
  const bar = document.getElementById("ew-scroll-progress-fill");
  const count = document.getElementById("ew-scroll-frame-count");
  const loadingBar = document.getElementById("ew-boot-bar");
  const loadingFill = document.getElementById("ew-boot-fill");
  const loadingPercent = document.getElementById("ew-boot-percent");
  const loadingStatus = document.getElementById("ew-boot-status");
  const continueButton = document.getElementById("ew-boot-continue");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const controller = new AbortController();
  const signal = controller.signal;
  const decoded = new Map();
  const decoding = new Set();
  const decodeFailed = new Set();
  const limit = window.innerWidth <= 760 ? 9 : 16;
  const maxConcurrent = window.innerWidth <= 760 ? 2 : 4;
  let raf = 0, wanted = 0, shown = -1, closed = false, ready = false, loaderDismissed = false;
  let readyCount = 0;

  function resetHome() {
    window.scrollTo(0,0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }
  function updateLoading(percent, message) {
    if (closed || !loader || loaderDismissed) return;
    loadingFill.style.width = percent + "%";
    loadingPercent.textContent = percent + "%";
    loadingBar.setAttribute("aria-valuenow", String(percent));
    if (message) loadingStatus.textContent = message;
  }
  function tick() { if (!closed && !raf) raf = requestAnimationFrame(update); }

  // The loader is a first-visit experience; subsequent SPA renders reuse
  // the binary pack instead of waiting for the network again.
  if (!sequence.urls && !sequence.enteredOnce) {
    document.body.classList.add("ew-is-loading");
    resetHome();
  } else {
    loader.hidden = true;
    loaderDismissed = true;
  }

  function hideLoader() {
    if (closed || loaderDismissed) return;
    loaderDismissed = true;
    sequence.enteredOnce = true;
    document.body.classList.remove("ew-is-loading");
    resetHome();
    ready = true;
    update();
    loader.classList.add("ew-boot-exit");
    setTimeout(() => { if (!closed) loader.hidden = true; }, 420);
    requestAnimationFrame(() => { if (!closed) { resetHome(); tick(); } });
  }

  // Do not trap the visitor forever on a poor connection. This control is
  // ONLY inside the loader and appears if waiting is unusually long.
  const fallbackTimer = setTimeout(() => {
    if (!closed && !loaderDismissed) {
      continueButton.hidden = false;
      loadingStatus.textContent = "La conexión está tardando más de lo normal.";
    }
  }, 9500);
  continueButton.addEventListener("click",hideLoader,{signal});
  if (sequence.urls && sequence.urls.filter(Boolean).length) {
    ready = true;
    tick();
  }

  function progress() {
    const vh = window.innerHeight || document.documentElement.clientHeight;
    const distance = Math.max(1, zone.getBoundingClientRect().height - vh);
    return Math.max(0, Math.min(1, -zone.getBoundingClientRect().top / distance));
  }

  function prioritize() {
    if (closed || reduced || !sequence.urls) return;
    const order = [wanted];
    for (let d=1;d<=9;d++) {
      if (wanted+d < SCROLL_FRAMES) order.push(wanted+d);
      if (wanted-d >= 0) order.push(wanted-d);
    }
    for (const i of order) {
      if (decoding.size >= maxConcurrent) break;
      if (!decoded.has(i) && !decoding.has(i) && !decodeFailed.has(i) && sequence.urls[i]) decodeFrame(i);
    }
  }

  function decodeFrame(i) {
    const src = sequence.urls[i];
    if (!src) return;
    decoding.add(i);
    const pic = new Image();
    pic.decoding = "async";
    const success = () => {
      if (closed) return;
      decoding.delete(i);
      if (pic.naturalWidth) {
        decoded.set(i,pic);
        readyCount++;
      }
      trim();
      if (!ready && sequence.urls && (decoded.has(0) || readyCount>=4)) {
        hideLoader();
      }
      tick();
      prioritize();
    };
    pic.onload = success;
    pic.onerror = () => {
      decoding.delete(i);
      decodeFailed.add(i);
      tick();
      prioritize();
    };
    pic.src = src;
  }

  function trim() {
    if (decoded.size <= limit) return;
    const remove = [...decoded.keys()]
      .filter(i => i !== shown)
      .sort((a,b) => Math.abs(b-wanted)-Math.abs(a-wanted));
    for (const i of remove) {
      if (decoded.size <= limit) break;
      decoded.delete(i);
    }
  }

  function showFrame(index) {
    const pic = decoded.get(index);
    if (!pic || index === shown || !pic.naturalWidth) return;
    image.src = pic.src;
    image.style.opacity = "1";
    shown = index;
  }

  function update() {
    raf = 0;
    if (closed) return;
    const p = progress();
    wanted = Math.round(p * (SCROLL_FRAMES - 1));
    if (ready && !reduced) {
      if (decoded.has(wanted)) showFrame(wanted);
      else if (shown < 0) {
        for (let d=1;d<=5;d++) {
          if (wanted-d>=0 && decoded.has(wanted-d)) {showFrame(wanted-d);break;}
          if (wanted+d<SCROLL_FRAMES && decoded.has(wanted+d)) {showFrame(wanted+d);break;}
        }
      }
    }
    if (ready) prioritize();
    if (bar) bar.style.transform = "scaleY(" + p + ")";
    if (count) count.textContent = String(wanted+1).padStart(2,"0") + " / " + SCROLL_FRAMES;

    const introAlpha = Math.max(0,Math.min(1,(.22-p)/.16));
    if (intro) {
      intro.style.opacity = String(introAlpha);
      intro.style.visibility = introAlpha < .02 ? "hidden" : "visible";
    }
    for (const card of stories) {
      const a=Number(card.dataset.start), b=Number(card.dataset.end);
      const fadeOut = b>=1 ? 1 : (b-p)/.035;
      const visibility = Math.max(0,Math.min(1,(p-a)/.035,fadeOut));
      card.style.opacity = String(visibility);
      card.style.visibility = visibility<.02 ? "hidden" : "visible";
      card.style.transform = "translateY(" + Math.round((1-visibility)*18) + "px)";
      card.style.pointerEvents = visibility>.8 ? "auto" : "none";
    }
  }

  // Download one packed asset, warm the first frames, THEN expose the Home.
  const onProgress=(value,message)=>updateLoading(value,message);
  sequence.listeners.add(onProgress);
  onProgress(sequence.percentage,"Preparando la experiencia Everywear...");
  loadSequence().then(() => {
    if (closed) return;
    updateLoading(100,"Dejando todo listo...");
    wanted = 0;
    if (reduced || !sequence.urls.some(Boolean)) {
      hideLoader(); // static poster and the rest of the site remain available
      return;
    }
    for (const i of [0,1,2,3,4,5,6]) {
      if (decoding.size>=maxConcurrent) break;
      if (sequence.urls[i] && !decoded.has(i) && !decoding.has(i)) decodeFrame(i);
    }
    // A broken decoder must never leave the whole site inaccessible.
    setTimeout(() => {if (!closed && !loaderDismissed) hideLoader();},3500);
  }).catch(() => {
    if (!closed) hideLoader();
  });

  window.addEventListener("scroll", tick, {passive:true,signal});
  window.addEventListener("resize", tick, {passive:true,signal});
  window.addEventListener("pageshow", () => {
    if (!closed && !loaderDismissed) resetHome();
    tick();
  }, {passive:true,signal});
  tick();

  teardown = () => {
    closed = true;
    clearTimeout(fallbackTimer);
    controller.abort();
    sequence.listeners.delete(onProgress);
    document.body.classList.remove("ew-is-loading");
    if (raf) cancelAnimationFrame(raf);
    decoded.clear();
    decoding.clear();
    decodeFailed.clear();
  };
}
