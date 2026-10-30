import { PRODUCTS, CATEGORIES, MEDIA, money } from "./data.js";
import "./styles.css";

const root = document.getElementById("app");
const PHONE = String(import.meta.env.VITE_WHATSAPP_NUMBER || "").replace(/\D/g, "");
const CART_KEY = "everywear_selection_v1";
const instagram = "https://www.instagram.com/everywear.ve/";

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
  formFeedback: "", notice: ""
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
const waLink = message => "https://wa.me/" + PHONE + "?text=" + encodeURIComponent(message);
const persist = () => localStorage.setItem(CART_KEY, JSON.stringify(state.cart));
const productOf = id => PRODUCTS.find(p => p.id === id);

function header() {
  return `
    <div class="announce"><span>YOUR ACCESS TO EUROPEAN FASHION</span><span class="announce-star">✳</span><span>CURATED WITH LOVE</span></div>
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
          <button class="icon-button mobile-menu-button" data-action="toggle-menu" aria-label="Abrir menú" aria-expanded="${state.mobileMenu}">${icon(state.mobileMenu ? "close" : "menu", 25)}</button>
        </div>
      </div>
      ${state.mobileMenu ? `<nav class="mobile-nav" aria-label="Menú móvil"><a href="#/" data-action="close-menu">Inicio</a><a href="#/catalogo" data-action="close-menu">Catálogo</a><a href="#/shopper" data-action="close-menu">Personal shopper</a><a href="${instagram}" target="_blank" rel="noopener noreferrer">Instagram ${icon("arrowup",16)}</a></nav>` : ""}
    </header>`;
}

const actionLink = (label, href, extra = "") => `<a class="button button-dark ${extra}" href="${href}"><span>${label}</span>${icon("arrowup", 18)}</a>`;

