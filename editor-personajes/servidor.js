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
//   GET  /api/<tipo>/<id>/historial · POST …/restaurar { marca }   versiones anteriores (../.historial) y volver a una
//   GET  /api/<tipo>/papelera · POST /api/<tipo>/papelera/<archivo>/recuperar   lo borrado y recuperarlo
//   POST /api/sincronizar { mensaje }                   git pull, commit y push del repo (como sincronizar.ps1)
//   GET  /api/imagenes                                   imágenes para fondos (carpetas fondos, imagenes, img, assets)
//   GET  /api/audios                                     audios disponibles para las escenas (wav/mp3 bajo shorts-flow)
//   GET  /video/<id>.mp4                                 el último render de una escena
//   POST /api/vtuber · GET /api/vtuber/eventos (SSE)     modo VTuber: fotogramas de vtuber.html a su salida para OBS (vtuber.html?salida)
// Shorts (montaje: una voz + varias escenas):
//   GET/PUT /api/shorts[/:id] · POST …/papelera           como las escenas
//   POST /api/transcribir  { archivo, guion }            palabras con tiempos (VoiceStudio; si no está abierto, estimadas desde el guion) + envolvente
//   POST /api/shorts/:id/render · GET …/render           exporta ../short-<id>/ (voz, música montada con montar-musica.py, efectos) y renderiza
//   GET  /video-short/<id>.mp4                           el último render de un short
const http = require("http"), fs = require("fs"), path = require("path"), { spawn } = require("child_process");
const PUERTO = Number(process.env.PORT || 3170);
// CODIGO = donde están la interfaz y el motor (comun/); RAIZ = donde están los datos (personajes, escenas, láminas, renders…).
// Son la misma carpeta (shorts-flow) salvo en la app de escritorio, que pone los datos en Documentos (FEB_DATOS, ver app-escritorio/).
const AQUI = __dirname, CODIGO = path.join(AQUI, ".."), RAIZ = process.env.FEB_DATOS ? path.resolve(process.env.FEB_DATOS) : CODIGO, COMUN = path.join(CODIGO, "comun");
const EN_APP = process.env.FEB_APP === "1";
const DIRS = { personajes: path.join(RAIZ, "personajes"), escenas: path.join(RAIZ, "escenas"), acciones: path.join(RAIZ, "acciones"), andares: path.join(RAIZ, "andares"), shorts: path.join(RAIZ, "shorts"), piezas: path.join(RAIZ, "piezas") };   // acciones = biblioteca común
const PY_VS = path.join(process.env.APPDATA || "", "VoiceStudio", "runtime", "project", ".venv", "Scripts", "python.exe");   // python con numpy y soundfile (montar-musica.py)
const API_VS = "http://127.0.0.1:3900";   // VoiceStudio: transcripción con tiempos por palabra
for (const d of Object.values(DIRS)) fs.mkdirSync(d, { recursive: true });
const HERRAMIENTAS = path.join(RAIZ, "..", "historia-en-cuatro-actos-tools");   // ffmpeg para HyperFrames

