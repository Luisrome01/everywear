import { PRODUCTS } from "./data.js";

// Galería de las tres pantallas de Everywear.
// Cambia estas entradas por tus fotografías reales cuando las tengas:
// { src: "/brand/tv-photos/nombre-de-la-prenda.webp", alt: "Descripción" }
// Puedes añadir tantas como quieras; diez es solo el punto de partida.
// Hasta cargar las fotos definitivas se utilizan imágenes ilustrativas del catálogo.
const selections = [
  PRODUCTS[3].image,
  PRODUCTS[0].image,
  PRODUCTS[4].image,
  PRODUCTS[1].image,
  PRODUCTS[5].image,
  PRODUCTS[6].image,
  PRODUCTS[2].image,
  PRODUCTS[7].image,
  PRODUCTS[3].images[1],
  PRODUCTS[0].images[1]
];

export const TV_PHOTOS = selections.map((src, i) => ({
  src,
  alt: "Selección de moda Everywear " + String(i + 1).padStart(2, "0")
}));
