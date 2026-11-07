import test from "node:test";
import assert from "node:assert/strict";
import { makeFixtures } from "../admin/fixtures.js";
import { productForStorefront, mediaForStorefront } from "../catalog-adapter.js";

test("original demo data maps to editor without inventing stock", () => {
  const data = makeFixtures();
  assert.equal(data.products.length, 8);
  assert.equal(data.home.tv.length, 10);
  assert.equal(data.home.lookbook.length, 8);
  assert.ok(data.products.every(product => product.status === "draft"));
  assert.equal(data.products.reduce((sum,p)=>sum+p.variants.length,0), 70);
  assert.ok(data.products.flatMap(p=>p.variants).every(v=>v.stock===null));
});

test("database rows map to the original storefront product API", () => {
  const item=productForStorefront({
    id:"x",name:"Camisa",category:"Tops",price:"35.50",tag:"Nuevo",
    images:[{src:"https://example.org/a.webp",alt:"foto"}],
    variants:[
      {color:"Crema",hex:"#e8dec8",size:"S",stock:2},
      {color:"Crema",hex:"#e8dec8",size:"M",stock:0},
      {color:"Negro",hex:"#292522",size:"S",stock:1}
    ]
  });
  assert.equal(item.price,35.5);
  assert.deepEqual(item.sizes,["S","M"]);
  assert.equal(item.colors.length,2);
  assert.equal(item.images.length,1);
  assert.equal(item.variants[1].stock,0);
});

test("TV selector ignores disabled media and keeps order", () => {
  const rows=[
    {section:"tv",src:"B",enabled:true,sort_order:2},
    {section:"tv",src:"A",enabled:true,sort_order:1},
    {section:"lookbook",src:"X",enabled:true,sort_order:0},
    {section:"tv",src:"hidden",enabled:false,sort_order:0}
  ];
  assert.deepEqual(mediaForStorefront(rows,"tv").map(x=>x.src),["A","B"]);
});

test("relational Supabase image/variant joins map to legacy storefront",()=>{
  const item=productForStorefront({
    id:"uuid",slug:"test-product",name:"Ejemplo",category:"Tops",price:"12.00",
    everywear_product_images:[{src:"/brand/bag.webp",sort_order:0}],
    everywear_product_variants:[
      {color:"Crema",hex:"#e8dec8",size:"S",stock:4},
      {color:"Negro",hex:"#292522",size:"M",stock:2}
    ]
  });
  assert.equal(item.slug,"test-product");
  assert.equal(item.price,12);
  assert.deepEqual(item.sizes,["S","M"]);
  assert.equal(item.image,"/brand/bag.webp");
  assert.equal(item.variants.length,2);
});
