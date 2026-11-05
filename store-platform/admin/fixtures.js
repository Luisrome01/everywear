// Datos de demostración IMPORTADOS del diseño original, sin modificar sus archivos.
import { PRODUCTS } from "../../src/data.js";
import { TV_PHOTOS } from "../../src/tv-photos.js";
import { LOOKBOOK_SLIDES } from "../../src/brand-media.js";

function image(src, alt = "") { return { id: crypto.randomUUID(), src, alt }; }

export function makeFixtures() {
  return {
    version: 1,
    products: PRODUCTS.map((p, i) => ({
      id: "example-" + p.id,
      slug: p.id,
      name: p.name,
      category: p.category,
      description: p.description,
      price: p.price,
      status: "draft",
      featured: i < 4,
      sortOrder: i,
      tag: p.tag || "",
      images: (p.images?.length ? p.images : [p.image]).map(src => image(src, p.name)),
      variants: p.colors.flatMap(c => (p.sizes?.length ? p.sizes : ["Única"])
        .map(size => ({id: crypto.randomUUID(), color: c.name, hex: c.hex, size, stock: null})))
    })),
    home: {
      tv: TV_PHOTOS.map((p, i) => ({ ...image(p.src, p.alt), enabled: true, sortOrder: i })),
      lookbook: LOOKBOOK_SLIDES.map((p, i) => ({ ...image(p.image, p.alt), enabled: true, sortOrder: i })),
      hero: []
    },
    settings: { storeName: "Everywear", currency: "USD" }
  };
}
