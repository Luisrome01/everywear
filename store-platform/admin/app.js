import * as api from "../client.js";

// All commercial data is persisted in Supabase PERSONAL; only session tokens live in localStorage.
const WORKSPACE = document.getElementById("workspace");
const TOAST = document.getElementById("toast");
const TITLES = { dashboard: "Resumen general", products: "Catálogo de productos", categories:"Categorías", home: "Contenido del Home", settings: "Mi cuenta" };
const deepCopy = value => JSON.parse(JSON.stringify(value));
const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[c]));
const uid = () => crypto.randomUUID();
const money = value => new Intl.NumberFormat("en-US", {style:"currency",currency:"USD"}).format(Number(value)||0);
const slugify = name => String(name).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()
  .replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,160) || "producto";
const safeImg = src => {
  const value=String(src||"");
  return /^https:\/\//i.test(value) || value.startsWith("/") && !value.startsWith("//")
    ? esc(value) : "";
};
const blankProduct = () => ({
  id:uid(),slug:"",name:"",category:"",categoryIds:[],description:"",price:0,status:"draft",
  featured:false,sortOrder:0,tag:"",images:[],variants:[]
});
const blankMedia = () => ({id:uid(),src:"",alt:"",enabled:true,sortOrder:0});
let db = {products:[],categories:[],home:{tv:[],lookbook:[],hero:[]},settings:{storeName:"Everywear",currency:"USD"}};
let authorizedEmail = "";
async function loadData() {
  const [products,media,categories]=await Promise.all([api.listProducts(),api.listHome(true),api.listCategories(true)]);
  db.categories=categories;
  db.products=products;
  db.home={tv:[],lookbook:[],hero:[]};
  media.forEach(item=>{if(db.home[item.section])db.home[item.section].push({
    id:item.id,src:item.src,alt:item.alt,enabled:item.enabled,sortOrder:item.sort_order
  });});
}
let view = "dashboard", query = "", editing = false, draft = null, homeTab = "tv", homeDraft = [];
let productStatusFilter="all",productCategoryFilter="all",productSort="manual";
let selectedCategoryId=null,categorySearch="",pendingCategorySelection=null;
function notify(msg) {
  TOAST.textContent = msg; TOAST.classList.add("show");
  clearTimeout(notify.timer); notify.timer = setTimeout(()=>TOAST.classList.remove("show"),3500);
}
function imgMarkup(src, alt="", css="thumb") {
  return '<img class="'+css+'" alt="'+esc(alt)+'" src="'+(safeImg(src)||"/brand/bag.webp")+'" loading="lazy">';
}
function header(title, description, action="") {
  return '<div class="page-heading"><div><p class="eyebrow">Everywear / Administración</p><h1>'+title+
    '</h1><p class="muted">'+description+'</p></div>'+action+'</div>';
}
function card(label,num,note) {
  return '<div class="card"><div class="muted">'+label+'</div><div class="number tag-number">'+num+
    '</div><div class="muted">'+note+'</div></div>';
}
function renderDashboard() {
  const active=db.products.filter(p=>p.status==="active").length;
  const variants=db.products.flatMap(p=>p.variants||[]);
  const unknown=variants.filter(v=>v.stock===null||v.stock===undefined).length;
  const stock=variants.reduce((n,v)=>n+(Number(v.stock)||0),0);
  return header("Tu tienda, en un solo lugar","Todo lo que necesitas para cuidar cada detalle de tu colección.")+
    '<div class="cards">'+card("Productos",db.products.length,"Artículos de tu catálogo")+
    card("Publicados",active,"Disponibles en la tienda")+
    card("Unidades registradas",stock,"Inventario disponible")+
    card("Tallas por revisar",unknown,"Sin cantidad asignada")+'</div>'+
    '<div class="layout-two"><section class="panel"><div class="panel-head"><h2>Tu colección</h2></div>'+
    '<p class="muted">Organiza tus prendas, actualiza sus precios y prepara nuevas colecciones.</p>'+
    '<p class="muted">Los productos en borrador permanecen ocultos hasta que decidas publicarlos.</p>'+
    '<button class="btn" data-action="go-products">Ver productos</button></section>'+
    '<section class="panel"><div class="panel-head"><h2>Tu estilo, siempre al día</h2></div>'+
    '<p class="muted">Personaliza las fotografías de la portada, el lookbook y los televisores.</p>'+
    '<p class="muted">Cada cambio se reflejará en la tienda al actualizarla.</p>'+
    '<button class="btn btn-outline" data-action="go-home">Editar imágenes</button></section></div>';
}
function filteredProducts(){
  const q=query.trim().toLocaleLowerCase("es");
  let products=db.products.filter(p=>{
    const matchesText=[p.name,...(p.categories||[p.category])].join(" ").toLocaleLowerCase("es").includes(q);
    const matchesStatus=productStatusFilter==="all"||p.status===productStatusFilter;
    const matchesCategory=productCategoryFilter==="all"||(p.categoryIds||[]).includes(productCategoryFilter);
    return matchesText&&matchesStatus&&matchesCategory;
  });
  const ordered=products.slice();
  if(productSort==="price-asc")ordered.sort((a,b)=>a.price-b.price);
  if(productSort==="price-desc")ordered.sort((a,b)=>b.price-a.price);
  if(productSort==="name-asc")ordered.sort((a,b)=>a.name.localeCompare(b.name,"es"));
  if(productSort==="name-desc")ordered.sort((a,b)=>b.name.localeCompare(a.name,"es"));
  if(productSort==="stock-asc"||productSort==="stock-desc"){
    const sum=p=>(p.variants||[]).reduce((n,v)=>n+(Number(v.stock)||0),0);
    ordered.sort((a,b)=>productSort==="stock-asc"?sum(a)-sum(b):sum(b)-sum(a));
  }
  return ordered;
}
function productRows(){
  const products=filteredProducts(),allowOrder=productSort==="manual"&&productStatusFilter==="all"&&productCategoryFilter==="all"&&!query.trim();
  if(!products.length)return '<tr><td colspan="6"><div class="empty">No hay productos para estos filtros.</div></td></tr>';
  return products.map(p=>{
    const known=(p.variants||[]).filter(v=>v.stock!==null&&v.stock!==undefined&&v.stock!=="");
    const qty=known.reduce((n,v)=>n+Number(v.stock||0),0);
    const stockLabel=known.length===(p.variants||[]).length?qty+" uds.":qty+" uds. + pendientes";
    const index=db.products.findIndex(item=>item.id===p.id);
    return '<tr class="product-clickable" tabindex="0" role="button" aria-label="Editar '+esc(p.name)+'" data-product-id="'+esc(p.id)+'">'+
      '<td><div class="item-with-photo">'+imgMarkup(p.images?.[0]?.src,p.name)+
      '<div><div class="product-title">'+esc(p.name)+'</div><div class="muted">'+esc((p.categories||[p.category]).join(" · "))+'</div></div></div></td>'+
      '<td>'+money(p.price)+'</td><td><span class="pill '+esc(p.status)+'">'+
      esc(({active:"Activo",draft:"Borrador",archived:"Archivado"})[p.status]||p.status)+'</span></td>'+
      '<td>'+esc((p.variants||[]).length)+'</td><td>'+esc(stockLabel)+'</td>'+
      '<td><div class="actions"><div class="sort-arrows">'+
      '<button type="button" class="btn btn-outline btn-sm" data-action="move-product" data-id="'+esc(p.id)+'" data-direction="-1" '+(!allowOrder||index===0?"disabled":"")+' title="Subir producto" aria-label="Subir producto">↑</button>'+
      '<button type="button" class="btn btn-outline btn-sm" data-action="move-product" data-id="'+esc(p.id)+'" data-direction="1" '+(!allowOrder||index===db.products.length-1?"disabled":"")+' title="Bajar producto" aria-label="Bajar producto">↓</button></div>'+
      '<button class="btn btn-outline btn-sm" data-action="edit-product" data-id="'+esc(p.id)+'">Editar</button>'+
      '<button class="btn btn-outline btn-sm" data-action="archive-product" data-id="'+esc(p.id)+'">Archivar</button>'+
      '<button class="btn btn-danger btn-sm" data-action="delete-permanent" data-id="'+esc(p.id)+'">Eliminar</button></div></td></tr>';
  }).join("");
}
function renderProducts(){
  if(editing)return renderProductEditor();
  return header("Catálogo de productos","Toca una fila para editar una prenda o usa los filtros para encontrarla.",
    '<button class="btn" data-action="new-product">+ Nuevo producto</button>')+
    '<section class="panel"><div class="product-filters">'+
    '<label class="filter-field filter-search">Buscar<input id="search-products" type="search" placeholder="Nombre o categoría…" value="'+esc(query)+'"></label>'+
    '<label class="filter-field">Estado<select id="filter-status">'+
    [['all','Todos'],['active','Activos'],['draft','Borradores'],['archived','Archivados']].map(([value,label])=>
      '<option value="'+value+'" '+(productStatusFilter===value?'selected':'')+'>'+label+'</option>').join("")+'</select></label>'+
    '<label class="filter-field">Categoría<select id="filter-category"><option value="all">Todas</option>'+
    db.categories.map(c=>'<option value="'+esc(c.id)+'" '+(productCategoryFilter===c.id?'selected':'')+'>'+esc(c.name)+'</option>').join("")+'</select></label>'+
    '<label class="filter-field">Ordenar<select id="filter-sort">'+
    [['manual','Orden de la tienda'],['price-asc','Menor precio'],['price-desc','Mayor precio'],['name-asc','Nombre A–Z'],['name-desc','Nombre Z–A'],['stock-asc','Menos existencias'],['stock-desc','Más existencias']].map(([value,label])=>
      '<option value="'+value+'" '+(productSort===value?'selected':'')+'>'+label+'</option>').join("")+'</select></label>'+
    '<button type="button" class="btn btn-outline btn-sm filter-reset" data-action="clear-filters">Limpiar filtros</button></div>'+
    '<div class="result-counter" id="product-count">'+filteredProducts().length+' de '+db.products.length+' productos</div>'+
    '<div class="table-wrap"><table><thead><tr><th>Artículo</th><th>Precio</th><th>Estado</th><th>Variantes</th><th>Inventario</th><th>Orden y acciones</th></tr></thead>'+
    '<tbody id="product-rows">'+productRows()+'</tbody></table></div>'+
    '<p class="help">Las flechas de orden se habilitan cuando no hay filtros aplicados y está seleccionado “Orden de la tienda”.</p></section>';
}
function categoryProducts(categoryId){
  return db.products.filter(p=>(p.categoryIds||[]).includes(categoryId));
}
function renderCategories(){
  const current=db.categories.find(c=>c.id===selectedCategoryId);
  if(current){
    const q=categorySearch.trim().toLocaleLowerCase("es");
    const matches=db.products.filter(p=>p.name.toLocaleLowerCase("es").includes(q));
    return header("Editar categoría","Cambia el nombre sin perder los productos que ya pertenecen a ella.",
      '<button class="btn btn-outline" data-action="back-categories">← Todas las categorías</button>')+
      '<section class="panel"><form id="rename-category-form" class="category-create">'+
      '<label>Nombre de la categoría<input name="name" required minlength="2" maxlength="80" value="'+esc(current.name)+'"></label>'+
      '<button type="submit" class="btn">Guardar nombre</button></form>'+
      '<div class="section-bar"><h3>Productos de esta categoría</h3><span class="muted">'+categoryProducts(current.id).length+' asociados</span></div>'+
      '<p class="help">Marca los productos que quieras agregar. Desmarca los que ya no deban pertenecer a esta categoría.</p>'+
      '<label class="filter-field">Buscar producto<input type="search" id="category-product-search" value="'+esc(categorySearch)+'" placeholder="Buscar en la colección…"></label>'+
      '<form id="category-products-form"><div class="category-products-list">'+matches.map(p=>
        '<label class="category-product-option"><input type="checkbox" name="productIds" value="'+esc(p.id)+'" '+((pendingCategorySelection?pendingCategorySelection.has(p.id):(p.categoryIds||[]).includes(current.id))?'checked':'')+'>'+
        imgMarkup(p.images?.[0]?.src,p.name,"category-mini-photo")+
        '<span><strong>'+esc(p.name)+'</strong><small>'+esc(p.status==="active"?"Activo":p.status==="archived"?"Archivado":"Borrador")+' · '+money(p.price)+'</small></span></label>').join("")+
      (matches.length?'':'<div class="empty">No se encontraron productos.</div>')+
      '</div><div class="footer-actions"><button type="submit" class="btn">Guardar productos asociados</button></div></form>'+
      '<div class="category-danger"><span>¿Ya no necesitas esta categoría? Solo podrás eliminarla si ningún producto queda sin categoría.</span>'+
      '<button type="button" class="btn btn-danger" data-action="remove-category" data-id="'+esc(current.id)+'">Eliminar categoría</button></div></section>';
  }
  return header("Categorías","Gestiona tus colecciones y los productos asociados a cada una.")+
    '<section class="panel"><form id="category-form" class="category-create">'+
    '<label>Nombre de la categoría<input name="name" maxlength="80" minlength="2" required placeholder="Ej. Jeans"></label>'+
    '<button class="btn" type="submit">+ Crear categoría</button></form>'+
    '<div class="table-wrap"><table class="category-table"><thead><tr><th>Categoría</th><th>Productos asociados</th><th>Acción</th></tr></thead>'+
    '<tbody>'+db.categories.map(c=>'<tr class="category-clickable" data-category-id="'+esc(c.id)+'" tabindex="0" role="button" aria-label="Abrir categoría '+esc(c.name)+'">'+
    '<td><strong>'+esc(c.name)+'</strong></td><td>'+categoryProducts(c.id).length+' productos</td>'+
    '<td><button type="button" class="btn btn-outline btn-sm" data-action="open-category" data-id="'+esc(c.id)+'">Ver y editar</button></td></tr>').join("")+
    '</tbody></table></div></section>';
}

