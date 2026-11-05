// Password-protected PREVIEW ONLY. Not a production storefront/auth solution.
// All paths (including JS/CSS/images) require HTTP Basic Auth.
import http from "node:http";
import {createHash, timingSafeEqual} from "node:crypto";
import {stat, readFile} from "node:fs/promises";
import {resolve, sep, extname} from "node:path";
import {fileURLToPath} from "node:url";

const ROOT = resolve(fileURLToPath(new URL("../dist/", import.meta.url)));
const USER = process.env.PREVIEW_USER;
const PASS = process.env.PREVIEW_PASSWORD;
const PORT = Number(process.env.PORT || 10000);
if (!USER || !PASS || PASS.length < 16) {
  throw new Error("Missing PREVIEW_USER or a PREVIEW_PASSWORD of at least 16 characters");
}
const expected = createHash("sha256").update(USER + ":" + PASS).digest();
const types = {
  ".html":"text/html; charset=utf-8",
  ".js":"text/javascript; charset=utf-8",
  ".mjs":"text/javascript; charset=utf-8",
  ".css":"text/css; charset=utf-8",
  ".svg":"image/svg+xml",
  ".webp":"image/webp",
  ".png":"image/png",
  ".jpg":"image/jpeg",
  ".jpeg":"image/jpeg",
  ".gif":"image/gif",
  ".avif":"image/avif",
  ".mp4":"video/mp4",
  ".webm":"video/webm",
  ".woff":"font/woff",
  ".woff2":"font/woff2",
  ".ico":"image/x-icon",
  ".json":"application/json; charset=utf-8",
  ".txt":"text/plain; charset=utf-8",
  ".wasm":"application/wasm"
};
function authorized(req) {
  const header = req.headers.authorization || "";
  if (!/^Basic [a-z0-9+/=]+$/i.test(header) || header.length > 1024) return false;
  try {
    const raw = Buffer.from(header.slice(6), "base64").toString("utf8");
    const received = createHash("sha256").update(raw).digest();
    return timingSafeEqual(received, expected);
  } catch { return false; }
}
const server = http.createServer(async(req,res)=>{
  const securityHeaders = {
    "X-Content-Type-Options":"nosniff",
    "X-Frame-Options":"DENY",
    "Referrer-Policy":"no-referrer",
    "Cache-Control":"private, no-store",
    "Cross-Origin-Resource-Policy":"same-origin"
  };
  for(const [key,value] of Object.entries(securityHeaders))res.setHeader(key,value);
  if(req.url==="/healthz"){
    res.writeHead(200,{"Content-Type":"text/plain; charset=utf-8"});
    return res.end("OK");
  }
  if(!["GET","HEAD"].includes(req.method)){
    res.writeHead(405,{"Allow":"GET, HEAD"});return res.end();
  }
  if(!authorized(req)){
    res.writeHead(401,{"WWW-Authenticate":'Basic realm="Everywear private preview", charset="UTF-8"', "Content-Type":"text/plain; charset=utf-8"});
    return res.end("Esta vista previa requiere usuario y contrasena.");
  }
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url,"http://localhost").pathname);
  } catch {
    res.writeHead(400);return res.end();
  }
  if(pathname.includes("\0") || pathname.includes("\\") || pathname.includes("..")){
    res.writeHead(400);return res.end();
  }
  let target = resolve(ROOT,"." + pathname);
  if(target !== ROOT && !target.startsWith(ROOT + sep)){
    res.writeHead(403);return res.end();
  }
  try {
    const info = await stat(target);
    if(info.isDirectory())target = resolve(target,"index.html");
    const data = await readFile(target);
    res.writeHead(200,{"Content-Type":types[extname(target).toLowerCase()]||"application/octet-stream"});
    return res.end(req.method==="HEAD" ? undefined : data);
  } catch(err) {
    // Missing files are 404. No fallback routing on this private Vite multipage preview.
    if(err.code !== "ENOENT" && err.code !== "ENOTDIR") console.error("Preview read error:",err.code);
    res.writeHead(404,{"Content-Type":"text/plain; charset=utf-8"});
    return res.end("Not found");
  }
});
server.listen(PORT,"0.0.0.0",()=>console.log("Protected Everywear preview ready on port",PORT));
