-- Corrección de función SQL: variable `v_product_id` inequívoca para operaciones de edición.
-- Atomic product editor save, executed with the authenticated caller's own RLS rights.
create or replace function public.everywear_save_product(payload jsonb)
returns uuid language plpgsql security invoker set search_path='' as $$
declare
  v_product_id uuid;
  record jsonb;
  i int;
  status_text text;
begin
  if not exists(select 1 from public.everywear_admins a where a.user_id=(select auth.uid())) then
    raise exception 'Everywear: administrator authorization required' using errcode='42501';
  end if;
  if payload is null or jsonb_typeof(payload) <> 'object' then
    raise exception 'Invalid product payload';
  end if;
  if jsonb_typeof(coalesce(payload->'variants','[]'::jsonb)) <> 'array'
     or jsonb_typeof(coalesce(payload->'images','[]'::jsonb)) <> 'array' then
    raise exception 'Invalid variants or images';
  end if;
  v_product_id := coalesce(nullif(payload->>'id','')::uuid,gen_random_uuid());
  status_text := coalesce(payload->>'status','draft');
  if status_text='active' and
    (jsonb_array_length(coalesce(payload->'variants','[]'::jsonb))=0
    or jsonb_array_length(coalesce(payload->'images','[]'::jsonb))=0) then
    raise exception 'Published products require images and variants';
  end if;
  insert into public.everywear_products
  (id,slug,name,category,description,price,status,featured,tag,sort_order)
  values(v_product_id,payload->>'slug',payload->>'name',coalesce(payload->>'category','Otros'),
     coalesce(payload->>'description',''),coalesce((payload->>'price')::numeric,0),
     status_text,coalesce((payload->>'featured')::boolean,false),
     coalesce(payload->>'tag',''),coalesce((payload->>'sortOrder')::integer,0))
  on conflict(id) do update set slug=excluded.slug,name=excluded.name,category=excluded.category,
     description=excluded.description,price=excluded.price,status=excluded.status,
     featured=excluded.featured,tag=excluded.tag,sort_order=excluded.sort_order;
  delete from public.everywear_product_variants v where v.product_id=v_product_id;
  for record in select value from jsonb_array_elements(coalesce(payload->'variants','[]'::jsonb)) loop
    insert into public.everywear_product_variants(product_id,color,hex,size,stock,sort_order)
    values(v_product_id,record->>'color',coalesce(record->>'hex','#777777'),record->>'size',
    nullif(record->>'stock','')::int,coalesce((record->>'sortOrder')::int,0));
  end loop;
  delete from public.everywear_product_images im where im.product_id=v_product_id;
  i:=0;
  for record in select value from jsonb_array_elements(coalesce(payload->'images','[]'::jsonb)) loop
    insert into public.everywear_product_images(product_id,src,alt,sort_order)
    values(v_product_id,record->>'src',coalesce(record->>'alt',''),i);
    i:=i+1;
  end loop;
  return v_product_id;
end $$;
revoke all on function public.everywear_save_product(jsonb) from public,anon;
grant execute on function public.everywear_save_product(jsonb) to authenticated;