import { PRODUCTS, CATEGORIES, MEDIA, money } from "./data.js";
import { BRAND_MEDIA, LOOKBOOK_SLIDES } from "./brand-media.js";
import { TV_PHOTOS } from "./tv-photos.js";
import { listPublicProducts, listHome, publicProduct, configured as hasEverywearApi } from "../store-platform/client.js";
import { scrollHeroMarkup, initScrollHero } from "./scroll-hero.js";
import "./styles.css";
import "./scroll-hero.css";

const root = document.getElementById("app");
const WHATSAPP_URL = "https://wa.me/message/DSVJNNXTXSVML1";
const CART_KEY = "everywear_selection_v1";
let tvSlideNumber = 0;
const instagram = "https://www.instagram.com/everywear.ve?srtk=MTJycHJxNXl2eXZyOQ==";

const getSavedCart = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
    return Array.isArray(stored) ? stored.filter(x => PRODUCTS.some(p => p.id === x.id) && Number.isInteger(x.qty) && x.qty > 0) : [];
  } catch { return []; }
};

const state = {
  page: location.hash.startsWith("#/catalogo") ? "catalogo" : "home",
  category: "Todos", search: "", sort: "featured",
  cart: getSavedCart(), cartOpen: false, mobileMenu: false,
  productId: null, colorIndex: 0, size: "", photoIndex: 0,
  formFeedback: "", notice: "", lookbookIndex: 0
};

