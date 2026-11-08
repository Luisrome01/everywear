// Everywear preview: public storefront at /, Supabase-authenticated Studio at /config.
// Authorization for product writes is enforced by Supabase RLS, never by a URL.
import http from "node:http";
import {stat,readFile} from "node:fs/promises";
import {resolve,sep,extname} from "node:path";
import {fileURLToPath} from "node:url";

const ROOT=resolve(fileURLToPath(new URL("../dist/",import.meta.url)));
const PORT=Number(process.env.PORT||10000);
const types={
  ".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",
  ".mjs":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",
  ".svg":"image/svg+xml",".webp":"image/webp",".png":"image/png",
  ".jpg":"image/jpeg",".jpeg":"image/jpeg",".gif":"image/gif",
  ".avif":"image/avif",".mp4":"video/mp4",".webm":"video/webm",
  ".woff":"font/woff",".woff2":"font/woff2",".ico":"image/x-icon",
  ".json":"application/json; charset=utf-8",".txt":"text/plain; charset=utf-8",
  ".wasm":"application/wasm"
};
const server=http.createServer(async(req,res)=>{
  res.setHeader("X-Content-Type-Options","nosniff");
  res.setHeader("X-Frame-Options","DENY");
  res.setHeader("Referrer-Policy","strict-origin-when-cross-origin");
  res.setHeader("Cross-Origin-Resource-Policy","same-origin");
  let pathname;
  try{pathname=decodeURIComponent(new URL(req.url||"/","http://localhost").pathname);}
  catch{res.writeHead(400);return res.end("Bad request");}
  if(pathname==="/healthz"){
    res.writeHead(200,{"Content-Type":"text/plain; charset=utf-8"});
    return res.end(req.method==="HEAD"?undefined:"OK");
  }
  // Legacy private gateway and admin paths are no longer login endpoints.
  // No credentials are accepted or checked by the Render server.
  if(pathname==="/access"||pathname==="/logout"||pathname==="/store-platform/admin"||
     pathname==="/store-platform/admin/"||pathname==="/store-platform/admin/index.html"){
    res.writeHead(303,{"Location":"/config","Cache-Control":"no-store"});
    return res.end();
  }
  if(req.method!=="GET"&&req.method!=="HEAD"){
    res.writeHead(405,{"Allow":"GET, HEAD"});return res.end("Method not allowed");
  }
  if(pathname.includes("\\")||pathname.includes("\0")||pathname.split("/").includes("..")){
    res.writeHead(400);return res.end("Bad path");
  }
  const admin=pathname==="/config"||pathname==="/config/";
  const filename=admin?"store-platform/admin/index.html":
    pathname==="/config/index.html"?"store-platform/admin/index.html":
    pathname==="/"? "index.html" : pathname.replace(/^\//,"");
  let target=resolve(ROOT,filename);
  if(target!==ROOT&&!target.startsWith(ROOT+sep)){
    res.writeHead(403);return res.end("Forbidden");
  }
  try{
    const info=await stat(target);
    if(info.isDirectory())target=resolve(target,"index.html");
    if(!target.startsWith(ROOT+sep)){res.writeHead(403);return res.end("Forbidden");}
    const data=await readFile(target);
    res.writeHead(200,{"Content-Type":types[extname(target).toLowerCase()]||"application/octet-stream",
      "Cache-Control":admin||extname(target)===".html"?"no-store":"public, max-age=300"});
    return res.end(req.method==="HEAD"?undefined:data);
  }catch(error){
    if(error.code!=="ENOENT"&&error.code!=="ENOTDIR")
      console.error("Everywear static response failed",error.code);
    res.writeHead(404,{"Content-Type":"text/plain; charset=utf-8"});
    return res.end("Not found");
  }
});
server.listen(PORT,"0.0.0.0",()=>console.log("Everywear public store + Supabase Studio ready on port",PORT));
