-- Everywear Full Store — BORRADOR para aplicar cuando se conecte Supabase.
-- NO se ha ejecutado sobre ninguna base de datos.
-- Catálogo de una sola tienda; ventas/pagos siguen fuera del sistema.
-- El inventario se registra por talla y color en JSONB (MVP, sin reserva automática).

create table if not exists public.everywear_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.everywear_products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 2 and 180),
  slug text not null unique check (length(slug) between 2 and 200),
  category text not null default 'Otros',
  description text not null default '',
  price numeric(12,2) not null default 0 check (price >= 0),
  status text not null default 'draft' check (status in ('draft','active','archived')),
  featured boolean not null default false,
  sort_order integer not null default 0,
  -- images: [{ "src": "https://...", "alt": "..." }]
  images jsonb not null default '[]'::jsonb check (jsonb_typeof(images) = 'array'),
  -- variants: [{ "color": "Crema", "hex": "#E8DEC8", "size": "M", "stock": 4 }]
  variants jsonb not null default '[]'::jsonb check (jsonb_typeof(variants) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.everywear_home_media (
  id uuid primary key default gen_random_uuid(),
  section text not null check (section in ('tv','lookbook','hero')),
  src text not null check (length(src) > 1),
  alt text not null default '',
  sort_order integer not null default 0,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists everywear_products_status_sort_idx
  on public.everywear_products (status, sort_order);
create index if not exists everywear_home_media_section_sort_idx
  on public.everywear_home_media (section, sort_order);

create or replace function public.everywear_set_updated_at()
returns trigger language plpgsql security invoker set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists everywear_products_updated_at on public.everywear_products;
create trigger everywear_products_updated_at before update on public.everywear_products
for each row execute function public.everywear_set_updated_at();
drop trigger if exists everywear_media_updated_at on public.everywear_home_media;
create trigger everywear_media_updated_at before update on public.everywear_home_media
for each row execute function public.everywear_set_updated_at();

alter table public.everywear_admins enable row level security;
alter table public.everywear_products enable row level security;
alter table public.everywear_home_media enable row level security;

-- Solo el propietario de la cuenta autenticada puede consultar su fila de administrador.
-- Los administradores se asignan manualmente desde un entorno privilegiado.
create policy "ew_admins_read_self"
on public.everywear_admins for select to authenticated
using (user_id = (select auth.uid()));

-- Usuarios públicos: exclusivamente los productos publicados.
-- Administradores: catálogo completo y permisos de edición.
create policy "ew_products_public_read"
on public.everywear_products for select to anon, authenticated
using (
  status = 'active'
  or exists (select 1 from public.everywear_admins a where a.user_id = (select auth.uid()))
);
create policy "ew_products_admin_insert"
on public.everywear_products for insert to authenticated
with check (exists (select 1 from public.everywear_admins a where a.user_id = (select auth.uid())));
create policy "ew_products_admin_update"
on public.everywear_products for update to authenticated
using (exists (select 1 from public.everywear_admins a where a.user_id = (select auth.uid())))
with check (exists (select 1 from public.everywear_admins a where a.user_id = (select auth.uid())));
create policy "ew_products_admin_delete"
on public.everywear_products for delete to authenticated
using (exists (select 1 from public.everywear_admins a where a.user_id = (select auth.uid())));

create policy "ew_home_public_read"
on public.everywear_home_media for select to anon, authenticated
using (
  enabled
  or exists (select 1 from public.everywear_admins a where a.user_id = (select auth.uid()))
);
create policy "ew_home_admin_insert"
on public.everywear_home_media for insert to authenticated
with check (exists (select 1 from public.everywear_admins a where a.user_id = (select auth.uid())));
create policy "ew_home_admin_update"
on public.everywear_home_media for update to authenticated
using (exists (select 1 from public.everywear_admins a where a.user_id = (select auth.uid())))
with check (exists (select 1 from public.everywear_admins a where a.user_id = (select auth.uid())));
create policy "ew_home_admin_delete"
on public.everywear_home_media for delete to authenticated
using (exists (select 1 from public.everywear_admins a where a.user_id = (select auth.uid())));

grant select on public.everywear_products, public.everywear_home_media to anon, authenticated;
grant insert, update, delete on public.everywear_products, public.everywear_home_media to authenticated;
grant select on public.everywear_admins to authenticated;

-- Recursos públicos de la tienda: lectura libre; escrituras solo administradores.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('everywear-media', 'everywear-media', true, 8388608,
        array['image/jpeg','image/png','image/webp','image/avif'])
on conflict (id) do nothing;

create policy "ew_media_upload_admin"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'everywear-media'
  and (name like 'products/%' or name like 'home/%')
  and exists (select 1 from public.everywear_admins a where a.user_id = (select auth.uid()))
);
create policy "ew_media_update_admin"
on storage.objects for update to authenticated
using (
  bucket_id = 'everywear-media'
  and exists (select 1 from public.everywear_admins a where a.user_id = (select auth.uid()))
)
with check (
  bucket_id = 'everywear-media'
  and exists (select 1 from public.everywear_admins a where a.user_id = (select auth.uid()))
);
create policy "ew_media_delete_admin"
on storage.objects for delete to authenticated
using (
  bucket_id = 'everywear-media'
  and exists (select 1 from public.everywear_admins a where a.user_id = (select auth.uid()))
);

-- ATENCIÓN: no se crea ningún administrador automáticamente.
-- Primero crear el usuario con Supabase Auth y luego insertar su user_id
-- con permisos privilegiados: insert into public.everywear_admins(user_id) values ('UUID');
-- Nunca colocar secret/service_role keys en Vite ni en el navegador.
