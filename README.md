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
