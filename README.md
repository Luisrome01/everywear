# Everywear — boutique editorial

Sitio web de Everywear: landing de marca y catálogo con selección de variantes y pedidos por WhatsApp.

## Ejecutar

```bash
npm install
npm run dev
```

## Configuración

Crea un archivo `.env` en la raíz tomando `.env.example` como referencia y establece `VITE_WHATSAPP_NUMBER` con el teléfono comercial en formato internacional, solo dígitos. Ejemplo de formato: `584120000000` (ejemplo ficticio, NO el número de la tienda).

Mientras no se configure el número, los enlaces usan el flujo para compartir un mensaje mediante WhatsApp, sin destinatario predeterminado. No hay pasarela de pago ni órdenes persistidas en un servidor.

**Aviso**: los productos, imágenes y precios iniciales son demostrativos y deben sustituirse con el inventario aprobado de Everywear. Las fotos de demostración se cargan desde Unsplash. La identidad de color y el enfoque editorial fueron inspirados por las referencias visuales aportadas.

## Despliegue

Aplicación estática con Vite. Comando de compilación `npm run build`, carpeta de salida `dist`. La navegación usa hash (`#/catalogo`), por lo que no requiere reglas especiales de rewrite.

## Televisores editoriales

El componente de tres televisores se encuentra en `src/app.js` y utiliza un solo marco vectorial estático, `public/brand/tv-stack.svg`. Las fotografías se muestran mediante elementos HTML independientes detrás de las tres pantallas.

La lista editable de fotografías está en `src/tv-photos.js` (`TV_PHOTOS`). Inicialmente contiene diez fotografías ilustrativas del catálogo. Para incluir las fotografías de ropa oficiales, colócalas en `public/brand/tv-photos/` y reemplaza las entradas con rutas como `/brand/tv-photos/outfit-01.webp`. Se admiten más de diez fotografías sin modificar el componente.

Mientras la sección es visible, cada pantalla muestra nuevas imágenes aleatorias a intervalos ligeramente diferentes, evita repeticiones inmediatas y no selecciona fotografías que estén apareciendo en otras pantallas. Al salir de la vista o pasar la pestaña a segundo plano, los cambios se pausan. Se respetan las preferencias de movimiento reducido. Haz clic o toca una pantalla para cambiar su fotografía manualmente.