function colorGroups() {
  const groups=[];
  draft.variants.forEach((v,i)=>{
    let g=groups.find(item=>item.name===v.color);
    if(!g){g={name:v.color,hex:v.hex||"#777777",indices:[]};groups.push(g);}
    g.indices.push(i);
  });
  return groups.map((g,n)=>
    '<div class="color-group" data-color-group data-members="'+g.indices.join(",")+'">'+
    '<div class="color-heading"><span class="color-count">Color '+(n+1)+'</span>'+
    '<label>Nombre<input data-color-name maxlength="80" value="'+esc(g.name)+'" placeholder="Ej. Crema"></label>'+
    '<label>Color visual<input type="color" data-color-hex value="'+esc(/^#[a-fA-F0-9]{6}$/.test(g.hex)?g.hex:"#777777")+'"></label>'+
    '<button type="button" class="btn btn-danger btn-sm" data-action="remove-color" data-index="'+g.indices[0]+'">Quitar color</button></div>'+
    '<div class="size-head">Talla <span>Existencias</span></div>'+
    g.indices.map(i=>{
      const v=draft.variants[i],stock=v.stock===null||v.stock===undefined?"":v.stock;
      return '<div class="size-row" data-variant-row data-index="'+i+'">'+
      '<input data-v-field="size" aria-label="Talla" placeholder="Ej. S, M, L" value="'+esc(v.size)+'">'+
      '<input data-v-field="stock" type="number" min="0" step="1" aria-label="Existencias" placeholder="Sin definir" value="'+esc(stock)+'">'+
      '<button type="button" class="btn btn-danger btn-sm" data-action="remove-variant" data-index="'+i+'" aria-label="Quitar talla">×</button></div>';
    }).join("")+
    '<button type="button" class="btn btn-outline btn-sm" data-action="add-size" data-index="'+g.indices[0]+'">+ Agregar talla</button></div>'
  ).join("");
}
function imageRow(image,i) {
  return '<div class="photo-card" data-image-row data-index="'+i+'">'+
    imgMarkup(image.src,image.alt||draft.name,"photo-preview")+
    '<div class="photo-meta"><strong>Foto '+(i+1)+(i===0?' · Principal':'')+'</strong>'+
    '<label>Descripción<input data-image-field="alt" maxlength="160" value="'+esc(image.alt||"")+'" placeholder="Descripción opcional"></label></div>'+
    '<div class="photo-buttons"><button type="button" class="btn btn-outline btn-sm" data-action="move-image" data-index="'+i+'" data-direction="-1" '+(i===0?'disabled':'')+' aria-label="Mover foto hacia arriba">↑</button>'+
    '<button type="button" class="btn btn-outline btn-sm" data-action="move-image" data-index="'+i+'" data-direction="1" '+(i===draft.images.length-1?'disabled':'')+' aria-label="Mover foto hacia abajo">↓</button>'+
    '<button type="button" class="btn btn-danger btn-sm" data-action="remove-image" data-index="'+i+'">Quitar</button></div></div>';
}
function renderProductEditor(){
  const selected=new Set(draft.categoryIds||[]);
  return header(draft.name?"Editar "+esc(draft.name):"Nuevo producto",
    "Personaliza los detalles de tu prenda y elige cuándo mostrarla en la tienda.",
    '<button class="btn btn-outline" data-action="cancel-product">← Regresar</button>')+
    '<form id="product-form" class="panel"><div class="form-grid">'+
    '<label>Nombre del producto<input name="name" maxlength="180" required value="'+esc(draft.name)+'"></label>'+
    '<label>Precio (USD)<input type="number" name="price" min="0" step=".01" required value="'+esc(draft.price)+'"></label>'+
    '<div class="wide"><strong class="form-caption">Categorías</strong><p class="help">Puedes elegir varias para la misma prenda.</p>'+
    '<div class="category-choices">'+db.categories.map(c=>
      '<label class="category-choice"><input type="checkbox" name="categoryIds" value="'+esc(c.id)+'" '+(selected.has(c.id)?'checked':'')+'><span>'+esc(c.name)+'</span></label>').join("")+
    '</div><button type="button" class="btn btn-outline btn-sm category-shortcut" data-action="go-categories">Administrar categorías</button></div>'+
    '<label>Estado<select name="status"><option value="draft" '+(draft.status==="draft"?"selected":"")+'>Borrador</option>'+
    '<option value="active" '+(draft.status==="active"?"selected":"")+'>Activo</option>'+
    '<option value="archived" '+(draft.status==="archived"?"selected":"")+'>Archivado</option></select></label>'+
    '<label>Etiqueta (opcional)<input name="tag" maxlength="40" value="'+esc(draft.tag)+'" placeholder="Nuevo, Favorito…"></label>'+
    '<label class="wide">Descripción<textarea name="description" maxlength="2500">'+esc(draft.description)+'</textarea></label>'+
    '<div class="wide checkline"><input type="checkbox" id="featured" name="featured" '+(draft.featured?"checked":"")+'><label for="featured">Mostrar como producto destacado</label></div></div>'+
    '<div class="section-bar"><h3>Colores y tallas</h3><button type="button" class="btn btn-outline btn-sm" data-action="add-color">+ Agregar color</button></div>'+
    '<p class="help">Crea un color una sola vez y agrega debajo las tallas con sus cantidades.</p>'+
    '<div id="variant-list">'+(draft.variants.length?colorGroups():'<div class="empty">Aún no hay colores. Agrega uno para empezar.</div>')+'</div>'+
    '<div class="section-bar"><h3>Fotografías del producto</h3></div>'+
    '<p class="help">Selecciona una o varias fotos desde tu dispositivo. La primera será la imagen principal; puedes cambiar el orden con las flechas.</p>'+
    '<label class="upload-area">+ Seleccionar fotografías<input type="file" id="product-photo-file" multiple accept="image/png,image/jpeg,image/webp,image/avif"></label>'+
    '<div id="image-list" class="photo-list">'+(draft.images.length?draft.images.map(imageRow).join(""):'<div class="empty">Todavía no has agregado fotografías.</div>')+'</div>'+
    '<div class="footer-actions"><button class="btn btn-outline" type="button" data-action="cancel-product">Cancelar</button>'+
    '<button class="btn" type="submit">Guardar producto</button></div></form>';
}
function renderHome() {
  const labels={tv:"Tres televisores",lookbook:"Lookbook editorial",hero:"Portada"};
  return header("Fotografías de la tienda","Elige las imágenes que representan tu colección.")+
    '<div class="home-tabs">'+Object.keys(labels).map(k=>
      '<button type="button" class="'+(homeTab===k?"active":"")+'" data-action="home-tab" data-section="'+k+'">'+labels[k]+'</button>'
    ).join("")+'</div><section class="panel"><div class="panel-head"><div><h2>'+labels[homeTab]+'</h2>'+
    '<p class="muted">Ordena las fotografías y decide cuáles quieres mostrar.</p></div></div>'+
    '<label class="upload-area">+ Seleccionar fotografías<input type="file" id="home-photo-file" multiple accept="image/jpeg,image/png,image/webp,image/avif"></label>'+
    '<div id="home-list" class="photo-list">'+(homeDraft.length?homeDraft.map((item,i)=>
      '<div class="photo-card" data-home-row data-index="'+i+'">'+imgMarkup(item.src,item.alt,"photo-preview")+
      '<div class="photo-meta"><strong>Foto '+(i+1)+'</strong>'+
      '<label>Descripción<input data-home-field="alt" value="'+esc(item.alt)+'" placeholder="Descripción opcional"></label>'+
      '<label class="checkline"><input data-home-field="enabled" type="checkbox" '+(item.enabled?"checked":"")+'> Visible en la tienda</label></div>'+
      '<div class="photo-buttons"><button type="button" class="btn btn-outline btn-sm" data-action="move-home" data-index="'+i+'" data-direction="-1" '+(i===0?'disabled':'')+'>↑</button>'+
      '<button type="button" class="btn btn-outline btn-sm" data-action="move-home" data-index="'+i+'" data-direction="1" '+(i===homeDraft.length-1?'disabled':'')+'>↓</button>'+
      '<button type="button" class="btn btn-danger btn-sm" data-action="remove-home" data-index="'+i+'">Quitar</button></div></div>').join("")
      :'<div class="empty">Todavía no hay fotografías en esta sección.</div>')+'</div>'+
    '<div class="footer-actions"><button class="btn" data-action="save-home">Guardar cambios</button></div></section>';
}
function renderSettings(){
  return header("Mi cuenta","Gestiona tu sesión y conserva una copia de tu catálogo.")+
    '<section class="panel"><h2>Datos de tu cuenta</h2>'+
    '<p class="muted">Sesión iniciada como: <strong>'+esc(authorizedEmail)+'</strong></p>'+
    '<p class="muted">Recuerda que enviar un pedido por WhatsApp no descuenta las existencias. Puedes actualizarlas desde cada producto.</p>'+
    '<button class="btn btn-outline" data-action="export-data">Descargar copia del catálogo</button> '+
    '<button class="btn btn-danger" data-action="sign-out">Cerrar sesión</button></section>';
}

function render() {
  document.getElementById("subtitle").textContent = TITLES[view];
  document.querySelectorAll("[data-view]").forEach(el=>el.classList.toggle("active",el.dataset.view===view));
  WORKSPACE.innerHTML = view==="dashboard" ? renderDashboard() :
    view==="products" ? renderProducts() : view==="categories"?renderCategories(): view==="home" ? renderHome() : renderSettings();
}
function go(next) {
  view = next; editing=false;draft=null;
  if(next==="categories"){selectedCategoryId=null;categorySearch="";pendingCategorySelection=null;}
  if (view==="home") homeDraft = deepCopy(db.home[homeTab]);
  render(); window.scrollTo({top:0,behavior:"instant"});
}
function startEdit(id) {
  draft = id ? deepCopy(db.products.find(p=>p.id===id)) : blankProduct();
  if(draft && !(draft.categoryIds||[]).length){
    draft.categoryIds=db.categories.filter(c=>c.name===draft.category).map(c=>c.id);
  }
  if (!draft) return notify("Producto no encontrado");
  editing=true; view="products";render();window.scrollTo(0,0);
}
function collectProduct(){
  const form=document.getElementById("product-form");if(!form||!draft)return;
  const fields=new FormData(form);
  draft.name=String(fields.get("name")||"").trim();
  draft.categoryIds=fields.getAll("categoryIds").map(String);
  draft.category=db.categories.find(c=>c.id===draft.categoryIds[0])?.name||"";
  draft.description=String(fields.get("description")||"").trim();
  draft.price=Number(fields.get("price"));
  draft.status=String(fields.get("status")||"draft");
  draft.tag=String(fields.get("tag")||"").trim();
  draft.featured=fields.get("featured")==="on";
  document.querySelectorAll("[data-variant-row]").forEach(row=>{
    const v=draft.variants[Number(row.dataset.index)];if(!v)return;
    row.querySelectorAll("[data-v-field]").forEach(input=>{
      const field=input.dataset.vField;
      v[field]=field==="stock"?(input.value===""?null:Number(input.value)):input.value.trim();
    });
  });
  document.querySelectorAll("[data-color-group]").forEach(group=>{
    const name=group.querySelector("[data-color-name]").value.trim();
    const hex=group.querySelector("[data-color-hex]").value;
    for(const index of group.dataset.members.split(",").map(Number)){
      if(draft.variants[index])Object.assign(draft.variants[index],{color:name,hex});
    }
  });
  document.querySelectorAll("[data-image-row]").forEach(row=>{
    const im=draft.images[Number(row.dataset.index)];
    if(im)im.alt=row.querySelector("[data-image-field=alt]").value.trim();
  });
}

function validateProduct(p) {
  if (p.name.length < 2 || p.name.length > 180) return "El nombre debe tener de 2 a 180 caracteres";
  if (!p.categoryIds?.length) return "Selecciona al menos una categoría";
  if (!Number.isFinite(p.price) || p.price<0) return "El precio no es válido";
  if (!["draft","active","archived"].includes(p.status)) return "Estado inválido";
  const pairs = new Set();
  for (const v of p.variants) {
    if (!v.color || !v.size) return "Completa el color y talla de todas las variantes";
    if (v.stock!==null && (!Number.isInteger(v.stock) || v.stock<0)) return "El stock debe ser un entero igual o mayor que cero";
    const pair = (v.color+"|"+v.size).toLowerCase();
    if (pairs.has(pair)) return "Hay combinaciones repetidas de color y talla";
    pairs.add(pair);
  }
  if (p.images.some(im=>im.src && !safeImg(im.src))) return "Hay una fotografía no válida";
  if (p.status==="active" && (!p.images.some(im=>im.src) || !p.variants.length))
    return "Para activar un producto, agrega al menos una foto y una variante";
  return null;
}
async function saveProduct() {
  collectProduct();
  const err=validateProduct(draft);
  if(err)return notify(err);
  if(!draft.slug || !db.products.some(p=>p.id===draft.id)){
    const base=slugify(draft.name);
    let slug=base,i=2;
    while(db.products.some(p=>p.slug===slug&&p.id!==draft.id))slug=base+"-"+i++;
    draft.slug=slug;
  }
  try{
    await api.saveProduct(draft);
    await loadData();
    editing=false;draft=null;render();
    notify("Producto guardado correctamente");
  }catch(error){notify("No se guardó: "+error.message);}
}
function collectHome() {
  document.querySelectorAll("[data-home-row]").forEach(row=>{
    const item=homeDraft[Number(row.dataset.index)];if(!item)return;
    row.querySelectorAll("[data-home-field]").forEach(input=>{
      const field=input.dataset.homeField;
      item[field] = field==="enabled" ? input.checked : input.value.trim();
    });
  });
}
async function saveHome() {
  collectHome();
  if(homeDraft.some(x=>x.src&&!safeImg(x.src)))return notify("Hay una fotografía no válida");
  try{
    await api.saveHomeSection(homeTab,homeDraft.map((m,i)=>({...m,sortOrder:i})),db.home[homeTab]);
    await loadData();
    homeDraft=deepCopy(db.home[homeTab]);render();
    notify("Galería actualizada correctamente");
  }catch(error){notify("Error al guardar la galería: "+error.message);}
}
async function fileAsImage(file,folder) {
  if(!file)throw Error("Selecciona una fotografía");
  const result=await api.uploadImage(file,folder);
  return result.src;
}
const productDeleteDialog=document.getElementById("delete-product-dialog");
const productDeleteName=document.getElementById("delete-product-name");
const productDeleteError=document.getElementById("delete-dialog-error");
const productDeleteConfirm=document.getElementById("confirm-delete-product");
const productDeleteCancel=document.getElementById("cancel-delete-product");
let pendingProductDeleteId=null;
function closeDeleteDialog(){
  if(productDeleteConfirm.disabled)return;
  productDeleteDialog.close();
}
function openDeleteDialog(product){
  if(productDeleteDialog.open)return;
  pendingProductDeleteId=product.id;
  productDeleteName.textContent=product.name;
  productDeleteError.textContent="";
  productDeleteError.hidden=true;
  productDeleteConfirm.disabled=false;
  productDeleteConfirm.textContent="Sí, eliminar";
  productDeleteDialog.showModal();
  productDeleteCancel.focus();
}
productDeleteCancel.addEventListener("click",closeDeleteDialog);
productDeleteDialog.addEventListener("click",event=>{
  // Clicking the backdrop cancels; clicking the dialog itself never confirms.
  if(event.target===productDeleteDialog)closeDeleteDialog();
});
productDeleteDialog.addEventListener("close",()=>{pendingProductDeleteId=null;});
productDeleteDialog.addEventListener("cancel",event=>{
  if(productDeleteConfirm.disabled)event.preventDefault();
});
productDeleteConfirm.addEventListener("click",async()=>{
  const id=pendingProductDeleteId;
  if(!id||productDeleteConfirm.disabled)return;
  productDeleteConfirm.disabled=true;
  productDeleteCancel.disabled=true;
  productDeleteConfirm.textContent="Eliminando…";
  productDeleteError.hidden=true;
  try{
    await api.deleteProduct(id);
    await loadData();
    productDeleteDialog.close();
    render();
    notify("Producto eliminado correctamente");
  }catch(error){
    productDeleteError.textContent="No se pudo eliminar el producto. "+error.message;
    productDeleteError.hidden=false;
  }finally{
    productDeleteConfirm.disabled=false;
    productDeleteCancel.disabled=false;
    productDeleteConfirm.textContent="Sí, eliminar";
  }
});
document.addEventListener("click", async e=>{
  const nav=e.target.closest("[data-view]");if(nav){go(nav.dataset.view);return;}
  const el=e.target.closest("[data-action]");
  if(!el){
    const productRow=e.target.closest("[data-product-id]");
    if(productRow){startEdit(productRow.dataset.productId);return;}
    const categoryRow=e.target.closest("[data-category-id]");
    if(categoryRow){selectedCategoryId=categoryRow.dataset.categoryId;categorySearch="";pendingCategorySelection=null;render();return;}
    return;
  }
  const action=el.dataset.action,idx=Number(el.dataset.index);
  if(action==="go-products")return go("products");
  if(action==="clear-filters"){query="";productStatusFilter="all";productCategoryFilter="all";productSort="manual";return render();}
  if(action==="open-category"){selectedCategoryId=el.dataset.id;categorySearch="";pendingCategorySelection=null;return render();}
  if(action==="back-categories"){selectedCategoryId=null;categorySearch="";pendingCategorySelection=null;return render();}
  if(action==="remove-category"){
    const category=db.categories.find(c=>c.id===el.dataset.id);if(!category)return;
    if(!confirm('¿Eliminar la categoría "'+category.name+'"? Los productos conservarán sus otras categorías.'))return;
    try{await api.deleteCategory(category.id);selectedCategoryId=null;await loadData();render();notify("Categoría eliminada");}
    catch(error){notify("No se pudo eliminar: "+error.message);}
    return;
  }
  if(action==="go-home")return go("home");
  if(action==="go-categories")return go("categories");
  if(action==="new-product")return startEdit(null);
  if(action==="edit-product")return startEdit(el.dataset.id);
  if(action==="cancel-product"){editing=false;draft=null;return render();}
  if(action==="add-color"){
    collectProduct();let number=1;
    while(draft.variants.some(v=>v.color==="Color "+number))number++;
    draft.variants.push({id:uid(),color:"Color "+number,hex:"#777777",size:"",stock:null});return render();
  }
  if(action==="add-size"){
    collectProduct();const base=draft.variants[idx];if(!base)return;
    draft.variants.push({id:uid(),color:base.color,hex:base.hex,size:"",stock:null});return render();
  }
  if(action==="remove-color"){
    collectProduct();const color=draft.variants[idx]?.color;
    draft.variants=draft.variants.filter(v=>v.color!==color);return render();
  }
  if(action==="remove-variant"){collectProduct();draft.variants.splice(idx,1);return render();}
  if(action==="move-image"){
    collectProduct();const other=idx+Number(el.dataset.direction);
    if(other>=0&&other<draft.images.length)[draft.images[idx],draft.images[other]]=[draft.images[other],draft.images[idx]];
    return render();
  }
  if(action==="remove-image"){collectProduct();draft.images.splice(idx,1);return render();}
  if(action==="move-product"){
    const start=db.products.findIndex(p=>p.id===el.dataset.id),end=start+Number(el.dataset.direction);
    if(start<0||end<0||end>=db.products.length)return;
    const reordered=db.products.slice();[reordered[start],reordered[end]]=[reordered[end],reordered[start]];
    try{await api.reorderProducts(reordered);await loadData();render();notify("Orden actualizado");}
    catch(error){await loadData();render();notify("No se pudo cambiar el orden: "+error.message);}
    return;
  }
  if(action==="delete-permanent"){
    const product=db.products.find(p=>p.id===el.dataset.id);
    if(product)openDeleteDialog(product);
    return;
  }
  if(action==="archive-product"){
    const p=db.products.find(p=>p.id===el.dataset.id);
    if(!p||!confirm('¿Archivar "'+p.name+'"? Dejará de verse en la tienda de pruebas.'))return;
    try{await api.archiveProduct(p.id);await loadData();render();notify("Producto archivado");}
    catch(error){notify("No se pudo archivar: "+error.message);}
    return;
  }
  if(action==="home-tab"){collectHome();homeTab=el.dataset.section;homeDraft=deepCopy(db.home[homeTab]);return render();}
  
  if(action==="remove-home"){collectHome();homeDraft.splice(idx,1);return render();}
  if(action==="move-home"){
    collectHome();const other=idx+Number(el.dataset.direction);
    if(other>=0&&other<homeDraft.length)[homeDraft[idx],homeDraft[other]]=[homeDraft[other],homeDraft[idx]];
    return render();
  }
  if(action==="save-home")return saveHome();
  if(action==="export-data") {
    const blob=new Blob([JSON.stringify(db,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob),link=document.createElement("a");
    link.href=url;link.download="everywear-studio-catalog-backup.json";link.click();URL.revokeObjectURL(url);
  }
  if(action==="sign-out"){
    api.signOut();
    showLogin("Sesión cerrada");
    return;
  }
});
document.addEventListener("submit",e=>{
  if(e.target.id==="rename-category-form"){
    e.preventDefault();
    const id=selectedCategoryId,name=String(new FormData(e.target).get("name")||"").trim();
    if(db.categories.some(c=>c.id!==id&&c.name.trim().toLocaleLowerCase("es")===name.toLocaleLowerCase("es")))return notify("Ya existe una categoría con ese nombre");
    api.renameCategory(id,name).then(()=>loadData()).then(()=>{render();notify("Nombre actualizado sin perder productos");})
      .catch(error=>notify("No se pudo renombrar: "+error.message));return;
  }
  if(e.target.id==="category-products-form"){
    e.preventDefault();
    const id=selectedCategoryId;
    // Search hides some rows; preserve their current category membership.
    const visibleIds=new Set(Array.from(e.target.querySelectorAll('[name="productIds"]')).map(input=>input.value));
    const chosen=new Set(pendingCategorySelection || db.products.filter(p=>(p.categoryIds||[]).includes(id)&&!visibleIds.has(p.id)).map(p=>p.id));
    for(const input of e.target.querySelectorAll('[name="productIds"]:checked'))chosen.add(input.value);
    api.setCategoryProducts(id,[...chosen]).then(()=>loadData()).then(()=>{pendingCategorySelection=null;render();notify("Productos asociados actualizados");})
      .catch(error=>notify("No se pudieron actualizar los productos: "+error.message));return;
  }
  if(e.target.id!=="product-form"&&e.target.id!=="category-form")return;
  if(e.target.id==="category-form"){
    e.preventDefault();const name=String(new FormData(e.target).get("name")||"").trim();
    if(name.length<2)return notify("Escribe un nombre de categoría");
    if(db.categories.some(c=>c.name.trim().toLowerCase()===name.toLowerCase()))return notify("Esa categoría ya existe");
    api.createCategory(name).then(()=>loadData()).then(()=>{render();notify("Categoría creada");})
      .catch(error=>notify("No se pudo crear la categoría: "+error.message));return;
  }
  e.preventDefault();saveProduct();
});
document.addEventListener("input",e=>{
  if(e.target.id==="search-products"){
    query=e.target.value;
    document.getElementById("product-rows").innerHTML=productRows();
    document.getElementById("product-count").textContent=filteredProducts().length+" de "+db.products.length+" productos";
  }
  if(e.target.id==="category-product-search"){
    categorySearch=e.target.value;
    // Re-render on search while keeping selections (including unsaved ones).
    const form=document.getElementById("category-products-form");
    if(form){
      if(!pendingCategorySelection){
        pendingCategorySelection=new Set(db.products.filter(p=>(p.categoryIds||[]).includes(selectedCategoryId)).map(p=>p.id));
      }
      for(const box of form.querySelectorAll('[name="productIds"]')){
        if(box.checked)pendingCategorySelection.add(box.value);
        else pendingCategorySelection.delete(box.value);
      }
    }
    const caret=e.target.selectionStart;render();
    const field=document.getElementById("category-product-search");field?.focus();field?.setSelectionRange(caret,caret);
  }
});
document.addEventListener("change",e=>{
  if(e.target.id==="filter-status"){productStatusFilter=e.target.value;render();}
  if(e.target.id==="filter-category"){productCategoryFilter=e.target.value;render();}
  if(e.target.id==="filter-sort"){productSort=e.target.value;render();}
});
document.addEventListener("change",async e=>{
  const id=e.target.id;
  if(id==="product-photo-file" || id==="home-photo-file"){
    try {
      const files=Array.from(e.target.files||[]);
      if(id==="product-photo-file")collectProduct();else collectHome();
      let uploaded=0;
      for(const file of files){
        const src=await fileAsImage(file,id==="product-photo-file"?"products":"home");
        if(id==="product-photo-file")draft.images.push({id:uid(),src,alt:draft.name});
        else homeDraft.push({...blankMedia(),src});
        uploaded++;
      }
      render();notify(uploaded+" fotografía(s) cargada(s). Guarda los cambios para publicarlas.");
    } catch(error){notify(error.message);}
  }

});
const loginScreen=document.getElementById("login-screen");
const appShell=document.querySelector(".app-shell");
function showLogin(message="") {
  appShell.hidden=true;
  loginScreen.hidden=false;
  loginScreen.querySelector(".auth-message").textContent=message;
  db.products=[];db.categories=[];db.home={tv:[],lookbook:[],hero:[]};
}
async function initialize() {
  if(!api.configured)return showLogin("No se pudo conectar con la tienda. Intenta nuevamente más tarde.");
  const user=await api.checkAdmin();
  if(!user){
    return showLogin("Inicia sesión con una cuenta autorizada. Si ya has iniciado sesión, solicita que tu usuario se agregue a los administradores.");
  }
  authorizedEmail=user.email||"Administrador";
  await loadData();
  loginScreen.hidden=true;appShell.hidden=false;
  render();
}
document.addEventListener("click",event=>{
  const button=event.target.closest("#toggle-password");
  if(!button)return;
  const input=document.getElementById("login-password");
  const shown=input.type==="password";
  input.type=shown?"text":"password";
  button.setAttribute("aria-pressed",String(shown));
  button.setAttribute("aria-label",shown?"Ocultar contraseña":"Mostrar contraseña");
  button.title=shown?"Ocultar contraseña":"Mostrar contraseña";
  button.innerHTML=shown?
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.2A10.9 10.9 0 0 1 12 5c5.2 0 9 7 9 7a15 15 0 0 1-3.4 4.3M6.2 6.2C3.9 7.8 3 12 3 12s3.8 7 9 7a10 10 0 0 0 4.3-.9"/></svg>':
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.2 12s3.7-7 9.8-7 9.8 7 9.8 7-3.7 7-9.8 7-9.8-7-9.8-7Z"/><circle cx="12" cy="12" r="3"/></svg>';
  input.focus({preventScroll:true});
});
document.addEventListener("keydown",event=>{
  if(!["Enter"," "].includes(event.key)||event.target.closest("button,input,select,textarea"))return;
  const productRow=event.target.closest("[data-product-id]");
  if(productRow){event.preventDefault();startEdit(productRow.dataset.productId);return;}
  const categoryRow=event.target.closest("[data-category-id]");
  if(categoryRow){event.preventDefault();selectedCategoryId=categoryRow.dataset.categoryId;pendingCategorySelection=null;render();}
});
document.addEventListener("change",event=>{
  const box=event.target;
  if(box.matches('#category-products-form [name="productIds"]') && pendingCategorySelection){
    if(box.checked)pendingCategorySelection.add(box.value);else pendingCategorySelection.delete(box.value);
  }
});
document.addEventListener("submit",async event=>{
  if(event.target.id!=="login-form")return;
  event.preventDefault();
  const submit=event.target.querySelector('button[type="submit"]');
  const fields=new FormData(event.target);
  submit.disabled=true;
  try{
    await api.signIn(String(fields.get("email")||"").trim(),String(fields.get("password")||""));
    event.target.querySelector('[name="password"]').value="";
    await initialize();
  }catch(error){showLogin("No se pudo iniciar sesión: "+error.message);}
  finally{submit.disabled=false;}
});
initialize().catch(error=>showLogin("No se pudo cargar el panel: "+error.message));

