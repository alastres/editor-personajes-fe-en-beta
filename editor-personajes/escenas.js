// Editor de ESCENAS: varios personajes sobre un fondo, recorridos, acciones, cámara, rótulos y audio, con línea de tiempo,
// y render a vídeo con HyperFrames sin escribir código. El motor de dibujo es comun/escena.js (el mismo que usa el vídeo).
(() => {
  const $ = (s) => document.querySelector(s);
  const h = (tag, at = {}, ...hijos) => { const e = document.createElement(tag); for (const k in at) k === "class" ? (e.className = at[k]) : k.startsWith("on") ? e.addEventListener(k.slice(2), at[k]) : e.setAttribute(k, at[k]); hijos.forEach((c) => e.append(c)); return e; };
  const slug = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "escena";
  const fmtT = (t) => t.toFixed(2).replace(".", ",") + " s", cl = (x, a, b) => Math.max(a, Math.min(b, x));
  const aviso = (txt) => { const a = $("#aviso"); a.textContent = txt; a.classList.add("ver"); clearTimeout(aviso.t); aviso.t = setTimeout(() => a.classList.remove("ver"), 2800); };
  const estado = (txt, cls = "") => { const e = $("#estado"); e.textContent = txt; e.className = "estado " + cls; };
  const FONDOS_N = { noche: "Noche", alba: "Amanecer", dia: "Día", interior: "Interior", color: "Color liso" };
  const PLANOS = { general: { n: "General", zoom: 0.8, dy: -60 }, medio: { n: "Medio", zoom: 1.45, dy: -40 }, primer: { n: "Primer plano", zoom: 2.5, dy: -130 } };

  let lista = [], actual = null, esc = null, guardadoTxt = "", historia = [], futuro = [], tGuardar = null, PJ = {}, motor = null;
  let tiempo = 0, play = false, tAnt = null, selActor = null, selBloque = null, selTexto = null;
  const nueva = (nombre) => ({ nombre, duracion: 6, fondo: { tipo: "noche" }, camara: [{ t: 0, x: 0, y: -360, zoom: 1 }], actores: [], textos: [], audios: [] });
  const normaliza = (x) => Object.assign({ duracion: 6, fondo: { tipo: "noche" }, camara: [], actores: [], textos: [], audios: [] }, x);
  const D = () => Math.max(0.5, esc?.duracion || 6);
  const actor = (id = selActor) => esc?.actores.find((a) => a.id === id);

  // ---- personajes (para dibujar y para las listas de acciones)
  async function cargarPersonajes() { const l = await (await fetch("/api/personajes")).json(); PJ = {};
    await Promise.all(l.map(async (p) => { try { PJ[p.id] = await (await fetch(`/api/personajes/${p.id}`)).json(); } catch {} }));
    $("#add-personaje").replaceChildren(...Object.values(PJ).map((j) => h("option", { value: j.id }, j.nombre || j.id))); }

  // ---- E/S de escenas
  async function cargarLista() { lista = await (await fetch("/api/escenas")).json(); pintarLista(); }
  async function abrir(id) { const r = await fetch(`/api/escenas/${id}`); if (!r.ok) return aviso("No se pudo abrir " + id);
    actual = id; esc = normaliza(await r.json()); guardadoTxt = JSON.stringify(esc); historia = []; futuro = []; tiempo = 0; play = false; selActor = esc.actores[0]?.id || null; selBloque = selTexto = null;
    try { localStorage.setItem("es-actual", id); } catch {} pintarLista(); reconstruir(); estado("Guardado", "ok"); }
  async function guardar() { if (!esc) return; const txt = JSON.stringify(esc); if (txt === guardadoTxt) return; estado("Guardando…");
    const r = await fetch(`/api/escenas/${actual}`, { method: "PUT", body: txt }); if (r.ok) { guardadoTxt = txt; estado("Guardado", "ok"); pintarLista(); } else estado("Error al guardar", "cambio"); }
  let ultimaClave = null, tClave = 0;
  function cambio(fn, clave, estructura = true) {
    const antes = JSON.stringify(esc), ahora = Date.now();
    if (!(clave && clave === ultimaClave && ahora - tClave < 900)) { historia.push(antes); if (historia.length > 200) historia.shift(); futuro = []; }
    ultimaClave = clave; tClave = ahora; fn(esc); estado("Sin guardar…", "cambio"); clearTimeout(tGuardar); tGuardar = setTimeout(guardar, 450);
    if (estructura) reconstruir(); else { pintarPanel(); pintarPistas(); dibujar(); } }
  function deshacer() { if (!historia.length) return; futuro.push(JSON.stringify(esc)); esc = JSON.parse(historia.pop()); ultimaClave = null; reconstruir(); clearTimeout(tGuardar); tGuardar = setTimeout(guardar, 300); }
  function rehacer() { if (!futuro.length) return; historia.push(JSON.stringify(esc)); esc = JSON.parse(futuro.pop()); ultimaClave = null; reconstruir(); clearTimeout(tGuardar); tGuardar = setTimeout(guardar, 300); }
  function escuchar() { const es = new EventSource("/api/eventos");
    es.onmessage = async (ev) => { const { tipo, id } = JSON.parse(ev.data);
      if (tipo === "personajes") { await cargarPersonajes(); reconstruir(); return; }
      if (tipo !== "escenas") return; if (id !== actual) return cargarLista();
      const r = await fetch(`/api/escenas/${id}`); if (!r.ok) return cargarLista(); let n; try { n = normaliza(await r.json()); } catch { return; }
      const txt = JSON.stringify(n); if (txt === guardadoTxt || txt === JSON.stringify(esc)) return;
      historia.push(JSON.stringify(esc)); futuro = []; esc = n; guardadoTxt = txt; reconstruir(); aviso("Cambios recibidos del archivo (puedes deshacerlos)"); };
    es.onerror = () => estado("Sin conexión con el servidor", "cambio"); }

  // ---- lista de escenas
  function pintarLista() { const ul = $("#lista"); ul.replaceChildren();
    if (!lista.length) ul.append(h("li", { class: "vacio" }, "Aún no hay escenas."));
    for (const it of lista) ul.append(h("li", { class: it.id === actual ? "activo" : "", onclick: () => it.id !== actual && abrir(it.id) }, h("span", {}, it.id === actual ? esc.nombre : it.nombre))); }
  function pedirNombre(base) { const f = $("#form-nueva"), i = $("#nombre-nueva"); f.hidden = false; f.dataset.base = base ? "1" : ""; i.value = base ? esc.nombre + " (copia)" : ""; i.placeholder = "Nombre de la escena"; i.focus(); i.select(); }
  $("#b-nueva").addEventListener("click", () => pedirNombre(false)); $("#b-duplicar").addEventListener("click", () => esc && pedirNombre(true));
  $("#b-cancelar").addEventListener("click", () => { $("#form-nueva").hidden = true; });
  $("#form-nueva").addEventListener("submit", async (ev) => { ev.preventDefault(); const f = ev.target, nombre = $("#nombre-nueva").value.trim(); f.hidden = true; if (!nombre) return;
    let id = slug(nombre); while (lista.find((x) => x.id === id)) id = id.replace(/-\d+$/, "") + "-" + Math.floor(Math.random() * 90 + 10);
    const x = f.dataset.base ? Object.assign(JSON.parse(JSON.stringify(esc)), { nombre }) : nueva(nombre);
    await fetch(`/api/escenas/${id}`, { method: "PUT", body: JSON.stringify(x) }); await cargarLista(); await abrir(id); aviso("Creada: " + nombre); });
  let tPap = 0; $("#b-papelera").addEventListener("click", async () => { if (!actual) return; const b = $("#b-papelera");
    if (Date.now() - tPap > 3000) { tPap = Date.now(); b.textContent = "¿Seguro?"; b.classList.add("armado"); setTimeout(() => { b.textContent = "Papelera"; b.classList.remove("armado"); }, 3000); return; }
    tPap = 0; b.textContent = "Papelera"; b.classList.remove("armado"); await fetch(`/api/escenas/${actual}/papelera`, { method: "POST" }); aviso("Movida a escenas/papelera"); actual = null; esc = null; await cargarLista(); if (lista[0]) abrir(lista[0].id); });

  // ---- dibujo
  const lienzo = $("#lienzo"), capa = $("#capa-escena");
  function reconstruir() { if (!esc) return; capa.replaceChildren(); motor = Escena.crear(capa, esc, PJ); prepararAudios(); pintarPanel(); pintarPistas(); dibujar(); }
  function dibujar() { if (motor) motor.dibujar(Math.min(tiempo, D())); }
  function bucle(ahora) { const t = ahora / 1000;
    if (play && esc) { if (tAnt !== null) tiempo += t - tAnt; tAnt = t; if (tiempo >= D()) { tiempo = D(); parar(); } dibujar(); moverCabezal(); }
    requestAnimationFrame(bucle); }
  requestAnimationFrame(bucle);

  // ---- audio en el editor (para oír la voz mientras se monta)
  let audiosEl = [];
  function prepararAudios() { audiosEl.forEach((a) => a.el.pause()); audiosEl = (esc.audios || []).map((au) => ({ au, el: Object.assign(new Audio("/audio/" + au.archivo), { preload: "auto", volume: cl(au.volumen ?? 1, 0, 1) }) })); }
  function sonar() { for (const { au, el } of audiosEl) { const u = tiempo - (au.t || 0); if (u >= 0 && u < (au.dur || 1e9)) { el.currentTime = u; el.play().catch(() => {}); } } }
  function callar() { audiosEl.forEach((a) => a.el.pause()); }
  function parar() { play = false; tAnt = null; callar(); $("#t-play").textContent = "▶"; }
  function reproducir() { if (!esc) return; if (play) return parar(); if (tiempo >= D() - 0.01) tiempo = 0; play = true; tAnt = null; $("#t-play").textContent = "❚❚"; sonar(); }
  $("#t-play").addEventListener("click", reproducir); $("#t-inicio").addEventListener("click", () => { parar(); tiempo = 0; dibujar(); pintarPanel(); pintarPistas(); });

  // ---- claves: crear o tocar la clave del cabezal (autoclave), con los valores interpolados como punto de partida
  function tocarClave(listaK, campos, valores) { let i = listaK.findIndex((k) => Math.abs(k.t - tiempo) < 0.02);
    if (i < 0) { const base = Escena.claves(listaK, tiempo, campos) || {}; const k = { t: +tiempo.toFixed(2) }; for (const c of campos) k[c] = base[c] ?? valores[c] ?? 0; listaK.push(k); listaK.sort((a, b) => a.t - b.t); i = listaK.indexOf(k); }
    Object.assign(listaK[i], valores); }
  const posActor = (a) => Escena.claves(a.recorrido, tiempo, ["x", "p", "giro"]) || { x: 0, p: 0, giro: 20 };
  const posCam = () => Escena.claves(esc.camara, tiempo, ["x", "y", "zoom"]) || { x: 0, y: -360, zoom: 1 };

  // ---- panel
  function seg(sel, opciones, valor, alElegir) { const c = $(sel); c.replaceChildren(); for (const [k, n] of Object.entries(opciones)) c.append(h("button", { class: k === valor ? "activo" : "", onclick: () => alElegir(k) }, n)); }
  function deslizar(id, valor, fmt) { const i = $("#" + id); if (document.activeElement !== i) i.value = valor; i.nextElementSibling.textContent = fmt(Number(valor)); }
  function pintarPanel() {
    if (!esc) return;
    if (document.activeElement !== $("#e-nombre")) $("#e-nombre").value = esc.nombre || "";
    deslizar("e-dur", D(), (v) => v.toFixed(1) + " s");
    seg("#e-fondo", FONDOS_N, esc.fondo?.tipo || "noche", (k) => cambio((x) => { x.fondo = Object.assign({}, x.fondo, { tipo: k }); }));
    // actores
    const ul = $("#actores"); ul.replaceChildren(); if (!esc.actores.length) ul.append(h("li", { class: "vacio" }, "Añade personajes de tu reparto."));
    for (const a of esc.actores) ul.append(h("li", { class: a.id === selActor ? "activo" : "", onclick: () => { selActor = a.id; selBloque = null; pintarPanel(); pintarPistas(); } },
      h("span", {}, "●"), h("span", {}, PJ[a.personaje]?.nombre || a.personaje), h("span", { class: "hueso" }, `${(a.bloques || []).length} acc.`), h("span")));
    const a = actor(); $("#actor-det").hidden = !a;
    if (a) { const q = posActor(a); deslizar("a-x", q.x, (v) => Math.round(v)); deslizar("a-p", q.p || 0, (v) => v.toFixed(2)); deslizar("a-giro", q.giro ?? 20, (v) => Math.round(v) + "°"); deslizar("a-escala", a.escala || 1, (v) => Math.round(v * 100) + "%");
      const acc = [...(PJ[a.personaje]?.acciones || []), ...Object.values(window.ACCIONES || {}).map((x) => Object.assign({}, x, { comun: true }))];
      $("#a-accion").replaceChildren(...(acc.length ? acc.map((x) => h("option", { value: x.id }, (x.comun ? "★ " : "") + (x.nombre || x.id))) : [h("option", { value: "" }, "— sin acciones: créalas en Personajes → Animación —")]));
      $("#b-add-bloque").disabled = !acc.length;
      const b = selBloque !== null ? a.bloques[selBloque] : null; $("#bloque-det").hidden = !b; if (b) { deslizar("b-dur", b.dur || 2, (v) => v.toFixed(1) + " s");
        seg("#b-capa", { todo: "Todo el cuerpo", cuerpo: "Solo cuerpo", brazos: "Solo brazos" }, b.capa || "todo", (k) => cambio((x) => { const bb = x.actores.find((y) => y.id === a.id).bloques[selBloque]; if (k === "todo") delete bb.capa; else bb.capa = k; }, null, false)); }
      $("#b-quitar-clave").disabled = !(a.recorrido || []).some((k) => Math.abs(k.t - tiempo) < 0.02) || a.recorrido.length < 2; }
    // cámara
    const c = posCam(); deslizar("c-x", c.x, (v) => Math.round(v)); deslizar("c-y", c.y, (v) => Math.round(v)); deslizar("c-zoom", c.zoom || 1, (v) => v.toFixed(2) + "×");
    seg("#c-planos", Object.fromEntries(Object.entries(PLANOS).map(([k, v]) => [k, v.n])), "", (k) => { const p = PLANOS[k], a2 = actor(), q = a2 ? posActor(a2) : { x: c.x, p: 0 }, s = (a2?.escala || 1) * (1 - 0.38 * (q.p || 0));
      const centroY = -170 * (q.p || 0) + (-330 + p.dy) * s; cambio((x) => tocarClave(x.camara, ["x", "y", "zoom"], { x: Math.round(q.x), y: Math.round(centroY), zoom: +(p.zoom / s).toFixed(2) }), null, false); });
    $("#b-quitar-cam").disabled = !esc.camara.some((k) => Math.abs(k.t - tiempo) < 0.02) || esc.camara.length < 2;
    // rótulos
    const ut = $("#textos"); ut.replaceChildren(); for (const [i, tx] of esc.textos.entries()) { const inp = h("input", { type: "text", value: tx.texto, class: "nom-ctrl" }); inp.addEventListener("change", () => cambio((x) => { x.textos[i].texto = inp.value; }, null, false));
      ut.append(h("li", { class: i === selTexto ? "activo" : "", onclick: () => { selTexto = i; tiempo = tx.t; dibujar(); pintarPistas(); } }, h("span", {}, "T"), inp, h("span", { class: "hueso" }, fmtT(tx.t)), h("button", { class: "x", title: "Quitar", onclick: (ev) => { ev.stopPropagation(); cambio((x) => { x.textos.splice(i, 1); }, null, false); } }, "✕"))); }
    // audio
    const ua = $("#audios"); ua.replaceChildren(); for (const [i, au] of esc.audios.entries()) { const vol = h("input", { type: "range", min: 0, max: 1, step: 0.05, value: au.volumen ?? 1, title: "Volumen" });
      vol.addEventListener("input", () => cambio((x) => { x.audios[i].volumen = Number(vol.value); }, "vol" + i, false));
      const quien = h("select", { class: "habla", title: "¿Quién habla? Su boca seguirá esta voz" }, h("option", { value: "" }, "nadie habla (música)"), ...esc.actores.map((a) => h("option", { value: a.id }, "habla: " + (PJ[a.personaje]?.nombre || a.personaje))));
      quien.value = au.habla || ""; quien.addEventListener("change", async () => { const v = quien.value; let env = au.envolvente;
        if (v && !env) { estado("Analizando la voz…"); const r = await (await fetch("/api/envolvente?archivo=" + encodeURIComponent(au.archivo))).json(); env = r.envolvente; }
        cambio((x) => { x.audios[i].habla = v || undefined; if (env) x.audios[i].envolvente = env; }, null, false); });
      ua.append(h("li", { class: "fila-audio" }, h("span", {}, "♪"), h("div", { class: "audio-info" }, h("span", { title: au.archivo }, au.archivo.split("/").pop()), quien), vol, h("button", { class: "x", title: "Quitar", onclick: () => cambio((x) => { x.audios.splice(i, 1); }) }, "✕"))); }
    $("#t-tiempo").textContent = fmtT(tiempo) + " / " + fmtT(D());
    const kc = claveCabezal(); $("#t-curva").disabled = !kc; if (kc) $("#t-curva").value = kc.k.curva || "suave";
  }
  // clave del cabezal a la que se aplica la curva: la del recorrido del personaje elegido; si no hay, la de cámara
  function claveCabezal() { const a = actor(), cerca = (k) => Math.abs(k.t - tiempo) < 0.02;
    const ka = a && (a.recorrido || []).find(cerca); if (ka) return { tipo: "rec", k: ka, id: a.id }; const kc = esc.camara.find(cerca); return kc ? { tipo: "cam", k: kc } : null; }
  $("#t-curva").addEventListener("change", (ev) => { const c = claveCabezal(); if (!c) return; const v = ev.target.value;
    cambio((x) => { const lst = c.tipo === "cam" ? x.camara : x.actores.find((y) => y.id === c.id).recorrido, k = lst.find((q) => Math.abs(q.t - tiempo) < 0.02); if (v === "suave") delete k.curva; else k.curva = v; }, null, false); });
  $("#e-nombre").addEventListener("input", (ev) => cambio((x) => { x.nombre = ev.target.value; }, "e-nombre", false));
  $("#e-dur").addEventListener("input", (ev) => cambio((x) => { x.duracion = Number(ev.target.value); }, "e-dur", false));
  $("#b-add-actor").addEventListener("click", () => { const pid = $("#add-personaje").value; if (!pid) return; let n = 1, id = pid; while (esc.actores.some((a) => a.id === id)) id = pid + "-" + ++n;
    const x0 = esc.actores.length ? (esc.actores.length % 2 ? 260 : -260) * Math.ceil(esc.actores.length / 2) : 0;
    cambio((x) => { x.actores.push({ id, personaje: pid, escala: 1, recorrido: [{ t: 0, x: x0, p: 0, giro: x0 > 0 ? -25 : 25 }], bloques: [] }); }); selActor = id; pintarPanel(); pintarPistas(); });
  const editarActor = (valores, clave) => { const a = actor(); if (!a) return; cambio((x) => { tocarClave(x.actores.find((y) => y.id === a.id).recorrido, ["x", "p", "giro"], valores); }, clave ? clave + "@" + tiempo.toFixed(2) : null, false); };
  $("#a-x").addEventListener("input", (ev) => editarActor({ x: Number(ev.target.value) }, "a-x"));
  $("#a-p").addEventListener("input", (ev) => editarActor({ p: Number(ev.target.value) }, "a-p"));
  $("#a-giro").addEventListener("input", (ev) => editarActor({ giro: Number(ev.target.value) }, "a-giro"));
  $("#a-escala").addEventListener("input", (ev) => { const a = actor(); if (a) cambio((x) => { x.actores.find((y) => y.id === a.id).escala = Number(ev.target.value); }, "a-escala", false); });
  $("#b-add-bloque").addEventListener("click", () => { const a = actor(), acc = $("#a-accion").value; if (!a || !acc) return; const def = Personajes.buscarAccion(PJ[a.personaje], acc)?.duracion || 2;
    cambio((x) => { const ax = x.actores.find((y) => y.id === a.id); ax.bloques = ax.bloques || []; ax.bloques.push({ t: +tiempo.toFixed(2), accion: acc, dur: +Math.min(def * 2, D() - tiempo || def).toFixed(1) || def }); ax.bloques.sort((m, n) => m.t - n.t); selBloque = ax.bloques.findIndex((b) => b.accion === acc && Math.abs(b.t - tiempo) < 0.02); }, null, false); });
  $("#b-dur").addEventListener("input", (ev) => { const a = actor(); if (!a || selBloque === null) return; cambio((x) => { x.actores.find((y) => y.id === a.id).bloques[selBloque].dur = Number(ev.target.value); }, "b-dur" + selBloque, false); });
  $("#b-quitar-bloque").addEventListener("click", () => { const a = actor(); if (!a || selBloque === null) return; const i = selBloque; selBloque = null; cambio((x) => { x.actores.find((y) => y.id === a.id).bloques.splice(i, 1); }, null, false); });
  $("#b-quitar-clave").addEventListener("click", () => { const a = actor(); if (!a) return; cambio((x) => { const r = x.actores.find((y) => y.id === a.id).recorrido; const i = r.findIndex((k) => Math.abs(k.t - tiempo) < 0.02); if (i >= 0 && r.length > 1) r.splice(i, 1); }, null, false); });
  $("#b-quitar-actor").addEventListener("click", () => { const a = actor(); if (!a) return; cambio((x) => { x.actores = x.actores.filter((y) => y.id !== a.id); }); selActor = esc.actores[0]?.id || null; aviso("Quitado de la escena (Ctrl+Z lo recupera)"); });
  const editarCam = (valores, clave) => cambio((x) => tocarClave(x.camara, ["x", "y", "zoom"], valores), clave + "@" + tiempo.toFixed(2), false);
  $("#c-x").addEventListener("input", (ev) => editarCam({ x: Number(ev.target.value) }, "c-x")); $("#c-y").addEventListener("input", (ev) => editarCam({ y: Number(ev.target.value) }, "c-y"));
  $("#c-zoom").addEventListener("input", (ev) => editarCam({ zoom: Number(ev.target.value) }, "c-zoom"));
  $("#b-quitar-cam").addEventListener("click", () => cambio((x) => { const i = x.camara.findIndex((k) => Math.abs(k.t - tiempo) < 0.02); if (i >= 0 && x.camara.length > 1) x.camara.splice(i, 1); }, null, false));
  $("#b-add-texto").addEventListener("click", () => { const t = $("#tx-texto").value.trim(); if (!t) return; $("#tx-texto").value = ""; cambio((x) => { x.textos.push({ t: +tiempo.toFixed(2), dur: 2, texto: t }); x.textos.sort((a, b) => a.t - b.t); }, null, false); });
  $("#tx-texto").addEventListener("keydown", (ev) => { if (ev.key === "Enter") $("#b-add-texto").click(); });
  $("#b-add-audio").addEventListener("click", async () => { const f = $("#au-lista").value; if (!f) return; estado("Analizando el audio…");
    let info = {}; try { info = await (await fetch("/api/envolvente?archivo=" + encodeURIComponent(f))).json(); } catch {}
    const voz = /voz|narra/i.test(f) && esc.actores.length ? (actor() || esc.actores[0]).id : undefined;
    cambio((x) => { x.audios.push({ archivo: f, t: +tiempo.toFixed(2), dur: info.duracion ? +info.duracion.toFixed(2) : undefined, volumen: 1, habla: voz, envolvente: info.envolvente });
      if (info.duracion && x.duracion < tiempo + info.duracion) x.duracion = +(tiempo + info.duracion + 0.5).toFixed(1); });
    aviso(voz ? `Voz añadida en ${fmtT(tiempo)}: la boca de ${PJ[actor(voz).personaje]?.nombre} la sigue` : "Audio añadido en " + fmtT(tiempo)); });
  async function cargarAudios() { const l = await (await fetch("/api/audios")).json(); $("#au-lista").replaceChildren(h("option", { value: "" }, l.length ? "— elige una voz o una música —" : "— no hay audios —"), ...l.map((f) => h("option", { value: f }, f))); }

  // ---- pistas (línea de tiempo)
  const pct = (t) => (cl(t, 0, D()) / D()) * 100 + "%";
  function fila(nombre, activo, onNom) { const f = h("div", { class: "pista-fila" }), n = h("div", { class: "nom" + (activo ? " activo" : ""), title: nombre }, nombre), c = h("div", { class: "carril" }); if (onNom) n.addEventListener("click", onNom); f.append(n, c); $("#pistas").append(f); return c; }
  function pintarPistas() {
    const P = $("#pistas"); P.replaceChildren(); if (!esc) return;
    const r = fila("", false); r.parentElement.classList.add("regla-fila"); for (let t = 0; t <= D() + 1e-6; t += D() > 20 ? 5 : 1) r.append(h("span", { class: "marca-t", style: `left:${pct(t)}` }, String(t)));
    const cam = fila("Cámara", false); for (const [i, k] of esc.camara.entries()) cam.append(h("div", { class: "rombo cam" + (Math.abs(k.t - tiempo) < 0.02 ? " activo" : ""), style: `left:${pct(k.t)}`, "data-tipo": "cam", "data-i": i, title: fmtT(k.t) }));
    for (const a of esc.actores) { const c = fila(PJ[a.personaje]?.nombre || a.personaje, a.id === selActor, () => { selActor = a.id; selBloque = null; pintarPanel(); pintarPistas(); });
      for (const [i, b] of (a.bloques || []).entries()) { const acc = Personajes.buscarAccion(PJ[a.personaje], b.accion);
        c.append(h("div", { class: "bloque" + (a.id === selActor && i === selBloque ? " activo" : ""), style: `left:${pct(b.t)};width:${((b.dur || 2) / D()) * 100}%`, "data-tipo": "bloque", "data-actor": a.id, "data-i": i, title: (acc?.nombre || b.accion) + " · " + fmtT(b.t) + (b.capa === "brazos" ? " · capa de brazos" : "") }, (b.capa === "brazos" ? "✋ " : "") + (acc?.nombre || b.accion))); }
      for (const [i, k] of (a.recorrido || []).entries()) c.append(h("div", { class: "rombo" + (Math.abs(k.t - tiempo) < 0.02 ? " activo" : ""), style: `left:${pct(k.t)}`, "data-tipo": "rec", "data-actor": a.id, "data-i": i, title: "recorrido · " + fmtT(k.t) })); }
    if (esc.textos.length) { const c = fila("Rótulos", false); for (const [i, tx] of esc.textos.entries()) c.append(h("div", { class: "bloque texto" + (i === selTexto ? " activo" : ""), style: `left:${pct(tx.t)};width:${((tx.dur || 2) / D()) * 100}%`, "data-tipo": "texto", "data-i": i }, tx.texto)); }
    if (esc.audios.length) { const c = fila("Audio", false); for (const [i, au] of esc.audios.entries()) c.append(h("div", { class: "bloque audio", style: `left:${pct(au.t || 0)};width:${(Math.min(D() - (au.t || 0), au.dur || D()) / D()) * 100}%`, "data-tipo": "audio", "data-i": i }, "♪ " + au.archivo.split("/").pop())); }
    for (const c of P.querySelectorAll(".carril")) c.append(h("div", { class: "cabezal-g" }));
    moverCabezal();
    $("#t-ayuda").textContent = !esc.actores.length ? "Añade personajes en el panel de la derecha." : "Clic en una pista para mover el cabezal · arrastra rombos y bloques para cambiar el ritmo.";
  }
  function moverCabezal() { for (const c of document.querySelectorAll(".cabezal-g")) c.style.left = pct(tiempo); $("#t-tiempo").textContent = fmtT(tiempo) + " / " + fmtT(D()); }
  // arrastres en las pistas: cabezal, rombos (claves) y bloques
  let arr = null;
  $("#pistas").addEventListener("pointerdown", (ev) => { const c = ev.target.closest(".carril"); if (!c || !esc) return; parar(); try { c.setPointerCapture(ev.pointerId); } catch {}
    const r = c.getBoundingClientRect(), t = cl(((ev.clientX - r.left) / r.width) * D(), 0, D()), o = ev.target.closest("[data-tipo]");
    if (o) { const tipo = o.dataset.tipo, i = Number(o.dataset.i), aid = o.dataset.actor; const lst = tipo === "cam" ? esc.camara : tipo === "texto" ? esc.textos : tipo === "audio" ? esc.audios : tipo === "rec" ? actor(aid).recorrido : actor(aid).bloques;
      if (aid) selActor = aid; if (tipo === "bloque") selBloque = i; if (tipo === "texto") selTexto = i;
      arr = { tipo, i, aid, x0: ev.clientX, t0: lst[i].t || 0, w: r.width, movida: false }; if (tipo === "cam" || tipo === "rec") tiempo = lst[i].t; }
    else { tiempo = +t.toFixed(2); arr = { cabezal: true, c }; }
    dibujar(); pintarPanel(); pintarPistas(); });
  document.addEventListener("pointermove", (ev) => { if (!arr) return;
    if (arr.cabezal) { const r = $("#pistas .carril").getBoundingClientRect(); tiempo = +cl(((ev.clientX - r.left) / r.width) * D(), 0, D()).toFixed(2); dibujar(); moverCabezal(); return; }
    if (!arr.movida && Math.abs(ev.clientX - arr.x0) < 3) return; arr.movida = true; const t = +cl(arr.t0 + ((ev.clientX - arr.x0) / arr.w) * D(), 0, D()).toFixed(2), a = arr;
    cambio((x) => { const lst = a.tipo === "cam" ? x.camara : a.tipo === "texto" ? x.textos : a.tipo === "audio" ? x.audios : a.tipo === "rec" ? x.actores.find((y) => y.id === a.aid).recorrido : x.actores.find((y) => y.id === a.aid).bloques; lst[a.i].t = t; }, "arr-" + a.tipo + a.aid + a.i, a.tipo === "audio");
    if (a.tipo === "cam" || a.tipo === "rec") tiempo = t; });
  document.addEventListener("pointerup", () => { if (arr && arr.movida && !arr.cabezal) cambio((x) => { x.camara.sort((m, n) => m.t - n.t); x.textos.sort((m, n) => m.t - n.t); x.actores.forEach((y) => { y.recorrido.sort((m, n) => m.t - n.t); (y.bloques || []).sort((m, n) => m.t - n.t); }); }, "arr-" + arr.tipo + arr.aid + arr.i, false);
    if (arr) { arr = null; pintarPanel(); } });

  // ---- arrastrar personajes en el escenario: horizontal = posición, vertical = profundidad (autoclave de recorrido)
  let arrA = null;
  lienzo.addEventListener("pointerdown", (ev) => { const g = ev.target.closest("[data-actor]"); if (!g || !esc) return; const a = actor(g.getAttribute("data-actor")); if (!a) return; parar();
    selActor = a.id; selBloque = null; try { lienzo.setPointerCapture(ev.pointerId); } catch {} lienzo.classList.add("arrastrando");
    const q = posActor(a); arrA = { id: a.id, x0: ev.clientX, y0: ev.clientY, q, k: (1080 / lienzo.clientWidth) / (posCam().zoom || 1) }; pintarPanel(); pintarPistas(); });
  lienzo.addEventListener("pointermove", (ev) => { if (!arrA) return; const a = arrA, dx = (ev.clientX - a.x0) * a.k, dy = (ev.clientY - a.y0) * a.k;
    cambio((x) => tocarClave(x.actores.find((y) => y.id === a.id).recorrido, ["x", "p", "giro"], { x: Math.round(a.q.x + dx), p: +cl((a.q.p || 0) - dy / 400, 0, 1).toFixed(3) }), "arrA" + a.id + tiempo.toFixed(2), false); });
  const soltarA = () => { if (!arrA) return; arrA = null; lienzo.classList.remove("arrastrando"); };
  lienzo.addEventListener("pointerup", soltarA); lienzo.addEventListener("pointercancel", soltarA);

  // ---- render
  let sondeo = null;
  async function consultar() { const r = await (await fetch(`/api/escenas/${actual}/render`)).json(), e = $("#render-estado"), b = $("#b-render");
    if (r.estado === "renderizando") { e.textContent = `Renderizando… ${r.progreso || ""} (${r.segundos} s)`; b.disabled = true; sondeo = setTimeout(consultar, 1500); return; }
    b.disabled = false; if (r.estado === "listo") { e.textContent = `Listo en ${r.segundos} s · Videos/shorts-flow/escena-${actual}/out/${actual}.mp4`; const v = $("#render-video"); v.hidden = false; v.src = r.archivo; }
    else if (r.estado === "error") e.textContent = "Error al renderizar:\n" + r.log; else e.textContent = ""; }
  $("#b-render").addEventListener("click", async () => { if (!esc) return; await guardar(); clearTimeout(sondeo); $("#render-video").hidden = true; await fetch(`/api/escenas/${actual}/render`, { method: "POST" }); consultar(); });
  $("#b-exportar").addEventListener("click", async () => { await guardar(); const r = await (await fetch(`/api/escenas/${actual}/exportar`, { method: "POST" })).json(); aviso("Proyecto en Videos/shorts-flow/" + r.dir); });

  $("#b-png").addEventListener("click", async () => { if (!esc) return; const svg = $("#lienzo"), copia = svg.cloneNode(true); copia.setAttribute("width", 1080); copia.setAttribute("height", 1920); copia.querySelector("#guias")?.remove();
    const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(copia)], { type: "image/svg+xml" })), img = new Image(); await new Promise((ok, mal) => { img.onload = ok; img.onerror = mal; img.src = url; });
    const c = document.createElement("canvas"); c.width = 1080; c.height = 1920; c.getContext("2d").drawImage(img, 0, 0); URL.revokeObjectURL(url);
    c.toBlob((b) => { const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = `${actual}-${tiempo.toFixed(2).replace(".", "_")}s.png`; a.click(); aviso("Fotograma descargado"); }, "image/png"); });

  // ---- teclado
  $("#b-deshacer").addEventListener("click", deshacer); $("#b-rehacer").addEventListener("click", rehacer);
  document.addEventListener("keydown", (ev) => { const el = document.activeElement, escribe = ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName) && el.type !== "range";
    if ((ev.ctrlKey || ev.metaKey) && !escribe) { if (ev.key.toLowerCase() === "z" && !ev.shiftKey) { ev.preventDefault(); deshacer(); } else if (ev.key.toLowerCase() === "y" || (ev.key.toLowerCase() === "z" && ev.shiftKey)) { ev.preventDefault(); rehacer(); } return; }
    if (ev.code === "Space" && !escribe) { ev.preventDefault(); reproducir(); } });

  // ---- arranque
  (async () => { await cargarPersonajes(); await cargarLista(); cargarAudios(); escuchar();
    let ini = null; try { ini = localStorage.getItem("es-actual"); } catch {} const id = lista.find((x) => x.id === ini) ? ini : lista[0]?.id; if (id) await abrir(id); else pintarPistas();
    if (actual) consultar(); })();
})();
