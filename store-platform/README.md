# Everywear Full Store — fase 1

**Repositorio:** \`Luisrome01/everywear\`  
**Rama de origen:** \`video-scroll-test\` (commit \`20d45492442cf8a2fb90ab2c1ce5b9a86fc6620a\`)  
**Rama de trabajo:** \`everywhere-full-store-scroll-preview\`

## Regla principal: preservar el diseño actual
No se alteraron los archivos existentes de \`src/\`, \`public/\`, \`index.html\`, \`package.json\`, ni los recursos de scroll. Todo el avance se ubicó en la carpeta **\`store-platform/\`** de la nueva rama. No hay conexión a una base de datos, ni despliegue de producción.

## Lo creado
- \`admin/index.html\`, \`admin/styles.css\`, \`admin/app.js\`: **panel de demostración** con dashboard, gestión de productos, variantes, stock, fotos, imágenes del Home, exportar/importar JSON y reinicio.
- \`admin/fixtures.js\`: importa los productos, fotos de TV y lookbook originales para pruebas. No inventa cantidades de inventario; las marca como **sin definir**. Todos los productos comienzan como borradores.
- \`catalog-adapter.js\`: adapta filas dinámicas a los objetos que consume el frontend actual; será útil al conectar la API.
- \`supabase-repository.js\`: interfaz de repositorio para un futuro cliente Supabase autenticado. No está conectada al panel todavía.
- \`schema-draft.sql\`: propuesta de SQL con tablas, política de roles, Storage y RLS. **No ejecutada**.

## Cómo probar el panel (solo local)
Desde la raíz del repositorio:

\`\`\`bash
npm install
npm run dev
\`\`\`

Abrir: **http://localhost:5173/store-platform/admin/**

El proyecto público se visualiza como siempre en \`http://localhost:5173/\`. El administrador es una ruta independiente que no se importa en el sitio actual.

### Funciones de demostración
1. **Productos:** crear, editar nombre, descripción, precio, categoría, etiqueta, estado y destacado; archivar un producto.
2. **Tallas y colores:** agregar/eliminar variantes. El stock vacío significa *aún no registrado*, mientras \`0\` significa *agotado*. Se impiden duplicados color + talla.
3. **Imágenes:** agregar URLs de fotos o seleccionar archivos locales de hasta 350 KB por foto para probar la interfaz.
4. **Home:** gestionar independientemente las fotos de los tres televisores, lookbook y hero; editar URL, descripción, visibilidad y orden.
5. **Datos:** guardar en localStorage del navegador, exportar/importar JSON de pruebas y volver a los ejemplos iniciales.

**ATENCIÓN:** Este panel **NO tiene autenticación**. No desplegarlo públicamente ni utilizarlo para administrar inventario real. La persistencia de la demo es local y susceptible a borrarse. El estado \`Activo\` dentro del panel no publica productos en Everywear.

## Arquitectura para la etapa con Supabase
- **Auth:** acceso solamente a administradores aprobados en \`everywear_admins\`.
- **PostgreSQL:** \`everywear_products\` (productos con variantes e imágenes) y \`everywear_home_media\` (galerías del Home).
- **Storage:** bucket \`everywear-media\`; formatos y tamaños restringidos.
- **Políticas RLS:** lectura pública de productos activos y fotos visibles; escrituras reservadas a administradores.
- **Frontend:** el archivo \`src/app.js\` actual se conectará más adelante al adaptador dinámico, conservando su diseño y animaciones. Es necesario manejar carga, errores, borrados de productos y carritos antiguos.

La API inicial puede ser el **Data API** de Supabase (PostgREST), evitando desplegar un servidor propio para operaciones CRUD básicas.

## Pendientes de siguiente etapa
- Revisar el diseño del esquema con los productos reales, permisos, catálogo y categorías definitivas.
- Conectar Supabase y ejecutar SQL solo después de revisión, pruebas de seguridad y autorización.
- Reemplazar el repositorio local del panel por el adaptador Supabase, añadir **pantalla de inicio de sesión**, carga real a Storage y manejo de errores.
- Integrar datos dinámicos al frontend de \`video-scroll-test\` en esta rama, sin cambiar estilos ni efectos de scroll.
- Cargar productos/precios/fotografías aprobados y validar cada variante.
- Añadir registro de ventas o ajustes manuales para controlar stock: un pedido enviado por WhatsApp NO confirma una venta ni permite descontar automáticamente.
- Pruebas de build y navegación, rendimiento, seguridad, UX móvil y despliegue de prueba independiente.

### Seguridad
La clave publicable del proyecto puede usarse en un cliente web **solo con RLS correctamente configurada**. Nunca se debe incluir una \`service_role\` ni una clave secreta en JavaScript público. La autorización debe comprobarse en la base de datos, no solo ocultando botones en el panel.

### Estado de esta entrega
La fase 1 es un **prototipo funcional de navegador y una base de integración**. No es todavía una API funcionando, una tienda sincronizada ni un administrador de producción.
