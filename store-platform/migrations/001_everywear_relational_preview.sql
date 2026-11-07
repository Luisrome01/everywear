-- Everywear preview: relational store model, PERSONAL Supabase only.
-- Changes are additive; never affects Proporca projects.
create extension if not exists pgcrypto with schema extensions;
create table public.everywear_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table public.everywear_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(btrim(name)) between 2 and 80),
  sort_order integer not null default 0
);
create table public.everywear_products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 2 and 180),
  slug text not null unique check (length(slug) between 2 and 200),
  category text not null default 'Otros',
  description text not null default '',
  price numeric(12,2) not null default 0 check (price >= 0),
  status text not null default 'draft' check (status in ('draft','active','archived')),
  featured boolean not null default false,
  tag text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.everywear_product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.everywear_products(id) on delete cascade,
  color text not null check (length(btrim(color)) between 1 and 80),
  hex text not null default '#777777' check (hex ~ '^#[0-9a-fA-F]{6}$'),
  size text not null check (length(btrim(size)) between 1 and 30),
  stock integer check (stock is null or stock >= 0),
  sort_order integer not null default 0
);
create unique index ew_variant_unique_color_size on public.everywear_product_variants(product_id,lower(color),lower(size));
create index ew_variants_product_sort on public.everywear_product_variants(product_id,sort_order);
create table public.everywear_product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.everywear_products(id) on delete cascade,
  src text not null check (length(src) > 1),
  alt text not null default '',
  sort_order integer not null default 0
);
create index ew_images_product_sort on public.everywear_product_images(product_id,sort_order);
create table public.everywear_home_media (
  id uuid primary key default gen_random_uuid(),
  section text not null check (section in ('tv','lookbook','hero')),
  src text not null check (length(src)>1),
  alt text not null default '',
  sort_order integer not null default 0,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index ew_products_status_sort on public.everywear_products(status,sort_order);
create index ew_media_section_sort on public.everywear_home_media(section,sort_order);

create function public.everywear_touch_updated_at() returns trigger
language plpgsql security invoker set search_path='' as $$
begin new.updated_at=now();return new;end;$$;
create trigger ew_touch_products before update on public.everywear_products
for each row execute function public.everywear_touch_updated_at();
create trigger ew_touch_home before update on public.everywear_home_media
for each row execute function public.everywear_touch_updated_at();

alter table public.everywear_admins enable row level security;
alter table public.everywear_categories enable row level security;
alter table public.everywear_products enable row level security;
alter table public.everywear_product_variants enable row level security;
alter table public.everywear_product_images enable row level security;
alter table public.everywear_home_media enable row level security;

create policy ew_admin_read_own on public.everywear_admins for select to authenticated
using (user_id=(select auth.uid()));
create policy ew_categories_public_select on public.everywear_categories for select to anon,authenticated
using (true);
create policy ew_categories_admin_write on public.everywear_categories for all to authenticated
using (exists(select 1 from public.everywear_admins a where a.user_id=(select auth.uid())))
with check (exists(select 1 from public.everywear_admins a where a.user_id=(select auth.uid())));

create policy ew_products_read on public.everywear_products for select to anon,authenticated
using (status='active' or exists(select 1 from public.everywear_admins a where a.user_id=(select auth.uid())));
create policy ew_products_admin_write on public.everywear_products for all to authenticated
using (exists(select 1 from public.everywear_admins a where a.user_id=(select auth.uid())))
with check (exists(select 1 from public.everywear_admins a where a.user_id=(select auth.uid())));

create policy ew_variants_read on public.everywear_product_variants for select to anon,authenticated
using (
 exists(select 1 from public.everywear_products p where p.id=product_id and p.status='active')
 or exists(select 1 from public.everywear_admins a where a.user_id=(select auth.uid()))
);
create policy ew_variants_admin_write on public.everywear_product_variants for all to authenticated
using (exists(select 1 from public.everywear_admins a where a.user_id=(select auth.uid())))
with check (exists(select 1 from public.everywear_admins a where a.user_id=(select auth.uid())));

create policy ew_images_read on public.everywear_product_images for select to anon,authenticated
using (
 exists(select 1 from public.everywear_products p where p.id=product_id and p.status='active')
 or exists(select 1 from public.everywear_admins a where a.user_id=(select auth.uid()))
);
create policy ew_images_admin_write on public.everywear_product_images for all to authenticated
using (exists(select 1 from public.everywear_admins a where a.user_id=(select auth.uid())))
with check (exists(select 1 from public.everywear_admins a where a.user_id=(select auth.uid())));

create policy ew_home_read on public.everywear_home_media for select to anon,authenticated
using (enabled or exists(select 1 from public.everywear_admins a where a.user_id=(select auth.uid())));
create policy ew_home_admin_write on public.everywear_home_media for all to authenticated
using (exists(select 1 from public.everywear_admins a where a.user_id=(select auth.uid())))
with check (exists(select 1 from public.everywear_admins a where a.user_id=(select auth.uid())));

grant select on public.everywear_categories, public.everywear_products,
 public.everywear_product_variants, public.everywear_product_images,public.everywear_home_media to anon,authenticated;
grant select on public.everywear_admins to authenticated;
revoke all on public.everywear_admins from anon;
grant insert,update,delete on public.everywear_categories, public.everywear_products,
 public.everywear_product_variants,public.everywear_product_images,public.everywear_home_media to authenticated;

insert into public.everywear_categories(name,sort_order)
values ('Tops',1),('Conjuntos',2),('Pantalones',3),('Vestidos',4),
('Accesorios',5),('Otros',6);
-- Public image hosting; writes only admin users. Never store service_role keys in the frontend.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values('everywear-media','everywear-media',true,8388608,array['image/jpeg','image/png','image/webp','image/avif'])
on conflict (id) do nothing;
create policy ew_storage_admin_insert on storage.objects for insert to authenticated
with check (bucket_id='everywear-media' and (name like 'products/%' or name like 'home/%') and
exists(select 1 from public.everywear_admins a where a.user_id=(select auth.uid())));
create policy ew_storage_admin_select on storage.objects for select to authenticated
using (bucket_id='everywear-media' and
exists(select 1 from public.everywear_admins a where a.user_id=(select auth.uid())));
create policy ew_storage_admin_update on storage.objects for update to authenticated
using (bucket_id='everywear-media' and exists(select 1 from public.everywear_admins a where a.user_id=(select auth.uid())))
with check (bucket_id='everywear-media' and exists(select 1 from public.everywear_admins a where a.user_id=(select auth.uid())));
create policy ew_storage_admin_delete on storage.objects for delete to authenticated
using (bucket_id='everywear-media' and exists(select 1 from public.everywear_admins a where a.user_id=(select auth.uid())));
