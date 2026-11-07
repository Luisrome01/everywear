drop policy if exists ew_categories_admin_write on public.everywear_categories;
create policy ew_categories_admin_insert on public.everywear_categories for insert to authenticated with check (exists(select 1 from public.everywear_admins a where a.user_id=(select auth.uid())));
create policy ew_categories_admin_update on public.everywear_categories for update to authenticated using (exists(select 1 from public.everywear_admins a where a.user_id=(select auth.uid()))) with check (exists(select 1 from public.everywear_admins a where a.user_id=(select auth.uid())));
create policy ew_categories_admin_delete on public.everywear_categories for delete to authenticated using (exists(select 1 from public.everywear_admins a where a.user_id=(select auth.uid())));

drop policy if exists ew_products_admin_write on public.everywear_products;
create policy ew_products_admin_insert on public.everywear_products for insert to authenticated with check (exists(select 1 from public.everywear_admins a where a.user_id=(select auth.uid())));
create policy ew_products_admin_update on public.everywear_products for update to authenticated using (exists(select 1 from public.everywear_admins a where a.user_id=(select auth.uid()))) with check (exists(select 1 from public.everywear_admins a where a.user_id=(select auth.uid())));
create policy ew_products_admin_delete on public.everywear_products for delete to authenticated using (exists(select 1 from public.everywear_admins a where a.user_id=(select auth.uid())));

drop policy if exists ew_variants_admin_write on public.everywear_product_variants;
create policy ew_variants_admin_insert on public.everywear_product_variants for insert to authenticated with check (exists(select 1 from public.everywear_admins a where a.user_id=(select auth.uid())));
create policy ew_variants_admin_update on public.everywear_product_variants for update to authenticated using (exists(select 1 from public.everywear_admins a where a.user_id=(select auth.uid()))) with check (exists(select 1 from public.everywear_admins a where a.user_id=(select auth.uid())));
create policy ew_variants_admin_delete on public.everywear_product_variants for delete to authenticated using (exists(select 1 from public.everywear_admins a where a.user_id=(select auth.uid())));

drop policy if exists ew_images_admin_write on public.everywear_product_images;
create policy ew_images_admin_insert on public.everywear_product_images for insert to authenticated with check (exists(select 1 from public.everywear_admins a where a.user_id=(select auth.uid())));
create policy ew_images_admin_update on public.everywear_product_images for update to authenticated using (exists(select 1 from public.everywear_admins a where a.user_id=(select auth.uid()))) with check (exists(select 1 from public.everywear_admins a where a.user_id=(select auth.uid())));
create policy ew_images_admin_delete on public.everywear_product_images for delete to authenticated using (exists(select 1 from public.everywear_admins a where a.user_id=(select auth.uid())));

drop policy if exists ew_home_admin_write on public.everywear_home_media;
create policy ew_home_admin_insert on public.everywear_home_media for insert to authenticated with check (exists(select 1 from public.everywear_admins a where a.user_id=(select auth.uid())));
create policy ew_home_admin_update on public.everywear_home_media for update to authenticated using (exists(select 1 from public.everywear_admins a where a.user_id=(select auth.uid()))) with check (exists(select 1 from public.everywear_admins a where a.user_id=(select auth.uid())));
create policy ew_home_admin_delete on public.everywear_home_media for delete to authenticated using (exists(select 1 from public.everywear_admins a where a.user_id=(select auth.uid())));