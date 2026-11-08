// Private preview: a branded access screen with signed HttpOnly session cookie.
// After this gate, the Studio administrator separately uses Supabase Auth + RLS.
import http from "node:http";
import {createHash, createHmac, timingSafeEqual} from "node:crypto";
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
const accessPage = await readFile(fileURLToPath(new URL("./access-page.html",import.meta.url)), "utf8");
const cookieName = "ew_preview_session";
const sessionLifetime = 12 * 60 * 60 * 1000;
const sessionSecret = createHash("sha256").update("ew-preview-cookie-v1:"+USER+":"+PASS).digest();
const loginAttempts = new Map();
const MAX_BODY_SIZE = 8192;
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

function hash(value) {
  return createHash("sha256").update(value).digest();
}
function checkCredentials(user,pass) {
  const actual=hash(String(user)+":"+String(pass));
  return timingSafeEqual(actual,expected);
}
function signedToken(issued) {
  const stamp=String(issued);
  return stamp+"."+createHmac("sha256",sessionSecret).update(stamp).digest("base64url");
}
function authorized(req) {
  const cookie=String(req.headers.cookie||"").split(";")
    .map(part=>part.trim()).find(part=>part.startsWith(cookieName+"="));
  if(!cookie)return false;
  const token=cookie.slice(cookieName.length+1);
  const split=token.split(".");
  if(split.length!==2||!(/^[0-9]{13}$/.test(split[0])))return false;
  const when=Number(split[0]);
  if(!Number.isSafeInteger(when)||when>Date.now()+30000||Date.now()-when>sessionLifetime)return false;
  const actual=Buffer.from(split[1],"base64url");
  const expectedSignature=createHmac("sha256",sessionSecret).update(split[0]).digest();
  return actual.length===expectedSignature.length && timingSafeEqual(actual,expectedSignature);
}
function safeDestination(value){
  const fallback="/store-platform/admin/";
  if(typeof value!=="string"||!value.startsWith("/")||value.startsWith("//")
      ||/[\\\x00-\x1f]/.test(value))return fallback;
  try{
    const url=new URL(value,"https://everywear.preview.invalid");
    if(url.origin!=="https://everywear.preview.invalid"||url.pathname.startsWith("//")
      ||url.pathname==="/access"||url.pathname==="/logout")return fallback;
    return url.pathname+url.search+url.hash;
  }catch{return fallback;}
}
function escapeHtml(value){
  return String(value).replace(/[&<>"']/g,char=>({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  })[char]);
}
function showAccess(req,res,returnTo,message="",status=200){
  const warning=message?'<p class="message" role="alert">'+escapeHtml(message)+'</p>':"";
  const html=accessPage.replace("{{NEXT}}",escapeHtml(safeDestination(returnTo)))
    .replace("{{MESSAGE}}",warning);
  res.writeHead(status,{"Content-Type":"text/html; charset=utf-8",
    "Content-Security-Policy":"default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"});
  return res.end(req.method==="HEAD"?undefined:html);
}
function redirect(res,to,cookie){
  res.writeHead(303,{"Location":safeDestination(to),
    ...(cookie?{"Set-Cookie":cookie}:{})});
  return res.end();
}
async function readForm(req){
  let bytes=0;
  const chunks=[];
  for await(const chunk of req){
    bytes+=chunk.length;
    if(bytes>MAX_BODY_SIZE)throw Error("Formulario demasiado grande");
    chunks.push(chunk);
  }
  return new URLSearchParams(Buffer.concat(chunks).toString("utf8"));
}
function clientBucket(req){
  // Render sits behind proxies. Rate limiting supplements, not replaces,
  // strong PREVIEW_PASSWORD and the Supabase Auth / RLS boundary.
  const forwarded=String(req.headers["x-forwarded-for"]||"").split(",")[0].trim();
  return (forwarded||req.socket.remoteAddress||"unknown").slice(0,100);
}
async function postAccess(req,res){
  // Render can forward an internal Host header. Validate browser Origin against
  // this deployment's fixed public origin instead of the proxy-supplied Host.
  const origin=req.headers.origin;
  if(origin){
    try {
      if(new URL(origin).origin!=="https://everywear-full-store-preview.onrender.com") {
        res.writeHead(403);return res.end("Forbidden");
      }
    } catch {
      res.writeHead(403);return res.end("Forbidden");
    }
  }
  let form;
  try{form=await readForm(req);}catch{
    res.writeHead(413);return res.end("Formulario no válido");
  }
  const username=String(form.get("username")||"");
  const password=String(form.get("password")||"");
  const to=safeDestination(form.get("next"));
  const client=clientBucket(req);
  const recent=loginAttempts.get(client);
  if(recent && recent.count>=10 && Date.now()-recent.start<10*60*1000)
    return showAccess(req,res,to,"Demasiados intentos. Prueba de nuevo en unos minutos.",429);
  if(!checkCredentials(username,password)){
    if(loginAttempts.size>1000)loginAttempts.clear();
    const entry=recent&&Date.now()-recent.start<10*60*1000?recent:{count:0,start:Date.now()};
    entry.count++;
    loginAttempts.set(client,entry);
    return showAccess(req,res,to,"Revisa el usuario y la contraseña de acceso a la vista previa.",401);
  }
  loginAttempts.delete(client);
  const token=signedToken(Date.now());
  return redirect(res,to,cookieName+"="+token+"; Path=/; Max-Age=43200; HttpOnly; Secure; SameSite=Lax");
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
  const path=new URL(req.url||"/","http://local").pathname;
  if(path==="/healthz"){
    res.writeHead(200,{"Content-Type":"text/plain; charset=utf-8"});
    return res.end("OK");
  }
  if(path==="/_entry-cover" && (req.method==="GET"||req.method==="HEAD")){
    try{
      const photo=await readFile(resolve(ROOT,"brand/lookbook-hd-06.webp"));
      res.writeHead(200,{"Content-Type":"image/webp"});
      return res.end(req.method==="HEAD"?undefined:photo);
    }catch{res.writeHead(404);return res.end();}
  }
  if(path==="/access" && req.method==="POST")return postAccess(req,res);
  if(path==="/logout" && req.method==="POST"){
    return redirect(res,"/access",
      cookieName+"=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax");
  }
  if(!["GET","HEAD"].includes(req.method)){
    res.writeHead(405,{"Allow":"GET, HEAD, POST"});return res.end();
  }
  if(!authorized(req)) {
    const returnTo=path==="/access"
      ? safeDestination(new URL(req.url,"http://local").searchParams.get("next"))
      : safeDestination(req.url);
    return showAccess(req,res,returnTo);
  }
  if(path==="/access")return redirect(res,
    new URL(req.url,"http://local").searchParams.get("next")||"/store-platform/admin/");
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
server.listen(PORT,"0.0.0.0",()=>console.log("Branded private Everywear preview ready on port",PORT));