function categoryTiles() {
  const tiles = [
    ["Tops", PRODUCTS[0].image, "Tops & camisas"],
    ["Conjuntos", PRODUCTS[1].image, "Conjuntos"],
    ["Vestidos", PRODUCTS[3].image, "Vestidos"],
    ["Accesorios", PRODUCTS[7].image, "Accesorios"]
  ];
  return `<section class="section categories-section" aria-labelledby="category-title">
    <div class="section-topline"><span>01 / EXPLORA</span><span>PIEZAS PARA CADA VERSIÓN DE TI</span></div>
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

function home() {
  return `
    <main>
      <section class="hero">
        <div class="hero-copy">
          <div class="hero-kicker"><span class="line"></span> EDICIÓN 01 / EUROPA</div>
          <h1>Vístete de<br/><em>lo que eres.</em></h1>
          <p class="hero-subtitle">Tu acceso a la moda europea. Una selección de piezas para expresarte, reinventarte y hacer cada look tuyo.</p>
          <div class="hero-buttons">${actionLink("Descubrir colección", "#/catalogo")}<a href="#/shopper" class="hero-secondary">Personal shopper ${icon("arrow",17)}</a></div>
          <div class="hero-bottom"><span>STYLE IS PERSONAL.</span><span>EVERY DAY. EVERY WEAR.</span></div>
        </div>
        <div class="hero-photo">
          <img src="${MEDIA.hero}" alt="Editorial de moda femenina, inspiración Everywear" fetchpriority="high" />
          <div class="hero-photo-chip"><span class="chip-star">✳</span><span>CURATED<br/>EUROPEAN STYLE</span></div>
          <div class="hero-photo-caption">THE NEW EVERYDAY / 2026</div>
        </div>
        <div class="hero-vertical">EVERYWEAR — EVERY OCCASION</div>
      </section>
      <div class="marquee" aria-label="Everywear, estilo para cada día"><div class="marquee-inner">${Array(3).fill(`<span>EVERY DAY</span><span class="marquee-flower">✳</span><span>EVERY STYLE</span><span class="marquee-flower">✳</span><span>EVERY WEAR</span><span class="marquee-flower">✳</span>`).join("")}</div></div>
      ${categoryTiles()}
      <section class="section featured-section">
        <div class="section-topline"><span>02 / THE EDIT</span><span>UNA SELECCIÓN, MIL POSIBILIDADES</span></div>
        <div class="section-heading"><div><p class="eyebrow">The pieces we love</p><h2>Favoritos de <em>Everywear.</em></h2></div><a href="#/catalogo" class="text-link">Explorar la colección ${icon("arrowup",17)}</a></div>
        <div class="products-grid featured-grid">${PRODUCTS.slice(0,4).map(productCard).join("")}</div>
        <p class="demo-note">Selección ilustrativa. Fotografías y precios sujetos a confirmación.</p>
      </section>
      <section class="editorial">
        <div class="editorial-photo"><img src="${MEDIA.story}" alt="Fotografía editorial de estilo y moda" loading="lazy" /><span class="editorial-photo-index">EVERYWEAR / 001</span></div>
        <div class="editorial-copy">
          <span class="editorial-stamp">E<span>✳</span>W</span>
          <p class="eyebrow">A little more about us</p>
          <h2>Más que ropa.<br/><em>Una forma de ser.</em></h2>
          <p>Creemos en la libertad de vestirte como te sientes. En los detalles que hacen diferente un outfit y en esas prendas que te acompañan una y otra vez.</p>
          <p class="editorial-signature">Make it yours.</p>
          <a class="text-link editorial-link" href="#/catalogo">Conoce nuestra selección ${icon("arrowup",17)}</a>
        </div>
      </section>
      <section class="personal-shopper section" id="personal-shopper">
        <div class="shopper-intro">
          <p class="eyebrow">03 / JUST FOR YOU</p>
          <div class="shopper-star">✳</div>
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
            <p class="form-foot">Te llevaremos a WhatsApp con tu solicitud lista para enviar. ${PHONE ? "" : "El número de la tienda aún está por configurar."}</p>
          </form>
        </div>
      </section>
      <section class="closing-banner"><div><span>THE EVERYWEAR CLUB</span><h2>Wear it. <em>Own it.</em></h2><p>La mejor versión de tu estilo es la tuya.</p></div>${actionLink("Shop the edit", "#/catalogo", "button-light")}</section>
    </main>
  `;
}

function filteredProducts() {
  let list = PRODUCTS.filter(p => (state.category === "Todos" || p.category === state.category) && (p.name + " " + p.category).toLowerCase().includes(state.search.toLowerCase().trim()));
  if (state.sort === "low") list.sort((a,b) => a.price - b.price);
  if (state.sort === "high") list.sort((a,b) => b.price - a.price);
  if (state.sort === "name") list.sort((a,b) => a.name.localeCompare(b.name, "es"));
  return list;
}

function catalogGrid() {
  const items = filteredProducts();
  return items.length ? items.map(productCard).join("") : `<div class="empty-products"><span>✳</span><h3>No encontramos coincidencias.</h3><p>Prueba con otra búsqueda o explora todas las categorías.</p><button data-action="reset-filters" class="text-link">Ver todos los productos ${icon("arrow",17)}</button></div>`;
}

function catalog() {
  return `<main class="catalog-page">
    <section class="catalog-intro">
      <div class="catalog-backdrop">everywear.</div>
      <p class="eyebrow">THE EVERYWEAR EDIT / EDICIÓN 01</p>
      <h1>Tu próximo <em>favorito.</em></h1>
      <p>Piezas especiales para todos los días. Explora, elige y arma una selección tan única como tú.</p>
      <div class="catalog-corner">CURATED WITH INTENTION ✳</div>
    </section>
    <section class="section catalog-content">
      <div class="catalog-toolbar"><div><span class="eyebrow">EXPLORE THE EDIT</span><h2>La colección <span id="result-count">(${filteredProducts().length})</span></h2></div>
        <div class="catalog-controls"><label class="searchbox" aria-label="Buscar productos">${icon("search",18)}<input id="catalog-search" type="search" value="${htmlSafe(state.search)}" placeholder="Buscar una prenda..." /></label><label class="sortbox"><span>Ordenar:</span><select id="sort-select" aria-label="Ordenar productos"><option value="featured" ${state.sort === "featured" ? "selected" : ""}>Destacados</option><option value="low" ${state.sort === "low" ? "selected" : ""}>Menor precio</option><option value="high" ${state.sort === "high" ? "selected" : ""}>Mayor precio</option><option value="name" ${state.sort === "name" ? "selected" : ""}>Nombre A-Z</option></select></label></div>
      </div>
      <div class="filter-scroll"><div class="filter-chips" role="group" aria-label="Filtrar por categoría">${CATEGORIES.map(c => `<button data-action="category" data-category="${c}" class="filter-chip ${state.category === c ? "selected" : ""}" aria-pressed="${state.category === c}">${c}</button>`).join("")}</div></div>
      <div class="catalog-notice">CATÁLOGO DE DEMOSTRACIÓN · Los artículos, las imágenes y los precios se reemplazarán por los productos reales.</div>
      <div id="catalog-grid" class="products-grid catalog-grid">${catalogGrid()}</div>
      <div class="catalog-end"><span>✳</span><p>You've seen the whole edit.</p><h3>¿No encontraste lo que buscas?</h3><a href="#/shopper" class="text-link">Pregúntale a nuestro personal shopper ${icon("arrowup",17)}</a></div>
    </section>
  </main>`;
}

function footer() {
  return `<footer class="footer">
    <div class="footer-main">
      <div class="footer-about"><a href="#/" class="footer-logo">${logo()}</a><p>Tu acceso a la moda europea. Seleccionamos piezas para que las hagas completamente tuyas.</p><a class="footer-social" href="${instagram}" target="_blank" rel="noopener noreferrer">${icon("insta",19)} @everywear.ve</a></div>
      <div class="footer-links"><span>EXPLORA</span><a href="#/">Inicio</a><a href="#/catalogo">Catálogo</a><a href="#/shopper">Personal shopper</a></div>
      <div class="footer-links"><span>HABLEMOS</span><a href="${instagram}" target="_blank" rel="noopener noreferrer">Instagram ${icon("arrowup",14)}</a><a href="${waLink("Hola Everywear, me gustaría recibir información sobre sus productos.")}" target="_blank" rel="noopener noreferrer">WhatsApp ${icon("arrowup",14)}</a><button data-action="open-cart">Tu selección</button></div>
      <div class="footer-note"><span>EVERY DAY, EVERY WEAR.</span><div class="footer-flower">✳</div><p>Curated for you.<br/>Worn your way.</p></div>
    </div>
    <div class="footer-bottom"><span>© ${new Date().getFullYear()} EVERYWEAR. ALL RIGHTS RESERVED.</span><span>MADE TO BE YOURS ✳</span><span>YOUR ACCESS TO EUROPEAN FASHION</span></div>
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
      <div class="drawer-checkout"><div class="subtotal-line"><span>Subtotal</span><strong>${money(cartTotal())}</strong></div><p>Los precios son de demostración. En WhatsApp confirmaremos el total, la disponibilidad y la entrega.</p><button data-action="checkout" class="button button-dark checkout-button"><span>Finalizar por WhatsApp</span>${icon("whatsapp",20)}</button><a href="#/catalogo" data-action="close-cart" class="keep-shopping">Seguir explorando ${icon("arrow",16)}</a></div>`
      : `<div class="empty-cart"><div class="empty-cart-icon">${icon("bag",42)}</div><h3>Tu selección está esperando.</h3><p>Agrega tus piezas favoritas y prepara tu pedido en un solo lugar.</p><a href="#/catalogo" data-action="close-cart" class="button button-dark"><span>Explorar catálogo</span>${icon("arrowup",17)}</a></div>`}
    </aside></div>`;
}

