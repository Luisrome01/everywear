import * as api from "../client.js";

// All commercial data is persisted in Supabase PERSONAL; only session tokens live in localStorage.
const WORKSPACE = document.getElementById("workspace");
const TOAST = document.getElementById("toast");
const TITLES = { dashboard: "Resumen general", products: "Catálogo de productos", home: "Contenido del Home", settings: "Cuenta y seguridad" };
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
  id:uid(),slug:"",name:"",category:"Tops",description:"",price:0,status:"draft",
  featured:false,sortOrder:0,tag:"",images:[],variants:[]
});
const blankMedia = () => ({id:uid(),src:"",alt:"",enabled:true,sortOrder:0});
let db = {products:[],home:{tv:[],lookbook:[],hero:[]},settings:{storeName:"Everywear",currency:"USD"}};
let authorizedEmail = "";
async function loadData() {
  const [products,media]=await Promise.all([api.listProducts(),api.listHome(true)]);
  db.products=products;
  db.home={tv:[],lookbook:[],hero:[]};
  media.forEach(item=>{if(db.home[item.section])db.home[item.section].push({
    id:item.id,src:item.src,alt:item.alt,enabled:item.enabled,sortOrder:item.sort_order
  });});
}
let view = "dashboard", query = "", editing = false, draft = null, homeTab = "tv", homeDraft = [];
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
  const active = db.products.filter(p=>p.status==="active").length;
  const variants = db.products.flatMap(p=>p.variants||[]);
  const unknown = variants.filter(v=>v.stock===null || v.stock==="" || v.stock===undefined).length;
  const stock = variants.reduce((n,v)=>n+(v.stock===null || v.stock==="" || v.stock===undefined?0:Number(v.stock)||0),0);
  return header("Tu tienda, en un solo lugar",
    "Administra productos, inventario y fotografías con almacenamiento seguro.")+
    '<div class="cards">'+card("Productos cargados",db.products.length,"Registros reales de Supabase")+
    card("Publicables",active,"Visibles en la vista previa")+
    card("Unidades registradas",stock,"Solo cantidades configuradas")+
    card("Variantes sin stock definido",unknown,"Pendientes de completar")+'</div>'+
    '<div class="layout-two"><section class="panel"><div class="panel-head"><h2>Qué ya puedes probar</h2></div>'+
    '<p class="muted">Crea productos con precios, descripciones, colores, tallas, inventario y fotografías almacenadas en Supabase.</p>'+
    '<p class="muted">Solo los productos activos aparecen en la tienda de pruebas. Los borradores no son públicos.</p>'+
    '<button class="btn" data-action="go-products">Administrar productos</button></section>'+
    '<section class="panel"><div class="panel-head"><h2>Sincronización y seguridad</h2></div>'+
    '<p class="muted">Conexión activa con PostgreSQL, Supabase Auth y almacenamiento de imágenes protegido por permisos.</p>'+
    '<p class="muted">Los productos de demostración permanecen como borrador hasta que los publiques explícitamente.</p>'+
    '<button class="btn btn-outline" data-action="go-home">Editar fotos del Home</button></section></div>';
}
function productRows() {
  const q = query.trim().toLowerCase();
  const products = db.products.filter(p=>[p.name,p.category,p.slug].join(" ").toLowerCase().includes(q));
  if (!products.length) return '<tr><td colspan="6"><div class="empty">No hay productos que coincidan con tu búsqueda.</div></td></tr>';
  return products.map(p=>{
    const known = (p.variants||[]).filter(v=>v.stock!==null && v.stock!==undefined && v.stock!=="");
    const qty = known.reduce((n,v)=>n+Number(v.stock||0),0);
    const stockLabel = known.length === (p.variants||[]).length ? qty+" uds." : qty+" uds. + sin definir";
    const img = p.images?.[0]?.src;
    return '<tr><td><div class="item-with-photo">'+imgMarkup(img,p.name)+'<div><div class="product-title">'+esc(p.name)+
      '</div><div class="muted">'+esc(p.category)+'</div></div></div></td>'+
      '<td>'+money(p.price)+'</td><td><span class="pill '+esc(p.status)+'">'+esc(p.status)+'</span></td>'+
      '<td>'+esc((p.variants||[]).length)+'</td><td>'+esc(stockLabel)+'</td><td><div class="actions">'+
      '<button class="btn btn-outline btn-sm" data-action="edit-product" data-id="'+esc(p.id)+'">Editar</button>'+
      '<button class="btn btn-danger btn-sm" data-action="delete-product" data-id="'+esc(p.id)+'">Archivar</button>'+
      '</div></td></tr>';
  }).join("");
}
function renderProducts() {
  if (editing) return renderProductEditor();
  return header("Catálogo de productos","Crea artículos, organiza variantes y prepara su publicación.",
    '<button class="btn" data-action="new-product">+ Nuevo producto</button>')+
    '<section class="panel"><div class="toolbar"><input id="search-products" type="search" placeholder="Buscar por nombre o categoría…" value="'+esc(query)+'">'+
    '<span class="muted">'+db.products.length+' productos · sincronizados con Supabase</span></div>'+
    '<div class="table-wrap"><table><thead><tr><th>Artículo</th><th>Precio</th><th>Estado</th><th>Variantes</th><th>Inventario</th><th>Acciones</th></tr></thead>'+
    '<tbody id="product-rows">'+productRows()+'</tbody></table></div></section>';
}
function variantRow(v,i) {
  const stock = v.stock===null || v.stock===undefined ? "" : v.stock;
  return '<div class="editable-row" data-variant-row data-index="'+i+'">'+
    '<input data-v-field="color" aria-label="Color" placeholder="Color" value="'+esc(v.color)+'">'+
    '<input data-v-field="hex" type="color" aria-label="Color visual" value="'+esc(/^#[a-fA-F0-9]{6}$/.test(v.hex)?v.hex:"#777777")+'">'+
    '<input data-v-field="size" aria-label="Talla" placeholder="Talla" value="'+esc(v.size)+'">'+
    '<input data-v-field="stock" type="number" min="0" step="1" aria-label="Existencias" placeholder="—" value="'+esc(stock)+'">'+
    '<button type="button" class="btn btn-danger btn-sm" data-action="remove-variant" data-index="'+i+'" aria-label="Eliminar variante">×</button>'+
    '</div>';
}
function imageRow(image,i) {
  return '<div class="media-row" data-image-row data-index="'+i+'">'+
    imgMarkup(image.src,image.alt)+
    '<div class="controls"><input data-image-field="src" aria-label="URL de foto" placeholder="https://… o /brand/…" value="'+esc(image.src)+'">'+
    '<input data-image-field="alt" aria-label="Descripción de foto" placeholder="Descripción accesible" value="'+esc(image.alt)+'"></div>'+
    '<button type="button" class="btn btn-danger btn-sm" data-action="remove-image" data-index="'+i+'">×</button></div>';
}
function renderProductEditor() {
  return header(draft.name ? "Editar "+esc(draft.name) : "Nuevo producto",
    "Los cambios se guardan en Supabase PERSONAL. Solo el estado Activo se muestra en la tienda de prueba.",
    '<button class="btn btn-outline" data-action="cancel-product">← Regresar</button>')+
    '<form id="product-form" class="panel"><div class="form-grid">'+
    '<label>Nombre del producto<input name="name" maxlength="180" required value="'+esc(draft.name)+'"></label>'+
    '<label>Categoría<input name="category" maxlength="80" required value="'+esc(draft.category)+'"></label>'+
    '<label>Precio (USD)<input type="number" name="price" min="0" step=".01" required value="'+esc(draft.price)+'"></label>'+
    '<label>Estado<select name="status"><option value="draft" '+(draft.status==="draft"?"selected":"")+'>Borrador</option>'+
    '<option value="active" '+(draft.status==="active"?"selected":"")+'>Activo</option>'+
    '<option value="archived" '+(draft.status==="archived"?"selected":"")+'>Archivado</option></select></label>'+
    '<label>Etiqueta (opcional)<input name="tag" maxlength="40" value="'+esc(draft.tag)+'" placeholder="Nuevo, Favorito…"></label>'+
    '<label>Orden de aparición<input name="sortOrder" type="number" step="1" value="'+esc(draft.sortOrder)+'"></label>'+
    '<label class="wide">Descripción<textarea name="description" maxlength="2500">'+esc(draft.description)+'</textarea></label>'+
    '<div class="wide checkline"><input type="checkbox" id="featured" name="featured" '+(draft.featured?"checked":"")+'><label for="featured">Mostrar como producto destacado</label></div></div>'+
    '<div class="section-bar"><h3>Variantes · color, talla y existencias</h3><button type="button" class="btn btn-outline btn-sm" data-action="add-variant">+ Variante</button></div>'+
    '<p class="help">Deja stock vacío si aún no lo sabes. Cero significa agotado. Cada combinación color/talla debe ser única.</p>'+
    '<div id="variant-list">'+(draft.variants.length?draft.variants.map(variantRow).join(""):'<div class="empty">Sin variantes. Agrega una para definir colores y tallas.</div>')+'</div>'+
    '<div class="section-bar"><h3>Fotografías del producto</h3><button type="button" class="btn btn-outline btn-sm" data-action="add-image">+ Fotografía</button></div>'+
    '<p class="help">Selecciona archivos JPG, PNG, WebP o AVIF de hasta 8 MB. Se subirán a Supabase Storage. También puedes usar una URL HTTPS.</p>'+
    '<input type="file" id="product-photo-file" accept="image/png,image/jpeg,image/webp,image/avif" aria-label="Agregar foto desde el equipo">'+
    '<div id="image-list">'+(draft.images.length?draft.images.map(imageRow).join(""):'<div class="empty">Este producto no tiene fotografías.</div>')+'</div>'+
    '<div class="footer-actions"><button class="btn btn-outline" type="button" data-action="cancel-product">Cancelar</button>'+
    '<button class="btn" type="submit">Guardar producto</button></div></form>';
}
function renderHome() {
  const labels = {tv:"Tres televisores",lookbook:"Lookbook editorial",hero:"Hero / portada"};
  const items = homeDraft;
  return header("Contenido visual del Home","Administra las galerías sin modificar el SVG ni las animaciones originales.")+
    '<div class="home-tabs">'+Object.keys(labels).map(k=>
      '<button type="button" class="'+(homeTab===k?"active":"")+'" data-action="home-tab" data-section="'+k+'">'+labels[k]+'</button>'
    ).join("")+'</div><section class="panel"><div class="panel-head"><div><h2>'+labels[homeTab]+'</h2>'+
    '<p class="muted">Ordena las fotografías y marca cuáles deben mostrarse.</p></div>'+
    '<button type="button" class="btn" data-action="add-home">+ Agregar imagen</button></div>'+
    '<p class="help">Las fotografías y su orden se guardan en Supabase. Se mantiene el diseño original de los televisores y el scroll.</p>'+
    '<div id="home-list">'+(items.length ? items.map((item,i)=>
      '<div class="home-tile" data-home-row data-index="'+i+'">'+imgMarkup(item.src,item.alt,"thumb")+
      '<div><label>URL de imagen<input data-home-field="src" value="'+esc(item.src)+'" placeholder="https://…"></label>'+
      '<label>Descripción<input data-home-field="alt" value="'+esc(item.alt)+'" placeholder="Descripción"></label>'+
      '<div class="checkline"><input id="visible-'+i+'" type="checkbox" data-home-field="enabled" '+(item.enabled?"checked":"")+'>'+
      '<label for="visible-'+i+'">Visible</label></div></div>'+
      '<div class="two-buttons"><button class="btn btn-outline btn-sm" data-action="move-home" data-index="'+i+'" data-direction="-1" title="Subir">↑</button>'+
      '<button class="btn btn-outline btn-sm" data-action="move-home" data-index="'+i+'" data-direction="1" title="Bajar">↓</button>'+
      '<button class="btn btn-danger btn-sm" data-action="remove-home" data-index="'+i+'" title="Eliminar">×</button></div></div>').join("")
      : '<div class="empty">No hay imágenes configuradas para esta sección.</div>')+'</div>'+
    '<div class="section-bar"><label>Subir fotografía desde equipo<input type="file" id="home-photo-file" accept="image/jpeg,image/png,image/webp,image/avif"></label></div>'+
    '<div class="footer-actions"><button class="btn" data-action="save-home">Guardar galería</button></div></section>';
}
function renderSettings() {
  return header("Cuenta y seguridad","Tu sesión y la conexión protegida con Supabase PERSONAL.")+
    '<section class="panel"><h2>Cuenta autorizada</h2>'+
    '<p class="muted">Sesión: '+esc(authorizedEmail)+'</p>'+
    '<p class="muted">Proyecto Supabase: '+esc(api.projectRef)+'. Todas las escrituras están protegidas por RLS.</p>'+
    '<p class="muted">Los pedidos por WhatsApp no descuentan el inventario. Las cantidades solo cambian al editar el producto.</p>'+
    '<button class="btn btn-outline" data-action="export-data">Exportar catálogo JSON</button> '+
    '<button class="btn btn-danger" data-action="sign-out">Cerrar sesión</button></section>';
}
function render() {
  document.getElementById("subtitle").textContent = TITLES[view];
  document.querySelectorAll("[data-view]").forEach(el=>el.classList.toggle("active",el.dataset.view===view));
  WORKSPACE.innerHTML = view==="dashboard" ? renderDashboard() :
    view==="products" ? renderProducts() : view==="home" ? renderHome() : renderSettings();
}
function go(next) {
  view = next; editing=false;draft=null;
  if (view==="home") homeDraft = deepCopy(db.home[homeTab]);
  render(); window.scrollTo({top:0,behavior:"instant"});
}
function startEdit(id) {
  draft = id ? deepCopy(db.products.find(p=>p.id===id)) : blankProduct();
  if (!draft) return notify("Producto no encontrado");
  editing=true; view="products";render();window.scrollTo(0,0);
}
function collectProduct() {
  const form = document.getElementById("product-form"); if (!form || !draft) return;
  const fields = new FormData(form);
  draft.name = String(fields.get("name")||"").trim();
  draft.category = String(fields.get("category")||"").trim();
  draft.description = String(fields.get("description")||"").trim();
  draft.price = Number(fields.get("price"));
  draft.status = String(fields.get("status")||"draft");
  draft.tag = String(fields.get("tag")||"").trim();
  draft.sortOrder = Number(fields.get("sortOrder"))||0;
  draft.featured = fields.get("featured")==="on";
  document.querySelectorAll("[data-variant-row]").forEach(row=>{
    const i=Number(row.dataset.index),v=draft.variants[i]; if(!v)return;
    row.querySelectorAll("[data-v-field]").forEach(input=>{
      const field=input.dataset.vField;
      v[field] = field==="stock" ? (input.value==="" ? null : Number(input.value)) : input.value.trim();
    });
  });
  document.querySelectorAll("[data-image-row]").forEach(row=>{
    const i=Number(row.dataset.index),im=draft.images[i];if(!im)return;
    row.querySelectorAll("[data-image-field]").forEach(input=>im[input.dataset.imageField]=input.value.trim());
  });
}
function validateProduct(p) {
  if (p.name.length < 2 || p.name.length > 180) return "El nombre debe tener de 2 a 180 caracteres";
  if (!p.category) return "La categoría es obligatoria";
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
  if (p.images.some(im=>im.src && !safeImg(im.src))) return "Hay una URL de fotografía no permitida";
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
    notify("Producto guardado correctamente en Supabase");
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
  if(homeDraft.some(x=>x.src&&!safeImg(x.src)))return notify("Hay una imagen con URL no permitida");
  try{
    await api.saveHomeSection(homeTab,homeDraft.map((m,i)=>({...m,sortOrder:i})),db.home[homeTab]);
    await loadData();
    homeDraft=deepCopy(db.home[homeTab]);render();
    notify("Galería guardada en Supabase");
  }catch(error){notify("Error al guardar la galería: "+error.message);}
}
async function fileAsImage(file,folder) {
  if(!file)throw Error("Selecciona una fotografía");
  const result=await api.uploadImage(file,folder);
  return result.src;
}
document.addEventListener("click", async e=>{
  const nav=e.target.closest("[data-view]");if(nav){go(nav.dataset.view);return;}
  const el=e.target.closest("[data-action]");if(!el)return;
  const action=el.dataset.action,idx=Number(el.dataset.index);
  if(action==="go-products")return go("products");
  if(action==="go-home")return go("home");
  if(action==="new-product")return startEdit(null);
  if(action==="edit-product")return startEdit(el.dataset.id);
  if(action==="cancel-product"){editing=false;draft=null;return render();}
  if(action==="add-variant"){collectProduct();draft.variants.push({id:uid(),color:"",hex:"#777777",size:"",stock:null});return render();}
  if(action==="remove-variant"){collectProduct();draft.variants.splice(idx,1);return render();}
  if(action==="add-image"){collectProduct();draft.images.push({id:uid(),src:"",alt:""});return render();}
  if(action==="remove-image"){collectProduct();draft.images.splice(idx,1);return render();}
  if(action==="delete-product"){
    const p=db.products.find(p=>p.id===el.dataset.id);
    if(!p||!confirm('¿Archivar "'+p.name+'"? Dejará de verse en la tienda de pruebas.'))return;
    try{await api.archiveProduct(p.id);await loadData();render();notify("Producto archivado en Supabase");}
    catch(error){notify("No se pudo archivar: "+error.message);}
    return;
  }
  if(action==="home-tab"){collectHome();homeTab=el.dataset.section;homeDraft=deepCopy(db.home[homeTab]);return render();}
  if(action==="add-home"){collectHome();homeDraft.push(blankMedia());return render();}
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
    link.href=url;link.download="everywear-demo.json";link.click();URL.revokeObjectURL(url);
  }
  if(action==="sign-out"){
    api.signOut();
    showLogin("Sesión cerrada");
    return;
  }
});
document.addEventListener("submit",e=>{
  if(e.target.id!=="product-form")return;
  e.preventDefault();saveProduct();
});
document.addEventListener("input",e=>{
  if(e.target.id==="search-products"){query=e.target.value;const target=document.getElementById("product-rows");if(target)target.innerHTML=productRows();}
});
document.addEventListener("change",async e=>{
  const id=e.target.id;
  if(id==="product-photo-file" || id==="home-photo-file"){
    try {
      const src=await fileAsImage(e.target.files?.[0],id==="product-photo-file"?"products":"home");
      if(id==="product-photo-file"){collectProduct();draft.images.push({id:uid(),src,alt:draft.name});}
      else {collectHome();homeDraft.push({...blankMedia(),src});}
      render();notify("Imagen agregada a la demo. Guarda para conservarla.");
    } catch(error){notify(error.message);}
  }

});
const loginScreen=document.getElementById("login-screen");
const appShell=document.querySelector(".app-shell");
function showLogin(message="") {
  appShell.hidden=true;
  loginScreen.hidden=false;
  loginScreen.querySelector(".auth-message").textContent=message;
  db.products=[];db.home={tv:[],lookbook:[],hero:[]};
}
async function initialize() {
  if(!api.configured)return showLogin("Supabase no está configurado para este despliegue.");
  const user=await api.checkAdmin();
  if(!user){
    return showLogin("Inicia sesión con una cuenta autorizada. Si ya has iniciado sesión, solicita que tu usuario se agregue a los administradores.");
  }
  authorizedEmail=user.email||"Administrador";
  await loadData();
  loginScreen.hidden=true;appShell.hidden=false;
  render();
}
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

