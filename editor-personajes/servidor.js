// Editor de personajes y escenas de Fe en Beta: servidor local sin dependencias.
//   node servidor.js            → http://localhost:3170  (personajes)  ·  http://localhost:3170/escenas.html (escenas)
// Sirve la interfaz (esta carpeta), el motor común (../comun), los personajes (../personajes/*.json) y las escenas (../escenas/*.json).
// API (personajes y escenas igual):
//   GET  /api/personajes | /api/escenas                  lista [{ id, nombre }]
//   GET  /api/<tipo>/:id                                 el JSON
//   PUT  /api/<tipo>/:id                                 guarda (personajes: regenera ../personajes/todos.js para los vídeos)
//   POST /api/<tipo>/:id/papelera                        lo mueve a la papelera de su carpeta (no borra)
//   GET  /api/eventos                                    SSE: avisa cuando un JSON cambia en disco ({ tipo, id })
//   POST /api/escenas/:id/exportar                       crea el proyecto HyperFrames ../escena-<id>/
//   POST /api/escenas/:id/render   · GET …/render        lanza el render (MP4 en ../escena-<id>/out/) y consulta su estado
//   GET  /api/audios                                     audios disponibles para las escenas (wav/mp3 bajo shorts-flow)
//   GET  /video/<id>.mp4                                 el último render de una escena
const http = require("http"), fs = require("fs"), path = require("path"), { spawn } = require("child_process");
const PUERTO = Number(process.env.PORT || 3170);
const AQUI = __dirname, RAIZ = path.join(AQUI, ".."), COMUN = path.join(RAIZ, "comun");
const DIRS = { personajes: path.join(RAIZ, "personajes"), escenas: path.join(RAIZ, "escenas"), acciones: path.join(RAIZ, "acciones") };   // acciones = biblioteca común
for (const d of Object.values(DIRS)) fs.mkdirSync(d, { recursive: true });
const HERRAMIENTAS = path.join(RAIZ, "..", "historia-en-cuatro-actos-tools");   // ffmpeg para HyperFrames

const TIPOS = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".mp4": "video/mp4", ".wav": "audio/wav", ".mp3": "audio/mpeg", ".woff2": "font/woff2" };
const idValido = (id) => /^[a-z0-9][a-z0-9-]{0,60}$/.test(id);
const leerJSON = (f) => JSON.parse(fs.readFileSync(f, "utf8"));
const lista = (tipo) => fs.readdirSync(DIRS[tipo]).filter((f) => f.endsWith(".json")).sort().map((f) => {
  try { const j = leerJSON(path.join(DIRS[tipo], f)); return { id: f.slice(0, -5), nombre: j.nombre || f.slice(0, -5) }; } catch { return { id: f.slice(0, -5), nombre: f.slice(0, -5) + " (JSON roto)" }; } });

// todos.js: los personajes en un solo script para cargarlos desde una composición (window.PERSONAJES.pedro …)
function regenerarTodos() {
  const todos = {}; for (const { id } of lista("personajes")) { try { todos[id] = leerJSON(path.join(DIRS.personajes, id + ".json")); } catch {} }
  fs.writeFileSync(path.join(DIRS.personajes, "todos.js"), "// Generado por el editor de personajes: no editar a mano (edita los .json).\nwindow.PERSONAJES = " + JSON.stringify(todos, null, 1) + ";\n");
}
function regenerarAcciones() {
  const todas = {}; for (const { id } of lista("acciones")) { try { todas[id] = leerJSON(path.join(DIRS.acciones, id + ".json")); } catch {} }
  fs.writeFileSync(path.join(DIRS.acciones, "todas.js"), "// Generado por el editor: la biblioteca común de acciones (window.ACCIONES).\nwindow.ACCIONES = " + JSON.stringify(todas) + ";\n"); return todas;
}
regenerarTodos(); regenerarAcciones();
// eventos: vigila las carpetas; un cambio hecho por el propio servidor también se avisa (la interfaz ignora el suyo)
const clientes = new Set();
for (const [tipo, dir] of Object.entries(DIRS)) { let tmr = null; const pend = new Set();
  fs.watch(dir, (ev, f) => { if (!f || !f.endsWith(".json")) return; pend.add(f.slice(0, -5)); clearTimeout(tmr);
    tmr = setTimeout(() => { if (tipo === "personajes") regenerarTodos(); if (tipo === "acciones") regenerarAcciones(); for (const id of pend) for (const c of clientes) c.write(`data: ${JSON.stringify({ tipo, id })}\n\n`); pend.clear(); }, 120); }); }

