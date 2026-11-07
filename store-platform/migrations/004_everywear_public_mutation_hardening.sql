-- Defense in depth: public visitors may read published resources but never mutate them.
revoke insert, update, delete, truncate, references, trigger on
 public.everywear_admins,
 public.everywear_categories,
 public.everywear_products,
 public.everywear_product_variants,
 public.everywear_product_images,
 public.everywear_home_media
from anon;
-- SECURITY: auth admins remains denied direct INSERT/UPDATE/DELETE.
revoke insert, update, delete, truncate, references, trigger on public.everywear_admins from authenticated;