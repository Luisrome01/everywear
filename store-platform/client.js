// Everywear preview-only Supabase gateway: public publishable key + user JWT.
// Database RLS is the authorization boundary; no service_role or secret keys.
const URL = String(import.meta.env.VITE_EW_SUPABASE_URL || "").replace(/\/$/,"");
const KEY = String(import.meta.env.VITE_EW_SUPABASE_PUBLISHABLE_KEY || "");
const SESSION_KEY = "everywear-studio-auth-v1";
export const configured = Boolean(URL && KEY);
export const projectRef = URL.match(/^https:\/\/([a-z0-9]+)\.supabase\.co$/)?.[1] || "";

let session = null;
try { session = JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); } catch {}
function saveSession(data) {
  session = data;
  if (data) localStorage.setItem(SESSION_KEY,JSON.stringify(data));
  else localStorage.removeItem(SESSION_KEY);
}
function errorFrom(body,status) {
  return Error(body?.msg || body?.error_description || body?.message || body?.error || "Supabase HTTP "+status);
}
async function rawRequest(path,method="GET",body=null,authenticated=false,extraHeaders={}) {
  if (!configured) throw Error("Falta configurar Supabase para Everywear en Render");
  if (authenticated && (!session?.access_token || (session.expires_at && session.expires_at < Date.now()/1000 + 45)))
    await refreshSession();
  if (authenticated && !session?.access_token) throw Error("Inicia sesión para continuar");
  const headers={apikey:KEY,...extraHeaders};
  if (authenticated) headers.Authorization="Bearer "+session.access_token;
  if (body!==null && !(body instanceof Blob) && !(body instanceof FormData)) headers["Content-Type"]="application/json";
  const response=await fetch(URL+path,{method,headers,body:body===null?undefined:
    body instanceof Blob || body instanceof FormData ? body : JSON.stringify(body),cache:"no-store"});
  const text=await response.text();
  let data;
  try {data=text?JSON.parse(text):null;}catch{data=text;}
  if (!response.ok) throw errorFrom(data,response.status);
  return data;
}
export async function signIn(email,password){
  const data=await rawRequest("/auth/v1/token?grant_type=password","POST",{email,password});
  saveSession({...data,expires_at:Math.floor(Date.now()/1000)+data.expires_in});
  return data.user;
}
export function signOut(){
  const token=session?.access_token;
  saveSession(null);
  // Invalidate the server session as well. Never delay the local logout UI.
  if (token && configured) {
    fetch(URL+"/auth/v1/logout",{method:"POST",headers:{apikey:KEY,Authorization:"Bearer "+token}})
      .catch(()=>{});
  }
}
async function refreshSession(){
  if (!session?.refresh_token) {saveSession(null);throw Error("Sesión vencida. Inicia sesión nuevamente");}
  try {
    const data=await rawRequest("/auth/v1/token?grant_type=refresh_token","POST",
      {refresh_token:session.refresh_token});
    saveSession({...data,expires_at:Math.floor(Date.now()/1000)+data.expires_in});
    return session;
  }catch(error){saveSession(null);throw error;}
}
export async function currentUser(){
  if (!session?.access_token) return null;
  try{
    const response=await rawRequest("/auth/v1/user","GET",null,true);
    return response;
  }catch(error){saveSession(null);return null;}
}
export async function checkAdmin(){
  const user=await currentUser();
  if (!user) return null;
  const matches=await rawRequest("/rest/v1/everywear_admins?select=user_id&user_id=eq."+encodeURIComponent(user.id), "GET",null,true);
  return matches?.length ? user : null;
}
const withSort = arr => (arr||[]).slice().sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));
export function normalizeProduct(p){
  return {
    id:p.id,slug:p.slug,name:p.name,category:p.category,description:p.description||"",
    price:Number(p.price),status:p.status,featured:!!p.featured,tag:p.tag||"",
    sortOrder:p.sort_order||0,
    images:withSort(p.everywear_product_images).map(i=>({id:i.id,src:i.src,alt:i.alt||""})),
    variants:withSort(p.everywear_product_variants).map(v=>({
      id:v.id,color:v.color,hex:v.hex,size:v.size,stock:v.stock,sortOrder:v.sort_order||0
    }))
  };
}
const fullSelect="select=*,everywear_product_variants(*),everywear_product_images(*)&order=sort_order.asc";
async function categoryAssignments(admin=false){
  return rawRequest("/rest/v1/everywear_product_categories?select=product_id,category_id,everywear_categories(name)","GET",null,admin);
}
function attachCategories(products,assignments){
  return products.map(p=>{
    const matches=assignments.filter(x=>x.product_id===p.id);
    return {...p,
      categoryIds:matches.map(x=>x.category_id),
      categories:matches.map(x=>x.everywear_categories?.name).filter(Boolean).length
        ? matches.map(x=>x.everywear_categories?.name).filter(Boolean):[p.category]
    };
  });
}
export async function listCategories(admin=false){
  return rawRequest("/rest/v1/everywear_categories?select=*&order=sort_order.asc,name.asc","GET",null,admin);
}
export async function createCategory(name){
  return rawRequest("/rest/v1/everywear_categories","POST",
    {name:name.trim(),sort_order:0},true,{Prefer:"return=representation"});
}
export async function listProducts(){
  const [products,assignments]=await Promise.all([
    rawRequest("/rest/v1/everywear_products?"+fullSelect,"GET",null,true),
    categoryAssignments(true)]);
  return attachCategories(products.map(normalizeProduct),assignments);
}
export async function listPublicProducts(){
  const [products,assignments]=await Promise.all([
    rawRequest("/rest/v1/everywear_products?"+fullSelect+"&status=eq.active","GET"),
    categoryAssignments()]);
  return attachCategories(products.map(normalizeProduct),assignments);
}
export async function saveProduct(product){
  const payload={
    id:product.id,slug:product.slug,name:product.name,category:product.category,
    categoryIds:product.categoryIds,
    description:product.description,price:product.price,status:product.status,
    featured:product.featured,tag:product.tag,sortOrder:product.sortOrder,
    images:(product.images||[]).map(i=>({src:i.src,alt:i.alt||""})),
    variants:(product.variants||[]).map((v,i)=>({color:v.color,hex:v.hex,size:v.size,
      stock:v.stock,sortOrder:i}))
  };
  return rawRequest("/rest/v1/rpc/everywear_save_product","POST",{payload},true);
}
export async function deleteProduct(id){
  return rawRequest("/rest/v1/rpc/everywear_delete_product","POST",{p_product_id:id},true);
}
export async function reorderProducts(products){
  for(let i=0;i<products.length;i++){
    await rawRequest("/rest/v1/everywear_products?id=eq."+encodeURIComponent(products[i].id),
      "PATCH",{sort_order:i},true,{Prefer:"return=minimal"});
  }
}
export async function archiveProduct(id){
  return rawRequest("/rest/v1/everywear_products?id=eq."+encodeURIComponent(id),"PATCH",
    {status:"archived"},true,{Prefer:"return=representation"});
}
export async function listHome(admin=false){
  const suffix=admin?"":"&enabled=eq.true";
  return rawRequest("/rest/v1/everywear_home_media?select=*&order=sort_order.asc"+suffix,"GET",null,admin);
}
export async function saveHomeSection(section,items,priorItems){
  // Upsert first, then remove obsolete rows. RLS checks every mutation.
  const updated=items.filter(x=>x.src).map((x,i)=>({
    id:x.id,section,src:x.src,alt:x.alt||"",enabled:x.enabled!==false,sort_order:i
  }));
  if(updated.length)await rawRequest("/rest/v1/everywear_home_media?on_conflict=id","POST",
    updated,true,{Prefer:"resolution=merge-duplicates,return=minimal"});
  const ids=new Set(updated.map(x=>x.id));
  const removed=(priorItems||[]).filter(x=>!ids.has(x.id));
  for(const item of removed)await rawRequest("/rest/v1/everywear_home_media?id=eq."+encodeURIComponent(item.id),
    "DELETE",null,true);
  return true;
}
export async function uploadImage(file,folder="products"){
  if(!["products","home"].includes(folder))throw Error("Carpeta de imágenes inválida");
  const ext={"image/png":"png","image/jpeg":"jpg","image/webp":"webp","image/avif":"avif"}[file?.type];
  if(!ext)throw Error("Solo se permiten JPG, PNG, WebP y AVIF");
  if(file.size>8*1024*1024)throw Error("La fotografía no puede superar 8 MB");
  const path=folder+"/"+crypto.randomUUID()+"."+ext;
  await rawRequest("/storage/v1/object/everywear-media/"+path,"POST",file,true,{"Content-Type":file.type,"x-upsert":"false"});
  return {src:URL+"/storage/v1/object/public/everywear-media/"+path,path};
}
export async function removeImage(path) {
  if(!/^(products|home)\/[0-9a-f-]+\.(jpg|png|webp|avif)$/.test(path))throw Error("Ruta inválida");
  await rawRequest("/storage/v1/object/everywear-media/"+path,"DELETE",null,true);
}
export function publicProduct(p){
  const colors=new Map();
  for(const v of p.variants){
    if(!colors.has(v.color))colors.set(v.color,{name:v.color,hex:v.hex||"#777777"});
  }
  const sizes=[...new Set(p.variants.map(v=>v.size))].filter(x=>x!=="Única");
  return {
    id:p.id,slug:p.slug,name:p.name,category:p.category,categories:p.categories,price:p.price,
    description:p.description,tag:p.tag,
    image:p.images[0]?.src||"/brand/bag.webp",
    images:p.images.map(i=>i.src),colors:[...colors.values()],sizes,
    variants:p.variants
  };
}
