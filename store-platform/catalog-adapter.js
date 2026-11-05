// Prepared adapter: Supabase data -> existing vanilla-JS storefront shape.
// Not connected to src/app.js yet. No credentials, writes, or effects.
const FALLBACK_COLOR = "#777777";
export function productForStorefront(row) {
  const photos = (Array.isArray(row.images) ? row.images : [])
    .filter(x => x && typeof x.src === "string" && x.src)
    .map(x => x.src);
  const variants = Array.isArray(row.variants) ? row.variants : [];
  const colorMap = new Map();
  for (const v of variants) {
    const name = String(v.color || "Único");
    const hex = /^#[a-f0-9]{6}$/i.test(v.hex || "") ? v.hex : FALLBACK_COLOR;
    if (!colorMap.has(name)) colorMap.set(name, {name, hex});
  }
  const sizes = [...new Set(variants.map(v => String(v.size || "Única")))]
    .filter(x => x !== "Única");
  return {
    id: row.id, name: row.name, category: row.category,
    price: Number(row.price) || 0, description: row.description || "",
    tag: row.tag || "", image: photos[0] || "/brand/bag.webp",
    images: photos.length ? photos : ["/brand/bag.webp"],
    colors: [...colorMap.values()].length ? [...colorMap.values()] : [{name:"Único",hex:FALLBACK_COLOR}],
    sizes, variants
  };
}
export function mediaForStorefront(rows, section) {
  return rows.filter(m => m.section === section && m.enabled)
    .sort((a,b) => a.sort_order - b.sort_order)
    .map(m => ({src:m.src,alt:m.alt || ""}));
}
export async function loadPublishedStorefront(client) {
  const [products, media] = await Promise.all([
    client.from("everywear_products").select("*").eq("status","active").order("sort_order"),
    client.from("everywear_home_media").select("*").eq("enabled",true).order("sort_order")
  ]);
  if (products.error) throw products.error;
  if (media.error) throw media.error;
  const rows = products.data || [];
  return {
    products: rows.map(productForStorefront),
    categories: ["Todos",...new Set(rows.map(p=>p.category).filter(Boolean))],
    tvPhotos: mediaForStorefront(media.data || [], "tv"),
    lookbook: mediaForStorefront(media.data || [], "lookbook"),
    hero: mediaForStorefront(media.data || [], "hero")
  };
}
