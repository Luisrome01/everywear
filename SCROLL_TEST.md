# Everywear — prueba de scroll por fotogramas

Rama: `video-scroll-test`. Esta prueba reemplaza únicamente la portada visual del **Home** por una escena controlada por scroll. No modifica el catálogo, la bolsa, WhatsApp ni la rama `main`.

## Cómo funciona

- 60 archivos `public/scroll-frames/frame_001.webp` a `frame_060.webp`, todos de 1280×720.
- Origen de la secuencia: video de Everywear con la modelo caminando estabilizada (5 segundos).
- `src/scroll-hero.js`: escena sticky, mapeo 0–100 % de scroll a los 60 frames, precarga de hasta cuatro imágenes simultáneas, soporte de scroll inverso y textos sincronizados.
- `src/scroll-hero.css`: adaptación a escritorio, tablet e iPhone, con paleta vainilla y vino.
- Al terminar el recorrido, se continúa con las secciones originales del Home.

## Validación

```bash
npm install
npm run build
npm run dev
```

En el navegador comprueba: frame 1 al inicio, frame 60 al final, reversibilidad al subir, pausa exacta al dejar de desplazar, títulos y ausencia de desplazamiento horizontal en iPhone. El Home de producción permanece en `main`.

> Prototipo editorial para evaluar el efecto. Las fotografías proceden del video de prueba y pueden sustituirse conservando la nomenclatura.
