-- Original on-screen catalog seeded in PERSONAL PREVIEW ONLY.
-- All 70 variant stocks remain NULL (unknown); no verified physical inventory.
insert into public.everywear_categories(name,sort_order)
values('Chaquetas',7),('Faldas',8) on conflict(name) do nothing;
insert into public.everywear_products(slug,name,category,description,price,status,tag,featured,sort_order)
values
('camisa-essential','Camisa Essential','Tops','Un básico atemporal con una silueta relajada, pensado para combinar sin esfuerzo.',42,'active','Favorito',true,0),
('set-siena','Set Siena','Conjuntos','Dos piezas con carácter contemporáneo y una esencia versátil.',78,'active','Nuevo',true,1),
('denim-roma','Denim Roma','Pantalones','Denim de inspiración europea para acompañarte todos los días.',64,'active','',true,2),
('vestido-alma','Vestido Alma','Vestidos','Una pieza femenina que une movimiento, sencillez y presencia.',72,'active','Nuevo',true,3),
('top-capri','Top Capri','Tops','Líneas simples y un acabado delicado para construir looks propios.',36,'active','',false,4),
('blazer-paris','Blazer Paris','Chaquetas','Estructura suave para elevar un outfit sin perder comodidad.',95,'active','Editorial',false,5),
('falda-midi','Falda Midi','Faldas','Fluidez y elegancia para llevar de día o de noche.',57,'active','',false,6),
('bolso-nola','Bolso Nola','Accesorios','El toque final: un bolso de líneas depuradas para tu día a día.',53,'active','Favorito',false,7)
on conflict(slug) do nothing;
insert into public.everywear_product_variants(product_id,color,hex,size,stock,sort_order)
select p.id,v.color,v.hex,v.size,null,v.ord from (
values
('camisa-essential','Crema','#E8DEC8','XS',0),
('camisa-essential','Crema','#E8DEC8','S',1),
('camisa-essential','Crema','#E8DEC8','M',2),
('camisa-essential','Crema','#E8DEC8','L',3),
('camisa-essential','Oliva','#76765A','XS',0),
('camisa-essential','Oliva','#76765A','S',1),
('camisa-essential','Oliva','#76765A','M',2),
('camisa-essential','Oliva','#76765A','L',3),
('camisa-essential','Negro','#292522','XS',0),
('camisa-essential','Negro','#292522','S',1),
('camisa-essential','Negro','#292522','M',2),
('camisa-essential','Negro','#292522','L',3),
('set-siena','Hueso','#F1E8D9','S',0),
('set-siena','Hueso','#F1E8D9','M',1),
('set-siena','Hueso','#F1E8D9','L',2),
('set-siena','Chocolate','#655044','S',0),
('set-siena','Chocolate','#655044','M',1),
('set-siena','Chocolate','#655044','L',2),
('denim-roma','Denim','#7C96B0','26',0),
('denim-roma','Denim','#7C96B0','28',1),
('denim-roma','Denim','#7C96B0','30',2),
('denim-roma','Denim','#7C96B0','32',3),
('denim-roma','Negro','#292522','26',0),
('denim-roma','Negro','#292522','28',1),
('denim-roma','Negro','#292522','30',2),
('denim-roma','Negro','#292522','32',3),
('vestido-alma','Vino','#772E3D','XS',0),
('vestido-alma','Vino','#772E3D','S',1),
('vestido-alma','Vino','#772E3D','M',2),
('vestido-alma','Vino','#772E3D','L',3),
('vestido-alma','Crema','#E8DEC8','XS',0),
('vestido-alma','Crema','#E8DEC8','S',1),
('vestido-alma','Crema','#E8DEC8','M',2),
('vestido-alma','Crema','#E8DEC8','L',3),
('vestido-alma','Negro','#292522','XS',0),
('vestido-alma','Negro','#292522','S',1),
('vestido-alma','Negro','#292522','M',2),
('vestido-alma','Negro','#292522','L',3),
('top-capri','Rosa empolvado','#CE9394','XS',0),
('top-capri','Rosa empolvado','#CE9394','S',1),
('top-capri','Rosa empolvado','#CE9394','M',2),
('top-capri','Rosa empolvado','#CE9394','L',3),
('top-capri','Hueso','#F1E8D9','XS',0),
('top-capri','Hueso','#F1E8D9','S',1),
('top-capri','Hueso','#F1E8D9','M',2),
('top-capri','Hueso','#F1E8D9','L',3),
('blazer-paris','Chocolate','#655044','S',0),
('blazer-paris','Chocolate','#655044','M',1),
('blazer-paris','Chocolate','#655044','L',2),
('blazer-paris','Negro','#292522','S',0),
('blazer-paris','Negro','#292522','M',1),
('blazer-paris','Negro','#292522','L',2),
('blazer-paris','Crema','#E8DEC8','S',0),
('blazer-paris','Crema','#E8DEC8','M',1),
('blazer-paris','Crema','#E8DEC8','L',2),
('falda-midi','Oliva','#76765A','XS',0),
('falda-midi','Oliva','#76765A','S',1),
('falda-midi','Oliva','#76765A','M',2),
('falda-midi','Oliva','#76765A','L',3),
('falda-midi','Vino','#772E3D','XS',0),
('falda-midi','Vino','#772E3D','S',1),
('falda-midi','Vino','#772E3D','M',2),
('falda-midi','Vino','#772E3D','L',3),
('falda-midi','Hueso','#F1E8D9','XS',0),
('falda-midi','Hueso','#F1E8D9','S',1),
('falda-midi','Hueso','#F1E8D9','M',2),
('falda-midi','Hueso','#F1E8D9','L',3),
('bolso-nola','Chocolate','#655044','Única',0),
('bolso-nola','Negro','#292522','Única',0),
('bolso-nola','Crema','#E8DEC8','Única',0)
) as v(slug,color,hex,size,ord)
join public.everywear_products p on p.slug=v.slug
where not exists(select 1 from public.everywear_product_variants x where x.product_id=p.id);
insert into public.everywear_product_images(product_id,src,alt,sort_order)
select p.id,i.src,i.alt,i.ord from (
values
('camisa-essential','https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=760&q=82','Camisa Essential',0),
('camisa-essential','https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=760&q=82','Camisa Essential',1),
('set-siena','https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=760&q=82','Set Siena',0),
('set-siena','https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=760&q=82','Set Siena',1),
('denim-roma','https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=760&q=82','Denim Roma',0),
('denim-roma','https://images.unsplash.com/photo-1475178626620-a4d074967452?auto=format&fit=crop&w=760&q=82','Denim Roma',1),
('vestido-alma','https://images.unsplash.com/photo-1539008835657-9e8e9680c956?auto=format&fit=crop&w=760&q=82','Vestido Alma',0),
('vestido-alma','https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=760&q=82','Vestido Alma',1),
('top-capri','https://images.unsplash.com/photo-1551803091-e20673f15770?auto=format&fit=crop&w=760&q=82','Top Capri',0),
('top-capri','https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=760&q=82','Top Capri',1),
('blazer-paris','https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=760&q=82','Blazer Paris',0),
('blazer-paris','https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?auto=format&fit=crop&w=760&q=82','Blazer Paris',1),
('falda-midi','https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=760&q=82','Falda Midi',0),
('falda-midi','https://images.unsplash.com/photo-1539008835657-9e8e9680c956?auto=format&fit=crop&w=760&q=82','Falda Midi',1),
('bolso-nola','https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=760&q=82','Bolso Nola',0),
('bolso-nola','https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=760&q=82','Bolso Nola',1)
) as i(slug,src,alt,ord)
join public.everywear_products p on p.slug=i.slug
where not exists(select 1 from public.everywear_product_images x where x.product_id=p.id);