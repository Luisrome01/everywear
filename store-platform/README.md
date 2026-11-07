# Everywear Studio — Preview con Supabase PERSONAL

**Rama exclusiva de desarrollo:** `everywhere-full-store-scroll-preview`  
**Render protegido:** https://everywear-full-store-preview.onrender.com  
**Panel:** https://everywear-full-store-preview.onrender.com/store-platform/admin/  
**Base de datos:** Supabase PERSONAL, proyecto `pzkspmqwdhcfyxrbndaa`. PROPORCA no participa.

## Arquitectura

El panel ya no guarda productos, fotos o inventarios en localStorage. Usa un cliente HTTP con Supabase Auth, la API REST de PostgreSQL y Storage. La sesión de usuario sí puede guardarse en el navegador para mantener el acceso.

Las tablas creadas son:
- `everywear_admins`: lista autorizada de usuarios.
- `everywear_categories`: categorías configurables.
- `everywear_products`: ficha, precio, estado de publicación y destacados.
- `everywear_product_variants`: color, talla, existencias por combinación.
- `everywear_product_images`: fotografías ordenadas de cada producto.
- `everywear_home_media`: fotografías ordenadas de televisores, lookbook y hero.

Migraciones canónicas: `migrations/001_everywear_relational_preview.sql`, `migrations/002_everywear_atomic_editor.sql`, `migrations/003_everywear_anon_admin_policy_permission.sql`, `migrations/004_everywear_public_mutation_hardening.sql` y `migrations/005_everywear_split_write_policies.sql` y `migrations/006_seed_original_preview.sql`. Todas se aplicaron únicamente a Supabase PERSONAL. No vuelvas a ejecutarlas sin revisar el estado real. `schema-draft.sql` es solo un borrador histórico, **no es la estructura actual**.

Las seis tablas tienen RLS habilitado. Las escrituras requieren usuario Auth con su UUID registrado en `everywear_admins`; el público solo puede leer productos activos y medios habilitados. El bucket público `everywear-media` permite leer fotos, pero subir/actualizar/eliminar exige ser administrador.

## Primer acceso — configuración obligatoria

1. Abre **Supabase PERSONAL → Authentication → Users** para el proyecto indicado y crea o invita al usuario real de la administradora. No registres contraseñas en GitHub ni en ChatGPT.
2. Obtén su UUID real y agrégalo a la tabla de administradores desde el SQL Editor de ese mismo proyecto, previa verificación de identidad:
   ```sql
   insert into public.everywear_admins(user_id) values ('UUID_REAL_DEL_USUARIO');
   ```
3. Abre el panel privado (primero requerirá la contraseña temporal HTTP Basic de Render), luego inicia sesión con las credenciales de **Supabase Auth**. Son dos protecciones distintas.
4. Crea productos, añade variantes color/talla/stock, sube fotografías desde el dispositivo, guarda y cambia a **Activo** para mostrarlos en el catálogo preview.

No existe usuario Auth ni permisos concedidos automáticamente. No se debe compartir el correo/contraseña de la administradora en los commits.

## Catálogo y límites actuales

- El storefront obtiene su catálogo **exclusivamente de Supabase cuando la consulta funciona**. La base personal contiene las mismas 8 fichas originales del catálogo visible (mismos nombres, precios, colores, tallas y fotos) en estado Activo solo en este preview. Se importaron 70 variantes con `stock = NULL`, **sin inventar existencias**. Al archivar artículos no reaparecen por su posición en los arreglos. Los borradores, incluido el producto ficticio, no se publican.
- Las 10 fotografías de televisores y las 8 imágenes del lookbook originales están registradas en Supabase. Su edición administra el contenido sin modificar el motor de scroll.
- El producto `producto-prueba-everywear` es ficticio y permanece en **Borrador**.
- Pedidos enviados por WhatsApp **no** descuentan inventario. La venta no se confirma por abrir un enlace.
- Las fotografías se guardan en Storage con una URL pública; eliminar una foto del producto quita su referencia, pero no borra automáticamente el archivo del bucket, para evitar eliminar medios compartidos.
- Si la API no está disponible, el storefront recupera sus recursos editoriales originales.

## Render

El servicio de preview mantiene `autoDeploy=off`, la rama aislada y la protección HTTP Basic. Variables de compilación Vite (solo clave **publicable**, no secreta):
- `VITE_EW_SUPABASE_URL`
- `VITE_EW_SUPABASE_PUBLISHABLE_KEY`

No usar claves `service_role`, secret keys, contraseñas administrativas ni credenciales Render en JavaScript público.

## Verificaciones y pendientes

Verificar en navegador con una cuenta Auth habilitada: crear, editar, subir y retirar fotos, archivar, publicar en preview y comprobar respuesta después de recargar. Las pruebas SQL de almacenamiento y RLS se pueden hacer por separado, pero **no sustituyen** la prueba con una sesión de administradora. La tienda pública de producción y PROPORCA no deben modificarse.


## Pruebas de compilación

El script \`npm test\` ejecuta las pruebas de los adaptadores y datos iniciales. El \`prebuild\` del preview ejecuta esas pruebas antes de empaquetar las 97 imágenes del Hero con scroll. No es una prueba end-to-end en navegador.