const htmlSafe = value => String(value ?? "").replace(/[&<>"']/g, char => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[char]));

const icons = {
  bag: '<path d="M6 8h12l1 13H5L6 8Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/>',
  menu: '<path d="M4 8h16M4 16h16"/>',
  close: '<path d="M5 5l14 14M19 5 5 19"/>',
  arrow: '<path d="M4 12h16m-7-7 7 7-7 7"/>',
  arrowup: '<path d="M6 18 18 6M7 6h11v11"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  search: '<circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/>',
  back: '<path d="m15 18-6-6 6-6"/>',
  check: '<path d="m4 12 5 5 11-11"/>',
  heart: '<path d="M20.5 9.2c0 4.6-8.5 10.4-8.5 10.4S3.5 13.8 3.5 9.2a4.5 4.5 0 0 1 8.5-2 4.5 4.5 0 0 1 8.5 2Z"/>',
  spark: '<path d="m12 2 2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4L12 2Z"/>',
  insta: '<rect width="17" height="17" x="3.5" y="3.5" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".8" fill="currentColor" stroke="none"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6m4-6v6"/>',
  whatsapp: '<path d="M20 11.5a8 8 0 0 1-11.7 7.1L3 20l1.4-5.2A8 8 0 1 1 20 11.5Z"/><path d="M8.3 8.3c.3-.5.7-.5.9-.2l1 1.7-.6 1c.8 1.4 1.8 2.3 3.3 2.9l.9-.7 1.7.9c.4.2.4.6.2.9-.5.9-1.7 1.2-2.8.8-2.8-1-4.9-3-6-5.8-.3-.8.5-1.4 1.4-1.5Z"/>'
};
const icon = (name, size = 20) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.spark}</svg>`;
const logo = (small = false) => `<span class="brand${small ? " brand-small" : ""}" aria-label="Everywear"><span class="brand-every">every</span><span class="brand-wear">wear.</span></span>`;
const cartCount = () => state.cart.reduce((sum, item) => sum + item.qty, 0);
const cartTotal = () => state.cart.reduce((sum, item) => sum + ((PRODUCTS.find(p => p.id === item.id)?.price || 0) * item.qty), 0);
const waLink = () => WHATSAPP_URL;
const persist = () => localStorage.setItem(CART_KEY, JSON.stringify(state.cart));
const productOf = id => PRODUCTS.find(p => p.id === id);

function header() {
  return `
    <div class="announce"><span>YOUR ACCESS TO EUROPEAN FASHION</span><span class="announce-star">*</span><span>CURATED WITH LOVE</span></div>
    <header class="header">
      <div class="header-wrap">
        <a class="header-logo" href="#/" aria-label="Everywear, inicio">${logo()}</a>
        <nav class="desktop-nav" aria-label="Navegación principal">
          <a href="#/" class="nav-item ${state.page === "home" ? "active" : ""}">Inicio</a>
          <a href="#/catalogo" class="nav-item ${state.page === "catalogo" ? "active" : ""}">Catálogo</a>
          <a href="#/shopper" class="nav-item">Personal shopper</a>
        </nav>
        <div class="header-actions">
          <a class="header-instagram" href="${instagram}" target="_blank" rel="noopener noreferrer" aria-label="Everywear en Instagram">${icon("insta", 19)}</a>
          <button class="icon-button bag-trigger" data-action="open-cart" aria-label="Abrir tu selección">
            ${icon("bag", 22)}<span class="bag-badge ${cartCount() ? "" : "empty"}">${cartCount()}</span>
          </button>
          <button class="icon-button mobile-menu-button" type="button" data-action="toggle-menu" aria-label="Abrir menú" aria-controls="mobile-navigation" aria-expanded="false">
            <span class="mobile-menu-icon mobile-menu-icon--open">${icon("menu", 25)}</span>
            <span class="mobile-menu-icon mobile-menu-icon--close">${icon("close", 25)}</span>
          </button>
        </div>
      </div>
      <nav class="mobile-nav" id="mobile-navigation" aria-label="Menú móvil" aria-hidden="true" inert>
        <a href="#/" data-action="close-menu">Inicio</a>
        <a href="#/catalogo" data-action="close-menu">Catálogo</a>
        <a href="#/shopper" data-action="close-menu">Personal shopper</a>
        <a href="${instagram}" data-action="close-menu" target="_blank" rel="noopener noreferrer">Instagram ${icon("arrowup",16)}</a>
      </nav>
    </header>
    <div class="mobile-menu-scrim" data-action="close-menu" aria-hidden="true"></div>`;
}


function setMobileMenu(open) {
  if (state.mobileMenu === open) return;
  state.mobileMenu = open;
  const header = root.querySelector(".header");
  const nav = root.querySelector(".mobile-nav");
  const button = root.querySelector(".mobile-menu-button");
  header?.classList.toggle("is-menu-open", open);
  root.querySelector(".mobile-menu-scrim")?.classList.toggle("is-active", open);
  button?.setAttribute("aria-expanded", String(open));
  button?.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
  if (nav) {
    nav.inert = !open;
    nav.setAttribute("aria-hidden", String(!open));
  }
  document.body.classList.toggle("mobile-nav-open", open);
}
// Do not re-render any Home section when toggling. Prevent scroll input
// on the background without fixing/repositioning the body on iOS.
function preventMenuBackgroundScroll(event) {
  if (!state.mobileMenu || !event.cancelable) return;
  if (event.target instanceof Element && event.target.closest(".mobile-nav")) return;
  event.preventDefault();
}
document.addEventListener("touchmove", preventMenuBackgroundScroll, {passive:false,capture:true});
document.addEventListener("wheel", preventMenuBackgroundScroll, {passive:false,capture:true});
window.addEventListener("keydown", event => {
  if (state.mobileMenu && ["ArrowDown","ArrowUp","PageUp","PageDown","Home","End"," "].includes(event.key)) event.preventDefault();
}, {capture:true});
window.addEventListener("resize", () => {
  if (state.mobileMenu && window.innerWidth > 760) setMobileMenu(false);
}, {passive:true});

const actionLink = (label, href, extra = "") => `<a class="button button-dark ${extra}" href="${href}"><span>${label}</span>${icon("arrowup", 18)}</a>`;

function categoryTiles() {
  // Never depend on product order: new/archived items must not break Home.
  const coverFor = (category,fallback) => PRODUCTS.find(p=>p.category===category)?.image || fallback;
  const tiles = [
    ["Tops", coverFor("Tops",MEDIA.story), "Tops & camisas"],
    ["Conjuntos", coverFor("Conjuntos",MEDIA.collection), "Conjuntos"],
    ["Vestidos", coverFor("Vestidos",MEDIA.hero), "Vestidos"],
    ["Accesorios", coverFor("Accesorios",MEDIA.accessories), "Accesorios"]
  ];
  return `<section class="section categories-section" aria-labelledby="category-title">
    <div class="section-topline"><span>05 / EXPLORA</span><span>PIEZAS PARA CADA VERSIÓN DE TI</span></div>
    <div class="section-heading"><div><p class="eyebrow">Discover your style</p><h2 id="category-title">Encuentra tu <em>esencia.</em></h2></div><a class="text-link" href="#/catalogo">Ver todo el catálogo ${icon("arrowup",17)}</a></div>
    <div class="category-grid">${tiles.map((item, index) => `<a href="#/catalogo" data-category="${item[0]}" class="category-card category-${index}">
      <img loading="lazy" src="${item[1]}" alt="Editorial ilustrativa de ${item[2]}" />
      <span class="category-shade"></span><span class="category-content"><span>0${index+1}</span><strong>${item[2]}</strong><span class="category-arrow">${icon("arrowup",17)}</span></span>
    </a>`).join("")}</div>
  </section>`;
}

function productCard(p, index = 0) {
  return `<article class="product-card">
    <button class="product-visual" data-action="view-product" data-id="${p.id}" aria-label="Ver detalles de ${htmlSafe(p.name)}">
      <img src="${p.image}" alt="Imagen ilustrativa de ${htmlSafe(p.name)}" loading="lazy" />
      ${p.tag ? `<span class="product-tag">${htmlSafe(p.tag)}</span>` : ""}
      <span class="quick-view">Ver detalles ${icon("arrowup",15)}</span>
    </button>
    <div class="product-row"><div><span class="product-category">${p.category}</span><h3>${htmlSafe(p.name)}</h3></div>
      <button class="product-add" data-action="view-product" data-id="${p.id}" aria-label="Elegir ${htmlSafe(p.name)}">${icon("plus",20)}</button>
    </div>
    <div class="product-lower"><span class="product-price">${money(p.price)}</span><div class="mini-swatches" aria-label="${p.colors.length} colores disponibles">${p.colors.slice(0,3).map(color => `<span style="background:${color.hex}"></span>`).join("")}</div></div>
  </article>`;
}


function tvScreen(position, index) {
  const photo = TV_PHOTOS[index % TV_PHOTOS.length];
  return `<button type="button" class="tv-live-screen tv-live-screen--${position}" data-tv-screen="${index}" data-action="tv-change" aria-label="Cambiar la prenda del televisor ${position}">
    <img class="tv-live-current" src="${htmlSafe(photo.src)}" alt="${htmlSafe(photo.alt)}" draggable="false" />
    <img class="tv-live-next" alt="" aria-hidden="true" draggable="false" />
    <span class="tv-screen-gloss" aria-hidden="true"></span>
  </button>`;
}

function editorialTV() {
  return `<section class="tv-editorial-section reveal-on-scroll" aria-labelledby="tv-editorial-title">
    <div class="tv-editorial-content">
      <div class="tv-editorial-copy">
        <div class="tv-eyebrow">03 / NOW SHOWING</div>
        <h2 id="tv-editorial-title">New pieces,<br/><em>new obsessions.</em></h2>
        <p>Looks que inspiran tu día a día. Descubre más drops, ideas y detrás de cámaras en nuestro Instagram.</p>
        <a class="tv-social-link" href="${instagram}" target="_blank" rel="noopener noreferrer">${icon("insta",19)} Seguir @everywear.ve ${icon("arrowup",19)}</a>
        <div class="tv-editorial-progress" aria-live="polite"><span id="tv-slide-current">01</span><span class="tv-progress-line"><span id="tv-progress-fill"></span></span><span>04</span></div>
      </div>
      <div class="tv-scene">
        <div class="tv-stage" role="group" aria-label="Tres televisores color vino, con fotografías de moda que cambian de forma independiente">
          ${tvScreen("top", 0)}
          ${tvScreen("middle", 1)}
          ${tvScreen("bottom", 2)}
          <img class="tv-photoreal-frame" src="/brand/tv-stack.svg" alt="" aria-hidden="true" draggable="false" />
        </div>
      </div>
    </div>
  </section>`;
}

function home() {
  return `
    <main>
      ${scrollHeroMarkup()}

      <div class="marquee" aria-label="Everywear, estilo para cada día"><div class="marquee-inner">${Array(3).fill(`<span>EVERY DAY</span><span class="marquee-flower">*</span><span>EVERY STYLE</span><span class="marquee-flower">*</span><span>EVERY WEAR</span><span class="marquee-flower">*</span>`).join("")}</div></div>
      <section class="brand-story section reveal-on-scroll" id="about-us" aria-labelledby="brand-story-title">
        <div class="section-topline"><span>01 / LA MARCA</span><span>EVERYWEAR — OUR WORLD</span></div>
        <div class="brand-story-layout">
          <div class="brand-story-copy">
            <p class="eyebrow">A little more about us</p>
            <h2 id="brand-story-title">Más que ropa.<br/><em>Una forma de ser.</em></h2>
            <p>Creemos en la libertad de vestirte como te sientes. En los detalles que hacen diferente un outfit y en esas prendas que te acompañan una y otra vez.</p>
            <span class="brand-story-script">Make it yours.</span>
            <a class="text-link" href="#/catalogo">Descubre nuestra selección ${icon("arrowup",17)}</a>
          </div>
          <div class="brand-collage" aria-label="Imágenes de identidad visual de Everywear">
            <figure class="collage-photo collage-store"><img src="${BRAND_MEDIA.store}" alt="Fachada de la boutique Everywear, con vitrinas y letrero de la marca" loading="lazy" /><figcaption>01 / OUR SPACE</figcaption></figure>
            <figure class="collage-photo collage-bag"><img src="${BRAND_MEDIA.oliveBag}" alt="Bolsa verde oliva Everywear de la nueva colección, con identidad gráfica beige" loading="lazy" /><figcaption>02 / OUR DETAILS</figcaption></figure>
            <figure class="collage-photo collage-girl"><img src="${BRAND_MEDIA.girlRedBag}" alt="Modelo de perfil sosteniendo la bolsa vino de la nueva colección Everywear" loading="lazy" /><figcaption>03 / OUR STYLE</figcaption></figure>
          </div>
        </div>
      </section>
      <section class="lookbook-section reveal-on-scroll" id="lookbook" aria-labelledby="lookbook-title">
        <div class="lookbook-shell">
          <div class="section-topline"><span>02 / EDITORIAL</span><span>EDICIÓN 01 — EUROPA</span></div>
          <div class="lookbook-header">
            <div><p class="eyebrow">An invitation to explore</p><h2 id="lookbook-title">Everywear <em>lookbook.</em></h2></div>
            <p>Un vistazo a nuestro universo: pequeños detalles, inspiración y nuevas formas de vestir.</p>
          </div>
          <div class="lookbook-body">
            <div class="lookbook-aside"><span class="lookbook-star">*</span><p class="lookbook-caption">THE EVERYWEAR JOURNAL</p><h3>Un libro.<br/><em>Muchas formas<br/>de ser tú.</em></h3><div class="lookbook-aside-bottom">OUR STORY IN FRAMES <span>↗</span></div></div>
            <div class="lookbook-viewer">
              <div class="lookbook-viewport" role="region" aria-roledescription="carrusel" aria-label="Lookbook fotográfico Everywear" tabindex="0">
                <div class="lookbook-track" id="lookbook-track" style="transform:translate3d(-${state.lookbookIndex * 100}%,0,0)">
                  ${LOOKBOOK_SLIDES.map((slide,i)=>`<div class="lookbook-slide" role="group" aria-roledescription="diapositiva" aria-label="${i+1} de ${LOOKBOOK_SLIDES.length}"><img src="${slide.image}" loading="${i===0 ? "eager" : "lazy"}" alt="${slide.alt}" width="1254" height="1254" decoding="async" draggable="false" /></div>`).join("")}
                </div>
              </div>
              <div class="lookbook-navigation">
                <div class="lookbook-counter"><strong id="lookbook-current">${String(state.lookbookIndex + 1).padStart(2,"0")}</strong><span class="lookbook-counter-rule"></span><span>${String(LOOKBOOK_SLIDES.length).padStart(2,"0")}</span></div>
                <div class="lookbook-dots" role="group" aria-label="Elegir página del lookbook">${LOOKBOOK_SLIDES.map((_,i)=>`<button class="lookbook-dot ${i===state.lookbookIndex?"active":""}" data-action="lookbook-go" data-index="${i}" aria-label="Ir a página ${i+1}" aria-pressed="${i===state.lookbookIndex}"></button>`).join("")}</div>
                <div class="lookbook-arrows"><button type="button" data-action="lookbook-prev" aria-label="Página anterior">${icon("back",21)}</button><button type="button" data-action="lookbook-next" aria-label="Siguiente página">${icon("arrow",21)}</button></div>
              </div>
            </div>
          </div>
          <div class="lookbook-bottom"><span>VISUAL JOURNAL / EVERYWEAR</span><span>DESLIZA O USA LAS FLECHAS PARA EXPLORAR</span></div>
        </div>
      </section>
      ${editorialTV()}
      <section class="personal-shopper section" id="personal-shopper">
        <div class="shopper-intro">
          <p class="eyebrow">03 / JUST FOR YOU</p>
          <div class="shopper-star">*</div>
          <h2>Tu estilo,<br/><em>nuestro punto de partida.</em></h2>
          <p>¿Buscas algo especial? Cuéntanos qué tienes en mente y te ayudamos a encontrar las piezas que van contigo.</p>
          <span class="shopper-sign">PERSONAL SHOPPER BY EVERYWEAR</span>
        </div>
        <div class="shopper-form-card">
          <div class="form-card-head"><span>PERSONAL SHOPPER</span><span>01 — 04</span></div>
          <h3>Hablemos de tu próximo <em>look.</em></h3>
          <form id="shopper-form">
            <label>¿Cómo te llamas?<input name="name" autocomplete="name" placeholder="Tu nombre" required maxlength="80" /></label>
            <label>¿Qué estás buscando?<select name="interest" required><option value="" disabled selected>Selecciona una opción</option><option>Outfit completo</option><option>Ropa casual</option><option>Look para una ocasión especial</option><option>Una prenda específica</option><option>Accesorios</option><option>Asesoría de estilo</option></select></label>
            <div class="form-row"><label>Tu talla (opcional)<input name="size" placeholder="Ej. S / M / 28" maxlength="40" /></label><label>Presupuesto (opcional)<input name="budget" placeholder="Ej. $100" maxlength="50" /></label></div>
            <label>Cuéntanos un poco más<textarea name="notes" rows="3" placeholder="Colores, inspiración, fecha, ocasión..." maxlength="500"></textarea></label>
            <button type="submit" class="button button-dark form-submit"><span>Enviar a WhatsApp</span>${icon("arrowup",18)}</button>
            <p class="form-foot">Abriremos el chat de Everywear en WhatsApp. Comparte allí los detalles de tu solicitud.</p>
          </form>
        </div>
      </section>
      <section class="section featured-section">
        <div class="section-topline"><span>04 / THE EDIT</span><span>UNA SELECCIÓN, MIL POSIBILIDADES</span></div>
        <div class="section-heading"><div><p class="eyebrow">The pieces we love</p><h2>Favoritos de <em>Everywear.</em></h2></div><a href="#/catalogo" class="text-link">Explorar la colección ${icon("arrowup",17)}</a></div>
        <div class="products-grid featured-grid">${PRODUCTS.slice(0,4).map(productCard).join("")}</div>
        <p class="demo-note">Selección ilustrativa. Fotografías y precios sujetos a confirmación.</p>
      </section>
      ${categoryTiles()}
      <section class="closing-banner"><div><span>THE EVERYWEAR CLUB</span><h2>Wear it. <em>Own it.</em></h2><p>La mejor versión de tu estilo es la tuya.</p></div>${actionLink("Shop the edit", "#/catalogo", "button-light")}</section>
    </main>
  `;
}

function filteredProducts() {
  let list = PRODUCTS.filter(p => (state.category === "Todos" || (p.categories||[p.category]).includes(state.category)) && (p.name + " " + p.category).toLowerCase().includes(state.search.toLowerCase().trim()));
  if (state.sort === "low") list.sort((a,b) => a.price - b.price);
  if (state.sort === "high") list.sort((a,b) => b.price - a.price);
  if (state.sort === "name") list.sort((a,b) => a.name.localeCompare(b.name, "es"));
  return list;
}

function catalogGrid() {
  const items = filteredProducts();
  return items.length ? items.map(productCard).join("") : `<div class="empty-products"><span>*</span><h3>No encontramos coincidencias.</h3><p>Prueba con otra búsqueda o explora todas las categorías.</p><button data-action="reset-filters" class="text-link">Ver todos los productos ${icon("arrow",17)}</button></div>`;
}

function catalog() {
  return `<main class="catalog-page">
    <section class="catalog-intro">
      <div class="catalog-backdrop">everywear.</div>
      <p class="eyebrow">THE EVERYWEAR EDIT / EDICIÓN 01</p>
      <h1>Tu próximo <em>favorito.</em></h1>
      <p>Piezas especiales para todos los días. Explora, elige y arma una selección tan única como tú.</p>
      <div class="catalog-corner">CURATED WITH INTENTION *</div>
    </section>
    <section class="section catalog-content">
      <div class="catalog-toolbar"><div><span class="eyebrow">EXPLORE THE EDIT</span><h2>La colección <span id="result-count">(${filteredProducts().length})</span></h2></div>
        <div class="catalog-controls"><label class="searchbox" aria-label="Buscar productos">${icon("search",18)}<input id="catalog-search" type="search" value="${htmlSafe(state.search)}" placeholder="Buscar una prenda..." /></label><label class="sortbox"><span>Ordenar:</span><select id="sort-select" aria-label="Ordenar productos"><option value="featured" ${state.sort === "featured" ? "selected" : ""}>Destacados</option><option value="low" ${state.sort === "low" ? "selected" : ""}>Menor precio</option><option value="high" ${state.sort === "high" ? "selected" : ""}>Mayor precio</option><option value="name" ${state.sort === "name" ? "selected" : ""}>Nombre A-Z</option></select></label></div>
      </div>
      <div class="filter-scroll"><div class="filter-chips" role="group" aria-label="Filtrar por categoría">${CATEGORIES.map(c => `<button data-action="category" data-category="${c}" class="filter-chip ${state.category === c ? "selected" : ""}" aria-pressed="${state.category === c}">${c}</button>`).join("")}</div></div>
      <div class="catalog-notice">CATÁLOGO DE DEMOSTRACIÓN · Los artículos, las imágenes y los precios se reemplazarán por los productos reales.</div>
      <div id="catalog-grid" class="products-grid catalog-grid">${catalogGrid()}</div>
      <div class="catalog-end"><span>*</span><p>You've seen the whole edit.</p><h3>¿No encontraste lo que buscas?</h3><a href="#/shopper" class="text-link">Pregúntale a nuestro personal shopper ${icon("arrowup",17)}</a></div>
    </section>
  </main>`;
}

function footer() {
  return `<footer class="footer">
    <div class="footer-main">
      <div class="footer-about"><a href="#/" class="footer-logo">${logo()}</a><p>Tu acceso a la moda europea. Seleccionamos piezas para que las hagas completamente tuyas.</p><a class="footer-social" href="${instagram}" target="_blank" rel="noopener noreferrer">${icon("insta",19)} @everywear.ve</a></div>
      <div class="footer-links"><span>EXPLORA</span><a href="#/">Inicio</a><a href="#/catalogo">Catálogo</a><a href="#/shopper">Personal shopper</a></div>
      <div class="footer-links"><span>HABLEMOS</span><a href="${instagram}" target="_blank" rel="noopener noreferrer">Instagram ${icon("arrowup",14)}</a><a href="${waLink("Hola Everywear, me gustaría recibir información sobre sus productos.")}" target="_blank" rel="noopener noreferrer">WhatsApp ${icon("arrowup",14)}</a><button data-action="open-cart">Tu selección</button></div>
      <div class="footer-note"><span>EVERY DAY, EVERY WEAR.</span><div class="footer-flower">*</div><p>Curated for you.<br/>Worn your way.</p></div>
    </div>
    <div class="footer-bottom"><span>© ${new Date().getFullYear()} EVERYWEAR. ALL RIGHTS RESERVED.</span><span>MADE TO BE YOURS *</span><span>YOUR ACCESS TO EUROPEAN FASHION</span></div>
    <div class="footer-large-word">everywear.</div>
  </footer>`;
}

function floatingSelection() {
  return `<button class="floating-selection ${cartCount() ? "has-items" : ""}" data-action="open-cart" aria-label="Abrir tu selección de ${cartCount()} artículos"><span class="floating-icon">${icon("bag",21)}</span><span>Tu selección</span><span class="floating-count">${cartCount()}</span></button>`;
}

function modal() {
  const p = productOf(state.productId);
  if (!p) return "";
  const image = p.images[state.photoIndex] || p.image;
  return `<div class="modal-layer" id="product-modal">
    <button class="modal-scrim" data-action="close-modal" aria-label="Cerrar detalle"></button>
    <section class="product-dialog" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <button class="dialog-close icon-button" data-action="close-modal" aria-label="Cerrar">${icon("close",22)}</button>
      <div class="dialog-media"><img src="${image}" alt="Vista ilustrativa de ${htmlSafe(p.name)}, ${htmlSafe(p.colors[state.colorIndex].name)}" />
        <div class="dialog-thumbnails">${p.images.map((src, i) => `<button class="thumb ${state.photoIndex === i ? "active" : ""}" data-action="photo" data-index="${i}" aria-label="Ver foto ${i+1}"><img src="${src}" alt="" /></button>`).join("")}</div>
      </div>
      <div class="dialog-details">
        <div class="dialog-breadcrumb">EVERYWEAR / ${htmlSafe(p.category.toUpperCase())}</div>
        <h2 id="modal-title">${htmlSafe(p.name)}</h2><p class="dialog-price">${money(p.price)}</p>
        <p class="dialog-desc">${htmlSafe(p.description)}</p>
        <div class="dialog-option"><div class="option-label"><strong>Color</strong><span>${htmlSafe(p.colors[state.colorIndex].name)}</span></div><div class="color-choices">${p.colors.map((c, i) => `<button class="color-choice ${i === state.colorIndex ? "active" : ""}" data-action="color" data-index="${i}" title="${htmlSafe(c.name)}" aria-label="Color ${htmlSafe(c.name)}" aria-pressed="${i === state.colorIndex}"><span style="background:${c.hex}"></span></button>`).join("")}</div></div>
        ${p.sizes.length ? `<div class="dialog-option"><div class="option-label"><strong>Talla</strong><span>${state.size ? "Seleccionada: " + htmlSafe(state.size) : "Elige tu talla"}</span></div><div class="size-choices">${p.sizes.map(s => `<button class="size-choice ${state.size === s ? "active" : ""}" data-action="size" data-size="${s}" aria-pressed="${state.size === s}">${s}</button>`).join("")}</div></div>` : ""}
        <div class="dialog-feedback" role="status">${htmlSafe(state.formFeedback)}</div>
        <button class="button button-dark modal-add" data-action="add-cart"><span>${icon("plus",17)} Agregar a tu selección</span><span>${money(p.price)}</span></button>
        <p class="dialog-disclaimer">Imágenes referenciales. Confirma disponibilidad, color y talla con Everywear antes de comprar.</p>
      </div>
    </section>
  </div>`;
}

function basket() {
  if (!state.cartOpen) return "";
  return `<div class="drawer-layer"><button data-action="close-cart" class="drawer-scrim" aria-label="Cerrar bolsa"></button>
    <aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="basket-title">
      <div class="drawer-header"><div><p class="eyebrow">THE EVERYWEAR EDIT</p><h2 id="basket-title">Tu selección <em>(${cartCount()})</em></h2></div><button data-action="close-cart" class="icon-button" aria-label="Cerrar selección">${icon("close",23)}</button></div>
      ${state.cart.length ? `<div class="drawer-items">${state.cart.map((item, i) => {
        const p = productOf(item.id);
        if (!p) return "";
        return `<article class="cart-item"><img src="${p.image}" alt="" /><div class="cart-info"><span class="cart-category">${p.category}</span><h3>${htmlSafe(p.name)}</h3><p>${htmlSafe(item.color)} ${item.size ? "· Talla " + htmlSafe(item.size) : ""}</p><strong>${money(p.price * item.qty)}</strong><div class="cart-item-bottom"><div class="quantity-stepper"><button data-action="qty-down" data-index="${i}" aria-label="Quitar una unidad">${icon("minus",15)}</button><span>${item.qty}</span><button data-action="qty-up" data-index="${i}" aria-label="Añadir una unidad">${icon("plus",15)}</button></div><button data-action="remove-item" data-index="${i}" class="remove-item" aria-label="Eliminar producto">${icon("trash",17)}</button></div></div></article>`;
      }).join("")}</div>
      <div class="drawer-checkout"><div class="subtotal-line"><span>Subtotal</span><strong>${money(cartTotal())}</strong></div><p>Los precios son de demostración. Al abrir WhatsApp, comparte los artículos de tu selección para confirmar total, disponibilidad y entrega.</p><button data-action="checkout" class="button button-dark checkout-button"><span>Finalizar por WhatsApp</span>${icon("whatsapp",20)}</button><a href="#/catalogo" data-action="close-cart" class="keep-shopping">Seguir explorando ${icon("arrow",16)}</a></div>`
      : `<div class="empty-cart"><div class="empty-cart-icon">${icon("bag",42)}</div><h3>Tu selección está esperando.</h3><p>Agrega tus piezas favoritas y prepara tu pedido en un solo lugar.</p><a href="#/catalogo" data-action="close-cart" class="button button-dark"><span>Explorar catálogo</span>${icon("arrowup",17)}</a></div>`}
    </aside></div>`;
}


let revealObserver;
function observeReveals() {
  if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  revealObserver?.disconnect();
  revealObserver = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) {
      entry.target.classList.add("is-visible");
      revealObserver?.unobserve(entry.target);
    }
  }, { threshold: 0.1, rootMargin: "0px 0px -30px 0px" });
  document.querySelectorAll(".reveal-on-scroll").forEach(el => revealObserver.observe(el));
}
function updateLookbook() {
  const track = document.getElementById("lookbook-track");
  if (!track) return;
  track.style.transform = "translate3d(-" + (state.lookbookIndex * 100) + "%,0,0)";
  const current = document.getElementById("lookbook-current");
  if (current) current.textContent = String(state.lookbookIndex + 1).padStart(2, "0");
  document.querySelectorAll(".lookbook-dot").forEach((dot, i) => {
    const active = i === state.lookbookIndex;
    dot.classList.toggle("active", active);
    dot.setAttribute("aria-pressed", String(active));
  });
}
function moveLookbook(delta) {
  state.lookbookIndex = (state.lookbookIndex + delta + LOOKBOOK_SLIDES.length) % LOOKBOOK_SLIDES.length;
  updateLookbook();
}
let touchStart = null;
root.addEventListener("pointerdown", event => {
  if (event.target.closest(".lookbook-viewport")) touchStart = {x:event.clientX,y:event.clientY};
}, {passive:true});
root.addEventListener("pointerup", event => {
  if (!touchStart || !event.target.closest(".lookbook-viewport")) { touchStart=null; return; }
  const dx = event.clientX - touchStart.x, dy = event.clientY - touchStart.y;
  if (Math.abs(dx)>48 && Math.abs(dx)>Math.abs(dy)*1.2) moveLookbook(dx<0 ? 1:-1);
  touchStart=null;
}, {passive:true});


let tvRotation = null;
function initTVRotation() {
  tvRotation?.stop();
  const scene = document.querySelector(".tv-stage");
  if (!scene || !TV_PHOTOS.length) { tvRotation = null; return; }
  const screens = Array.from(scene.querySelectorAll("[data-tv-screen]"));
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const chosen = screens.map((_, i) => i % TV_PHOTOS.length);
  const pending = new Set();
  const timers = new Array(screens.length).fill(null);
  let visible = false;
  let alive = true;
  const randomDelay = i => 2600 + i * 450 + Math.floor(Math.random() * 2300);
  const chooseNext = i => {
    const blocked = new Set([...chosen, ...pending]);
    let candidates = TV_PHOTOS.map((_, j) => j).filter(j => !blocked.has(j));
    if (!candidates.length) candidates = TV_PHOTOS.map((_, j) => j).filter(j => j !== chosen[i]);
    return candidates.length ? candidates[Math.floor(Math.random() * candidates.length)] : chosen[i];
  };
  const change = async i => {
    const screen = screens[i];
    if (!alive || !screen || screen.dataset.loading === "true" || TV_PHOTOS.length < 2) return;
    const nextIdx = chooseNext(i);
    const next = screen.querySelector(".tv-live-next");
    const current = screen.querySelector(".tv-live-current");
    if (nextIdx === chosen[i] || !next || !current) return;
    screen.dataset.loading = "true";
    pending.add(nextIdx);
    const src = TV_PHOTOS[nextIdx].src;
    next.src = src;
    try {
      if (next.decode) await next.decode();
      if (!alive || !scene.isConnected) return;
      next.classList.add("is-visible");
      await new Promise(resolve => setTimeout(resolve, reduced ? 0 : 800));
      if (!alive || !scene.isConnected) return;
      current.src = src;
      current.alt = TV_PHOTOS[nextIdx].alt || "Foto de prenda Everywear";
      chosen[i] = nextIdx;
      next.classList.remove("is-visible");
    } catch {
      // Una foto no disponible no interrumpe las demás pantallas.
    } finally {
      pending.delete(nextIdx);
      screen.dataset.loading = "false";
    }
  };
  const schedule = i => {
    clearTimeout(timers[i]);
    if (!alive || !visible || document.hidden || reduced) return;
    timers[i] = setTimeout(async () => {
      await change(i);
      schedule(i);
    }, randomDelay(i));
  };
  const pause = () => timers.forEach(timer => clearTimeout(timer));
  const resume = () => {
    pause();
    if (visible && !document.hidden) screens.forEach((_,i) => schedule(i));
  };
  const onVisibility = () => { document.hidden ? pause() : resume(); };
  document.addEventListener("visibilitychange", onVisibility);
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    visible ? resume() : pause();
  }, { threshold: .1 });
  observer.observe(scene);
  tvRotation = {
    change,
    changeAll: async direction => {
      tvSlideNumber = (tvSlideNumber + direction + 4) % 4;
      const num = document.getElementById("tv-slide-current");
      const progress = document.getElementById("tv-progress-fill");
      if (num) num.textContent = String(tvSlideNumber + 1).padStart(2, "0");
      if (progress) progress.style.width = ((tvSlideNumber + 1) * 25) + "%";
      await Promise.all(screens.map((_, i) => change(i)));
    },
    stop: () => {
      alive = false;
      pause();
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    }
  };
}

function render() {
  if (state.mobileMenu) setMobileMenu(false);
  root.innerHTML = `${header()}${state.page === "catalogo" ? catalog() : home()}${footer()}${floatingSelection()}${modal()}${basket()}`;
  document.body.classList.toggle("overlay-open", Boolean(state.cartOpen || state.productId));
  updateLookbook();
  observeReveals();
  initTVRotation();
  initScrollHero();
}
function openWhatsApp(message) {
  window.open(waLink(message), "_blank", "noopener,noreferrer");
}
function orderMessage() {
  const lines = ["¡Hola, Everywear! 🤍", "Vengo de la página web y quiero consultar mi selección:", ""];
  state.cart.forEach(item => {
    const p = productOf(item.id);
    if (!p) return;
    lines.push("• " + p.name + " — " + item.color + (item.size ? " / Talla " + item.size : "") + " / Cant. " + item.qty + " / " + money(p.price * item.qty));
  });
  lines.push("", "Subtotal referencial: " + money(cartTotal()), "¿Me confirman disponibilidad, precio final y opciones de entrega? Gracias.");
  return lines.join("\n");
}
function addToBag() {
  const p = productOf(state.productId);
  if (!p) return;
  if (p.sizes.length && !state.size) {
    state.formFeedback = "Selecciona una talla antes de agregar la prenda.";
    render();
    return;
  }
  const color = p.colors[state.colorIndex].name;
  const key = p.id + "|" + color + "|" + (state.size || "Única");
  const found = state.cart.find(x => x.key === key);
  if (found) found.qty++;
  else state.cart.push({ key, id: p.id, color, size: state.size, qty: 1 });
  persist();
  state.productId = null; state.cartOpen = true; state.formFeedback = "";
  render();
}

root.addEventListener("click", event => {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const a = target.dataset.action;
  if (a === "tv-change") { tvRotation?.change(Number(target.dataset.tvScreen)); return; }
  if (a === "lookbook-next") { moveLookbook(1); return; }
  if (a === "lookbook-prev") { moveLookbook(-1); return; }
  if (a === "lookbook-go") { state.lookbookIndex = Number(target.dataset.index); updateLookbook(); return; }
  if (a === "toggle-menu") { setMobileMenu(!state.mobileMenu); return; }
  if (a === "close-menu") { setMobileMenu(false); return; }
  if (a === "open-cart") { setMobileMenu(false); state.cartOpen = true; state.productId = null; render(); }
  if (a === "close-cart") { state.cartOpen = false; render(); }
  if (a === "view-product") { state.productId = target.dataset.id; state.colorIndex = 0; state.photoIndex = 0; state.size = ""; state.formFeedback = ""; render(); }
  if (a === "close-modal") { state.productId = null; state.formFeedback = ""; render(); }
  if (a === "color") { state.colorIndex = Number(target.dataset.index); state.photoIndex = state.colorIndex % productOf(state.productId).images.length; state.formFeedback = ""; render(); }
  if (a === "size") { state.size = target.dataset.size; state.formFeedback = ""; render(); }
  if (a === "photo") { state.photoIndex = Number(target.dataset.index); render(); }
  if (a === "add-cart") addToBag();
  if (a === "category") { state.category = target.dataset.category; render(); }
  if (a === "reset-filters") { state.category = "Todos"; state.search = ""; state.sort = "featured"; render(); }
  if (a === "qty-up" || a === "qty-down" || a === "remove-item") {
    const idx = Number(target.dataset.index);
    const item = state.cart[idx];
    if (!item) return;
    if (a === "remove-item") state.cart.splice(idx, 1);
    else if (a === "qty-up") item.qty = Math.min(item.qty + 1, 99);
    else if (item.qty === 1) state.cart.splice(idx, 1);
    else item.qty--;
    persist(); render();
  }
  if (a === "checkout" && state.cart.length) openWhatsApp(orderMessage());
});
root.addEventListener("input", event => {
  if (event.target.id === "catalog-search") {
    state.search = event.target.value;
    const grid = document.getElementById("catalog-grid");
    const count = document.getElementById("result-count");
    if (grid) grid.innerHTML = catalogGrid();
    if (count) count.textContent = "(" + filteredProducts().length + ")";
  }
});
root.addEventListener("change", event => {
  if (event.target.id === "sort-select") { state.sort = event.target.value; render(); }
});
root.addEventListener("submit", event => {
  if (event.target.id !== "shopper-form") return;
  event.preventDefault();
  const fields = new FormData(event.target);
  const name = String(fields.get("name") || "").trim();
  const interest = String(fields.get("interest") || "").trim();
  if (!name || !interest) return;
  const details = [
    "¡Hola, Everywear! ✨", "Vengo de su página web y me gustaría recibir ayuda de Personal Shopper.", "",
    "Nombre: " + name, "Estoy buscando: " + interest,
    "Talla: " + (String(fields.get("size") || "").trim() || "Por definir"),
    "Presupuesto: " + (String(fields.get("budget") || "").trim() || "Por definir"),
    "Detalles: " + (String(fields.get("notes") || "").trim() || "Sin detalles adicionales"),
    "", "¡Gracias!"
  ];
  openWhatsApp(details.join("\n"));
});

let hasRouted = false;
function route() {
  const hash = location.hash;
  const firstRoute = !hasRouted;
  hasRouted = true;
  state.page = hash.startsWith("#/catalogo") ? "catalogo" : "home";
  setMobileMenu(false);
  state.cartOpen = false; state.productId = null;
  if (hash.startsWith("#/catalogo") && state.pendingCategory) {
    state.category = state.pendingCategory; state.pendingCategory = null;
  }
  render();
  const motion = firstRoute || window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
  requestAnimationFrame(() => {
    if (hash.startsWith("#/shopper")) {
      document.getElementById("personal-shopper")?.scrollIntoView({ behavior: motion, block: "start" });
    } else {
      window.scrollTo({ top: 0, left: 0, behavior: motion });
    }
  });
}
root.addEventListener("click", event => {
  const categoryLink = event.target.closest("a[data-category]");
  if (categoryLink) state.pendingCategory = categoryLink.dataset.category;
  const navLink = event.target.closest('a[href="#/"], a[href="#/shopper"]');
  if (!navLink || state.page !== "home") return;
  const targetHash = navLink.getAttribute("href");
  if (location.hash === targetHash || (location.hash === "" && targetHash === "#/")) {
    event.preventDefault();
    if (state.mobileMenu) setMobileMenu(false);
    const options = { behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" };
    if (targetHash === "#/shopper") document.getElementById("personal-shopper")?.scrollIntoView({ ...options, block: "start" });
    else window.scrollTo({ top: 0, ...options });
  }
});
root.addEventListener("keydown", event => {
  if (!event.target.closest(".lookbook-viewport")) return;
  if (event.key === "ArrowLeft") { event.preventDefault(); moveLookbook(-1); }
  if (event.key === "ArrowRight") { event.preventDefault(); moveLookbook(1); }
});
window.addEventListener("hashchange", route);
window.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    if (state.productId) { state.productId = null; render(); }
    else if (state.cartOpen) { state.cartOpen = false; render(); }
    else if (state.mobileMenu) setMobileMenu(false);
  }
});

async function bootEverywearStore() {
  // Existing editorial assets remain as a resilient fallback if Supabase
  // cannot be reached. Only this isolated preview fetches live store data.
  if (hasEverywearApi) {
    try {
      const [products,media] = await Promise.all([listPublicProducts(),listHome()]);
      // On a successful response Supabase is the sole catalog source.
      // Empty active results must remain empty (not resurrect archived demos).
      PRODUCTS.splice(0, PRODUCTS.length,
        ...products.map(row=>({...publicProduct(row),id:row.slug||row.id})));
      const categories=[...new Set(PRODUCTS.flatMap(p=>p.categories||[p.category]).filter(Boolean))];
      CATEGORIES.splice(0,CATEGORIES.length,"Todos",...categories);
      const tv = media.filter(m => m.section === "tv").sort((a,b)=>a.sort_order-b.sort_order);
      if(tv.length)TV_PHOTOS.splice(0,TV_PHOTOS.length,...tv.map(m=>({src:m.src,alt:m.alt||""})));
      const lookbook = media.filter(m => m.section === "lookbook").sort((a,b)=>a.sort_order-b.sort_order);
      if(lookbook.length)LOOKBOOK_SLIDES.splice(0,LOOKBOOK_SLIDES.length,
        ...lookbook.map((m,i)=>({image:m.src,alt:m.alt||"",label:"Editorial "+String(i+1).padStart(2,"0") })));
    } catch (error) {
      console.warn("Everywear preview: using original gallery while Supabase is unavailable:",error.message);
    }
  }
  state.cart = getSavedCart();
  route();
}
document.documentElement.classList.add("has-scroll-reveal");
bootEverywearStore().catch(error=>{console.warn("Everywear preview bootstrap:",error);route();});