const FFMPEG = path.join(HERRAMIENTAS, process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg");
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
function regenerarAndares() {   // formas de andar propias (window.ANDARES): las de serie están en comun/andares.js
  const todas = {}; for (const { id } of lista("andares")) { try { todas[id] = leerJSON(path.join(DIRS.andares, id + ".json")); } catch {} }
  fs.writeFileSync(path.join(DIRS.andares, "todas.js"), "// Generado por el editor: formas de andar propias (window.ANDARES).\nwindow.ANDARES = " + JSON.stringify(todas) + ";\n"); return todas; }
regenerarTodos(); regenerarAcciones(); regenerarAndares();
// eventos: vigila las carpetas; un cambio hecho por el propio servidor también se avisa (la interfaz ignora el suyo)
const clientes = new Set();
for (const [tipo, dir] of Object.entries(DIRS)) { let tmr = null; const pend = new Set();
  fs.watch(dir, (ev, f) => { if (!f || !f.endsWith(".json")) return; pend.add(f.slice(0, -5)); clearTimeout(tmr);
    tmr = setTimeout(() => { if (tipo === "personajes") regenerarTodos(); if (tipo === "acciones") regenerarAcciones(); if (tipo === "andares") regenerarAndares(); for (const id of pend) for (const c of clientes) c.write(`data: ${JSON.stringify({ tipo, id })}\n\n`); pend.clear(); }, 120); }); }

function servir(res, archivo, req) {
  fs.stat(archivo, (err, st) => { if (err || !st.isFile()) { res.writeHead(404); return res.end("no existe"); }
    const tipo = TIPOS[path.extname(archivo).toLowerCase()] || "application/octet-stream", rango = req && req.headers.range;
    if (rango && /^bytes=/.test(rango)) { const [a, b] = rango.slice(6).split("-"), ini = Number(a) || 0, fin = b ? Number(b) : st.size - 1;
      res.writeHead(206, { "Content-Type": tipo, "Content-Range": `bytes ${ini}-${fin}/${st.size}`, "Accept-Ranges": "bytes", "Content-Length": fin - ini + 1 }); return fs.createReadStream(archivo, { start: ini, end: fin }).pipe(res); }
    res.writeHead(200, { "Content-Type": tipo, "Cache-Control": "no-store", "Content-Length": st.size, "Accept-Ranges": "bytes" }); fs.createReadStream(archivo).pipe(res); });
}
const cuerpo = (req) => new Promise((ok, mal) => { let s = ""; req.on("data", (c) => { s += c; if (s.length > 3e7) req.destroy(); }); req.on("end", () => ok(s)); req.on("error", mal); });
const enviarJSON = (res, x, cod = 200) => { res.writeHead(cod, { "Content-Type": TIPOS[".json"] }); res.end(JSON.stringify(x)); };

// ---- HISTORIAL DE VERSIONES: antes de sobrescribir un JSON se guarda la versión anterior en ../.historial/<tipo>/<id>/<marca>.json
// (como mucho una cada 90 s mientras se edita seguido, sin repetir contenido; se guardan las 60 últimas). No va a GitHub.
const HIST = path.join(RAIZ, ".historial");
function guardarVersion(tipo, id, f, forzar = false) { if (!fs.existsSync(f)) return; const d = path.join(HIST, tipo, id); fs.mkdirSync(d, { recursive: true });
  const ls = fs.readdirSync(d).filter((x) => /^\d+\.json$/.test(x)).sort(), ult = ls[ls.length - 1], prev = fs.readFileSync(f, "utf8");
  if (ult && fs.readFileSync(path.join(d, ult), "utf8") === prev) return; if (!forzar && ult && Date.now() - +ult.slice(0, -5) < 90000) return;
  fs.writeFileSync(path.join(d, Date.now() + ".json"), prev); for (const x of ls.slice(0, Math.max(0, ls.length + 1 - 60))) fs.unlinkSync(path.join(d, x)); }
function versiones(tipo, id) { const d = path.join(HIST, tipo, id); let ls = []; try { ls = fs.readdirSync(d).filter((x) => /^\d+\.json$/.test(x)); } catch {}
  return ls.sort().reverse().map((x) => { const st = fs.statSync(path.join(d, x)); return { marca: x.slice(0, -5), tam: st.size }; }); }
// papelera de cada tipo: lo borrado desde la interfaz, para recuperarlo
function papelera(tipo) { const d = path.join(DIRS[tipo], "papelera"); let ls = []; try { ls = fs.readdirSync(d).filter((x) => x.endsWith(".json")); } catch {}
  return ls.map((x) => { let nombre = x; try { nombre = leerJSON(path.join(d, x)).nombre || x; } catch {} const m = x.match(/^(.*)-(\d{12,})\.json$/); return { archivo: x, id: m ? m[1] : x.slice(0, -5), marca: m ? +m[2] : 0, nombre }; }).sort((a, b) => b.marca - a.marca); }
// sincronizar con GitHub (lo mismo que sincronizar.ps1): traer lo último, guardar los cambios y subirlos
function git(args) { return new Promise((ok) => { const p = spawn("git", args, { cwd: RAIZ }); let out = ""; p.stdout.on("data", (b) => (out += b)); p.stderr.on("data", (b) => (out += b)); p.on("close", (cod) => ok({ cod, out })); p.on("error", (e) => ok({ cod: -1, out: String(e) })); }); }
async function sincronizar(mensaje) { const log = []; const paso = async (args) => { const r = await git(args); log.push("$ git " + args.join(" ") + "\n" + r.out.trim()); return r; };
  let r = await paso(["pull", "--rebase", "--autostash"]); if (r.cod !== 0) return { ok: false, log: log.join("\n\n"), error: "No se pudo traer lo último de GitHub (¿conflicto?)" };
  await paso(["add", "-A"]); r = await git(["diff", "--cached", "--quiet"]); if (r.cod === 0) return { ok: true, nada: true, log: log.join("\n\n") };
  r = await paso(["commit", "-m", mensaje || "Actualizar editor de personajes y escenas"]); if (r.cod !== 0) return { ok: false, log: log.join("\n\n"), error: "No se pudo guardar el commit" };
  r = await paso(["push"]); return { ok: r.cod === 0, log: log.join("\n\n"), error: r.cod === 0 ? "" : "No se pudo subir a GitHub" }; }

// LÁMINAS editables desde el editor: lista, leer una (con el dibujo editable de cada capa si lo hay), guardar una capa, crear una nueva
const DIR_LAM = path.join(RAIZ, "ilustraciones");
function leerLamina(n) { const d = path.join(DIR_LAM, n), f = path.join(d, "lamina.json"); if (!fs.existsSync(f)) return null; const j = leerJSON(f), capas = {}, dibujos = {};
  for (const c of j.capas) { const fs1 = path.join(d, c + ".svg"); capas[c] = fs.existsSync(fs1) ? fs.readFileSync(fs1, "utf8").replace(/^<svg[^>]*>|<\/svg>\s*$/g, "") : "";
    const fd = path.join(d, c + ".dibujo.json"); if (fs.existsSync(fd)) try { dibujos[c] = leerJSON(fd); } catch {} }
  return { nombre: n, ancho: j.ancho, alto: j.alto, capas, dibujos, origen: j.origen || "", paleta: j.paleta || null, orden: j.capas }; }
function regenerarLaminas() { const todo = {};   // ilustraciones/todas.js (window.LAMINAS), igual que comun/lamina-vectorizar.py
  for (const n of fs.readdirSync(DIR_LAM).sort()) { const L = leerLamina(n); if (L) todo[n] = { ancho: L.ancho, alto: L.alto, capas: L.capas }; }
  fs.writeFileSync(path.join(DIR_LAM, "todas.js"), "window.LAMINAS = " + JSON.stringify(todo) + ";\n"); }
// láminas vectoriales (ilustraciones/<nombre>/) que usan unas escenas → objeto para window.LAMINAS del vídeo
function laminasDe(escenas) { const L = {};
  for (const esc of escenas) { const n = esc?.fondo?.tipo === "lamina" && esc.fondo.lamina; if (!n || L[n]) continue; const d = path.join(RAIZ, "ilustraciones", n), f = path.join(d, "lamina.json"); if (!fs.existsSync(f)) continue;
    const j = leerJSON(f), capas = {}; for (const c of j.capas) capas[c] = fs.readFileSync(path.join(d, c + ".svg"), "utf8").replace(/^<svg[^>]*>|<\/svg>\s*$/g, "");
    L[n] = { ancho: j.ancho, alto: j.alto, capas }; }
  return L; }

// ---- exportar una escena a un proyecto HyperFrames (../escena-<id>/)
function exportar(id) {
  const esc = leerJSON(path.join(DIRS.escenas, id + ".json")), [W, H] = esc.formato === "16:9" ? [1920, 1080] : [1080, 1920], dir = path.join(RAIZ, "escena-" + id), A = path.join(dir, "assets");
  for (const d of [dir, A, path.join(A, "vendor"), path.join(A, "audio"), path.join(dir, "compositions"), path.join(dir, "out")]) fs.mkdirSync(d, { recursive: true });
  for (const f of ["titere25d.js", "rig2d.js", "libre.js", "personajes.js", "atrezo.js", "andares.js", "escena.js"]) fs.copyFileSync(path.join(COMUN, f), path.join(A, f));
  fs.copyFileSync(path.join(COMUN, "vendor", "gsap.min.js"), path.join(A, "vendor", "gsap.min.js"));
  for (const f of ["figtree.woff2", "bricolage-grotesque.woff2", "newsreader-italic.woff2"]) fs.copyFileSync(path.join(COMUN, "vendor", f), path.join(A, "vendor", f));
  // solo los personajes que salen en la escena
  const usados = {}; for (const a of esc.actores || []) { const f = path.join(DIRS.personajes, a.personaje + ".json"); if (fs.existsSync(f)) usados[a.personaje] = leerJSON(f); }
  // acciones de la biblioteca común que usan los bloques de la escena
  const comunes = regenerarAcciones(), acc = {}; for (const a of esc.actores || []) for (const b of a.bloques || []) { const c = Object.values(comunes).find((x) => x.id === b.accion || x.nombre === b.accion); if (c) acc[c.id] = c; }
  fs.writeFileSync(path.join(A, "personajes-escena.js"), "window.PERSONAJES = " + JSON.stringify(usados) + ";\nwindow.ANDARES = " + JSON.stringify(regenerarAndares()) + ";\nwindow.LAMINAS = " + JSON.stringify(laminasDe([esc])) + ";\nwindow.ACCIONES = " + JSON.stringify(acc) + ";\nwindow.RUTA_ARCHIVOS = \"assets/archivos/\";\n");
  copiarImagenes([esc], A);
  const D = Math.max(0.5, Number(esc.duracion) || 6).toFixed(3);
  let audios = "";
  (esc.audios || []).forEach((au, i) => { const src = path.resolve(RAIZ, au.archivo || ""); if (!au.archivo || !fs.existsSync(src) || !src.startsWith(path.resolve(RAIZ, ".."))) return;
    const nom = `${i}-${path.basename(src)}`; fs.copyFileSync(src, path.join(A, "audio", nom));
    audios += `      <audio id="audio-${i}" class="clip" src="assets/audio/${nom}" data-start="${(Number(au.t) || 0).toFixed(3)}" data-duration="${(Number(au.dur) || Number(D)).toFixed(3)}" data-track-index="${10 + i}" data-volume="${Number(au.volumen ?? 1)}"></audio>\n`; });
  fs.writeFileSync(path.join(dir, "index.html"), `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${W}, height=${H}" />
    <title>${(esc.nombre || id).replace(/</g, "")} · Fe en Beta</title>
    <script src="assets/vendor/gsap.min.js"></script>
    <script src="assets/titere25d.js"></script>
    <script src="assets/rig2d.js"></script>
    <script src="assets/libre.js"></script>
    <script src="assets/personajes.js"></script>
    <script src="assets/atrezo.js"></script>
    <script src="assets/andares.js"></script>
    <script src="assets/escena.js"></script>
    <script src="assets/personajes-escena.js"></script>
    <style>
      @font-face { font-family: "Bricolage Grotesque"; src: url("assets/vendor/bricolage-grotesque.woff2") format("woff2"); font-weight: 200 800; }
      @font-face { font-family: "Newsreader"; src: url("assets/vendor/newsreader-italic.woff2") format("woff2"); font-weight: 200 800; font-style: italic; }
      @font-face { font-family: "Inter"; src: url("assets/vendor/figtree.woff2") format("woff2"); }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { margin: 0; width: ${W}px; height: ${H}px; overflow: hidden; background: #100c1e; }
      #root { position: relative; width: ${W}px; height: ${H}px; overflow: hidden; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${D}" data-width="${W}" data-height="${H}">
      <div id="escena" data-composition-id="escena" data-composition-src="compositions/escena.html" data-start="0" data-duration="${D}" data-track-index="1" data-track-kind="graphics" data-width="${W}" data-height="${H}" style="z-index:1"></div>
${audios}    </div>
    <script>
      window.__timelines = window.__timelines || {};
      window.__timelines["main"] = gsap.timeline({ paused: true });
    </script>
  </body>
</html>
`);
  fs.writeFileSync(path.join(dir, "compositions", "escena.html"), `<template>
  <style>#root { position: absolute; inset: 0; overflow: hidden; background: #100c1e; } #esc-svg { position: absolute; left: 0; top: 0; width: ${W}px; height: ${H}px; }</style>
  <div id="root" data-composition-id="escena" data-width="${W}" data-height="${H}">
    <svg id="esc-svg" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg"><defs></defs></svg>
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
const renders = {};   // clave → { estado: "preparando"|"renderizando"|"listo"|"error", log, inicio, archivo }
function renderizar(id, op) { return lanzarRender(id, async () => exportar(id), `/video/${id}.mp4`, op); }
// COLA: los renders van de uno en uno (cada uno ya usa varios procesos de Chrome); los demás esperan con su puesto.
// op = { rapida: borrador a 24 fps, desde, hasta: solo ese fragmento (segundos) }
const cola = []; let ocupado = false;
function siguiente() { if (ocupado) return; const job = cola.shift(); if (!job) return; ocupado = true; job.correr(() => { ocupado = false; siguiente(); }); }
function lanzarRender(clave, preparar, url, op = {}) {
  if (["en cola", "preparando", "renderizando"].includes(renders[clave]?.estado)) return renders[clave];
  const r = { estado: "en cola", log: "", inicio: Date.now(), archivo: null, rapida: !!op.rapida, fragmento: op.desde != null || op.hasta != null }; renders[clave] = r;
  cola.push({ r, correr: async (hecho) => { r.estado = "preparando"; r.inicio = Date.now(); let dir; try { dir = await preparar(r); } catch (e) { r.estado = "error"; r.log = String(e.stack || e); r.fin = Date.now(); return hecho(); }
    // cada render a un archivo nuevo: el anterior puede estar abierto en el reproductor (Windows no deja sustituirlo)
    r.estado = "renderizando"; const id = path.basename(url, ".mp4"), salida = path.join("out", `${id}-${Date.now()}.mp4`);
    const env = Object.assign({}, process.env, { PATH: HERRAMIENTAS + path.delimiter + process.env.PATH });
    const args = ["--yes", "hyperframes@0.9.8", "render", "--quality", op.rapida ? "draft" : "delivery", "-o", salida];
    if (op.rapida) args.push("--fps", "24");
    if (op.desde != null && op.desde !== "") args.push("--start", String(Math.max(0, +op.desde))); if (op.hasta != null && op.hasta !== "") args.push("--end", String(+op.hasta));
    const p = spawn("npx", args, { cwd: dir, env, shell: true });
    const leer = (b) => { r.log = (r.log + b.toString()).slice(-4000); };
    p.stdout.on("data", leer); p.stderr.on("data", leer);
    p.on("close", (cod) => { r.estado = cod === 0 && fs.existsSync(path.join(dir, salida)) ? "listo" : "error"; r.fin = Date.now(); r.ruta = path.relative(RAIZ, path.join(dir, salida)).replace(/\\/g, "/");
      if (r.estado === "listo") { r.archivo = `${url}?v=${r.fin}`; limpiarRenders(path.join(dir, "out"), id); } hecho(); }); } });
  siguiente(); return r;
}
// el render más reciente de un id (out/<id>-<marca>.mp4 o el antiguo out/<id>.mp4); se guardan los dos últimos
function ultimoRender(dirOut, id) { let ls = []; try { ls = fs.readdirSync(dirOut).filter((f) => f === id + ".mp4" || (f.startsWith(id + "-") && /^\d+\.mp4$/.test(f.slice(id.length + 1)))); } catch {}
  return ls.map((f) => ({ f, t: fs.statSync(path.join(dirOut, f)).mtimeMs })).sort((a, b) => b.t - a.t)[0]?.f; }
function limpiarRenders(dirOut, id) { try { fs.readdirSync(dirOut).filter((f) => f.startsWith(id + "-") && f.endsWith(".mp4")).map((f) => ({ f, t: fs.statSync(path.join(dirOut, f)).mtimeMs })).sort((a, b) => b.t - a.t).slice(2).forEach(({ f }) => { try { fs.unlinkSync(path.join(dirOut, f)); } catch {} }); } catch {} }
const estadoRender = (clave) => { const r = renders[clave] || { estado: "nada", log: "" }, pct = (r.log.match(/(\d{1,3})%/g) || []).pop();
  const puesto = r.estado === "en cola" ? cola.findIndex((j) => j.r === r) + 1 : 0;
  return { estado: r.estado, puesto, rapida: !!r.rapida, fragmento: !!r.fragmento, archivo: r.archivo, ruta: r.ruta || "", segundos: r.inicio ? Math.round(((r.fin || Date.now()) - r.inicio) / 1000) : 0, progreso: pct || "", nota: r.nota || "", log: r.estado === "error" ? r.log.slice(-1500) : "" }; };

// ---- transcripción de la voz: VoiceStudio (tiempos reales por palabra) o, si no está, estimada desde el guion como en comun/montar.py
const correr = (cmd, args, op = {}) => new Promise((ok) => { const p = spawn(cmd, args, op); let out = "", err = ""; p.stdout?.on("data", (c) => (out += c)); p.stderr?.on("data", (c) => (err += c)); p.on("error", (e) => ok({ cod: -1, out, err: String(e) })); p.on("close", (cod) => ok({ cod, out, err })); });
function estimar(texto) { let t = 0; const w = [];
  for (const p of String(texto).split(/\s+/).filter(Boolean)) { const letras = p.toLowerCase().replace(/[^\wáéíóúñü]/g, "").length, d = (0.11 + 0.052 * letras) * 0.85;
    w.push({ word: p, start: +t.toFixed(3), end: +(t + d).toFixed(3) }); t += d + (/[.,:;?!]»?$/.test(p) ? 0.15 : 0.02); }
  return { t, w }; }
async function transcribir(archivo, guion) {
  const f = path.resolve(RAIZ, archivo || ""); if (!archivo || !f.startsWith(path.resolve(RAIZ, "..")) || !fs.existsSync(f)) throw new Error("no existe el audio " + archivo);
  const env = await envolvente(f); let palabras = null, fuente = "voicestudio", aviso = "";
  const tmp = path.join(require("os").tmpdir(), "transcripcion-" + Date.now() + ".json");
  const r = await correr("curl.exe", ["-s", "-S", "-m", "600", "-X", "POST", API_VS + "/v1/audio/transcriptions", "-F", "file=@" + f, "-F", "language=es", "-F", "response_format=verbose_json", "-F", "timestamp_granularities[]=word", "-o", tmp]);
  try { if (r.cod === 0) palabras = (leerJSON(tmp).words || []).map((w) => ({ word: String(w.word).trim(), start: +(+w.start).toFixed(3), end: +(+w.end).toFixed(3) })).filter((w) => w.word); } catch {}
  try { fs.unlinkSync(tmp); } catch {}
  const motivo = env.silencio ? "La voz está en silencio (¿es un archivo de relleno?)" : r.cod !== 0 ? "VoiceStudio no respondió" : "VoiceStudio no reconoció palabras";
  if (!palabras || !palabras.length) { if (!guion) throw new Error(motivo + " y no hay guion para estimar los tiempos: pega el guion o usa otra voz");
    const e = estimar(guion), k = env.duracion > 0 ? (env.duracion - 0.3) / Math.max(0.1, e.t) : 1; palabras = e.w.map((w) => ({ word: w.word, start: +(w.start * k).toFixed(3), end: +(w.end * k).toFixed(3) }));
    fuente = "estimado"; aviso = motivo + ": tiempos ESTIMADOS desde el guion" + (env.silencio ? " (cuando tengas la voz grabada, cámbiala y vuelve a transcribir)" : " (abre VoiceStudio y vuelve a transcribir para tener los reales)"); }
  else if (guion) { // con el guion, el texto de cada palabra es el del guion (la transcripción pone cifras, se come tildes…) si el número de palabras cuadra
    const g = String(guion).split(/\s+/).filter(Boolean); if (g.length === palabras.length) palabras.forEach((w, i) => (w.word = g[i])); else aviso = `El guion tiene ${g.length} palabras y la voz ${palabras.length}: uso el texto transcrito (revisa los subtítulos)`; }
  return { duracion: +env.duracion.toFixed(3), envolvente: env.envolvente, palabras, fuente, aviso };
}

// ---- exportar un short (montaje) a ../short-<id>/: escenas en secuencia, voz, música montada, efectos y subtítulos
async function exportarShort(id, r = {}) {
  const sh = leerJSON(path.join(DIRS.shorts, id + ".json")), [W, H] = sh.formato === "16:9" ? [1920, 1080] : [1080, 1920], dir = path.join(RAIZ, "short-" + id), A = path.join(dir, "assets");
  for (const d of [dir, A, path.join(A, "vendor"), path.join(A, "voz"), path.join(A, "musica"), path.join(A, "sfx"), path.join(dir, "compositions"), path.join(dir, "out")]) fs.mkdirSync(d, { recursive: true });
  for (const f of ["titere25d.js", "rig2d.js", "libre.js", "personajes.js", "atrezo.js", "andares.js", "escena.js", "montaje.js"]) fs.copyFileSync(path.join(COMUN, f), path.join(A, f));
  for (const f of ["gsap.min.js", "figtree.woff2", "bricolage-grotesque.woff2", "newsreader-italic.woff2"]) fs.copyFileSync(path.join(COMUN, "vendor", f), path.join(A, "vendor", f));
  const ESC = {}, usados = {}, acc = {}, comunes = regenerarAcciones();
  for (const c of sh.clips || []) { const f = path.join(DIRS.escenas, c.escena + ".json"); if (!fs.existsSync(f) || ESC[c.escena]) continue; const esc = ESC[c.escena] = leerJSON(f);
    for (const a of esc.actores || []) { const fp = path.join(DIRS.personajes, a.personaje + ".json"); if (fs.existsSync(fp)) usados[a.personaje] = leerJSON(fp);
      for (const b of a.bloques || []) { const cc = Object.values(comunes).find((x) => x.id === b.accion || x.nombre === b.accion); if (cc) acc[cc.id] = cc; } } }
  const D = +(sh.duracion || (sh.voz?.duracion || 0) + 0.8 || 6).toFixed(3);
  fs.writeFileSync(path.join(A, "datos.js"), `window.ANDARES = ${JSON.stringify(regenerarAndares())};\nwindow.LAMINAS = ${JSON.stringify(laminasDe(Object.values(ESC)))};\nwindow.PERSONAJES = ${JSON.stringify(usados)};\nwindow.ACCIONES = ${JSON.stringify(acc)};\nwindow.ESCENAS = ${JSON.stringify(ESC)};\nwindow.SHORT = ${JSON.stringify(sh)};\nwindow.RUTA_ARCHIVOS = "assets/archivos/";\n`);
  copiarImagenes(Object.values(ESC), A);
  const dentro = (a) => { const f = path.resolve(RAIZ, a || ""); return a && f.startsWith(path.resolve(RAIZ, "..")) && fs.existsSync(f) ? f : null; };
  let audios = "", pista = 10;
  // voz → assets/voz/narracion.wav (montar-musica.py mide en ella el nivel de la voz)
  const fv = dentro(sh.voz?.archivo); if (fv) { await correr(FFMPEG, ["-v", "error", "-y", "-i", fv, "-ac", "1", "-ar", "48000", path.join(A, "voz", "narracion.wav")]);
    audios += `      <audio id="voz" class="clip" src="assets/voz/narracion.wav" data-start="0" data-duration="${D}" data-track-index="${pista++}" data-volume="1"></audio>\n`; }
  // música: se monta como en el resto de vídeos (AUDIO-DE-FONDO.md): ajustada a la duración, con su final y bajando cuando se habla
  const fm = dentro(sh.musica?.archivo);
  if (fm) { const fr = (frases) => frases; const tiempos = { total: D, escenas: [] }, pal = sh.voz?.palabras || [];
    const clips = [...(sh.clips || [])].sort((a, b) => a.t - b.t); (clips.length ? clips : [{ t: 0, dur: D }]).forEach((c, i) => {
      const ws = pal.filter((w) => w.start >= c.t && w.start < c.t + (c.dur || 2)); const lineas = [];
      for (const w of ws) { const l = lineas[lineas.length - 1]; if (l && w.start - (c.t + l.e) < 0.35) l.e = +(w.end - c.t).toFixed(3); else lineas.push({ s: +(w.start - c.t).toFixed(3), e: +(w.end - c.t).toFixed(3) }); }
      tiempos.escenas.push({ id: "e" + (i + 1), start: c.t, dur: c.dur || 2, lineas }); });
    fs.writeFileSync(path.join(dir, "tiempos.json"), JSON.stringify(tiempos, null, 1));
    const salida = path.join(A, "musica", "musica-montada.wav");
    const rm = fs.existsSync(PY_VS) ? await correr(PY_VS, [path.join(HERRAMIENTAS, "montar-musica.py"), fm, path.join(dir, "tiempos.json"), salida, JSON.stringify(sh.musica.opciones || {})], { cwd: dir }) : { cod: -1, err: "no encuentro el python de VoiceStudio" };
    if (rm.cod === 0 && fs.existsSync(salida)) audios += `      <audio id="musica" class="clip" src="assets/musica/musica-montada.wav" data-start="0" data-duration="${D}" data-track-index="${pista++}" data-volume="${Number(sh.musica.volumen ?? 1)}"></audio>\n`;
    else { r.nota = "La música no se pudo montar con montar-musica.py (" + String(rm.err || rm.out).trim().split("\n").pop() + "): va sin ajustar, a volumen bajo";
      const nom = "musica" + path.extname(fm); fs.copyFileSync(fm, path.join(A, "musica", nom));
      audios += `      <audio id="musica" class="clip" src="assets/musica/${nom}" data-start="0" data-duration="${D}" data-track-index="${pista++}" data-volume="${(0.18 * Number(sh.musica.volumen ?? 1)).toFixed(3)}"></audio>\n`; } }
  (sh.sfx || []).forEach((x, i) => { const f = dentro(x.archivo); if (!f) return; const nom = `${i}-${path.basename(f)}`; fs.copyFileSync(f, path.join(A, "sfx", nom));
    audios += `      <audio id="sfx-${i}" class="clip" src="assets/sfx/${nom}" data-start="${(+x.t || 0).toFixed(3)}" data-duration="${Math.max(0.1, Math.min(8, D - (+x.t || 0))).toFixed(3)}" data-track-index="${pista++}" data-volume="${Number(x.volumen ?? 0.4)}"></audio>\n`; });
  fs.writeFileSync(path.join(dir, "index.html"), `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${W}, height=${H}" />
    <title>${(sh.nombre || id).replace(/</g, "")} · Fe en Beta</title>
    <script src="assets/vendor/gsap.min.js"></script>
    <script src="assets/titere25d.js"></script>
    <script src="assets/rig2d.js"></script>
    <script src="assets/libre.js"></script>
    <script src="assets/personajes.js"></script>
    <script src="assets/atrezo.js"></script>
    <script src="assets/andares.js"></script>
    <script src="assets/escena.js"></script>
    <script src="assets/montaje.js"></script>
    <script src="assets/datos.js"></script>
    <style>
      @font-face { font-family: "Bricolage Grotesque"; src: url("assets/vendor/bricolage-grotesque.woff2") format("woff2"); font-weight: 200 800; }
      @font-face { font-family: "Newsreader"; src: url("assets/vendor/newsreader-italic.woff2") format("woff2"); font-weight: 200 800; font-style: italic; }
      @font-face { font-family: "Figtree"; src: url("assets/vendor/figtree.woff2") format("woff2"); font-weight: 300 900; }
      @font-face { font-family: "Inter"; src: url("assets/vendor/figtree.woff2") format("woff2"); }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { margin: 0; width: ${W}px; height: ${H}px; overflow: hidden; background: #100c1e; }
      #root { position: relative; width: ${W}px; height: ${H}px; overflow: hidden; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${D}" data-width="${W}" data-height="${H}">
      <div id="montaje" data-composition-id="montaje" data-composition-src="compositions/montaje.html" data-start="0" data-duration="${D}" data-track-index="1" data-track-kind="graphics" data-width="${W}" data-height="${H}" style="z-index:1"></div>
${audios}    </div>
    <script>
      window.__timelines = window.__timelines || {};
      window.__timelines["main"] = gsap.timeline({ paused: true });
    </script>
  </body>
</html>
`);
  fs.writeFileSync(path.join(dir, "compositions", "montaje.html"), `<template>
  <style>#root { position: absolute; inset: 0; overflow: hidden; background: #100c1e; } #mt-svg { position: absolute; left: 0; top: 0; width: ${W}px; height: ${H}px; }</style>
  <div id="root" data-composition-id="montaje" data-width="${W}" data-height="${H}">
    <svg id="mt-svg" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg"><defs></defs></svg>
  </div>
  <script>
    // Generado por el editor (editor-personajes/montaje.html): se rehace al exportar; edita el short allí.
    (() => { const mt = Montaje.crear(document.querySelector("#mt-svg"), SHORT, ESCENAS, PERSONAJES);
      const tl = gsap.timeline({ paused: true }), reloj = { t: 0 }; mt.dibujar(0);
      tl.to(reloj, { t: ${D}, duration: ${D}, ease: "none", onUpdate: () => mt.dibujar(reloj.t) }, 0);
      window.__timelines["montaje"] = tl; })();
  </script>
</template>
`);
  fs.writeFileSync(path.join(dir, "hyperframes.json"), JSON.stringify({ $schema: "https://hyperframes.heygen.com/schema/hyperframes.json", paths: { blocks: "compositions", components: "compositions/components", assets: "assets" }, media: { autoProxy: true } }, null, 2));
  fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({ name: "short-" + id, private: true, type: "module", scripts: { render: "npx --yes hyperframes@0.9.8 render" } }, null, 2));
  fs.writeFileSync(path.join(dir, "meta.json"), JSON.stringify({ id: "short-" + id, name: "short-" + id, createdAt: new Date().toISOString() }));
  return dir;
}
// envolvente de un audio para mover la boca: intensidad (RMS) 30 veces por segundo, normalizada a 0…1 (percentil 95)
function envolvente(f) { return new Promise((ok, mal) => {
  const ff = path.join(HERRAMIENTAS, process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg");
  const p = spawn(fs.existsSync(ff) ? ff : "ffmpeg", ["-v", "error", "-i", f, "-ac", "1", "-ar", "8000", "-f", "s16le", "-"]); const trozos = [];
  p.stdout.on("data", (c) => trozos.push(c)); p.on("error", mal);
  p.on("close", () => { const b = Buffer.concat(trozos), n = Math.floor(b.length / 2), paso = 8000 / 30, rms = [];
    for (let i = 0; i * paso < n; i++) { let s = 0, c = 0; for (let k = Math.floor(i * paso); k < Math.min(n, Math.floor((i + 1) * paso)); k++) { const v = b.readInt16LE(k * 2) / 32768; s += v * v; c++; } rms.push(Math.sqrt(s / Math.max(1, c))); }
    const orden = [...rms].sort((x, y) => x - y), ref = orden[Math.floor(orden.length * 0.95)] || 1, suelo = orden[Math.floor(orden.length * 0.2)] || 0;
    ok({ duracion: n / 8000, silencio: (orden[orden.length - 1] || 0) < 0.003, envolvente: rms.map((v) => +Math.max(0, Math.min(1, (v - suelo * 1.2) / Math.max(1e-6, ref - suelo * 1.2))).toFixed(2)) }); }); }); }
// audios que se pueden poner en una escena: voces y músicas de los proyectos de shorts-flow
// imágenes para fondos (png/jpg/webp en carpetas fondos, imagenes, img o assets; nada de capturas ni renders)
function imagenes() { const out = []; const mirar = (d, prof) => { if (prof > 5) return; let ls = []; try { ls = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of ls) { if (e.name.startsWith(".") || /^(node_modules|out|snaps.*|revision|referencias.*|papelera)$/.test(e.name)) continue; const f = path.join(d, e.name);
      if (e.isDirectory()) mirar(f, prof + 1); else if (/\.(png|jpe?g|webp)$/i.test(e.name) && /[\\/](fondos|imagenes|img|assets)[\\/]/i.test(f) && !/[\\/](short|escena)-[^\\/]+[\\/]/.test(f)) out.push(path.relative(RAIZ, f).replace(/\\/g, "/")); } };
  mirar(RAIZ, 0); return out.slice(0, 600); }
// copia la imagen de fondo de las escenas al proyecto exportado (assets/archivos/<misma ruta>)
function copiarImagenes(escenas, A) { for (const esc of escenas) { const a = esc?.fondo?.imagen?.archivo; if (!a) continue; const f = path.resolve(RAIZ, a);
    if (!f.startsWith(RAIZ) || !fs.existsSync(f)) continue; const dst = path.join(A, "archivos", a); fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.copyFileSync(f, dst); } }
function audios() { const out = []; const mirar = (d, prof) => { if (prof > 4) return; let ls = []; try { ls = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of ls) { if (e.name.startsWith(".") || e.name === "node_modules" || e.name === "out") continue; const f = path.join(d, e.name);
      if (e.isDirectory()) mirar(f, prof + 1); else if (/\.(wav|mp3)$/i.test(e.name) && /voz|musica|audio|sfx/i.test(f) && !/[\\/](short|escena)-[^\\/]+[\\/]/.test(f)) out.push(path.relative(RAIZ, f).replace(/\\/g, "/")); } };
  mirar(RAIZ, 0); return out.slice(0, 800); }

let vtUltimo = null; const vtClientes = new Set();
http.createServer(async (req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  try {
    if (url === "/api/eventos") { res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-store", Connection: "keep-alive" }); res.write(": hola\n\n"); clientes.add(res); req.on("close", () => clientes.delete(res)); return; }
    // MODO VTUBER: la página de control (vtuber.html) manda cada fotograma y la salida para OBS (vtuber.html?salida) lo recibe al momento
    if (url === "/api/vtuber" && req.method === "POST") { vtUltimo = (await cuerpo(req)).replace(/\n/g, " "); for (const c of vtClientes) c.write("data: " + vtUltimo + "\n\n"); res.writeHead(204); return res.end(); }
    if (url === "/api/vtuber/eventos") { res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-store", Connection: "keep-alive" }); res.write(": hola\n\n"); if (vtUltimo) res.write("data: " + vtUltimo + "\n\n"); vtClientes.add(res); req.on("close", () => vtClientes.delete(res)); return; }
    if (url === "/api/audios") return enviarJSON(res, audios());
    if (url === "/api/laminas" && req.method === "GET") return enviarJSON(res, fs.readdirSync(DIR_LAM).filter((n) => fs.existsSync(path.join(DIR_LAM, n, "lamina.json"))).map((n) => { const j = leerJSON(path.join(DIR_LAM, n, "lamina.json")); return { nombre: n, capas: j.capas, origen: j.origen || "" }; }));
    { const ml = url.match(/^\/api\/laminas\/([a-z0-9][a-z0-9-]{0,60})(?:\/([a-z0-9][a-z0-9-]{0,40}))?$/);
      if (ml) { const [, n, capa] = ml, d = path.join(DIR_LAM, n), fj = path.join(d, "lamina.json");
        if (!capa && req.method === "GET") { const L = leerLamina(n); return L ? enviarJSON(res, L) : (res.writeHead(404), res.end()); }
        if (!capa && req.method === "POST") { if (fs.existsSync(fj)) { res.writeHead(409); return res.end("ya existe"); } const b = JSON.parse(await cuerpo(req) || "{}"), capas = (b.capas || ["lejos", "medio", "delante"]).filter(idValido);
          fs.mkdirSync(d, { recursive: true }); for (const c of capas) fs.writeFileSync(path.join(d, c + ".svg"), '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1536 2752"></svg>');
          fs.writeFileSync(fj, JSON.stringify({ nombre: n, ancho: 1536, alto: 2752, capas, origen: "dibujada en el editor" }, null, 2)); regenerarLaminas(); return enviarJSON(res, leerLamina(n)); }
        if (capa && req.method === "PUT") { if (!fs.existsSync(fj)) { res.writeHead(404); return res.end(); } const b = JSON.parse(await cuerpo(req) || "{}"), j = leerJSON(fj);
          fs.writeFileSync(path.join(d, capa + ".svg"), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${j.ancho} ${j.alto}">${b.svg || ""}</svg>`);
          if (b.dibujo) fs.writeFileSync(path.join(d, capa + ".dibujo.json"), JSON.stringify(b.dibujo));
          if (!j.capas.includes(capa)) { j.capas.push(capa); fs.writeFileSync(fj, JSON.stringify(j, null, 2)); }
          regenerarLaminas(); return enviarJSON(res, leerLamina(n)); } } }
    if (url === "/api/imagenes") return enviarJSON(res, imagenes());
    if (url === "/api/envolvente") { const q = new URL(req.url, "http://x").searchParams.get("archivo") || "", f = path.resolve(RAIZ, q);
      if (!f.startsWith(path.resolve(RAIZ, "..")) || !fs.existsSync(f)) { res.writeHead(404); return res.end("no existe"); }
      return enviarJSON(res, await envolvente(f)); }
    if (url === "/api/transcribir" && req.method === "POST") { const b = JSON.parse(await cuerpo(req) || "{}");
      try { return enviarJSON(res, await transcribir(b.archivo, b.guion)); } catch (e) { return enviarJSON(res, { error: String(e.message || e) }, 400); } }
    // pruebas automáticas (pruebas.html): la referencia de los dibujos se guarda fuera de Git (../.pruebas/referencia.json)
    if (url === "/api/pruebas/referencia") { const f = path.join(RAIZ, ".pruebas", "referencia.json");
      if (req.method === "PUT") { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, await cuerpo(req)); res.writeHead(200); return res.end("ok"); }
      if (!fs.existsSync(f)) return enviarJSON(res, {}); return servir(res, f, req); }
    if (url === "/api/sincronizar" && EN_APP) return enviarJSON(res, { ok: false, error: "En la app de escritorio no se sube a GitHub: tus datos están en Documentos/Fe en Beta Editor." });
    if (url === "/api/sincronizar" && req.method === "POST") { let b = {}; try { b = JSON.parse(await cuerpo(req) || "{}"); } catch {} return enviarJSON(res, await sincronizar(String(b.mensaje || "").slice(0, 200))); }
    let mp = url.match(/^\/api\/(personajes|escenas|acciones|andares|shorts|piezas)\/papelera$/);
    if (mp && req.method === "GET") return enviarJSON(res, papelera(mp[1]));
    mp = url.match(/^\/api\/(personajes|escenas|acciones|andares|shorts|piezas)\/papelera\/([^/]+\.json)\/recuperar$/);
    if (mp && req.method === "POST") { const [, tipo, arch] = mp, src = path.join(DIRS[tipo], "papelera", path.basename(arch)); if (!fs.existsSync(src)) { res.writeHead(404); return res.end(); }
      const info = papelera(tipo).find((x) => x.archivo === path.basename(arch)); let id = info?.id && idValido(info.id) ? info.id : "recuperado", n = 2; const base = id;
      while (fs.existsSync(path.join(DIRS[tipo], id + ".json"))) id = `${base}-${n++}`;
      fs.renameSync(src, path.join(DIRS[tipo], id + ".json")); return enviarJSON(res, { id }); }
    let m = url.match(/^\/api\/(personajes|escenas|acciones|andares|shorts|piezas)$/);
    if (m && req.method === "GET") return enviarJSON(res, lista(m[1]));
    m = url.match(/^\/api\/(personajes|escenas|acciones|andares|shorts|piezas)\/([^/]+)(\/[a-z]+)?$/);
    if (m) { const [, tipo, id, sub] = m; if (!idValido(id)) { res.writeHead(400); return res.end("id no válido: minúsculas, números y guiones"); }
      const f = path.join(DIRS[tipo], id + ".json");
      if (sub === "/papelera" && req.method === "POST") { if (!fs.existsSync(f)) { res.writeHead(404); return res.end(); }
        fs.mkdirSync(path.join(DIRS[tipo], "papelera"), { recursive: true }); fs.renameSync(f, path.join(DIRS[tipo], "papelera", `${id}-${Date.now()}.json`)); res.writeHead(200); return res.end("ok"); }
      if (tipo === "escenas" && sub === "/exportar" && req.method === "POST") return enviarJSON(res, { dir: path.relative(RAIZ, exportar(id)) });
      if (tipo === "escenas" && sub === "/render") { if (req.method === "POST") { let op = {}; try { op = JSON.parse(await cuerpo(req) || "{}"); } catch {} renderizar(id, op); } const r = renders[id] || { estado: "nada", log: "" };
        return enviarJSON(res, estadoRender(id)); }
      if (tipo === "shorts" && sub === "/render") { if (req.method === "POST") { let op = {}; try { op = JSON.parse(await cuerpo(req) || "{}"); } catch {} lanzarRender("short:" + id, (r) => exportarShort(id, r), `/video-short/${id}.mp4`, op); } return enviarJSON(res, estadoRender("short:" + id)); }
      if (tipo === "shorts" && sub === "/seo" && req.method === "POST") { const b = JSON.parse(await cuerpo(req) || "{}"), textos = path.join(RAIZ, "..", "..", "Textos"); fs.mkdirSync(textos, { recursive: true });
        const fmd = path.join(textos, `seo-borrador-${id}.md`); fs.writeFileSync(fmd, String(b.md || ""));
        let fpng = null; if (/^data:image\/png;base64,/.test(b.png || "")) { const d = path.join(RAIZ, "short-" + id); fs.mkdirSync(d, { recursive: true }); fpng = path.join(d, "portada-referencia.png"); fs.writeFileSync(fpng, Buffer.from(b.png.split(",")[1], "base64")); }
        return enviarJSON(res, { md: path.relative(path.join(RAIZ, "..", ".."), fmd).replace(/\\/g, "/"), png: fpng ? path.relative(path.join(RAIZ, "..", ".."), fpng).replace(/\\/g, "/") : null }); }
      if (tipo === "shorts" && sub === "/exportar" && req.method === "POST") return enviarJSON(res, { dir: path.relative(RAIZ, await exportarShort(id)) });
      if (sub === "/historial" && req.method === "GET") return enviarJSON(res, versiones(tipo, id));
      if (sub === "/version" && req.method === "GET") { const mk = new URL(req.url, "http://x").searchParams.get("marca") || ""; if (!/^\d+$/.test(mk)) { res.writeHead(400); return res.end(); } return servir(res, path.join(HIST, tipo, id, mk + ".json"), req); }
      if (sub === "/restaurar" && req.method === "POST") { let b = {}; try { b = JSON.parse(await cuerpo(req) || "{}"); } catch {} const v = path.join(HIST, tipo, id, String(b.marca) + ".json");
        if (!/^\d+$/.test(String(b.marca)) || !fs.existsSync(v)) { res.writeHead(404); return res.end(); } guardarVersion(tipo, id, f, true); fs.copyFileSync(v, f); return enviarJSON(res, { ok: true }); }
      if (!sub && req.method === "GET") return servir(res, f, req);
      if (!sub && req.method === "PUT") { const s = await cuerpo(req); const j = JSON.parse(s); j.id = id; guardarVersion(tipo, id, f);
        fs.writeFileSync(f, JSON.stringify(j, null, 2) + "\n"); res.writeHead(200); return res.end("ok"); }
    }
    if (url.startsWith("/video-short/")) { const id = path.basename(url, ".mp4"); if (!idValido(id)) { res.writeHead(400); return res.end(); } const o = path.join(RAIZ, "short-" + id, "out"); return servir(res, path.join(o, ultimoRender(o, id) || id + ".mp4"), req); }
    if (url.startsWith("/video/")) { const id = path.basename(url, ".mp4"); if (!idValido(id)) { res.writeHead(400); return res.end(); } const o = path.join(RAIZ, "escena-" + id, "out"); return servir(res, path.join(o, ultimoRender(o, id) || id + ".mp4"), req); }
    if (url.startsWith("/audio/")) { const f = path.resolve(RAIZ, url.slice(7)); if (!f.startsWith(RAIZ)) { res.writeHead(403); return res.end(); } return servir(res, f, req); }
    if (url.startsWith("/comun/vendor/")) return servir(res, path.join(COMUN, "vendor", path.basename(url)), req);
    if (url.startsWith("/comun/")) return servir(res, path.join(COMUN, path.basename(url)), req);
    if (url.startsWith("/personajes/")) return servir(res, path.join(DIRS.personajes, path.basename(url)), req);
    if (url.startsWith("/acciones/")) return servir(res, path.join(DIRS.acciones, path.basename(url)), req);
    if (url.startsWith("/andares/")) return servir(res, path.join(DIRS.andares, path.basename(url)), req);
    if (url.startsWith("/ilustraciones/")) return servir(res, path.join(RAIZ, "ilustraciones", path.basename(url)), req);
    const f = path.join(AQUI, url === "/" ? "index.html" : path.basename(url));
    return servir(res, f, req);
  } catch (e) { res.writeHead(500); res.end(String(e.message || e)); }
}).listen(PUERTO, process.env.FEB_HOST || undefined, () => { console.log(`Editor de personajes en http://localhost:${PUERTO}  ·  escenas en http://localhost:${PUERTO}/escenas.html`);
  if (process.send) process.send({ listo: true, puerto: PUERTO }); });   // la app de escritorio espera este aviso para abrir la ventana
