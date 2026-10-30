// Catálogo demostrativo. Reemplazar por stock, precios y fotografías aprobados.
export const MEDIA = {
  hero: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=1400&q=85",
  story: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=85",
  collection: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=85",
  accessories: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1100&q=85"
};

const url = (id, width = 760) => "https://images.unsplash.com/" + id + "?auto=format&fit=crop&w=" + width + "&q=82";
const tones = {
  crema: { name: "Crema", hex: "#E8DEC8" },
  oliva: { name: "Oliva", hex: "#76765A" },
  vino: { name: "Vino", hex: "#772E3D" },
  rosa: { name: "Rosa empolvado", hex: "#CE9394" },
  negro: { name: "Negro", hex: "#292522" },
  denim: { name: "Denim", hex: "#7C96B0" },
  hueso: { name: "Hueso", hex: "#F1E8D9" },
  chocolate: { name: "Chocolate", hex: "#655044" }
};

export const PRODUCTS = [
  { id: "camisa-essential", name: "Camisa Essential", category: "Tops", price: 42, tag: "Favorito", image: url("photo-1483985988355-763728e1935b"), images: [url("photo-1483985988355-763728e1935b"), url("photo-1490481651871-ab68de25d43d")], colors: [tones.crema, tones.oliva, tones.negro], sizes: ["XS","S","M","L"], description: "Un básico atemporal con una silueta relajada, pensado para combinar sin esfuerzo." },
  { id: "set-siena", name: "Set Siena", category: "Conjuntos", price: 78, tag: "Nuevo", image: url("photo-1515886657613-9f3515b0c78f"), images: [url("photo-1515886657613-9f3515b0c78f"), url("photo-1529139574466-a303027c1d8b")], colors: [tones.hueso, tones.chocolate], sizes: ["S","M","L"], description: "Dos piezas con carácter contemporáneo y una esencia versátil." },
  { id: "denim-roma", name: "Denim Roma", category: "Pantalones", price: 64, tag: "", image: url("photo-1541099649105-f69ad21f3246"), images: [url("photo-1541099649105-f69ad21f3246"), url("photo-1475178626620-a4d074967452")], colors: [tones.denim, tones.negro], sizes: ["26","28","30","32"], description: "Denim de inspiración europea para acompañarte todos los días." },
  { id: "vestido-alma", name: "Vestido Alma", category: "Vestidos", price: 72, tag: "Nuevo", image: url("photo-1539008835657-9e8e9680c956"), images: [url("photo-1539008835657-9e8e9680c956"), url("photo-1496747611176-843222e1e57c")], colors: [tones.vino, tones.crema, tones.negro], sizes: ["XS","S","M","L"], description: "Una pieza femenina que une movimiento, sencillez y presencia." },
  { id: "top-capri", name: "Top Capri", category: "Tops", price: 36, tag: "", image: url("photo-1551803091-e20673f15770"), images: [url("photo-1551803091-e20673f15770"), url("photo-1483985988355-763728e1935b")], colors: [tones.rosa, tones.hueso], sizes: ["XS","S","M","L"], description: "Líneas simples y un acabado delicado para construir looks propios." },
  { id: "blazer-paris", name: "Blazer Paris", category: "Chaquetas", price: 95, tag: "Editorial", image: url("photo-1591047139829-d91aecb6caea"), images: [url("photo-1591047139829-d91aecb6caea"), url("photo-1525507119028-ed4c629a60a3")], colors: [tones.chocolate, tones.negro, tones.crema], sizes: ["S","M","L"], description: "Estructura suave para elevar un outfit sin perder comodidad." },
  { id: "falda-midi", name: "Falda Midi", category: "Faldas", price: 57, tag: "", image: url("photo-1496747611176-843222e1e57c"), images: [url("photo-1496747611176-843222e1e57c"), url("photo-1539008835657-9e8e9680c956")], colors: [tones.oliva, tones.vino, tones.hueso], sizes: ["XS","S","M","L"], description: "Fluidez y elegancia para llevar de día o de noche." },
  { id: "bolso-nola", name: "Bolso Nola", category: "Accesorios", price: 53, tag: "Favorito", image: url("photo-1548036328-c9fa89d128fa"), images: [url("photo-1548036328-c9fa89d128fa"), url("photo-1553062407-98eeb64c6a62")], colors: [tones.chocolate, tones.negro, tones.crema], sizes: [], description: "El toque final: un bolso de líneas depuradas para tu día a día." }
];

export const CATEGORIES = ["Todos", "Tops", "Pantalones", "Vestidos", "Conjuntos", "Chaquetas", "Faldas", "Accesorios"];

export const money = value => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);