function servir(res, archivo, req) {
  fs.stat(archivo, (err, st) => { if (err || !st.isFile()) { res.writeHead(404); return res.end("no existe"); }
    const tipo = TIPOS[path.extname(archivo).toLowerCase()] || "application/octet-stream", rango = req && req.headers.range;
    if (rango && /^bytes=/.test(rango)) { const [a, b] = rango.slice(6).split("-"), ini = Number(a) || 0, fin = b ? Number(b) : st.size - 1;
      res.writeHead(206, { "Content-Type": tipo, "Content-Range": `bytes ${ini}-${fin}/${st.size}`, "Accept-Ranges": "bytes", "Content-Length": fin - ini + 1 }); return fs.createReadStream(archivo, { start: ini, end: fin }).pipe(res); }
    res.writeHead(200, { "Content-Type": tipo, "Cache-Control": "no-store", "Content-Length": st.size, "Accept-Ranges": "bytes" }); fs.createReadStream(archivo).pipe(res); });
}
const cuerpo = (req) => new Promise((ok, mal) => { let s = ""; req.on("data", (c) => { s += c; if (s.length > 5e6) req.destroy(); }); req.on("end", () => ok(s)); req.on("error", mal); });
const enviarJSON = (res, x, cod = 200) => { res.writeHead(cod, { "Content-Type": TIPOS[".json"] }); res.end(JSON.stringify(x)); };

