// Editor de MONTAJE: un short = una sola voz + una secuencia de escenas (con transiciones), subtítulos de la marca, música y efectos.
// Del guion al short: transcribir la voz → crear una escena por frase → retocar cada escena en Escenas → renderizar.
// El dibujo es comun/montaje.js (el mismo que el vídeo exportado).
(() => {
  const $ = (s) => document.querySelector(s);
  const h = (tag, at = {}, ...hijos) => { const e = document.createElement(tag); for (const k in at) k === "class" ? (e.className = at[k]) : k.startsWith("on") ? e.addEventListener(k.slice(2), at[k]) : e.setAttribute(k, at[k]); hijos.forEach((c) => e.append(c)); return e; };
  const slug = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "short";
  const fmtT = (t) => t.toFixed(2).replace(".", ",") + " s", cl = (x, a, b) => Math.max(a, Math.min(b, x));
  const aviso = (txt) => { const a = $("#aviso"); a.textContent = txt; a.classList.add("ver"); clearTimeout(aviso.t); aviso.t = setTimeout(() => a.classList.remove("ver"), 3200); };
  const estado = (txt, cls = "") => { const e = $("#estado"); e.textContent = txt; e.className = "estado " + cls; };
  const FONDOS = { noche: "Noche", alba: "Amanecer", dia: "Día", interior: "Interior" }, TRANS = { corte: "Corte", fundido: "Fundido", barrido: "Barrido" };

  let lista = [], actual = null, sh = null, guardadoTxt = "", historia = [], futuro = [], tGuardar = null, PJ = {}, ESC = {}, todasEsc = [], audios = [];
  let motor = null, tiempo = 0, play = false, tAnt = null, selClip = null, gen = { personaje: "", fondo: "alba", trans: "corte" };
  const nuevo = (nombre) => ({ nombre, duracion: 6, voz: null, guion: "", clips: [], subtitulos: { activos: true, resaltar: [] }, musica: null, sfx: [] });
  const normaliza = (x) => Object.assign({ clips: [], sfx: [], subtitulos: { activos: true, resaltar: [] } }, x);
  const D = () => Math.max(1, sh?.duracion || 6);
  const clipsOrden = () => [...sh.clips].sort((a, b) => a.t - b.t);

  // ---- datos: personajes, escenas, audios
  async function cargarPersonajes() { const l = await (await fetch("/api/personajes")).json(); PJ = {}; await Promise.all(l.map(async (p) => { try { PJ[p.id] = await (await fetch(`/api/personajes/${p.id}`)).json(); } catch {} })); }
  async function cargarEscenas() { todasEsc = await (await fetch("/api/escenas")).json(); }
  async function escenasDelShort() { ESC = {}; await Promise.all([...new Set(sh.clips.map((c) => c.escena))].map(async (id) => { try { const r = await fetch(`/api/escenas/${id}`); if (r.ok) ESC[id] = await r.json(); } catch {} })); }
  async function cargarAudios() { audios = await (await fetch("/api/audios")).json(); }

  // ---- E/S de shorts
  async function cargarLista() { lista = await (await fetch("/api/shorts")).json(); pintarLista(); }
  async function abrir(id) { const r = await fetch(`/api/shorts/${id}`); if (!r.ok) return aviso("No se pudo abrir " + id);
    actual = id; sh = normaliza(await r.json()); guardadoTxt = JSON.stringify(sh); historia = []; futuro = []; tiempo = 0; parar(); selClip = null;
    try { localStorage.setItem("mt-actual", id); } catch {} await escenasDelShort(); pintarLista(); reconstruir(); estado("Guardado", "ok"); consultar(); }
  async function guardar() { if (!sh) return; const txt = JSON.stringify(sh); if (txt === guardadoTxt) return; estado("Guardando…");
    const r = await fetch(`/api/shorts/${actual}`, { method: "PUT", body: txt }); if (r.ok) { guardadoTxt = txt; estado("Guardado", "ok"); pintarLista(); } else estado("Error al guardar", "cambio"); }
  let ultimaClave = null, tClave = 0;
  function cambio(fn, clave, estructura = true) {
    const antes = JSON.stringify(sh), ahora = Date.now();
    if (!(clave && clave === ultimaClave && ahora - tClave < 900)) { historia.push(antes); if (historia.length > 150) historia.shift(); futuro = []; }
    ultimaClave = clave; tClave = ahora; fn(sh); estado("Sin guardar…", "cambio"); clearTimeout(tGuardar); tGuardar = setTimeout(guardar, 450);
    if (estructura) reconstruir(); else { pintarPanel(); pintarPistas(); dibujar(); } }
  const tras = () => { ultimaClave = null; escenasDelShort().then(reconstruir); clearTimeout(tGuardar); tGuardar = setTimeout(guardar, 300); };
  function deshacer() { if (!historia.length) return; futuro.push(JSON.stringify(sh)); sh = JSON.parse(historia.pop()); tras(); }
  function rehacer() { if (!futuro.length) return; historia.push(JSON.stringify(sh)); sh = JSON.parse(futuro.pop()); tras(); }
  function escuchar() { const es = new EventSource("/api/eventos");
    es.onmessage = async (ev) => { const { tipo, id } = JSON.parse(ev.data);
      if (tipo === "personajes") { await cargarPersonajes(); reconstruir(); return; }
      if (tipo === "escenas") { await cargarEscenas(); if (sh && sh.clips.some((c) => c.escena === id)) { await escenasDelShort(); reconstruir(); } else pintarPanel(); return; }
      if (tipo !== "shorts") return; if (id !== actual) return cargarLista();
      const r = await fetch(`/api/shorts/${id}`); if (!r.ok) return cargarLista(); let n; try { n = normaliza(await r.json()); } catch { return; }
      const txt = JSON.stringify(n); if (txt === guardadoTxt || txt === JSON.stringify(sh)) return;
      historia.push(JSON.stringify(sh)); futuro = []; sh = n; guardadoTxt = txt; await escenasDelShort(); reconstruir(); aviso("Cambios recibidos del archivo (puedes deshacerlos)"); }; }

  // ---- lista
  function pintarLista() { const ul = $("#lista"); ul.replaceChildren(); if (!lista.length) ul.append(h("li", { class: "vacio" }, "Aún no hay shorts."));
    for (const it of lista) ul.append(h("li", { class: it.id === actual ? "activo" : "", onclick: () => it.id !== actual && abrir(it.id) }, h("span", {}, it.id === actual ? sh.nombre : it.nombre))); }
  function pedirNombre(base) { const f = $("#form-nuevo"), i = $("#nombre-nuevo"); f.hidden = false; f.dataset.base = base ? "1" : ""; i.value = base ? sh.nombre + " (copia)" : ""; i.placeholder = "Nombre del short"; i.focus(); i.select(); }
  $("#b-nuevo").addEventListener("click", () => pedirNombre(false)); $("#b-duplicar").addEventListener("click", () => sh && pedirNombre(true)); $("#b-cancelar").addEventListener("click", () => { $("#form-nuevo").hidden = true; });
  $("#form-nuevo").addEventListener("submit", async (ev) => { ev.preventDefault(); const f = ev.target, nombre = $("#nombre-nuevo").value.trim(); f.hidden = true; if (!nombre) return;
    let id = slug(nombre); while (lista.find((x) => x.id === id)) id = id.replace(/-\d+$/, "") + "-" + Math.floor(Math.random() * 90 + 10);
    const x = f.dataset.base ? Object.assign(JSON.parse(JSON.stringify(sh)), { nombre }) : nuevo(nombre);
    await fetch(`/api/shorts/${id}`, { method: "PUT", body: JSON.stringify(x) }); await cargarLista(); await abrir(id); aviso("Creado: " + nombre); });
  let tPap = 0; $("#b-papelera").addEventListener("click", async () => { if (!actual) return; const b = $("#b-papelera");
    if (Date.now() - tPap > 3000) { tPap = Date.now(); b.textContent = "¿Seguro?"; b.classList.add("armado"); setTimeout(() => { b.textContent = "Papelera"; b.classList.remove("armado"); }, 3000); return; }
    tPap = 0; b.textContent = "Papelera"; b.classList.remove("armado"); await fetch(`/api/shorts/${actual}/papelera`, { method: "POST" }); aviso("Movido a shorts/papelera (sus escenas siguen en Escenas)"); actual = null; sh = null; await cargarLista(); if (lista[0]) abrir(lista[0].id); });

  // ---- vista previa y sonido
  const capa = $("#capa");
  function reconstruir() { if (!sh) return; capa.replaceChildren(); motor = Montaje.crear(capa, sh, ESC, PJ); prepararSonido(); pintarPanel(); pintarPistas(); dibujar(); }
  function dibujar() { if (motor) motor.dibujar(Math.min(tiempo, D() - 0.001)); }
  let sVoz = null, sMus = null, sfxProg = [];
  function prepararSonido() { callar(); sVoz = sh.voz?.archivo ? Object.assign(new Audio("/audio/" + sh.voz.archivo), { preload: "auto" }) : null;
    sMus = sh.musica?.archivo ? Object.assign(new Audio("/audio/" + sh.musica.archivo), { preload: "auto", loop: true, volume: cl(0.14 * (sh.musica.volumen ?? 1), 0, 1) }) : null; }
  function sonar() { if (sVoz && tiempo < (sh.voz.duracion || 1e9)) { sVoz.currentTime = tiempo; sVoz.play().catch(() => {}); } if (sMus) { sMus.currentTime = tiempo % (sMus.duration || 1e9); sMus.play().catch(() => {}); }
    sfxProg = (sh.sfx || []).filter((x) => x.t >= tiempo).map((x) => setTimeout(() => { const a = new Audio("/audio/" + x.archivo); a.volume = cl(x.volumen ?? 0.4, 0, 1); a.play().catch(() => {}); }, (x.t - tiempo) * 1000)); }
  function callar() { sVoz?.pause(); sMus?.pause(); sfxProg.forEach(clearTimeout); sfxProg = []; }
  function parar() { play = false; tAnt = null; callar(); $("#t-play").textContent = "▶"; }
  function reproducir() { if (!sh) return; if (play) return parar(); if (tiempo >= D() - 0.02) tiempo = 0; play = true; tAnt = null; $("#t-play").textContent = "❚❚"; sonar(); }
  function bucle(ahora) { const t = ahora / 1000; if (play && sh) { if (tAnt !== null) tiempo += t - tAnt; tAnt = t; if (tiempo >= D()) { tiempo = D(); parar(); } dibujar(); moverCabezal(); } requestAnimationFrame(bucle); }
  requestAnimationFrame(bucle);
  $("#t-play").addEventListener("click", reproducir); $("#t-inicio").addEventListener("click", () => { parar(); tiempo = 0; dibujar(); moverCabezal(); });

  // ---- 1 · voz y guion
  $("#b-transcribir").addEventListener("click", async () => { const archivo = $("#v-archivo").value, guion = $("#v-guion").value.trim(); if (!archivo) return aviso("Elige primero la voz");
    const b = $("#b-transcribir"), e = $("#v-estado"); b.disabled = true; e.className = "ayuda"; e.textContent = "Transcribiendo con VoiceStudio… (un minuto de voz tarda unos 20 s)";
    try { const r = await (await fetch("/api/transcribir", { method: "POST", body: JSON.stringify({ archivo, guion }) })).json(); if (r.error) throw new Error(r.error);
      cambio((x) => { x.voz = { archivo, duracion: r.duracion, palabras: r.palabras, envolvente: r.envolvente, fuente: r.fuente }; x.guion = guion; x.duracion = +(r.duracion + 0.8).toFixed(2); });
      e.className = "ayuda " + (r.fuente === "estimado" ? "mal" : "ok"); e.textContent = `${r.palabras.length} palabras · ${fmtT(r.duracion)} · ${r.fuente === "estimado" ? "tiempos estimados" : "tiempos de VoiceStudio"}${r.aviso ? "\n" + r.aviso : ""}`; }
    catch (err) { e.className = "ayuda mal"; e.textContent = String(err.message || err); } finally { b.disabled = false; } });

  // ---- 2 · escenas desde las frases: una escena por frase, con su duración exacta y el narrador hablando
  let tGen = 0;
  $("#b-generar").addEventListener("click", async () => { if (!sh?.voz?.palabras?.length) return aviso("Primero transcribe la voz (paso 1)");
    const pid = $("#g-personaje").value; if (!pid) return aviso("Elige quién narra");
    if (sh.clips.length && Date.now() - tGen > 3000) { tGen = Date.now(); aviso("Ya hay escenas: pulsa otra vez para reemplazarlas (las escenas viejas no se borran de Escenas)"); return; }
    const fr = Montaje.frases(sh.voz.palabras); if (!fr.length) return aviso("No hay frases en la voz");
    // una escena por frase, salvo las muy cortas, que se juntan con la siguiente
    const grupos = []; for (const f of fr) { const g = grupos[grupos.length - 1]; if (g && g.end - g.start < 1.6) { g.end = f.end; g.texto += " " + f.texto; } else grupos.push(Object.assign({}, f)); }
    const clips = grupos.map((g, i) => ({ t: i === 0 ? 0 : +Math.max(0, g.start - 0.12).toFixed(2), texto: g.texto }));
    clips.forEach((c, i) => (c.dur = +((i + 1 < clips.length ? clips[i + 1].t : D()) - c.t).toFixed(2)));
    estado("Creando escenas…"); const pj = PJ[pid], nuevos = [];
    for (const [i, c] of clips.entries()) { const id = `${actual}-${String(i + 1).padStart(2, "0")}`;
      const esc = { nombre: `${sh.nombre} · ${i + 1} · ${c.texto.slice(0, 40)}`, duracion: c.dur, fondo: { tipo: gen.fondo },
        camara: [{ t: 0, x: 0, y: i % 3 === 1 ? -480 : -400, zoom: i % 3 === 1 ? 1.6 : i % 3 === 2 ? 1.25 : 1.05 }],   // planos que varían: medio, primer plano, medio corto
        actores: [{ id: pid, personaje: pid, escala: 1, recorrido: [{ t: 0, x: 0, p: 0, giro: i % 2 ? -18 : 18 }],
          // que no quede quieto: gestos al hablar (acción común «Explicar», en capa de brazos), desfasados en cada escena
          bloques: Personajes.buscarAccion(pj, "explicar") ? [{ t: 0, accion: "explicar", dur: c.dur, capa: "brazos", desde: (i * 1.3) % 4 }] : [] }], textos: [], audios: [], origen: "montaje:" + actual, texto: c.texto };
      await fetch(`/api/escenas/${id}`, { method: "PUT", body: JSON.stringify(esc) }); nuevos.push({ escena: id, t: c.t, dur: c.dur, desde: 0, transicion: i === 0 ? "corte" : gen.trans, habla: pid }); }
    await cargarEscenas(); cambio((x) => { x.clips = nuevos; }); await escenasDelShort(); reconstruir(); aviso(`${nuevos.length} escenas creadas: retócalas en Escenas («Editar escena»)`); });

  // ---- panel
  function seg(sel, opciones, valor, alElegir) { const c = $(sel); c.replaceChildren(); for (const [k, n] of Object.entries(opciones)) c.append(h("button", { class: k === valor ? "activo" : "", onclick: () => alElegir(k) }, n)); }
  function deslizar(id, v, fmt) { const i = $("#" + id); if (document.activeElement !== i) i.value = v; i.nextElementSibling.textContent = fmt(Number(v)); }
  const opciones = (sel, items, valor, vacio) => { const s = $(sel), v = valor ?? s.value; s.replaceChildren(...(vacio ? [h("option", { value: "" }, vacio)] : []), ...items.map(([val, txt]) => h("option", { value: val }, txt))); s.value = v || ""; };
  function pintarPanel() { if (!sh) return;
    if (document.activeElement !== $("#s-nombre")) $("#s-nombre").value = sh.nombre || ""; deslizar("s-dur", D(), (v) => v.toFixed(1) + " s");
    opciones("#v-archivo", audios.filter((a) => /voz|narra/i.test(a)).map((a) => [a, a]), sh.voz?.archivo, "— elige la voz —");
    if (document.activeElement !== $("#v-guion")) $("#v-guion").value = sh.guion || "";
    if (sh.voz && !$("#v-estado").textContent) $("#v-estado").textContent = `${sh.voz.palabras?.length || 0} palabras · ${fmtT(sh.voz.duracion || 0)} · ${sh.voz.fuente === "estimado" ? "tiempos estimados" : "tiempos de VoiceStudio"}`;
    opciones("#g-personaje", Object.values(PJ).map((j) => [j.id, j.nombre || j.id]), gen.personaje || $("#g-personaje").value, "— elige el narrador —");
    seg("#g-fondo", FONDOS, gen.fondo, (k) => { gen.fondo = k; pintarPanel(); }); seg("#g-trans", TRANS, gen.trans, (k) => { gen.trans = k; pintarPanel(); });
    const c = selClip !== null ? sh.clips[selClip] : null; $("#c-det").hidden = !c; $("#c-vacio").hidden = !!c;
    if (c) { opciones("#c-escena", todasEsc.map((e) => [e.id, e.nombre]), c.escena); seg("#c-trans", TRANS, c.transicion || "corte", (k) => cambio((x) => { x.clips[selClip].transicion = k; }, null, false));
      const actores = ESC[c.escena]?.actores || []; opciones("#c-habla", [["auto", "el primero de la escena"], ...actores.map((a) => [a.id, PJ[a.personaje]?.nombre || a.personaje])], c.habla ?? "auto", "nadie (no mueve la boca)");
      deslizar("c-desde", c.desde || 0, (v) => v.toFixed(1) + " s"); }
    $("#u-activos").checked = sh.subtitulos?.activos !== false; if (document.activeElement !== $("#u-resaltar")) $("#u-resaltar").value = (sh.subtitulos?.resaltar || []).join(", ");
    opciones("#m-archivo", audios.filter((a) => /musica/i.test(a)).map((a) => [a, a]), sh.musica?.archivo, "— sin música —"); deslizar("m-vol", sh.musica?.volumen ?? 1, (v) => Math.round(v * 100) + "%");
    opciones("#x-archivo", audios.filter((a) => /sfx/i.test(a)).map((a) => [a, a.split("/").pop() + "  ·  " + a.split("/")[0]]), $("#x-archivo").value, "— elige un efecto —");
    const ul = $("#sfx"); ul.replaceChildren(); if (!sh.sfx.length) ul.append(h("li", { class: "vacio" }, "Pon el cabezal donde quieras el efecto y añádelo."));
    sh.sfx.forEach((x, i) => { const t = h("input", { type: "number", step: "0.05", min: 0, value: x.t, title: "Segundo" }), v = h("input", { type: "range", min: 0, max: 1, step: 0.05, value: x.volumen ?? 0.4, title: "Volumen" });
      t.addEventListener("change", () => cambio((s) => { s.sfx[i].t = +(+t.value).toFixed(2); }, null, false)); v.addEventListener("input", () => cambio((s) => { s.sfx[i].volumen = +v.value; }, "sv" + i, false));
      ul.append(h("li", { class: "fila-sfx" }, h("span", {}, "♪"), h("span", { title: x.archivo }, x.archivo.split("/").pop()), t, v, h("button", { class: "x", title: "Quitar", onclick: () => cambio((s) => { s.sfx.splice(i, 1); }, null, false) }, "✕"))); });
    $("#t-tiempo").textContent = fmtT(tiempo) + " / " + fmtT(D()); }
  $("#s-nombre").addEventListener("input", (ev) => cambio((x) => { x.nombre = ev.target.value; }, "s-nombre", false));
  $("#s-dur").addEventListener("input", (ev) => cambio((x) => { x.duracion = +ev.target.value; const u = clipsOrden().pop(); if (u) { const cc = x.clips.find((y) => y.escena === u.escena && y.t === u.t); cc.dur = +Math.max(0.3, x.duracion - cc.t).toFixed(2); } }, "s-dur"));
  $("#v-guion").addEventListener("change", (ev) => cambio((x) => { x.guion = ev.target.value; }, null, false));
  $("#c-escena").addEventListener("change", async (ev) => { cambio((x) => { x.clips[selClip].escena = ev.target.value; }, null, false); await escenasDelShort(); reconstruir(); });
  $("#c-habla").addEventListener("change", (ev) => cambio((x) => { x.clips[selClip].habla = ev.target.value; }));
  $("#c-desde").addEventListener("input", (ev) => cambio((x) => { x.clips[selClip].desde = +ev.target.value; }, "c-desde" + selClip));
  $("#c-editar").addEventListener("click", () => { const c = sh.clips[selClip]; if (c) window.open("escenas.html?escena=" + encodeURIComponent(c.escena), "_blank"); });
  $("#c-partir").addEventListener("click", () => { const c = sh.clips[selClip]; if (!c || tiempo <= c.t + 0.2 || tiempo >= c.t + c.dur - 0.2) return aviso("Pon el cabezal dentro de la escena elegida");
    cambio((x) => { const cc = x.clips[selClip], d1 = +(tiempo - cc.t).toFixed(2); x.clips.push({ escena: cc.escena, t: +tiempo.toFixed(2), dur: +(cc.dur - d1).toFixed(2), desde: +((cc.desde || 0) + d1).toFixed(2), transicion: "corte", habla: cc.habla }); cc.dur = d1; }); aviso("Partida: la segunda mitad puede llevar otra escena"); });
  $("#c-quitar").addEventListener("click", () => { if (selClip === null) return; const i = selClip; selClip = null; cambio((x) => { const [c] = x.clips.splice(i, 1); const prev = [...x.clips].filter((y) => y.t < c.t).sort((a, b) => b.t - a.t)[0]; if (prev) prev.dur = +(prev.dur + c.dur).toFixed(2); }); });
  $("#u-activos").addEventListener("change", (ev) => cambio((x) => { x.subtitulos = Object.assign({}, x.subtitulos, { activos: ev.target.checked }); }));
  $("#u-resaltar").addEventListener("change", (ev) => cambio((x) => { x.subtitulos = Object.assign({}, x.subtitulos, { resaltar: ev.target.value.split(",").map((s) => s.trim()).filter(Boolean) }); }));
  $("#m-archivo").addEventListener("change", (ev) => cambio((x) => { x.musica = ev.target.value ? { archivo: ev.target.value, volumen: x.musica?.volumen ?? 1 } : null; }));
  $("#m-vol").addEventListener("input", (ev) => { if (sh.musica) cambio((x) => { x.musica.volumen = +ev.target.value; }, "m-vol", false); if (sMus) sMus.volume = cl(0.14 * +ev.target.value, 0, 1); });
  $("#b-add-sfx").addEventListener("click", () => { const f = $("#x-archivo").value; if (!f) return aviso("Elige un efecto"); cambio((x) => { x.sfx.push({ t: +tiempo.toFixed(2), archivo: f, volumen: 0.4 }); x.sfx.sort((a, b) => a.t - b.t); }, null, false); aviso("Efecto en " + fmtT(tiempo)); });

  // ---- pistas
  const pct = (t) => (cl(t, 0, D()) / D()) * 100 + "%";
  function fila(nombre, clase = "") { const f = h("div", { class: "pista-fila " + clase }), c = h("div", { class: "carril" }); f.append(h("div", { class: "nom" }, nombre), c); $("#pistas").append(f); return c; }
  function pintarPistas() { const P = $("#pistas"); P.replaceChildren(); if (!sh) return;
    const r = fila(""); r.parentElement.classList.add("regla-fila"); const paso = D() > 60 ? 10 : D() > 20 ? 5 : 1; for (let t = 0; t <= D() + 1e-6; t += paso) r.append(h("span", { class: "marca-t", style: `left:${pct(t)}` }, String(t)));
    // voz: forma de onda (envolvente) y cortes de frase
    const v = fila("Voz", "alta"); if (sh.voz?.envolvente) { const onda = h("div", { class: "onda", style: `right:${100 - (sh.voz.duracion / D()) * 100}%` }), env = sh.voz.envolvente, n = 220;
      for (let i = 0; i < n; i++) { const a = Math.floor((i / n) * env.length), b = Math.max(a + 1, Math.floor(((i + 1) / n) * env.length)); let m = 0; for (let k = a; k < b; k++) m = Math.max(m, env[k] || 0); onda.append(h("i", { style: `height:${Math.max(4, m * 100)}%` })); }
      v.append(onda); for (const f of Montaje.frases(sh.voz.palabras)) v.append(h("div", { class: "frase", style: `left:${pct(f.start)}`, title: f.texto })); }
    else v.append(h("span", { class: "marca-t", style: "left:6px" }, "sin voz: elígela y transcríbela en el panel (paso 1)"));
    if (sh.subtitulos?.activos !== false && sh.voz?.palabras) { const s = fila("Subtítulos"); for (const l of Montaje.lineas(sh.voz.palabras)) s.append(h("div", { class: "bloque sub", style: `left:${pct(l.start)};width:${((l.hasta - l.start) / D()) * 100}%`, title: l.w.map((w) => w.word).join(" ") }, l.w.map((w) => w.word).join(" "))); }
    const ce = fila("Escenas", "alta"); sh.clips.forEach((c, i) => { const e = ESC[c.escena];
      ce.append(h("div", { class: "bloque clip" + (i === selClip ? " activo" : ""), style: `left:${pct(c.t)};width:${(c.dur / D()) * 100}%`, "data-tipo": "clip", "data-i": i, title: (e?.nombre || c.escena) + " · " + fmtT(c.t) }, (c.transicion && c.transicion !== "corte" ? (c.transicion === "fundido" ? "◐ " : "➜ ") : "") + (e?.texto || e?.nombre || c.escena)));
      if (c.t > 0.01) ce.append(h("div", { class: "borde", style: `left:${pct(c.t)}`, "data-tipo": "borde", "data-i": i, title: "Arrastra para mover el corte" })); });
    if (!sh.clips.length) ce.append(h("span", { class: "marca-t", style: "left:6px" }, "sin escenas: créalas desde la voz (paso 2)"));
    if (sh.musica?.archivo) { const m = fila("Música"); m.append(h("div", { class: "bloque musica", style: "left:0;width:100%" }, "♫ " + sh.musica.archivo.split("/").pop())); }
    if (sh.sfx.length) { const x = fila("Efectos"); sh.sfx.forEach((s, i) => x.append(h("div", { class: "rombo sfx", style: `left:${pct(s.t)}`, "data-tipo": "sfx", "data-i": i, title: s.archivo.split("/").pop() + " · " + fmtT(s.t) }))); }
    for (const c of P.querySelectorAll(".carril")) c.append(h("div", { class: "cabezal-g" })); moverCabezal();
    $("#t-ayuda").textContent = !sh.voz ? "Empieza por la voz (panel derecho, paso 1)." : !sh.clips.length ? "Ahora crea las escenas desde las frases (paso 2)." : "Clic en una escena para elegirla · arrastra los bordes entre escenas para mover el corte · espacio reproduce."; }
  function moverCabezal() { for (const c of document.querySelectorAll(".cabezal-g")) c.style.left = pct(tiempo); $("#t-tiempo").textContent = fmtT(tiempo) + " / " + fmtT(D()); }
  let arr = null;
  $("#pistas").addEventListener("pointerdown", (ev) => { const c = ev.target.closest(".carril"); if (!c || !sh) return; parar(); try { c.setPointerCapture(ev.pointerId); } catch {}
    const r = c.getBoundingClientRect(), t = cl(((ev.clientX - r.left) / r.width) * D(), 0, D()), o = ev.target.closest("[data-tipo]");
    if (o?.dataset.tipo === "borde") { const i = +o.dataset.i, ord = clipsOrden(), cc = sh.clips[i], prev = ord[ord.indexOf(cc) - 1]; arr = { borde: i, prev: sh.clips.indexOf(prev), w: r.width, x0: ev.clientX, t0: cc.t }; return; }
    if (o?.dataset.tipo === "sfx") { arr = { sfx: +o.dataset.i, w: r.width, x0: ev.clientX, t0: sh.sfx[+o.dataset.i].t }; return; }
    if (o?.dataset.tipo === "clip") { selClip = +o.dataset.i; }
    tiempo = +t.toFixed(2); arr = { cabezal: true }; dibujar(); pintarPanel(); pintarPistas(); });
  document.addEventListener("pointermove", (ev) => { if (!arr) return;
    if (arr.cabezal) { const r = $("#pistas .carril").getBoundingClientRect(); tiempo = +cl(((ev.clientX - r.left) / r.width) * D(), 0, D()).toFixed(2); dibujar(); moverCabezal(); return; }
    const t = +cl(arr.t0 + ((ev.clientX - arr.x0) / arr.w) * D(), 0, D()).toFixed(2), a = arr;
    if (a.borde !== undefined) cambio((x) => { const cc = x.clips[a.borde], pv = x.clips[a.prev]; if (!pv) return; const fin = cc.t + cc.dur, nt = cl(t, pv.t + 0.3, fin - 0.3); cc.t = +nt.toFixed(2); cc.dur = +(fin - nt).toFixed(2); pv.dur = +(nt - pv.t).toFixed(2); }, "borde" + a.borde, false);
    else if (a.sfx !== undefined) cambio((x) => { x.sfx[a.sfx].t = t; }, "sfx" + a.sfx, false); });
  document.addEventListener("pointerup", () => { if (arr && !arr.cabezal) reconstruir(); arr = null; });

  // ---- render
  let sondeo = null;
  async function consultar() { if (!actual) return; clearTimeout(sondeo); const r = await (await fetch(`/api/shorts/${actual}/render`)).json(), e = $("#render-estado"), b = $("#b-render");
    if (r.estado === "renderizando" || r.estado === "preparando") { e.textContent = `${r.estado === "preparando" ? "Preparando (voz, música, escenas)" : "Renderizando"}… ${r.progreso || ""} (${r.segundos} s)`; b.disabled = true; sondeo = setTimeout(consultar, 1500); return; }
    b.disabled = false; if (r.estado === "listo") { e.textContent = `Listo en ${r.segundos} s · ${r.ruta || "Videos/shorts-flow/short-" + actual + "/out/"}${r.nota ? "\n" + r.nota : ""}`; const v = $("#render-video"); v.hidden = false; v.src = r.archivo; }
    else if (r.estado === "error") e.textContent = "Error al renderizar:\n" + r.log; else e.textContent = ""; }
  $("#b-render").addEventListener("click", async () => { if (!sh) return; if (!sh.clips.length) return aviso("El short no tiene escenas todavía"); await guardar(); { const v = $("#render-video"); v.pause(); v.removeAttribute("src"); v.load(); v.hidden = true; }   // suelta el MP4 anterior (Windows lo bloquea mientras está abierto)
    await fetch(`/api/shorts/${actual}/render`, { method: "POST" }); consultar(); });

  // ---- teclado
  $("#b-deshacer").addEventListener("click", deshacer); $("#b-rehacer").addEventListener("click", rehacer);
  document.addEventListener("keydown", (ev) => { const el = document.activeElement, escribe = ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName) && el.type !== "range";
    if ((ev.ctrlKey || ev.metaKey) && !escribe) { if (ev.key.toLowerCase() === "z" && !ev.shiftKey) { ev.preventDefault(); deshacer(); } else if (ev.key.toLowerCase() === "y" || (ev.key.toLowerCase() === "z" && ev.shiftKey)) { ev.preventDefault(); rehacer(); } return; }
    if (ev.code === "Space" && !escribe) { ev.preventDefault(); reproducir(); } });

  // ---- arranque
  (async () => { await Promise.all([cargarPersonajes(), cargarEscenas(), cargarAudios()]); await cargarLista(); escuchar();
    let ini = new URLSearchParams(location.search).get("short"); if (!ini) try { ini = localStorage.getItem("mt-actual"); } catch {}
    const id = lista.find((x) => x.id === ini) ? ini : lista[0]?.id; if (id) await abrir(id); else pintarPistas(); })();
})();
