// Prepare the two Everywear static entry points without a Node request server.
// The /config route is also emitted as config.html for hosts with clean URLs.
import {readFile,writeFile,mkdir} from "node:fs/promises";
const admin=await readFile("dist/store-platform/admin/index.html","utf8");
await mkdir("dist/config",{recursive:true});
await writeFile("dist/config/index.html",admin);
await writeFile("dist/config.html",admin);
console.log("Everywear static routes generated: / and /config/");
