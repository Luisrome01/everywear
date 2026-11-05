// Future Supabase persistence adapter. Not imported by the demo UI yet.
// Requires an authenticated Supabase JS client and server-enforced RLS.
const check = response => {if(response.error)throw response.error;return response.data;};
export function toProductRow(p) {
  return {
    id:p.id, slug:p.slug, name:p.name, category:p.category,
    description:p.description||"", price:Number(p.price), status:p.status,
    featured:!!p.featured, sort_order:p.sortOrder||0, tag:p.tag||"",
    images:(p.images||[]).map(({src,alt})=>({src,alt})),
    variants:(p.variants||[]).map(({color,hex,size,stock})=>
      ({color,hex,size,stock:stock==null?null:Number(stock)}))
  };
}
export function fromProductRow(p) {
  return {
    id:p.id,slug:p.slug,name:p.name,category:p.category,
    description:p.description||"",price:Number(p.price),status:p.status,
    featured:!!p.featured,sortOrder:p.sort_order||0,tag:p.tag||"",
    images:(p.images||[]).map(im=>({...im,id:crypto.randomUUID()})),
    variants:(p.variants||[]).map(v=>({...v,id:crypto.randomUUID()}))
  };
}
export function createSupabaseRepository(client) {
  if(!client || typeof client.from!=="function")throw Error("Falta cliente Supabase");
  async function assertAdmin(){
    const {data,error}=await client.auth.getUser();
    if(error||!data?.user)throw Error("Autenticación requerida");
    const member=check(await client.from("everywear_admins").select("user_id")
      .eq("user_id",data.user.id).maybeSingle());
    if(!member)throw Error("Usuario sin permisos administrativos");
  }
  return {
    assertAdmin,
    async listProducts(){
      await assertAdmin();
      return (check(await client.from("everywear_products").select("*").order("sort_order"))||[])
        .map(fromProductRow);
    },
    async saveProduct(product){
      await assertAdmin();
      return fromProductRow(check(await client.from("everywear_products")
        .upsert(toProductRow(product),{onConflict:"id"}).select().single()));
    },
    async archiveProduct(id){
      await assertAdmin();
      return check(await client.from("everywear_products")
        .update({status:"archived"}).eq("id",id).select().single());
    },
    async listHome(section){
      await assertAdmin();
      return (check(await client.from("everywear_home_media")
        .select("*").eq("section",section).order("sort_order"))||[])
        .map(r=>({id:r.id,src:r.src,alt:r.alt,enabled:r.enabled,sortOrder:r.sort_order}));
    },
    async saveHomeItem(section,item){
      await assertAdmin();
      return check(await client.from("everywear_home_media").upsert({
        id:item.id,section,src:item.src,alt:item.alt||"",enabled:item.enabled!==false,
        sort_order:item.sortOrder||0
      },{onConflict:"id"}).select().single());
    },
    async deleteHomeItem(id){
      await assertAdmin();
      return check(await client.from("everywear_home_media").delete().eq("id",id).select());
    },
    async uploadImage(file,folder="products"){
      await assertAdmin();
      if(!["products","home"].includes(folder))throw Error("Carpeta inválida");
      if(!["image/jpeg","image/png","image/webp","image/avif"].includes(file.type))
        throw Error("Tipo de imagen no permitido");
      if(file.size>8*1024*1024)throw Error("Límite de 8 MB");
      const ext={"image/jpeg":"jpg","image/png":"png","image/webp":"webp","image/avif":"avif"}[file.type];
      const path=folder+"/"+crypto.randomUUID()+"."+ext;
      check(await client.storage.from("everywear-media").upload(path,file,{
        contentType:file.type,upsert:false
      }));
      return {path,url:client.storage.from("everywear-media").getPublicUrl(path).data.publicUrl};
    }
  };
}