// ---- exportar una escena a un proyecto HyperFrames (../escena-<id>/)
function exportar(id) {
  const esc = leerJSON(path.join(DIRS.escenas, id + ".json")), dir = path.join(RAIZ, "escena-" + id), A = path.join(dir, "assets");
  for (const d of [dir, A, path.join(A, "vendor"), path.join(A, "audio"), path.join(dir, "compositions"), path.join(dir, "out")]) fs.mkdirSync(d, { recursive: true });
  for (const f of ["titere25d.js", "personajes.js", "escena.js"]) fs.copyFileSync(path.join(COMUN, f), path.join(A, f));
  fs.copyFileSync(path.join(COMUN, "vendor", "gsap.min.js"), path.join(A, "vendor", "gsap.min.js"));
  fs.copyFileSync(path.join(COMUN, "vendor", "figtree.woff2"), path.join(A, "vendor", "figtree.woff2"));
  // solo los personajes que salen en la escena
  const usados = {}; for (const a of esc.actores || []) { const f = path.join(DIRS.personajes, a.personaje + ".json"); if (fs.existsSync(f)) usados[a.personaje] = leerJSON(f); }
  // acciones de la biblioteca común que usan los bloques de la escena
  const comunes = regenerarAcciones(), acc = {}; for (const a of esc.actores || []) for (const b of a.bloques || []) { const c = Object.values(comunes).find((x) => x.id === b.accion || x.nombre === b.accion); if (c) acc[c.id] = c; }
  fs.writeFileSync(path.join(A, "personajes-escena.js"), "window.PERSONAJES = " + JSON.stringify(usados) + ";\nwindow.ACCIONES = " + JSON.stringify(acc) + ";\n");
  const D = Math.max(0.5, Number(esc.duracion) || 6).toFixed(3);
  let audios = "";
  (esc.audios || []).forEach((au, i) => { const src = path.resolve(RAIZ, au.archivo || ""); if (!au.archivo || !fs.existsSync(src) || !src.startsWith(path.resolve(RAIZ, ".."))) return;
    const nom = `${i}-${path.basename(src)}`; fs.copyFileSync(src, path.join(A, "audio", nom));
    audios += `      <audio id="audio-${i}" class="clip" src="assets/audio/${nom}" data-start="${(Number(au.t) || 0).toFixed(3)}" data-duration="${(Number(au.dur) || Number(D)).toFixed(3)}" data-track-index="${10 + i}" data-volume="${Number(au.volumen ?? 1)}"></audio>\n`; });
  fs.writeFileSync(path.join(dir, "index.html"), `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <title>${(esc.nombre || id).replace(/</g, "")} · Fe en Beta</title>
    <script src="assets/vendor/gsap.min.js"></script>
    <script src="assets/titere25d.js"></script>
    <script src="assets/personajes.js"></script>
    <script src="assets/escena.js"></script>
    <script src="assets/personajes-escena.js"></script>
    <style>
      @font-face { font-family: "Inter"; src: url("assets/vendor/figtree.woff2") format("woff2"); }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { margin: 0; width: 1080px; height: 1920px; overflow: hidden; background: #100c1e; }
      #root { position: relative; width: 1080px; height: 1920px; overflow: hidden; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${D}" data-width="1080" data-height="1920">
      <div id="escena" data-composition-id="escena" data-composition-src="compositions/escena.html" data-start="0" data-duration="${D}" data-track-index="1" data-track-kind="graphics" data-width="1080" data-height="1920" style="z-index:1"></div>
${audios}    </div>
    <script>
      window.__timelines = window.__timelines || {};
      window.__timelines["main"] = gsap.timeline({ paused: true });
    </script>
  </body>
</html>
`);
  fs.writeFileSync(path.join(dir, "compositions", "escena.html"), `<template>
  <style>#root { position: absolute; inset: 0; overflow: hidden; background: #100c1e; } #esc-svg { position: absolute; left: 0; top: 0; width: 1080px; height: 1920px; }</style>
  <div id="root" data-composition-id="escena" data-width="1080" data-height="1920">
    <svg id="esc-svg" viewBox="0 0 1080 1920" xmlns="http://www.w3.org/2000/svg"><defs></defs></svg>
  </div>
  <script>
    // Generado por el editor de escenas (editor-personajes/escenas.html): se rehace al exportar; edita la escena allí.
    (() => { const ESCENA = ${JSON.stringify(esc)};
      const esc = Escena.crear(document.querySelector("#esc-svg"), ESCENA, PERSONAJES);
      const tl = gsap.timeline({ paused: true }), reloj = { t: 0 }; esc.dibujar(0);
      tl.to(reloj, { t: ${D}, duration: ${D}, ease: "none", onUpdate: () => esc.dibujar(reloj.t) }, 0);
      window.__timelines["escena"] = tl; })();
  </script>
</template>
`);
  fs.writeFileSync(path.join(dir, "hyperframes.json"), JSON.stringify({ $schema: "https://hyperframes.heygen.com/schema/hyperframes.json", paths: { blocks: "compositions", components: "compositions/components", assets: "assets" }, media: { autoProxy: true } }, null, 2));
  fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({ name: "escena-" + id, private: true, type: "module", scripts: { render: "npx --yes hyperframes@0.9.8 render" } }, null, 2));
  fs.writeFileSync(path.join(dir, "meta.json"), JSON.stringify({ id: "escena-" + id, name: "escena-" + id, createdAt: new Date().toISOString() }));
  return dir;
}
// ---- render en segundo plano
const renders = {};   // id → { estado: "renderizando"|"listo"|"error", log, inicio, archivo }
function renderizar(id) {
  if (renders[id]?.estado === "renderizando") return renders[id];
  const dir = exportar(id), salida = path.join("out", id + ".mp4"), r = { estado: "renderizando", log: "", inicio: Date.now(), archivo: null };
  renders[id] = r;
  const env = Object.assign({}, process.env, { PATH: HERRAMIENTAS + path.delimiter + process.env.PATH });
  const p = spawn("npx", ["--yes", "hyperframes@0.9.8", "render", "--quality", "delivery", "-o", salida], { cwd: dir, env, shell: true });
  const leer = (b) => { r.log = (r.log + b.toString()).slice(-4000); };
  p.stdout.on("data", leer); p.stderr.on("data", leer);
  p.on("close", (cod) => { r.estado = cod === 0 && fs.existsSync(path.join(dir, salida)) ? "listo" : "error"; r.fin = Date.now(); if (r.estado === "listo") r.archivo = `/video/${id}.mp4?v=${r.fin}`; });
  return r;
}
// envolvente de un audio para mover la boca: intensidad (RMS) 30 veces por segundo, normalizada a 0…1 (percentil 95)
function envolvente(f) { return new Promise((ok, mal) => {
  const ff = path.join(HERRAMIENTAS, process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg");
  const p = spawn(fs.existsSync(ff) ? ff : "ffmpeg", ["-v", "error", "-i", f, "-ac", "1", "-ar", "8000", "-f", "s16le", "-"]); const trozos = [];
  p.stdout.on("data", (c) => trozos.push(c)); p.on("error", mal);
  p.on("close", () => { const b = Buffer.concat(trozos), n = Math.floor(b.length / 2), paso = 8000 / 30, rms = [];
    for (let i = 0; i * paso < n; i++) { let s = 0, c = 0; for (let k = Math.floor(i * paso); k < Math.min(n, Math.floor((i + 1) * paso)); k++) { const v = b.readInt16LE(k * 2) / 32768; s += v * v; c++; } rms.push(Math.sqrt(s / Math.max(1, c))); }
    const orden = [...rms].sort((x, y) => x - y), ref = orden[Math.floor(orden.length * 0.95)] || 1, suelo = orden[Math.floor(orden.length * 0.2)] || 0;
    ok({ duracion: n / 8000, envolvente: rms.map((v) => +Math.max(0, Math.min(1, (v - suelo * 1.2) / Math.max(1e-6, ref - suelo * 1.2))).toFixed(2)) }); }); }); }
// audios que se pueden poner en una escena: voces y músicas de los proyectos de shorts-flow
function audios() { const out = []; const mirar = (d, prof) => { if (prof > 4) return; let ls = []; try { ls = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of ls) { if (e.name.startsWith(".") || e.name === "node_modules" || e.name === "out") continue; const f = path.join(d, e.name);
      if (e.isDirectory()) mirar(f, prof + 1); else if (/\.(wav|mp3)$/i.test(e.name) && /voz|musica|audio/i.test(f)) out.push(path.relative(RAIZ, f).replace(/\\/g, "/")); } };
  mirar(RAIZ, 0); return out.slice(0, 400); }

http.createServer(async (req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  try {
    if (url === "/api/eventos") { res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-store", Connection: "keep-alive" }); res.write(": hola\n\n"); clientes.add(res); req.on("close", () => clientes.delete(res)); return; }
    if (url === "/api/audios") return enviarJSON(res, audios());
    if (url === "/api/envolvente") { const q = new URL(req.url, "http://x").searchParams.get("archivo") || "", f = path.resolve(RAIZ, q);
      if (!f.startsWith(path.resolve(RAIZ, "..")) || !fs.existsSync(f)) { res.writeHead(404); return res.end("no existe"); }
      return enviarJSON(res, await envolvente(f)); }
    let m = url.match(/^\/api\/(personajes|escenas|acciones)$/);
    if (m && req.method === "GET") return enviarJSON(res, lista(m[1]));
    m = url.match(/^\/api\/(personajes|escenas|acciones)\/([^/]+)(\/[a-z]+)?$/);
    if (m) { const [, tipo, id, sub] = m; if (!idValido(id)) { res.writeHead(400); return res.end("id no válido: minúsculas, números y guiones"); }
      const f = path.join(DIRS[tipo], id + ".json");
      if (sub === "/papelera" && req.method === "POST") { if (!fs.existsSync(f)) { res.writeHead(404); return res.end(); }
        fs.mkdirSync(path.join(DIRS[tipo], "papelera"), { recursive: true }); fs.renameSync(f, path.join(DIRS[tipo], "papelera", `${id}-${Date.now()}.json`)); res.writeHead(200); return res.end("ok"); }
      if (tipo === "escenas" && sub === "/exportar" && req.method === "POST") return enviarJSON(res, { dir: path.relative(RAIZ, exportar(id)) });
      if (tipo === "escenas" && sub === "/render") { if (req.method === "POST") renderizar(id); const r = renders[id] || { estado: "nada", log: "" };
        const pct = (r.log.match(/(\d{1,3})%/g) || []).pop(); return enviarJSON(res, { estado: r.estado, archivo: r.archivo, segundos: r.inicio ? Math.round(((r.fin || Date.now()) - r.inicio) / 1000) : 0, progreso: pct || "", log: r.estado === "error" ? r.log.slice(-1500) : "" }); }
      if (!sub && req.method === "GET") return servir(res, f, req);
      if (!sub && req.method === "PUT") { const s = await cuerpo(req); const j = JSON.parse(s); j.id = id;
        fs.writeFileSync(f, JSON.stringify(j, null, 2) + "\n"); res.writeHead(200); return res.end("ok"); }
    }
    if (url.startsWith("/video/")) { const id = path.basename(url, ".mp4"); if (!idValido(id)) { res.writeHead(400); return res.end(); } return servir(res, path.join(RAIZ, "escena-" + id, "out", id + ".mp4"), req); }
    if (url.startsWith("/audio/")) { const f = path.resolve(RAIZ, url.slice(7)); if (!f.startsWith(RAIZ)) { res.writeHead(403); return res.end(); } return servir(res, f, req); }
    if (url.startsWith("/comun/")) return servir(res, path.join(COMUN, path.basename(url)), req);
    if (url.startsWith("/personajes/")) return servir(res, path.join(DIRS.personajes, path.basename(url)), req);
    if (url.startsWith("/acciones/")) return servir(res, path.join(DIRS.acciones, path.basename(url)), req);
    const f = path.join(AQUI, url === "/" ? "index.html" : path.basename(url));
    return servir(res, f, req);
  } catch (e) { res.writeHead(500); res.end(String(e.message || e)); }
}).listen(PUERTO, () => console.log(`Editor de personajes en http://localhost:${PUERTO}  ·  escenas en http://localhost:${PUERTO}/escenas.html`));