function render() {
  root.innerHTML = `${header()}${state.page === "catalogo" ? catalog() : home()}${footer()}${floatingSelection()}${modal()}${basket()}`;
  document.body.classList.toggle("overlay-open", Boolean(state.cartOpen || state.productId));
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
  if (a === "toggle-menu") { state.mobileMenu = !state.mobileMenu; render(); }
  if (a === "close-menu") { state.mobileMenu = false; }
  if (a === "open-cart") { state.cartOpen = true; state.mobileMenu = false; state.productId = null; render(); }
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

function route() {
  const hash = location.hash;
  state.page = hash.startsWith("#/catalogo") ? "catalogo" : "home";
  state.cartOpen = false; state.productId = null; state.mobileMenu = false;
  if (hash.startsWith("#/catalogo") && state.pendingCategory) {
    state.category = state.pendingCategory; state.pendingCategory = null;
  }
  render();
  if (hash.startsWith("#/shopper")) {
    requestAnimationFrame(() => document.getElementById("personal-shopper")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  } else window.scrollTo({ top: 0, left: 0, behavior: "instant" });
}
root.addEventListener("click", event => {
  const categoryLink = event.target.closest("a[data-category]");
  if (categoryLink) state.pendingCategory = categoryLink.dataset.category;
});
window.addEventListener("hashchange", route);
window.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    if (state.productId) { state.productId = null; render(); }
    else if (state.cartOpen) { state.cartOpen = false; render(); }
    else if (state.mobileMenu) { state.mobileMenu = false; render(); }
  }
});
route();
