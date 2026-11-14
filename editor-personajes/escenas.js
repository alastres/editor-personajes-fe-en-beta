// Editor de ESCENAS: varios personajes sobre un fondo, recorridos, acciones, cámara, rótulos y audio, con línea de tiempo,
// y render a vídeo con HyperFrames sin escribir código. El motor de dibujo es comun/escena.js (el mismo que usa el vídeo).
(() => {
  const $ = (s) => document.querySelector(s);
  const h = (tag, at = {}, ...hijos) => { const e = document.createElement(tag); for (const k in at) k === "class" ? (e.className = at[k]) : k.startsWith("on") ? e.addEventListener(k.slice(2), at[k]) : e.setAttribute(k, at[k]); hijos.forEach((c) => e.append(c)); return e; };
  const slug = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "escena";
  const fmtT = (t) => t.toFixed(2).replace(".", ",") + " s", cl = (x, a, b) => Math.max(a, Math.min(b, x));
  const aviso = (txt) => { const a = $("#aviso"); a.textContent = txt; a.classList.add("ver"); clearTimeout(aviso.t); aviso.t = setTimeout(() => a.classList.remove("ver"), 2800); };
  const estado = (txt, cls = "") => { const e = $("#estado"); e.textContent = txt; e.className = "estado " + cls; };
  const FONDOS_N = { noche: "Noche", luna: "Luna", alba: "Amanecer", dia: "Día", atardecer: "Atardecer", desierto: "Desierto", mar: "Mar", tormenta: "Tormenta", interior: "Interior", color: "Color liso", lamina: "Lámina dibujada" };
  const LEJOS_N = { montes: "Montes", ciudad: "Ciudad", roma: "Roma", olivar: "Olivar", nada: "Nada" };
  let IMAGENES = [];
  const PLANOS = { general: { n: "General", zoom: 0.8, dy: -60 }, medio: { n: "Medio", zoom: 1.45, dy: -40 }, primer: { n: "Primer plano", zoom: 2.5, dy: -130 } };

  let lista = [], actual = null, esc = null, guardadoTxt = "", historia = [], futuro = [], tGuardar = null, PJ = {}, motor = null;
  let tiempo = 0, play = false, tAnt = null, selActor = null, selBloque = null, selTexto = null, selObjeto = null;
  const nueva = (nombre) => ({ nombre, duracion: 6, fondo: { tipo: "noche" }, camara: [{ t: 0, x: 0, y: -360, zoom: 1 }], actores: [], textos: [], audios: [] });
  const normaliza = (x) => Object.assign({ duracion: 6, fondo: { tipo: "noche" }, camara: [], actores: [], textos: [], audios: [], objetos: [] }, x);
  const objeto = (id = selObjeto) => (esc?.objetos || []).find((o) => o.id === id);
  // ---- ANIMACIÓN A MANO (objeto «cuadros»): una tira de cuadros; cada uno se dibuja en el taller con papel cebolla (el anterior en
  // rojizo y el siguiente en verdoso, como en Moho). Se guardan en params.cuadros (SVG) y params.dibujos (para volver a editarlos).
  let selCuadro = 0;
  function hojaCuadros(ob) { const c = ob.params?.cuadros || [], n = c.length; selCuadro = Math.min(selCuadro, Math.max(0, n - 1));
    const mini = (svg, i) => h("button", { class: "cuadro-mini" + (i === selCuadro ? " activo" : ""), title: `Cuadro ${i + 1} (doble clic: dibujarlo)`, onclick: () => { document.activeElement?.blur(); document.activeElement?.blur(); selCuadro = i; pintarPanel(); }, ondblclick: () => dibujarCuadro(ob.id, i) },
      (() => { const s = document.createElementNS("http://www.w3.org/2000/svg", "svg"); s.setAttribute("viewBox", "-300 -560 600 600"); s.innerHTML = svg; return s; })(), h("span", {}, String(i + 1)));
    const cambiarC = (fn, msg) => { cambio((x) => { const o2 = x.objetos.find((y) => y.id === ob.id), p = (o2.params = o2.params || {}); p.cuadros = p.cuadros || []; p.dibujos = p.dibujos || []; fn(p); }); if (msg) aviso(msg); };
    return h("div", { class: "hoja-cuadros" }, h("label", { class: "et" }, `Cuadros (${n})`), h("div", { class: "tira-cuadros" }, ...c.map(mini)),
      h("div", { class: "fila-botones" }, h("button", { class: "primario", title: "Dibujar el cuadro elegido", ...(n ? {} : { disabled: "" }), onclick: () => dibujarCuadro(ob.id, selCuadro) }, "✎ Dibujar"),
        h("button", { title: "Cuadro nuevo detrás del elegido, copia de él (para retocarlo)", onclick: () => { document.activeElement?.blur(); const k = n ? selCuadro + 1 : 0; cambiarC((p) => { p.cuadros.splice(k, 0, n ? p.cuadros[selCuadro] : ""); p.dibujos.splice(k, 0, n ? JSON.parse(JSON.stringify(p.dibujos[selCuadro] || null)) : null); }); selCuadro = k; if (!n) dibujarCuadro(ob.id, 0); } }, "＋ Cuadro"),
        h("button", { title: "Mover el cuadro antes", ...(selCuadro > 0 ? {} : { disabled: "" }), onclick: () => { document.activeElement?.blur(); const i = selCuadro; cambiarC((p) => { for (const a of [p.cuadros, p.dibujos]) [a[i - 1], a[i]] = [a[i], a[i - 1]]; }); selCuadro--; } }, "←"),
        h("button", { title: "Mover el cuadro después", ...(selCuadro < n - 1 ? {} : { disabled: "" }), onclick: () => { document.activeElement?.blur(); const i = selCuadro; cambiarC((p) => { for (const a of [p.cuadros, p.dibujos]) [a[i + 1], a[i]] = [a[i], a[i + 1]]; }); selCuadro++; } }, "→"),
        h("button", { class: "peligro", title: "Borrar el cuadro elegido", ...(n ? {} : { disabled: "" }), onclick: () => { document.activeElement?.blur(); const i = selCuadro; cambiarC((p) => { p.cuadros.splice(i, 1); p.dibujos.splice(i, 1); }, "Cuadro borrado (Ctrl+Z lo recupera)"); } }, "✕")),
      h("p", { class: "ayuda" }, "Doble clic en un cuadro para dibujarlo. «＋ Cuadro» copia el elegido para retocarlo: así sale la animación. En el taller se ven el cuadro anterior (rojizo) y el siguiente (verdoso)."));
  }
  function dibujarCuadro(id, i) { if (!window.Taller) return aviso("El taller de dibujo no está cargado"); const ob = objeto(id), p = ob?.params || {}, c = p.cuadros || [];
    const fan = (svg, color, op) => `<g opacity="${op}" style="filter: drop-shadow(0 0 0 ${color})"><g fill="${color}" stroke="${color}">${(svg || "").replace(/ (fill|stroke)="(?!none)[^"]*"/g, "")}</g></g>`;
    Taller.abrir({ titulo: `Animación a mano · cuadro ${i + 1} de ${Math.max(c.length, i + 1)}`, textoGuardar: "Guardar el cuadro", colores: {}, dibujos: { frente: p.dibujos?.[i] || (c[i] ? Taller.deSVG(c[i]) : { formas: [] }) }, vistas: null, vista: "frente", encuadre: [-420, -680, 420, 80],
      referencia: (g) => { const r = document.createElementNS("http://www.w3.org/2000/svg", "g"); r.setAttribute("pointer-events", "none"); r.innerHTML = (i > 0 ? fan(c[i - 1], "#e0705a", 0.35) : "") + (i < c.length - 1 ? fan(c[i + 1], "#6ac08a", 0.2) : "")
        + `<line x1="-420" y1="0" x2="420" y2="0" stroke="#f0a33a" stroke-width="2" stroke-dasharray="10 8" opacity="0.5"/>`; g.append(r); },
      alGuardar: (out) => { const d = out.frente?.dibujo; if (!d) return; const svg = Taller.aSVG(d);
        cambio((x) => { const o2 = x.objetos.find((y) => y.id === id), q = (o2.params = o2.params || {}); q.cuadros = q.cuadros || []; q.dibujos = q.dibujos || []; q.cuadros[i] = svg; q.dibujos[i] = d; }); aviso(`Cuadro ${i + 1} guardado`); } }); }
  const D = () => Math.max(0.5, esc?.duracion || 6);
  const actor = (id = selActor) => esc?.actores.find((a) => a.id === id);

  // ---- personajes (para dibujar y para las listas de acciones)
  async function cargarImagenes() { try { IMAGENES = await (await fetch("/api/imagenes")).json(); } catch { IMAGENES = []; } }
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
    let x = f.dataset.base ? Object.assign(JSON.parse(JSON.stringify(esc)), { nombre }) : nueva(nombre); const pl = $("#plantilla-nueva").value; if (pl && !f.dataset.base) x = Escena.aplicarPlantilla(x, pl, x.duracion);
    await fetch(`/api/escenas/${id}`, { method: "PUT", body: JSON.stringify(x) }); await cargarLista(); await abrir(id); aviso("Creada: " + nombre); });
  let tPap = 0; $("#b-papelera").addEventListener("click", async () => { if (!actual) return; const b = $("#b-papelera");
    if (Date.now() - tPap > 6000) { tPap = Date.now(); b.textContent = "¿Seguro? Pulsa otra vez"; b.classList.add("armado"); setTimeout(() => { b.textContent = "Papelera"; b.classList.remove("armado"); }, 6000); return; }
    tPap = 0; b.textContent = "Papelera"; b.classList.remove("armado"); await fetch(`/api/escenas/${actual}/papelera`, { method: "POST" }); aviso("Movida a escenas/papelera"); actual = null; esc = null; motor = null; capa.replaceChildren(); await cargarLista(); pintarPistas?.(); estado("Elige una escena de la lista o crea una nueva", ""); });

  // ---- dibujo
  const lienzo = $("#lienzo"), capa = $("#capa-escena");
  function reconstruir() { if (!esc) return; capa.replaceChildren(); motor = Escena.crear(capa, esc, PJ); RenderUI.formatoLienzo(lienzo, esc.formato); prepararAudios(); pintarPanel(); pintarPistas(); dibujar(); }
  function dibujar() { if (motor) motor.dibujar(Math.min(tiempo, D())); pintarPlanta(); }
  // ---- VISTA DE PLANTA: la escena vista desde arriba. x a lo ancho, profundidad (p) hacia arriba; abajo la cámara con lo que ve (triángulo).
  // Personajes = círculos, atrezo = cuadrados; arrastrar un punto lo mueve en x y en profundidad (los personajes, con clave en el cabezal).
  const PL = { x0: -1800, x1: 1800, p0: -1, p1: 3.2, W: 300, H: 230 }, plX = (x) => ((x - PL.x0) / (PL.x1 - PL.x0)) * PL.W, plY = (p) => PL.H - 26 - ((p - PL.p0) / (PL.p1 - PL.p0)) * (PL.H - 34);
  const plDe = (X, Y) => ({ x: PL.x0 + (X / PL.W) * (PL.x1 - PL.x0), p: PL.p0 + ((PL.H - 26 - Y) / (PL.H - 34)) * (PL.p1 - PL.p0) });
  let plArr = null;
  function pintarPlanta() { const sv = $("#planta"); if (!sv || !esc || $("#planta-caja").classList.contains("plegada")) return; const NSs = "http://www.w3.org/2000/svg";
    const e = (tag, at, padre = sv) => { const n = document.createElementNS(NSs, tag); for (const k in at) n.setAttribute(k, at[k]); padre.appendChild(n); return n; };
    sv.replaceChildren(); const c = posCam(), z = c.zoom || 1, med = (Escena.ANCHO / 2) / z;
    for (const pp of [0, 1, 2, 3]) { e("line", { x1: 0, x2: PL.W, y1: plY(pp), y2: plY(pp), stroke: "#2a3248", "stroke-width": pp === 0 ? 1.5 : 1 }); e("text", { x: 3, y: plY(pp) - 2, fill: "#6a7490", "font-size": 9 }).textContent = "z " + pp; }
    e("line", { x1: 0, x2: PL.W, y1: plY(-0.5), y2: plY(-0.5), stroke: "#3a2a30", "stroke-dasharray": "3 3" });
    // lo que ve la cámara: a cada profundidad, el ancho visible crece con la distancia
    const fr = [-0.95, PL.p1].map((pp) => { const s2 = sDe(pp), hw = med / s2; return [plX(c.x - hw), plX(c.x + hw), plY(pp)]; });
    e("path", { d: `M${fr[0][0]} ${fr[0][2]} L ${fr[1][0]} ${fr[1][2]} L ${fr[1][1]} ${fr[1][2]} L ${fr[0][1]} ${fr[0][2]} Z`, fill: "#f0a33a22", stroke: "#f0a33a88" });
    e("path", { d: `M${plX(c.x) - 7} ${PL.H - 4} L ${plX(c.x) + 7} ${PL.H - 4} L ${plX(c.x)} ${PL.H - 16} Z`, fill: "#f0a33a" });
    e("text", { x: plX(c.x) + 10, y: PL.H - 5, fill: "#f0a33a", "font-size": 9 }).textContent = "cámara · alto " + Math.round(c.alto ?? 450);
    for (const ob of esc.objetos || []) { const g = e("g", { class: "pl-act", "data-tipo": "o", "data-id": ob.id }); const w = 6 + 5 * (ob.escala || 1);
      e("rect", { x: plX(ob.x || 0) - w / 2, y: plY(ob.p || 0) - w / 2, width: w, height: w, rx: 2, fill: ob.id === selObjeto ? "#ffd27a" : "#8a7a6a", stroke: "#000a" }, g); }
    for (const a of esc.actores || []) { const q = posActor(a), g = e("g", { class: "pl-act", "data-tipo": "a", "data-id": a.id });
      e("circle", { cx: plX(q.x), cy: plY(q.p || 0), r: 6, fill: a.id === selActor ? "#9ae0a0" : "#6aa0e0", stroke: "#000a" }, g);
      const ang = ((q.giro ?? 20) * Math.PI) / 180; e("line", { x1: plX(q.x), y1: plY(q.p || 0), x2: plX(q.x) + 11 * Math.sin(ang), y2: plY(q.p || 0) + 11 * Math.cos(ang), stroke: "#fff", "stroke-width": 1.5 }, g);
      e("text", { x: plX(q.x) + 8, y: plY(q.p || 0) - 6, fill: "#cfd6e8", "font-size": 9 }, g).textContent = a.id; } }
  function plPunto(ev) { const sv = $("#planta"), r = sv.getBoundingClientRect(); return plDe(((ev.clientX - r.left) / r.width) * PL.W, ((ev.clientY - r.top) / r.height) * PL.H); }
  $("#planta").addEventListener("pointerdown", (ev) => { const g = ev.target.closest(".pl-act"); if (!g) return; plArr = { tipo: g.dataset.tipo, id: g.dataset.id };
    if (plArr.tipo === "a") selActor = plArr.id; else selObjeto = plArr.id; try { $("#planta").setPointerCapture(ev.pointerId); } catch {} pintarPanel(); });
  $("#planta").addEventListener("pointermove", (ev) => { if (!plArr) return; const w = plPunto(ev), x = Math.round(w.x), p = +cl(w.p, -0.9, 3).toFixed(2);
    if (plArr.tipo === "a") cambio((xx) => tocarClave(xx.actores.find((y) => y.id === plArr.id).recorrido, ["x", "p", "giro"], { x, p }), "plA" + plArr.id + tiempo.toFixed(2), false);
    else cambio((xx) => { const o = xx.objetos.find((y) => y.id === plArr.id); o.x = x; o.p = p; }, "plO" + plArr.id, false); });
  $("#planta").addEventListener("pointerup", () => { plArr = null; });
  $("#b-rejilla").addEventListener("click", () => { window.REJILLA_PROF = !window.REJILLA_PROF; $("#b-rejilla").classList.toggle("activo", !!window.REJILLA_PROF); dibujar(); });
  $("#b-planta").addEventListener("click", () => { const c = $("#planta-caja"); c.classList.toggle("plegada"); $("#b-planta").textContent = c.classList.contains("plegada") ? "+" : "–"; pintarPlanta(); });
  const errBucle = new Set();   // un error al dibujar un fotograma no debe parar el bucle
  function bucle(ahora) { try { bucleF(ahora); } catch (e) { if (!errBucle.has(String(e))) { errBucle.add(String(e)); console.error(e); } requestAnimationFrame(bucle); } }
  function bucleF(ahora) { const t = ahora / 1000;
    if (play && esc) { if (tAnt !== null) tiempo += t - tAnt; tAnt = t; if (tiempo >= D()) { tiempo = D(); parar(); } dibujar(); moverCabezal();
      if (!(bucle.tP > t - 0.15)) { bucle.tP = t; const a = actor(); if (a) { const q = posActor(a); deslizar("a-x", q.x, (v) => Math.round(v)); deslizar("a-p", q.p || 0, (v) => v.toFixed(2)); deslizar("a-giro", q.giro ?? 20, (v) => Math.round(v) + "°"); } } }
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
  // contraste WCAG entre dos colores (luminancia relativa); el peor de los colores del fondo que suelen quedar detrás de la cabeza
  const lumi = (hx) => { const c = [1, 3, 5].map((i) => parseInt(hx.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const contraste = (a, b) => { const x = lumi(a), y = lumi(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  function contrasteFondo(piel) { const F = Escena.fondoDe(esc.fondo), cand = [];
    if (F.tipo === "color") cand.push([esc.fondo?.color || "#2a2540", "el color de fondo"]);
    else if (F.tipo === "interior") cand.push([F.pared[0], "la pared"]);
    else { (F.cielo || []).slice(1).forEach((c, i) => cand.push([c, i ? "el horizonte" : "el cielo"])); if ((F.lejos || "montes") !== "nada") cand.push([F.montes[0], "lo de lejos"]); }
    let peor = null; for (const [c, donde] of cand) { if (!/^#[0-9a-f]{6}$/i.test(c)) continue; const v = contraste(piel, c); if (!peor || v < peor.v) peor = { v, donde }; } return peor; }
  // ---- personalizar el fondo
  function pintarFondoPanel() { const F = Escena.fondoDe(esc.fondo), f = esc.fondo || {}, col = (id, v) => { const i = $("#" + id); if (v && document.activeElement !== i) i.value = v; };
    const conCielo = !["interior", "color"].includes(F.tipo); $("#f-mas").hidden = F.tipo === "color";
    (F.cielo || []).forEach((c, i) => col("f-c" + i, c)); (F.montes || []).forEach((c, i) => col("f-m" + i, c)); (F.suelo || []).forEach((c, i) => col("f-s" + i, c));
    seg("#f-lejos", LEJOS_N, F.lejos || "montes", (k) => cambiaFondo((v) => { v.lejos = k; }));
    $("#f-astro").checked = !!F.astro; $("#f-estrellas").checked = !!F.estrellas; $("#f-mar").checked = !!F.mar; $("#f-rayos").checked = !!F.rayos;
    deslizar("f-nubes", F.nubes || 0, (v) => Math.round(v * 100) + "%"); deslizar("f-lluvia", F.lluvia || 0, (v) => Math.round(v * 100) + "%"); deslizar("f-oleaje", F.oleaje ?? 1, (v) => v.toFixed(2));
    for (const id of ["f-c0", "f-c1", "f-c2", "f-astro", "f-estrellas", "f-nubes", "f-lluvia", "f-rayos", "f-lejos"]) $("#" + id).closest(".campo, .deslizador, label, .seg") && ($("#" + id).disabled = !conCielo);
    const sel = $("#f-imagen"), v = f.imagen?.archivo || ""; sel.replaceChildren(h("option", { value: "" }, "— sin imagen —"), ...IMAGENES.map((a) => h("option", { value: a }, a))); sel.value = v;
    $("#f-cubre").checked = !!f.imagen?.cubre; deslizar("f-imop", f.imagen?.opacidad ?? 1, (x) => Math.round(x * 100) + "%");
    const ul = $("#f-capas"); ul.replaceChildren(); if (!(f.capas || []).length) ul.append(h("li", { class: "vacio" }, "Dibuja montañas, un templo, árboles lejanos…"));
    (f.capas || []).forEach((c, i) => { const par = h("input", { type: "range", min: 0, max: 1, step: 0.05, value: c.par || 0, title: "Cuánto se mueve con la cámara (1 = muy lejos, casi quieta)" });
      par.addEventListener("input", () => cambiaFondo((x) => { x.capas[i].par = +par.value; }, "fcpar" + i));
      ul.append(h("li", {}, h("span", {}, "≋"), h("span", {}, c.nombre || "Capa " + (i + 1)), par, h("button", { class: "x", title: "Editar el dibujo", onclick: () => dibujarCapa(i) }, "✎"),
        h("button", { class: "x", title: "Quitar", onclick: () => cambiaFondo((x) => { x.capas.splice(i, 1); }) }, "✕"))); }); }
  const cambiaFondo = (fn, clave) => cambio((x) => { x.fondo = x.fondo || { tipo: "noche" }; fn(x.fondo); }, clave, !clave);
  // los colores parten de los del fondo elegido: solo se guarda lo que se cambia
  const ponColor = (grupo, i, id) => $("#" + id).addEventListener("input", (ev) => cambiaFondo((v) => { const F = Escena.fondoDe(v); v[grupo] = [...(v[grupo] || F[grupo])]; v[grupo][i] = ev.target.value; }, "fcol" + id));
  [0, 1, 2].forEach((i) => { ponColor("cielo", i, "f-c" + i); ponColor("montes", i, "f-m" + i); }); [0, 1].forEach((i) => ponColor("suelo", i, "f-s" + i));
  $("#f-astro").addEventListener("change", (ev) => cambiaFondo((v) => { if (ev.target.checked) { if (v.astro === false) delete v.astro; if (!Escena.fondoDe(v).astro) v.astro = {}; } else v.astro = false; }));
  $("#f-estrellas").addEventListener("change", (ev) => cambiaFondo((v) => { v.estrellas = ev.target.checked; }));
  $("#f-mar").addEventListener("change", (ev) => cambiaFondo((v) => { v.mar = ev.target.checked; }));
  $("#f-rayos").addEventListener("change", (ev) => cambiaFondo((v) => { v.rayos = ev.target.checked; }));
  for (const k of ["nubes", "lluvia", "oleaje"]) $("#f-" + k).addEventListener("input", (ev) => cambiaFondo((v) => { v[k] = +ev.target.value; }, "f" + k));
  $("#f-imagen").addEventListener("change", (ev) => cambiaFondo((v) => { if (ev.target.value) v.imagen = Object.assign({}, v.imagen, { archivo: ev.target.value }); else delete v.imagen; }));
  $("#f-cubre").addEventListener("change", (ev) => cambiaFondo((v) => { if (v.imagen) v.imagen.cubre = ev.target.checked; }));
  $("#f-imop").addEventListener("input", (ev) => cambiaFondo((v) => { if (v.imagen) v.imagen.opacidad = +ev.target.value; }, "fimop"));
  $("#b-fondo-reset").addEventListener("click", () => cambio((x) => { x.fondo = { tipo: x.fondo?.tipo || "noche" }; }));
  // ---- LÁMINAS: elegir una, colocarla (tamaño, posición, horizonte) y editar cada capa en el taller
  const CAPAS_PAR = { lejos: 0.45, cielo: 0.6, medio: 0, sala: 0, cerrado: 0, delante: -0.25, arco: -0.25 };
  function laminaPorDefecto(nombre) { const n = nombre && window.LAMINAS?.[nombre] ? nombre : Object.keys(window.LAMINAS || {}).find((k) => /formas/.test(k)) || Object.keys(window.LAMINAS || {})[0];
    const L = window.LAMINAS?.[n]; const ids = L ? Object.keys(L.capas) : [];
    return { tipo: "lamina", lamina: n, escala: 1.2, centro: { x: 0, y: -420 }, horizonte: 640, capas: ids.map((id, i) => ({ id, par: CAPAS_PAR[id] ?? (i === 0 ? 0.45 : i === ids.length - 1 && ids.length > 2 ? -0.25 : 0), delante: (id === "delante" || id === "arco") || undefined })) }; }
  const lmAbiertos = new Set();   // qué «Deformar» de capa están abiertos (sobreviven al repintar)
  function pintarLamina() { const f = esc.fondo || {}, es = f.tipo === "lamina"; $("#lamina-det").hidden = !es; $("#f-mas").hidden = es; if (!es) return;
    const sel = $("#lm-nombre"); if (document.activeElement !== sel) { sel.replaceChildren(...Object.keys(window.LAMINAS || {}).map((n) => h("option", { value: n }, n))); sel.value = f.lamina || ""; }
    deslizar("lm-escala", f.escala ?? 1.15, (v) => Math.round(v * 100) + "%"); deslizar("lm-cx", f.centro?.x ?? 0, (v) => Math.round(v)); deslizar("lm-cy", f.centro?.y ?? -400, (v) => Math.round(v));
    deslizar("lm-hz", f.horizonte ?? 640, (v) => Math.round(v) + " px");
    const L = window.LAMINAS?.[f.lamina], ul = $("#lm-capas"); if (ul.contains(document.activeElement) && document.activeElement.type === "range") return; ul.replaceChildren(); if (!L) { ul.append(h("li", { class: "vacio" }, "Esta lámina no está cargada")); return; }
    for (const id of Object.keys(L.capas)) { const c = (f.capas || []).find((x) => x.id === id), usada = !!c;
      const ch = h("input", { type: "checkbox", title: "Usar esta capa en la escena" }); ch.checked = usada;
      ch.addEventListener("change", () => cambiaFondo((v) => { v.capas = v.capas || []; if (ch.checked) { const orden = Object.keys(L.capas); v.capas.push({ id, par: CAPAS_PAR[id] ?? 0 }); v.capas.sort((a, b) => orden.indexOf(a.id) - orden.indexOf(b.id)); } else v.capas = v.capas.filter((x) => x.id !== id); }));
      const par = h("input", { type: "range", min: -0.6, max: 1, step: 0.05, value: c?.par ?? 0, title: "Cuánto se mueve con la cámara: 1 = muy lejos, 0 = como el suelo, negativo = más cerca" }); par.disabled = !usada;
      const out = h("output", {}, (c?.par ?? 0).toFixed(2)); par.addEventListener("input", () => { out.textContent = (+par.value).toFixed(2); cambiaFondo((v) => { const k = v.capas.find((x) => x.id === id); if (k) k.par = +par.value; }, "lmpar" + id); });
      const del = h("label", { class: "chk", title: "Se dibuja delante de los personajes (ramas, marcos, primer término)" }, h("input", { type: "checkbox" }), " delante"); del.firstChild.checked = !!c?.delante; del.firstChild.disabled = !usada;
      del.firstChild.addEventListener("change", (ev) => cambiaFondo((v) => { const k = v.capas.find((x) => x.id === id); if (k) { if (ev.target.checked) k.delante = true; else delete k.delante; } }));
      // deformador de la capa (como el de los objetos): doblar, ondear y respirar
      const dfm = h("details", { class: "sub-bloque lm-deformar", ...(lmAbiertos.has(id) ? { open: "" } : {}), ontoggle: () => { dfm.open ? lmAbiertos.add(id) : lmAbiertos.delete(id); } }, h("summary", {}, "Deformar" + (c && (c.doblar || c.ondear || c.respirar) ? " ●" : "")));
      for (const [k, et, mn] of [["doblar", "Doblar (viento)", -1], ["ondear", "Ondear (agua, humo, bandera)", 0], ["respirar", "Respirar (late suave)", 0]]) {
        const i = h("input", { type: "range", min: mn, max: 1, step: 0.01, value: c?.[k] || 0, ...(usada ? {} : { disabled: "" }) }), o = h("output", {}, String(c?.[k] || 0));
        i.addEventListener("input", () => { o.textContent = i.value; cambiaFondo((v) => { const q = v.capas.find((x) => x.id === id); if (!q) return; if (Math.abs(+i.value) > 0.004) q[k] = +i.value; else delete q[k]; }, "lmdef" + id + k); });
        dfm.append(h("div", { class: "deslizador" }, h("label", {}, et), i, o)); }
      dfm.append(h("p", { class: "ayuda" }, "Se dobla desde el borde de abajo del dibujo. Mientras se deforma, los movimientos propios de la capa (nubes, ramas…) se pausan."));
      ul.append(h("li", { class: "fila-capa" }, ch, h("span", {}, id), h("span", { class: "tenue" }, "Cuánto se mueve con la cámara"), par, out, del, h("button", { title: "Redibujar esta capa en el taller", onclick: () => editarCapaLamina(f.lamina, id) }, "✎ Editar"), dfm)); } }
  async function recargarLamina(n) { const L = await (await fetch("/api/laminas/" + n)).json(); window.LAMINAS = Object.assign({}, window.LAMINAS, { [n]: { ancho: L.ancho, alto: L.alto, capas: L.capas } }); return L; }
  async function editarCapaLamina(n, id) { if (!window.Taller) return aviso("El taller de dibujo no está cargado"); estado("Abriendo la capa en el taller…");
    const L = await recargarLamina(n), otras = Object.entries(L.capas).filter(([k]) => k !== id), NS = "http://www.w3.org/2000/svg";
    const tieneAnim = /data-anim/.test(L.capas[id] || "");
    // los degradados y demás definiciones de la capa original se conservan al guardar (el taller no los convierte)
    const defsOrig = ((L.capas[id] || "").match(/<defs>[\s\S]*?<\/defs>/g) || []).filter((x) => !/id="dg/.test(x)).join("");   // sin los degradados del taller (los vuelve a poner él)
    Taller.abrir({ titulo: `Lámina «${n}» · capa «${id}»` + (tieneAnim && !L.dibujos[id] ? " (al guardar se pierden sus movimientos automáticos)" : ""), textoGuardar: "Guardar capa", colores: {}, sinTokens: true, encuadre: [0, 0, L.ancho, L.alto],
      dibujos: L.dibujos[id] ? { frente: L.dibujos[id] } : {}, svgs: L.dibujos[id] ? {} : { frente: L.capas[id] || "" },
      referencia: (g) => { const r = document.createElementNS(NS, "g"); r.setAttribute("opacity", "0.35"); r.setAttribute("pointer-events", "none"); r.innerHTML = otras.map(([, s]) => s).join(""); g.appendChild(r);
        const marco = document.createElementNS(NS, "rect"); for (const [k, v] of Object.entries({ x: 0, y: 0, width: L.ancho, height: L.alto, fill: "none", stroke: "#f0a33a", "stroke-dasharray": "12 8", "stroke-width": 3 })) marco.setAttribute(k, v); g.appendChild(marco); },
      alGuardar: async (out) => { const r = out.frente; estado("Guardando la capa…");
        const ok = await fetch(`/api/laminas/${n}/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ svg: defsOrig + (r ? r.svg.replace(/\{[a-zA-Z]+\}/g, "#888888") : ""), dibujo: r ? r.dibujo : { formas: [] } }) }).then((x) => x.ok).catch(() => false);
        if (!ok) return estado("No se pudo guardar la capa", "error"); await recargarLamina(n); reconstruir(); estado("Capa guardada", ""); aviso(`Capa «${id}» guardada en la lámina «${n}»`); } });
    estado(""); }
  $("#lm-nombre").addEventListener("change", (ev) => cambio((x) => { x.fondo = Object.assign(laminaPorDefecto(ev.target.value), { escala: x.fondo?.escala, centro: x.fondo?.centro, horizonte: x.fondo?.horizonte }); }));
  $("#lm-escala").addEventListener("input", (ev) => cambiaFondo((v) => { v.escala = +ev.target.value; }, "lmesc"));
  $("#lm-cx").addEventListener("input", (ev) => cambiaFondo((v) => { v.centro = Object.assign({ x: 0, y: -400 }, v.centro, { x: +ev.target.value }); }, "lmcx"));
  $("#lm-cy").addEventListener("input", (ev) => cambiaFondo((v) => { v.centro = Object.assign({ x: 0, y: -400 }, v.centro, { y: +ev.target.value }); }, "lmcy"));
  $("#lm-hz").addEventListener("input", (ev) => cambiaFondo((v) => { v.horizonte = +ev.target.value; }, "lmhz"));
  $("#lm-recargar").addEventListener("click", async () => { const n = esc.fondo?.lamina; if (!n) return; await recargarLamina(n); reconstruir(); aviso("Lámina recargada"); });
  $("#lm-nueva").addEventListener("click", async () => { const nom = await Dialogo.pedir("Lámina nueva", { ayuda: "Nombre en minúsculas y con guiones.", marcador: "templo-noche", aceptar: "Crear" }); if (!nom) return; const n = nom.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const r = await fetch("/api/laminas/" + n, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ capas: ["lejos", "medio", "delante"] }) });
    if (!r.ok) return aviso(r.status === 409 ? "Ya hay una lámina con ese nombre" : "No se pudo crear"); await recargarLamina(n); cambio((x) => { x.fondo = laminaPorDefecto(n); }); aviso("Lámina creada: dibuja cada capa con ✎ Editar"); });
  $("#lm-capa-nueva").addEventListener("click", async () => { const n = esc.fondo?.lamina; if (!n) return; const nom = await Dialogo.pedir("Capa nueva de la lámina", { marcador: "arboles, niebla…", aceptar: "Crear" }); if (!nom) return;
    const id = nom.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const r = await fetch(`/api/laminas/${n}/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ svg: "" }) }); if (!r.ok) return aviso("No se pudo crear la capa");
    await recargarLamina(n); cambiaFondo((v) => { v.capas = v.capas || []; v.capas.push({ id, par: 0 }); }); editarCapaLamina(n, id); });
  // dibujar una capa del fondo en el taller: referencia = suelo (y = 0) y la silueta de un personaje para la escala
  function dibujarCapa(i) { if (!window.Taller) return aviso("El taller de dibujo no está cargado"); const c = i === undefined ? null : esc.fondo?.capas?.[i];
    Taller.abrir({ titulo: c ? `Editar ${c.nombre || "capa " + (i + 1)} del fondo` : "Dibujar una capa del fondo (la línea es el suelo; la silueta, un personaje)", textoGuardar: "Guardar capa", dibujos: c?.dibujo ? { frente: c.dibujo } : {}, colores: {},
      referencia: (g) => { const NS = "http://www.w3.org/2000/svg", mk = (t, at) => { const e = document.createElementNS(NS, t); for (const k in at) e.setAttribute(k, at[k]); g.appendChild(e); };
        mk("rect", { x: -3000, y: 0, width: 6000, height: 800, fill: "#ffffff", opacity: 0.05 }); mk("line", { x1: -3000, y1: 0, x2: 3000, y2: 0, stroke: "#f0a33a", "stroke-opacity": 0.6, "stroke-width": 3 });
        mk("rect", { x: -55, y: -600, width: 110, height: 600, rx: 55, fill: "#ffffff", opacity: 0.12 }); mk("circle", { cx: 0, cy: -520, r: 70, fill: "#ffffff", opacity: 0.12 }); },
      alGuardar: (out) => { const r = out.frente; if (!r) return; cambiaFondo((v) => { v.capas = v.capas || []; const nueva = { nombre: c?.nombre || "Capa " + (v.capas.length + 1), svg: r.svg, dibujo: r.dibujo, par: c?.par ?? 0.4 };
        if (c) Object.assign(v.capas[i], nueva); else v.capas.push(nueva); }); } }); }
  $("#b-capa-dibujar").addEventListener("click", () => dibujarCapa());
  // valores del objeto en el cabezal: los de sus claves (si está animado) o los fijos, con los de fábrica de su tipo
  function paramsObjeto(ob) { const defs = ATREZO[ob.tipo]?.params || {}, o = {}; for (const [k, d] of Object.entries(defs)) o[k] = ob.params?.[k] ?? d[3];
    const q = ob.claves?.length ? Escena.claves(ob.claves, tiempo, Object.keys(defs)) : null; if (q) for (const k in defs) if (q[k] !== undefined) o[k] = +(+q[k]).toFixed(3); return o; }
  const posActor = (a) => Escena.claves(a.recorrido, tiempo, ["x", "p", "giro"]) || { x: 0, p: 0, giro: 20 };
  const CAMPOS_CAM = ["x", "y", "zoom", "alto", "roll", "tilt"];
  const posCam = () => Escena.claves(esc.camara, tiempo, CAMPOS_CAM) || { x: 0, y: -360, zoom: 1 };
  // perspectiva del motor (comun/escena.js): cámara a 1600 del plano p = 0; p = 1 son 980 de profundidad
  const sDe = (p) => 1600 / Math.max(60, 1600 + 980 * (p || 0));

  // ---- panel
  function seg(sel, opciones, valor, alElegir) { const c = $(sel); c.replaceChildren(); for (const [k, n] of Object.entries(opciones)) c.append(h("button", { class: k === valor ? "activo" : "", onclick: () => alElegir(k) }, n)); }
  function deslizar(id, valor, fmt) { const i = $("#" + id); if (document.activeElement !== i) i.value = valor; i.nextElementSibling.textContent = fmt(Number(valor)); }
  function pintarPanel() {
    if (!esc) return;
    if (document.activeElement !== $("#e-nombre")) $("#e-nombre").value = esc.nombre || "";
    deslizar("e-dur", D(), (v) => v.toFixed(1) + " s");
    seg("#e-formato", { "": "Vertical 9:16 (short)", "16:9": "Horizontal 16:9" }, esc.formato || "", (k) => cambio((x) => { if (k) x.formato = k; else delete x.formato; }));
    // al cambiar de fondo se quitan los retoques de color y clima, pero se conservan las capas dibujadas y la imagen
    seg("#e-fondo", FONDOS_N, esc.fondo?.tipo || "noche", (k) => cambio((x) => { const v = x.fondo || {}; x.fondo = { tipo: k }; if (k === "lamina") { x.fondo = laminaPorDefecto(v.lamina); return; } if (v.capas) x.fondo.capas = v.capas; if (v.imagen) x.fondo.imagen = v.imagen; if (k === "color") x.fondo.color = v.color; }));
    pintarFondoPanel(); pintarLamina();
    // actores
    const ul = $("#actores"); ul.replaceChildren(); if (!esc.actores.length) ul.append(h("li", { class: "vacio" }, "Añade personajes de tu reparto."));
    for (const a of esc.actores) ul.append(h("li", { class: a.id === selActor ? "activo" : "", onclick: () => { selActor = a.id; selBloque = null; pintarPanel(); pintarPistas(); } },
      h("span", {}, "●"), h("span", {}, PJ[a.personaje]?.nombre || a.personaje), h("span", { class: "hueso" }, `${(a.bloques || []).length} acc.`), h("span")));
    // regla de la marca: la piel contrasta al menos 2:1 con lo que tiene detrás (cielo, horizonte y montes; pared en interior)
    const malos = esc.actores.map((x) => { const pj = PJ[x.personaje]; if (!pj) return null; const piel = Personajes.colores(pj).piel || "#c8684a", r = contrasteFondo(piel);
      return r && r.v < 2 ? `${pj.nombre || x.personaje}: ${r.v.toFixed(2).replace(".", ",")}:1 contra ${r.donde}` : null; }).filter(Boolean);
    const av = $("#aviso-contraste"); av.hidden = !malos.length; if (malos.length) av.textContent = "⚠ Piel con poco contraste con el fondo (mínimo 2:1):\n" + malos.join("\n") + "\nCambia el fondo o sus colores, o el tono de piel en Personajes.";
    const a = actor(); $("#actor-det").hidden = !a;
    if (a) { { const s = $("#a-mascara"); if (document.activeElement !== s) { opcionesMascara(s, null); s.value = a.mascara || ""; } $("#a-mascara-oculta").checked = !!a.mascaraOculta; }
      for (const i of document.querySelectorAll("[data-efx]")) { const k = i.dataset.efx; deslizar(i.id, a.efectos?.[k] ?? (k === "opacidad" ? 1 : 0), (v) => Math.round(v * 100) + "%"); } const q = posActor(a); deslizar("a-x", q.x, (v) => Math.round(v)); deslizar("a-p", q.p || 0, (v) => v.toFixed(2)); deslizar("a-giro", q.giro ?? 20, (v) => Math.round(v) + "°"); deslizar("a-escala", a.escala || 1, (v) => Math.round(v * 100) + "%");
      const acc = [...(PJ[a.personaje]?.acciones || []), ...Object.values(window.ACCIONES || {}).map((x) => Object.assign({}, x, { comun: true }))];
      $("#a-accion").replaceChildren(...(acc.length ? acc.map((x) => h("option", { value: x.id }, (x.comun ? "★ " : "") + (x.nombre || x.id))) : [h("option", { value: "" }, "— sin acciones: créalas en Personajes → Animación —")]));
      $("#b-add-bloque").disabled = !acc.length;
      const b = selBloque !== null ? a.bloques[selBloque] : null; $("#bloque-det").hidden = !b; if (b) { if (document.activeElement !== $("#b-t")) $("#b-t").value = b.t; deslizar("b-dur", b.dur || 2, (v) => v.toFixed(1) + " s"); deslizar("b-mezcla", b.mezcla ?? 0.3, (v) => v.toFixed(2) + " s");
        seg("#b-capa", { todo: "Todo el cuerpo", cuerpo: "Solo cuerpo", brazos: "Solo brazos", cara: "Solo cara" }, b.capa || "todo", (k) => cambio((x) => { const bb = x.actores.find((y) => y.id === a.id).bloques[selBloque]; if (k === "todo") delete bb.capa; else bb.capa = k; }, null, false)); }
      const ESTILOS = Object.fromEntries(Object.entries(window.Andares ? Andares.todos() : {}).map(([k, v]) => [k === "normal" ? "" : k, v.nombre || k]));
      seg("#a-estilo", ESTILOS, a.andar?.estilo || "", (k) => cambio((x) => { const y = x.actores.find((z) => z.id === a.id); y.andar = Object.assign({}, y.andar); if (k) y.andar.estilo = k; else delete y.andar.estilo; }, null, false));
      seg("#a-dir", DIRECCIONES_N, Object.keys(DIRECCIONES).find((k) => Math.abs(DIRECCIONES[k] - (q.giro ?? 20)) < 3) || "", (k) => ponDireccion(DIRECCIONES[k]));
      $("#a-orientar").checked = !!a.orientar;
      pintarTramo(a, ESTILOS);
      deslizar("a-zancada", a.andar?.zancada ?? 1, (v) => Math.round(v * 100) + "%");
      // mirar a / agarrar: a quién o a qué (otros personajes, sus manos, el atrezo)
      const otros = esc.actores.filter((x) => x.id !== a.id), nom = (x) => PJ[x.personaje]?.nombre || x.personaje, objs = esc.objetos || [];
      $("#a-mirar").replaceChildren(h("option", { value: "nada" }, "Nadie (su pose)"), h("option", { value: "camara" }, "A cámara"), h("option", { value: "habla" }, "A quien habla"),
        ...otros.map((x) => h("option", { value: x.id }, nom(x))), ...objs.map((o) => h("option", { value: o.id }, "▲ " + (ATREZO[o.tipo]?.nombre || o.tipo))));
      $("#a-agarra").replaceChildren(h("option", { value: "nada" }, "Soltar"), ...otros.flatMap((x) => [h("option", { value: x.id + ".manoDer" }, "Mano dcha. de " + nom(x)), h("option", { value: x.id + ".manoIzq" }, "Mano izq. de " + nom(x))]),
        ...objs.map((o) => h("option", { value: o.id }, "▲ " + (ATREZO[o.tipo]?.nombre || o.tipo))));
      const ux = $("#a-extra"); ux.replaceChildren();
      const txt = (v) => v === "nada" ? "nadie" : v === "camara" ? "cámara" : v === "habla" ? "quien habla" : String(v).replace(".manoDer", " (mano dcha.)").replace(".manoIzq", " (mano izq.)");
      for (const [lista, ico, et] of [["mirar", "◉", (k) => "Mira a " + txt(k.a)], ["agarra", "✋", (k) => (k.a === "nada" ? "Suelta" : "Agarra " + txt(k.a)) + " · " + (k.mano === "Izq" ? "izq." : "dcha.")]])
        (a[lista] || []).forEach((k, i) => ux.append(h("li", { onclick: () => { tiempo = k.t; dibujar(); pintarPistas(); pintarPanel(); } }, h("span", {}, ico), h("span", {}, et(k)), h("span", { class: "hueso" }, fmtT(k.t)),
          h("button", { class: "x", title: "Quitar", onclick: (ev) => { ev.stopPropagation(); cambio((x) => { x.actores.find((y) => y.id === a.id)[lista].splice(i, 1); }, null, false); } }, "✕"))));
      $("#b-quitar-clave").disabled = !(a.recorrido || []).some((k) => Math.abs(k.t - tiempo) < 0.02) || a.recorrido.length < 2; }
    // atrezo
    $("#add-objeto").replaceChildren(...(window.Atrezo ? Atrezo.lista() : []).map(([k, n]) => h("option", { value: k }, n)));
    const uo = $("#objetos"); uo.replaceChildren(); if (!(esc.objetos || []).length) uo.append(h("li", { class: "vacio" }, "Árboles, tumba, barca, casas, mesa, hoguera…"));
    for (const o of esc.objetos || []) uo.append(h("li", { class: o.id === selObjeto ? "activo" : "", onclick: () => { selObjeto = o.id; pintarPanel(); } },
      h("span", {}, "▲"), h("span", {}, ATREZO[o.tipo]?.nombre || o.tipo), h("span", { class: "hueso" }, o.claves?.length ? `${o.claves.length} claves` : ""), h("span")));
    const ob = objeto(); $("#objeto-det").hidden = !ob;
    if (ob) { deslizar("o-x", ob.x || 0, (v) => Math.round(v)); deslizar("o-p", ob.p || 0, (v) => v.toFixed(2)); deslizar("o-escala", ob.escala || 1, (v) => Math.round(v * 100) + "%");
      { const s = $("#o-mascara"); if (document.activeElement !== s) { opcionesMascara(s, ob.id); s.value = ob.mascara || ""; } $("#o-mascara-oculta").checked = !!ob.mascaraOculta; }
      $("#o-espejo").checked = !!ob.espejo; $("#o-detras").checked = !!ob.detras; $("#o-animar").checked = !!ob.claves?.length;
      const defs = ATREZO[ob.tipo]?.params || {}, cont = $("#o-params"), vals = paramsObjeto(ob);
      if (!cont.contains(document.activeElement)) { cont.replaceChildren();
        for (const [k, [mn, mx, paso, , etq]] of Object.entries(defs)) { const i = h("input", { type: "range", min: mn, max: mx, step: paso, value: vals[k] }), out = h("output", {}, String(vals[k]));
          i.addEventListener("input", () => { out.textContent = i.value; cambio((x) => { const o2 = x.objetos.find((y) => y.id === ob.id);
            if (o2.claves?.length) tocarClave(o2.claves, Object.keys(defs), Object.assign({}, paramsObjeto(o2), { [k]: +i.value })); else (o2.params = o2.params || {})[k] = +i.value; }, "op" + ob.id + k + tiempo.toFixed(2), false); });
          cont.append(h("div", { class: "deslizador" }, h("label", {}, etq), i, out)); }
        if (ob.tipo === "cuadros") cont.append(hojaCuadros(ob)); } }
    // cámara
    const c = posCam(); deslizar("c-x", c.x, (v) => Math.round(v)); deslizar("c-y", c.y, (v) => Math.round(v)); deslizar("c-zoom", c.zoom || 1, (v) => v.toFixed(2) + "×");
    deslizar("c-alto", c.alto ?? 450, (v) => Math.round(v) + (v < 300 ? " · contrapicado" : v > 700 ? " · picado" : "")); deslizar("c-roll", c.roll || 0, (v) => v.toFixed(1) + "°");
    seg("#c-angulos", { cp: "Contrapicado", normal: "Normal", pi: "Picado", cenital: "Muy alto" }, "", (k) => editarCam({ alto: { cp: 160, normal: 450, pi: 1000, cenital: 1450 }[k] }, null));
    seg("#c-planos", Object.fromEntries(Object.entries(PLANOS).map(([k, v]) => [k, v.n])), "", (k) => { const p = PLANOS[k], a2 = actor(), q = a2 ? posActor(a2) : { x: c.x, p: 0 }, sP = sDe(q.p), s = (a2?.escala || 1) * sP, alto = c.alto ?? 450, X = c.x + (q.x - c.x) * sP;
      const centroY = -alto * (1 - sP) + (-330 + p.dy) * s; cambio((x) => tocarClave(x.camara, CAMPOS_CAM, { x: Math.round(X), y: Math.round(centroY), zoom: +(p.zoom / s).toFixed(2) }), null, false); });
    $("#b-quitar-cam").disabled = !esc.camara.some((k) => Math.abs(k.t - tiempo) < 0.02) || esc.camara.length < 2;
    // ambiente
    const am = esc.ambiente || {}; deslizar("am-tono", am.tono || 0, (v) => (v < -0.02 ? "frío " : v > 0.02 ? "cálido " : "neutro ") + Math.round(Math.abs(v) * 100) + "%");
    deslizar("am-vineta", am.vineta || 0, (v) => Math.round(v * 100) + "%"); deslizar("am-cant", am.cantidad ?? 1, (v) => Math.round(v * 100) + "%");
    seg("#am-part", { "": "Ninguna", polvo: "Polvo", luciernagas: "Luciérnagas", nieve: "Nieve", chispas: "Chispas", ceniza: "Ceniza" }, am.particulas || "", (k) => cambio((x) => { x.ambiente = Object.assign({}, x.ambiente); if (k) x.ambiente.particulas = k; else delete x.ambiente.particulas; }, null, false));
    const ue = $("#efectos"); ue.replaceChildren(); if (!(esc.efectos || []).length) ue.append(h("li", { class: "vacio" }, "Pon el cabezal donde ocurre (un milagro, un golpe, un trueno)."));
    (esc.efectos || []).forEach((e, i) => { const fu = h("input", { type: "range", min: 0.1, max: 2, step: 0.05, value: e.fuerza ?? 1, title: "Fuerza" }), du = h("input", { type: "number", min: 0.1, max: 5, step: 0.1, value: e.dur || (e.tipo === "sacudida" ? 0.6 : 0.5), title: "Duración (s)" });
      fu.addEventListener("input", () => cambio((x) => { x.efectos[i].fuerza = +fu.value; }, "efu" + i, false)); du.addEventListener("change", () => cambio((x) => { x.efectos[i].dur = +du.value; }, null, false));
      ue.append(h("li", { class: "fila-efecto", onclick: (ev) => { if (ev.target.tagName !== "INPUT" && ev.target.tagName !== "BUTTON") { tiempo = e.t; dibujar(); pintarPistas(); } } }, h("span", {}, e.tipo === "destello" ? "✦" : "≋"), h("span", {}, (e.tipo === "destello" ? "Destello" : "Sacudida") + " · " + fmtT(e.t)), fu, du,
        h("button", { class: "x", title: "Quitar", onclick: () => cambio((x) => { x.efectos.splice(i, 1); }, null, false) }, "✕"))); });
    // rótulos
    const ut = $("#textos"); ut.replaceChildren(); for (const [i, tx] of esc.textos.entries()) { const inp = h("input", { type: "text", value: tx.texto, class: "nom-ctrl" }); inp.addEventListener("change", () => cambio((x) => { x.textos[i].texto = inp.value; }, null, false));
      ut.append(h("li", { class: i === selTexto ? "activo" : "", onclick: () => { selTexto = i; tiempo = tx.t; dibujar(); pintarPistas(); pintarTexto(); } }, h("span", {}, "T"), inp, h("span", { class: "hueso" }, fmtT(tx.t)),
        h("button", { class: "x", title: tx.arriba ? "Arriba (lejos de los subtítulos): pulsa para bajarlo" : "Abajo: pulsa para subirlo y que no lo tapen los subtítulos", onclick: (ev) => { ev.stopPropagation(); cambio((x) => { if (x.textos[i].arriba) delete x.textos[i].arriba; else x.textos[i].arriba = true; }, null, false); } }, tx.arriba ? "↑" : "↓"),
        h("button", { class: "x", title: "Quitar", onclick: (ev) => { ev.stopPropagation(); cambio((x) => { x.textos.splice(i, 1); }, null, false); } }, "✕"))); }
    pintarTexto();
    // audio
    const ua = $("#audios"); ua.replaceChildren(); for (const [i, au] of esc.audios.entries()) { const vol = h("input", { type: "range", min: 0, max: 1, step: 0.05, value: au.volumen ?? 1, title: "Volumen" });
      vol.addEventListener("input", () => cambio((x) => { x.audios[i].volumen = Number(vol.value); }, "vol" + i, false));
      const quien = h("select", { class: "habla", title: "¿Quién habla? Su boca seguirá esta voz" }, h("option", { value: "" }, "nadie habla (música)"), ...esc.actores.map((a) => h("option", { value: a.id }, "habla: " + (PJ[a.personaje]?.nombre || a.personaje))));
      quien.value = au.habla || ""; quien.addEventListener("change", async () => { const v = quien.value; let env = au.envolvente;
        if (v && !env) { estado("Analizando la voz…"); const r = await (await fetch("/api/envolvente?archivo=" + encodeURIComponent(au.archivo))).json(); env = r.envolvente; }
        let pal = au.palabras; if (v && !pal) pal = await palabrasDe(au.archivo);
        cambio((x) => { x.audios[i].habla = v || undefined; if (env) x.audios[i].envolvente = env; if (pal) x.audios[i].palabras = pal; }, null, false); });
      ua.append(h("li", { class: "fila-audio" }, h("span", {}, "♪"), h("div", { class: "audio-info" }, h("span", { title: au.archivo }, au.archivo.split("/").pop()), quien), vol, h("button", { class: "x", title: "Quitar", onclick: () => cambio((x) => { x.audios.splice(i, 1); }) }, "✕"))); }
    $("#t-tiempo").textContent = fmtT(tiempo) + " / " + fmtT(D());
    const kc = claveCabezal(); $("#t-curva").disabled = !kc; $("#t-curva").title = kc ? "Ritmo del tramo que empieza en esta clave" : "Pon el cabezal sobre una clave (un rombo de la pista) para cambiar su curva"; if (kc) $("#t-curva").value = Array.isArray(kc.k.curva) ? "propia" : kc.k.curva || "suave"; $("#t-curva-ed").disabled = !kc;
  }
  // clave del cabezal a la que se aplica la curva: la del recorrido del personaje elegido; si no hay, la de cámara
  function claveCabezal() { const a = actor(), cerca = (k) => Math.abs(k.t - tiempo) < 0.02;
    const ka = a && (a.recorrido || []).find(cerca); if (ka) return { tipo: "rec", k: ka, id: a.id }; const kc = esc.camara.find(cerca); return kc ? { tipo: "cam", k: kc } : null; }
  const ponCurva = (v) => { const c = claveCabezal(); if (!c) return;
    cambio((x) => { const lst = c.tipo === "cam" ? x.camara : x.actores.find((y) => y.id === c.id).recorrido, k = lst.find((q) => Math.abs(q.t - tiempo) < 0.02); if (v === "suave") delete k.curva; else k.curva = v; }, null, false); };
  const editarCurva = () => { const c = claveCabezal(); if (!c) return; EditorCurva.abrir($("#t-curva"), c.k.curva || "suave", (v) => ponCurva(v)); };
  $("#t-curva").addEventListener("change", (ev) => { if (ev.target.value === "propia") editarCurva(); else ponCurva(ev.target.value); });
  $("#t-curva-ed").addEventListener("click", editarCurva);
  $("#e-nombre").addEventListener("input", (ev) => cambio((x) => { x.nombre = ev.target.value; }, "e-nombre", false));
  $("#e-dur").addEventListener("input", (ev) => cambio((x) => { x.duracion = Number(ev.target.value); }, "e-dur", false));
  $("#b-add-actor").addEventListener("click", () => { const pid = $("#add-personaje").value; if (!pid) return; let n = 1, id = pid; while (esc.actores.some((a) => a.id === id)) id = pid + "-" + ++n;
    const x0 = esc.actores.length ? (esc.actores.length % 2 ? 260 : -260) * Math.ceil(esc.actores.length / 2) : 0;
    cambio((x) => { x.actores.push({ id, personaje: pid, escala: 1, orientar: true, recorrido: [{ t: 0, x: x0, p: 0, giro: x0 > 0 ? -25 : 25 }], bloques: [] }); }); selActor = id; pintarPanel(); pintarPistas(); });
  // DIRECCIÓN: botones con los ángulos de siempre; marcan la clave como «giroFijo» (manda sobre «Mira hacia donde anda»)
  const DIRECCIONES = { pi: -80, ti: -35, fr: 0, td: 35, pd: 80, es: 180 }, DIRECCIONES_N = { pi: "◀ Perfil", ti: "↙ 3/4", fr: "De frente", td: "3/4 ↘", pd: "Perfil ▶", es: "De espaldas" };
  const ponDireccion = (g, clave) => { const a = actor(); if (!a) return; cambio((x) => { const r = x.actores.find((y) => y.id === a.id).recorrido; tocarClave(r, ["x", "p", "giro"], { giro: g });
    const k = r.find((q) => Math.abs(q.t - tiempo) < 0.02); if (k) k.giroFijo = true; }, clave ? clave + "@" + tiempo.toFixed(2) : null, false); };
  // TRAMO: la clave del recorrido en el cabezal decide cómo gira y anda hasta la siguiente (comun/andares.js)
  const claveRec = (a) => (a?.recorrido || []).find((k) => Math.abs(k.t - tiempo) < 0.02);
  const editaClave = (fn, clave) => { const a = actor(); if (!a) return; cambio((x) => { const r = x.actores.find((y) => y.id === a.id).recorrido, k = r.find((q) => Math.abs(q.t - tiempo) < 0.02); if (k) fn(k, r); }, clave ? clave + "@" + tiempo.toFixed(2) : null, false); };
  function pintarTramo(a, ESTILOS) { const k = claveRec(a), ks = [...(a.recorrido || [])].sort((m, n) => m.t - n.t), i = k ? ks.indexOf(k) : -1, sig = i >= 0 ? ks[i + 1] : null;
    $("#k-fuera").textContent = k ? (sig ? "" : "Es la última clave: no hay tramo hasta otra.") : "Pon el cabezal en una clave del recorrido (un rombo en su pista, o «Clave anterior / siguiente») para decidir cómo va hasta la siguiente.";
    $("#k-det").style.visibility = k ? "visible" : "hidden"; for (const id of ["k-giromodo", "k-sentido", "k-vel", "k-andar"]) $("#" + id).closest(".campo").style.opacity = k && !sig ? 0.4 : 1; $("#k-titulo").textContent = k ? (sig ? `de ${fmtT(k.t)} a ${fmtT(sig.t)}` : `${fmtT(k.t)} · última clave`) : "";
    if (!k) return; if (document.activeElement !== $("#k-t")) $("#k-t").value = k.t;
    seg("#k-giromodo", { todo: "Durante todo el tramo", inicio: "Al empezar", final: "Al llegar" }, k.giroModo || (a.orientar ? "inicio" : "todo"), (v) => editaClave((kk) => { if (v === "todo") delete kk.giroModo; else kk.giroModo = v; }));
    $("#k-girodur-f").hidden = (k.giroModo || (a.orientar ? "inicio" : "todo")) === "todo"; deslizar("k-girodur", k.giroDur ?? (a.orientar ? 0.35 : 0.5), (v) => v.toFixed(2) + " s");
    seg("#k-sentido", { "": "Por el lado más corto", izquierda: "Hacia su izquierda", derecha: "Hacia su derecha" }, k.giroSentido || "", (v) => editaClave((kk) => { if (v) kk.giroSentido = v; else delete kk.giroSentido; }));
    if (document.activeElement !== $("#k-girocurva")) $("#k-girocurva").value = Array.isArray(k.giroCurva) ? "propia" : k.giroCurva || "";
    deslizar("k-cabeza", k.giroCabeza ?? 0.15, (v) => v.toFixed(2) + " s"); deslizar("k-pies", k.giroPies ?? 0.12, (v) => v.toFixed(2) + " s"); $("#k-pasitos").checked = k.giroPasitos ?? true;
    seg("#k-andar", Object.assign({ "-": "Como el personaje" }, ESTILOS), k.andar ?? "-", (v) => editaClave((kk) => { if (v === "-") delete kk.andar; else kk.andar = v || "normal"; }));
    const dist = sig ? Math.hypot((sig.x ?? 0) - (k.x ?? 0), ((sig.p ?? 0) - (k.p ?? 0)) * 500) : 0;
    const velAct = sig && dist > 20 ? [90, 150, 240, 420].reduce((m, v) => (Math.abs(v - dist / (sig.t - k.t)) < Math.abs(m - dist / (sig.t - k.t)) ? v : m)) : null;
    seg("#k-vel", dist > 20 ? { 90: "Despacio", 150: "Normal", 240: "Deprisa", 420: "Corriendo" } : { _: "Sin desplazamiento en este tramo" }, velAct ? String(velAct) : "", (v) => { if (v === "_") return; const dur = Math.max(0.3, dist / +v);
      editaClave((kk, r) => { const s2 = [...r].sort((m, n) => m.t - n.t), j = s2.indexOf(kk), nx = s2[j + 1]; if (!nx) return; const dd = +(kk.t + dur - nx.t).toFixed(2); for (const q of s2.slice(j + 1)) q.t = +(q.t + dd).toFixed(2);
        const ult = s2[s2.length - 1].t; return ult; }); aviso(`Tramo ajustado a ${dur.toFixed(1)} s`); }); }
  $("#k-ant").addEventListener("click", () => { const a = actor(); if (!a) return; const k = [...a.recorrido].map((q) => q.t).filter((t) => t < tiempo - 0.02).pop(); if (k != null) { tiempo = k; dibujar(); pintarPistas(); pintarPanel(); } });
  $("#k-sig").addEventListener("click", () => { const a = actor(); if (!a) return; const k = [...a.recorrido].map((q) => q.t).sort((m, n) => m - n).find((t) => t > tiempo + 0.02); if (k != null) { tiempo = k; dibujar(); pintarPistas(); pintarPanel(); } });
  $("#k-t").addEventListener("change", (ev) => { const v = Math.max(0, Math.min(D(), +ev.target.value)); if (!isFinite(v)) return; editaClave((k) => { k.t = +v.toFixed(2); }); tiempo = +v.toFixed(2); dibujar(); pintarPistas(); pintarPanel(); });
  $("#k-girodur").addEventListener("input", (ev) => editaClave((k) => { k.giroDur = +ev.target.value; if (!k.giroModo) k.giroModo = "inicio"; }, "kgd"));
  $("#k-cabeza").addEventListener("input", (ev) => editaClave((k) => { k.giroCabeza = +ev.target.value; }, "kcab"));
  $("#k-pies").addEventListener("input", (ev) => editaClave((k) => { k.giroPies = +ev.target.value; }, "kpie"));
  $("#k-pasitos").addEventListener("change", (ev) => editaClave((k) => { k.giroPasitos = ev.target.checked; }));
  $("#k-girocurva").addEventListener("change", (ev) => { const v = ev.target.value; if (v === "propia") { const k = claveRec(actor()); EditorCurva.abrir($("#k-girocurva"), k?.giroCurva || "suave", (c) => editaClave((kk) => { kk.giroCurva = c; })); return; }
    editaClave((k) => { if (v) k.giroCurva = v; else delete k.giroCurva; }); });
  $("#a-orientar").addEventListener("change", (ev) => { const a = actor(); if (a) cambio((x) => { const y = x.actores.find((z) => z.id === a.id); if (ev.target.checked) y.orientar = true; else delete y.orientar; }, null, false); });
  $("#b-andares").addEventListener("click", () => { const a = actor(); if (!window.EditorAndares) return aviso("Falta el editor de formas de andar");
    EditorAndares.abrir({ personajes: PJ, personaje: a?.personaje, estilo: a?.andar?.estilo, alElegir: (id) => { if (!a) return; cambio((x) => { const y = x.actores.find((z) => z.id === a.id); y.andar = Object.assign({}, y.andar); if (id && id !== "normal") y.andar.estilo = id; else delete y.andar.estilo; }, null, false); }, alCerrar: () => { pintarPanel(); dibujar(); } }); });
  const editarActor = (valores, clave) => { const a = actor(); if (!a) return; cambio((x) => { tocarClave(x.actores.find((y) => y.id === a.id).recorrido, ["x", "p", "giro"], valores); }, clave ? clave + "@" + tiempo.toFixed(2) : null, false); };
  $("#a-x").addEventListener("input", (ev) => editarActor({ x: Number(ev.target.value) }, "a-x"));
  $("#a-p").addEventListener("input", (ev) => editarActor({ p: Number(ev.target.value) }, "a-p"));
  $("#a-giro").addEventListener("input", (ev) => ponDireccion(Number(ev.target.value), "a-giro"));
  $("#a-escala").addEventListener("input", (ev) => { const a = actor(); if (a) cambio((x) => { x.actores.find((y) => y.id === a.id).escala = Number(ev.target.value); }, "a-escala", false); });
  // efectos de capa del personaje (sombra, desenfoque, resplandor, opacidad): comun/escena.js, efectosCapa
  for (const i of document.querySelectorAll("[data-efx]")) i.addEventListener("input", () => { const a = actor(); if (!a) return; const k = i.dataset.efx, v = Number(i.value);
    cambio((x) => { const q = x.actores.find((y) => y.id === a.id), e = (q.efectos = q.efectos || {}); if (k === "opacidad" ? v >= 0.999 : v <= 0.001) delete e[k]; else e[k] = v; if (!Object.keys(e).length) delete q.efectos; }, "a-efx-" + k, false); });
  $("#b-add-bloque").addEventListener("click", () => { const a = actor(), acc = $("#a-accion").value; if (!a || !acc) return; const def = Personajes.buscarAccion(PJ[a.personaje], acc)?.duracion || 2;
    cambio((x) => { const ax = x.actores.find((y) => y.id === a.id); ax.bloques = ax.bloques || []; ax.bloques.push({ t: +tiempo.toFixed(2), accion: acc, dur: +Math.min(def * 2, D() - tiempo || def).toFixed(1) || def }); ax.bloques.sort((m, n) => m.t - n.t); selBloque = ax.bloques.findIndex((b) => b.accion === acc && Math.abs(b.t - tiempo) < 0.02); }, null, false); });
  $("#b-dur").addEventListener("input", (ev) => { const a = actor(); if (!a || selBloque === null) return; cambio((x) => { x.actores.find((y) => y.id === a.id).bloques[selBloque].dur = Number(ev.target.value); }, "b-dur" + selBloque, false); });
  $("#b-mezcla").addEventListener("input", (ev) => { const a = actor(); if (!a || selBloque === null) return; cambio((x) => { x.actores.find((y) => y.id === a.id).bloques[selBloque].mezcla = +ev.target.value; }, "bmz" + selBloque, false); });
  $("#b-quitar-bloque").addEventListener("click", () => { const a = actor(); if (!a || selBloque === null) return; const i = selBloque; selBloque = null; cambio((x) => { x.actores.find((y) => y.id === a.id).bloques.splice(i, 1); }, null, false); });
  $("#b-quitar-clave").addEventListener("click", () => { const a = actor(); if (!a) return; cambio((x) => { const r = x.actores.find((y) => y.id === a.id).recorrido; const i = r.findIndex((k) => Math.abs(k.t - tiempo) < 0.02); if (i >= 0 && r.length > 1) r.splice(i, 1); }, null, false); });
  for (const k of ["tono", "vineta", "cant"]) $("#am-" + k).addEventListener("input", (ev) => cambio((x) => { x.ambiente = Object.assign({}, x.ambiente, { [k === "cant" ? "cantidad" : k]: +ev.target.value }); }, "am" + k, false));
  const ponEfecto = (tipo) => { if (!esc) return; cambio((x) => { (x.efectos = x.efectos || []).push({ t: +tiempo.toFixed(2), tipo, dur: tipo === "sacudida" ? 0.6 : 0.5, fuerza: 1 }); x.efectos.sort((a, b) => a.t - b.t); }, null, false); aviso((tipo === "destello" ? "Destello" : "Sacudida") + " en " + fmtT(tiempo)); };
  $("#b-destello").addEventListener("click", () => ponEfecto("destello")); $("#b-sacudida").addEventListener("click", () => ponEfecto("sacudida"));
  $("#a-zancada").addEventListener("input", (ev) => { const a = actor(); if (!a) return; cambio((x) => { const y = x.actores.find((z) => z.id === a.id); y.andar = Object.assign({}, y.andar, { zancada: +ev.target.value }); }, "azan" + a.id, false); });
  // clave de mirar / agarrar en el cabezal (si ya hay una en ese instante, se cambia)
  const ponClaveActor = (lista, valor) => { const a = actor(); if (!a) return; cambio((x) => { const y = x.actores.find((z) => z.id === a.id), l = (y[lista] = y[lista] || []);
      const i = l.findIndex((k) => Math.abs(k.t - tiempo) < 0.02 && (lista !== "agarra" || k.mano === valor.mano)); const k = Object.assign({ t: +tiempo.toFixed(2) }, valor);
      if (i >= 0) l[i] = k; else l.push(k); l.sort((m, n) => m.t - n.t); }, null, false); };
  $("#b-mirar").addEventListener("click", () => ponClaveActor("mirar", { a: $("#a-mirar").value }));
  $("#b-agarra").addEventListener("click", () => ponClaveActor("agarra", { a: $("#a-agarra").value, mano: $("#a-agarra-mano").value }));
  $("#b-add-objeto").addEventListener("click", () => { const tipo = $("#add-objeto").value; if (!tipo || !esc) return; let n = 1, id = tipo; while ((esc.objetos || []).some((o) => o.id === id)) id = tipo + "-" + ++n;
    const c = posCam(); cambio((x) => { (x.objetos = x.objetos || []).push({ id, tipo, x: Math.round(c.x + ((x.objetos.length % 3) - 1) * 380), p: 0.35, escala: 1 }); }); selObjeto = id; pintarPanel(); });
  const cambiaObj = (fn, clave) => { const ob = objeto(); if (ob) cambio((x) => fn(x.objetos.find((y) => y.id === ob.id)), clave, false); };
  $("#o-x").addEventListener("input", (ev) => cambiaObj((o) => (o.x = +ev.target.value), "ox"));
  $("#o-p").addEventListener("input", (ev) => cambiaObj((o) => (o.p = +ev.target.value), "op"));
  $("#o-escala").addEventListener("input", (ev) => cambiaObj((o) => (o.escala = +ev.target.value), "oe"));
  $("#o-espejo").addEventListener("change", (ev) => cambiaObj((o) => { if (ev.target.checked) o.espejo = true; else delete o.espejo; }));
  $("#o-detras").addEventListener("change", (ev) => cambiaObj((o) => { if (ev.target.checked) o.detras = true; else delete o.detras; }));
  // máscaras (comun/escena.js, mascara): la lista son los demás objetos de la escena
  const opcionesMascara = (sel, yo) => { const v = sel.value; sel.replaceChildren(h("option", { value: "" }, "— sin máscara —"), ...(esc?.objetos || []).filter((o) => o.id !== yo).map((o) => h("option", { value: o.id }, "▲ " + (ATREZO[o.tipo]?.nombre || o.tipo) + " (" + o.id + ")"))); sel.value = v; };
  const ponerMascara = (lista, id, k, v) => cambio((x) => { const q = x[lista].find((y) => y.id === id); if (!q) return; if (v) q[k] = v; else delete q[k]; }, null, false);
  $("#o-mascara").addEventListener("change", (ev) => { const ob = objeto(); if (ob) ponerMascara("objetos", ob.id, "mascara", ev.target.value); });
  $("#o-mascara-oculta").addEventListener("change", (ev) => { const ob = objeto(); if (ob) ponerMascara("objetos", ob.id, "mascaraOculta", ev.target.checked); });
  $("#a-mascara").addEventListener("change", (ev) => { const a = actor(); if (a) ponerMascara("actores", a.id, "mascara", ev.target.value); });
  $("#a-mascara-oculta").addEventListener("change", (ev) => { const a = actor(); if (a) ponerMascara("actores", a.id, "mascaraOculta", ev.target.checked); });
  $("#o-animar").addEventListener("change", (ev) => cambiaObj((o) => { if (ev.target.checked) { const v = paramsObjeto(o); o.claves = [Object.assign({ t: +tiempo.toFixed(2) }, v)]; } else { o.params = paramsObjeto(o); delete o.claves; } }));
  $("#b-quitar-objeto").addEventListener("click", () => { const ob = objeto(); if (!ob) return; cambio((x) => { x.objetos = x.objetos.filter((y) => y.id !== ob.id); }); selObjeto = null; pintarPanel(); aviso("Quitado (Ctrl+Z lo recupera)"); });
  $("#b-quitar-actor").addEventListener("click", () => { const a = actor(); if (!a) return; cambio((x) => { x.actores = x.actores.filter((y) => y.id !== a.id); }); selActor = esc.actores[0]?.id || null; aviso("Quitado de la escena (Ctrl+Z lo recupera)"); });
  // la altura de la cámara decide también el ángulo con el que se dibujan los personajes (tilt): baja = desde abajo, alta = desde arriba
  const tiltDe = (alto) => alto < 450 ? -0.16 * (450 - alto) / 300 : 0.18 + 0.36 * Math.min(1, (alto - 450) / 900);
  const editarCam = (valores, clave) => { if ("alto" in valores) valores.tilt = +tiltDe(valores.alto).toFixed(3);
    cambio((x) => tocarClave(x.camara, CAMPOS_CAM, valores), clave ? clave + "@" + tiempo.toFixed(2) : null, false); };
  $("#c-alto").addEventListener("input", (ev) => editarCam({ alto: Number(ev.target.value) }, "c-alto"));
  $("#c-roll").addEventListener("input", (ev) => editarCam({ roll: Number(ev.target.value) }, "c-roll"));
  $("#c-x").addEventListener("input", (ev) => editarCam({ x: Number(ev.target.value) }, "c-x")); $("#c-y").addEventListener("input", (ev) => editarCam({ y: Number(ev.target.value) }, "c-y"));
  $("#c-zoom").addEventListener("input", (ev) => editarCam({ zoom: Number(ev.target.value) }, "c-zoom"));
  $("#b-quitar-cam").addEventListener("click", () => cambio((x) => { const i = x.camara.findIndex((k) => Math.abs(k.t - tiempo) < 0.02); if (i >= 0 && x.camara.length > 1) x.camara.splice(i, 1); }, null, false));
  // RÓTULO ELEGIDO: estilo, tiempos, tamaño, posición, color y caja
  const COLORES_TX = ["#f7f1e5", "#f2a33a", "#ffd27a", "#ff7a5a", "#9ad0ff", "#a8e08a", "#14171e"];
  const editaTexto = (fn, clave) => { if (selTexto === null) return; cambio((x) => { const tx = x.textos[selTexto]; if (tx) fn(tx); }, clave ? clave + selTexto : null, false); };
  function pintarTexto() { const tx = selTexto !== null ? esc.textos[selTexto] : null; $("#texto-det").hidden = !tx; if (!tx) return;
    seg("#tx-estilo", { "": "Rótulo", titulo: "Título grande", cita: "Cita bíblica" }, tx.estilo || "", (v) => editaTexto((t) => { if (v) t.estilo = v; else delete t.estilo; }));
    for (const [id, v] of [["tx-t", tx.t], ["tx-dur", tx.dur || 2]]) if (document.activeElement !== $("#" + id)) $("#" + id).value = v;
    const tamDef = tx.estilo === "titulo" ? 104 : tx.estilo === "cita" ? 66 : 52; deslizar("tx-tam", tx.tam || tamDef, (v) => Math.round(v) + " px");
    $("#tx-y").max = Escena.ALTO - 80; const grande = !!tx.estilo, yAbajo = Math.round(Escena.ALTO * 0.72);   // título y cita van arriba si no se dice otra cosa
    const posAct = tx.y != null ? (tx.y === Math.round(Escena.ALTO / 2) ? "centro" : grande && tx.y === yAbajo ? "abajo" : "libre") : tx.arriba || grande ? "arriba" : "abajo";
    seg("#tx-pos", { arriba: "Arriba", centro: "En el centro", abajo: "Abajo", libre: "Altura exacta" }, posAct, (v) => editaTexto((t) => { delete t.y; delete t.arriba;
      if (v === "arriba") t.arriba = true; else if (v === "centro") t.y = Math.round(Escena.ALTO / 2); else if (v === "libre") t.y = Math.round(Escena.ALTO * 0.3); else if (v === "abajo" && t.estilo) t.y = yAbajo; }));
    deslizar("tx-y", tx.y ?? Math.round(Escena.ALTO * (tx.arriba ? 0.18 : 0.75)), (v) => Math.round(v) + " px");
    const pc = $("#tx-color"); pc.replaceChildren(); for (const c of COLORES_TX) { const b = h("button", { class: "sw" + ((tx.color || "#f7f1e5") === c ? " activo" : ""), title: c, onclick: () => editaTexto((t) => { if (c === "#f7f1e5") delete t.color; else t.color = c; }) }); b.style.background = c; pc.append(b); }
    const otro = h("input", { type: "color", value: tx.color || "#f7f1e5", title: "Otro color" }); otro.addEventListener("change", () => editaTexto((t) => { t.color = otro.value; })); pc.append(otro);
    const normal = !tx.estilo; $("#tx-color-f").hidden = !normal; $("#tx-caja-f").hidden = !normal; $("#tx-caja").checked = tx.caja !== false;
    $("#tx-ref-f").hidden = tx.estilo !== "cita"; if (document.activeElement !== $("#tx-ref")) $("#tx-ref").value = tx.ref || ""; }
  $("#tx-t").addEventListener("change", (ev) => { const v = Math.max(0, +ev.target.value); editaTexto((t) => { t.t = +v.toFixed(2); }); });
  $("#tx-dur").addEventListener("change", (ev) => { const v = Math.max(0.3, +ev.target.value); editaTexto((t) => { t.dur = +v.toFixed(2); }); });
  $("#tx-tam").addEventListener("input", (ev) => editaTexto((t) => { t.tam = +ev.target.value; }, "txtam"));
  $("#tx-y").addEventListener("input", (ev) => editaTexto((t) => { t.y = +ev.target.value; delete t.arriba; }, "txy"));
  $("#tx-caja").addEventListener("change", (ev) => editaTexto((t) => { if (ev.target.checked) delete t.caja; else t.caja = false; }));
  $("#tx-ref").addEventListener("input", (ev) => editaTexto((t) => { if (ev.target.value.trim()) t.ref = ev.target.value.trim(); else delete t.ref; }, "txref"));
  // COPIAR Y PEGAR CLAVES del recorrido (posición, dirección y cómo gira y anda en su tramo)
  let portapapeles = null;
  const copiarClave = () => { const k = claveRec(actor()); if (!k) return aviso("Pon el cabezal sobre una clave del recorrido para copiarla"); portapapeles = Object.assign({}, k); delete portapapeles.t; aviso("Clave copiada"); };
  const pegarClave = () => { const a = actor(); if (!a) return aviso("Elige un personaje"); if (!portapapeles) return aviso("Primero copia una clave");
    cambio((x) => { const r = x.actores.find((y) => y.id === a.id).recorrido, k = r.find((q) => Math.abs(q.t - tiempo) < 0.02); if (k) Object.assign(k, portapapeles); else { r.push(Object.assign({ t: +tiempo.toFixed(2) }, portapapeles)); r.sort((m, n) => m.t - n.t); } }, null, false); aviso("Clave pegada en " + fmtT(tiempo)); };
  $("#k-copiar").addEventListener("click", copiarClave); $("#k-pegar").addEventListener("click", pegarClave);
  $("#b-t").addEventListener("change", (ev) => { const a = actor(); if (!a || selBloque === null) return; const v = Math.max(0, +ev.target.value); cambio((x) => { x.actores.find((y) => y.id === a.id).bloques[selBloque].t = +v.toFixed(2); }, null, false); });
  $("#b-add-texto").addEventListener("click", () => { const t = $("#tx-texto").value.trim(); if (!t) { aviso("Escribe el texto del rótulo en la casilla y pulsa Añadir"); $("#tx-texto").focus(); return; } $("#tx-texto").value = ""; cambio((x) => { x.textos.push({ t: +tiempo.toFixed(2), dur: 2, texto: t }); x.textos.sort((a, b) => a.t - b.t); }, null, false); });
  // palabras con tiempos de una voz (VoiceStudio): la boca forma cada fonema; si no se puede transcribir, se queda con abrir y cerrar
  async function palabrasDe(archivo) { estado("Leyendo las palabras de la voz (labios por fonemas)…");
    try { const r = await (await fetch("/api/transcribir", { method: "POST", body: JSON.stringify({ archivo }) })).json(); return !r.error && r.fuente !== "estimado" && r.palabras?.length ? r.palabras : null; } catch { return null; } }
  $("#tx-texto").addEventListener("keydown", (ev) => { if (ev.key === "Enter") $("#b-add-texto").click(); });
  $("#b-add-audio").addEventListener("click", async () => { const f = $("#au-lista").value; if (!f) return; estado("Analizando el audio…");
    let info = {}; try { info = await (await fetch("/api/envolvente?archivo=" + encodeURIComponent(f))).json(); } catch {}
    const voz = /voz|narra/i.test(f) && esc.actores.length ? (actor() || esc.actores[0]).id : undefined;
    const pal = voz ? await palabrasDe(f) : null;
    cambio((x) => { x.audios.push({ archivo: f, t: +tiempo.toFixed(2), dur: info.duracion ? +info.duracion.toFixed(2) : undefined, volumen: 1, habla: voz, envolvente: info.envolvente, ...(pal ? { palabras: pal } : {}) });
      if (info.duracion && x.duracion < tiempo + info.duracion) x.duracion = +(tiempo + info.duracion + 0.5).toFixed(1); });
    aviso(voz ? `Voz añadida en ${fmtT(tiempo)}: la boca de ${PJ[actor(voz).personaje]?.nombre} la sigue` : "Audio añadido en " + fmtT(tiempo)); });
  async function cargarAudios() { const l = await (await fetch("/api/audios")).json(); $("#au-lista").replaceChildren(h("option", { value: "" }, l.length ? "— elige una voz o una música —" : "— no hay audios —"), ...l.map((f) => { const partes = f.split("/"), nom = partes.pop(); return h("option", { value: f, title: f }, `${nom}  ·  ${partes[0] || ""}`); })); }   // nombre del archivo y de qué proyecto viene (la ruta entera, al pasar el ratón)

  // ---- pistas (línea de tiempo)
  const pct = (t) => (cl(t, 0, D()) / D()) * 100 + "%";
  function fila(nombre, activo, onNom) { const f = h("div", { class: "pista-fila" }), n = h("div", { class: "nom" + (activo ? " activo" : ""), title: nombre }, nombre), c = h("div", { class: "carril" }); if (onNom) n.addEventListener("click", onNom); f.append(n, c); $("#pistas").append(f); return c; }
  function pintarPistas() {
    const P = $("#pistas"); P.replaceChildren(); if (!esc) return;
    const r = fila("", false); r.parentElement.classList.add("regla-fila"); for (let t = 0; t <= D() + 1e-6; t += D() > 20 ? 5 : 1) r.append(h("span", { class: "marca-t", style: `left:${pct(t)}` }, String(t)));
    const cam = fila("Cámara", false); for (const [i, k] of esc.camara.entries()) cam.append(h("div", { class: "rombo cam" + (Math.abs(k.t - tiempo) < 0.02 ? " activo" : ""), style: `left:${pct(k.t)}`, "data-tipo": "cam", "data-i": i, title: fmtT(k.t) }));
    for (const a of esc.actores) { const c = fila(PJ[a.personaje]?.nombre || a.personaje, a.id === selActor, () => { selActor = a.id; selBloque = null; pintarPanel(); pintarPistas(); });
      for (const [i, b] of (a.bloques || []).entries()) { const acc = Personajes.buscarAccion(PJ[a.personaje], b.accion);
        c.append(h("div", { class: "bloque" + (a.id === selActor && i === selBloque ? " activo" : ""), style: `left:${pct(b.t)};width:${((b.dur || 2) / D()) * 100}%`, "data-tipo": "bloque", "data-actor": a.id, "data-i": i, title: (acc?.nombre || b.accion) + " · " + fmtT(b.t) + (b.capa === "brazos" ? " · capa de brazos" : "") }, (b.capa === "brazos" ? "✋ " : b.capa === "cara" ? "☺ " : "") + (acc?.nombre || b.accion))); }
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
  // arrastrar el atrezo: horizontal = posición, vertical = profundidad (sin claves: es un decorado)
  let arrO = null;
  lienzo.addEventListener("pointerdown", (ev) => { const go = ev.target.closest("[data-objeto]"); if (!go || !esc || ev.target.closest("[data-actor]")) return; const ob = objeto(go.getAttribute("data-objeto")); if (!ob) return; parar();
    selObjeto = ob.id; try { lienzo.setPointerCapture(ev.pointerId); } catch {} lienzo.classList.add("arrastrando");
    arrO = { id: ob.id, x0: ev.clientX, y0: ev.clientY, x: ob.x || 0, p: ob.p || 0, k: (Escena.ANCHO / lienzo.clientWidth) / (posCam().zoom || 1) }; pintarPanel(); });
  lienzo.addEventListener("pointermove", (ev) => { if (!arrO) return; const a = arrO, dx = (ev.clientX - a.x0) * a.k, dy = (ev.clientY - a.y0) * a.k;
    cambio((x) => { const o = x.objetos.find((y) => y.id === a.id); o.x = Math.round(a.x + dx); o.p = +cl(a.p - dy / 400, -0.9, 4).toFixed(3); }, "arrO" + a.id, false); });
  const soltarO = () => { if (!arrO) return; arrO = null; lienzo.classList.remove("arrastrando"); pintarPanel(); };
  lienzo.addEventListener("pointerup", soltarO); lienzo.addEventListener("pointercancel", soltarO);
  lienzo.addEventListener("pointerdown", (ev) => { const g = ev.target.closest("[data-actor]"); if (!g || !esc) return; const a = actor(g.getAttribute("data-actor")); if (!a) return; parar();
    selActor = a.id; selBloque = null; try { lienzo.setPointerCapture(ev.pointerId); } catch {} lienzo.classList.add("arrastrando");
    const q = posActor(a); arrA = { id: a.id, x0: ev.clientX, y0: ev.clientY, q, k: (Escena.ANCHO / lienzo.clientWidth) / (posCam().zoom || 1) }; pintarPanel(); pintarPistas(); });
  lienzo.addEventListener("pointermove", (ev) => { if (!arrA) return; const a = arrA, dx = (ev.clientX - a.x0) * a.k, dy = (ev.clientY - a.y0) * a.k;
    cambio((x) => tocarClave(x.actores.find((y) => y.id === a.id).recorrido, ["x", "p", "giro"], { x: Math.round(a.q.x + dx), p: +cl((a.q.p || 0) - dy / 400, -0.8, 3).toFixed(3) }), "arrA" + a.id + tiempo.toFixed(2), false); });
  const soltarA = () => { if (!arrA) return; arrA = null; lienzo.classList.remove("arrastrando"); };
  lienzo.addEventListener("pointerup", soltarA); lienzo.addEventListener("pointercancel", soltarA);

  // ---- render
  let sondeo = null;
  async function consultar() { const r = await (await fetch(`/api/escenas/${actual}/render`)).json(); if (RenderUI.estado(r, `escena-${actual}/out`)) sondeo = setTimeout(consultar, 1500); }
  $("#b-render").addEventListener("click", async () => { if (!esc) return; await guardar(); clearTimeout(sondeo); { const v = $("#render-video"); v.pause(); v.removeAttribute("src"); v.load(); v.hidden = true; }   // suelta el MP4 anterior (Windows lo bloquea mientras está abierto)
    await fetch(`/api/escenas/${actual}/render`, { method: "POST", body: JSON.stringify(RenderUI.opciones()) }); consultar(); });
  $("#r-cabezal").addEventListener("click", () => RenderUI.fragmentoDesde(tiempo, D()));
  $("#b-exportar").addEventListener("click", async () => { await guardar(); const r = await (await fetch(`/api/escenas/${actual}/exportar`, { method: "POST" })).json(); aviso("Proyecto en Videos/shorts-flow/" + r.dir); });

  $("#b-png").addEventListener("click", async () => { if (!esc) return; const svg = $("#lienzo"), copia = svg.cloneNode(true); copia.setAttribute("width", Escena.ANCHO); copia.setAttribute("height", Escena.ALTO); copia.querySelector("#guias")?.remove();
    const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(copia)], { type: "image/svg+xml" })), img = new Image(); await new Promise((ok, mal) => { img.onload = ok; img.onerror = mal; img.src = url; });
    const c = document.createElement("canvas"); c.width = Escena.ANCHO; c.height = Escena.ALTO; c.getContext("2d").drawImage(img, 0, 0); URL.revokeObjectURL(url);
    c.toBlob((b) => { const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = `${actual}-${tiempo.toFixed(2).replace(".", "_")}s.png`; a.click(); aviso("Fotograma descargado"); }, "image/png"); });

  // ---- teclado
  $("#b-deshacer").addEventListener("click", deshacer); $("#b-rehacer").addEventListener("click", rehacer);
  document.addEventListener("keydown", (ev) => { const el = document.activeElement, escribe = ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName) && el.type !== "range";
    if ((ev.ctrlKey || ev.metaKey) && !escribe && ev.key.toLowerCase() === "c") { ev.preventDefault(); copiarClave(); return; }
    if ((ev.ctrlKey || ev.metaKey) && !escribe && ev.key.toLowerCase() === "v") { ev.preventDefault(); pegarClave(); return; }
    if ((ev.ctrlKey || ev.metaKey) && !escribe) { if (ev.key.toLowerCase() === "z" && !ev.shiftKey) { ev.preventDefault(); deshacer(); } else if (ev.key.toLowerCase() === "y" || (ev.key.toLowerCase() === "z" && ev.shiftKey)) { ev.preventDefault(); rehacer(); } return; }
    if (ev.code === "Space" && !escribe) { ev.preventDefault(); reproducir(); } });

  // ---- arranque
  (async () => { await Promise.all([cargarPersonajes(), cargarImagenes()]); await cargarLista(); cargarAudios(); escuchar();
    let ini = new URLSearchParams(location.search).get("escena"); if (!ini) try { ini = localStorage.getItem("es-actual"); } catch {} const id = lista.find((x) => x.id === ini) ? ini : lista[0]?.id; if (id) await abrir(id); else pintarPistas();
    if (actual) consultar(); })();
  window.CTX_HISTORIAL = () => ({ tipo: "escenas", id: actual, nombre: esc?.nombre });
})();
