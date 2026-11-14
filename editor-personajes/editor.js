// Editor de personajes: interfaz sobre comun/titere25d.js. El estado de cada personaje es un JSON en ../personajes;
// se guarda solo y se recarga cuando el archivo cambia en disco (lo edite Claude o quien sea).
(() => {
  const T = Titere25D, P = Personajes, NS = "http://www.w3.org/2000/svg";
  const $ = (s) => document.querySelector(s), rad = (g) => (g * Math.PI) / 180;
  const el = (tag, at = {}, padre) => { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); if (padre) padre.appendChild(e); return e; };
  const h = (tag, at = {}, ...hijos) => { const e = document.createElement(tag); for (const k in at) k === "class" ? (e.className = at[k]) : k.startsWith("on") ? e.addEventListener(k.slice(2), at[k]) : e.setAttribute(k, at[k]); hijos.forEach((c) => e.append(c)); return e; };

  // ---- catálogos
  const TIPOS = { normal: { n: "Adulto", m: [1, 1, 1] }, mujer: { n: "Mujer", m: [0.88, 0.95, 0.96] }, nino: { n: "Niño", m: [0.7, 0.58, 0.9] }, chibi: { n: "Chibi", m: [0.7, 0.54, 1.12] } };
  const PELOS = { corto: "Corto", rizado: "Rizado", largo: "Largo", calvo: "Sin pelo" };
  const ROPAS = { tunica: "Túnica", vestido: "Vestido", moderno: "Actual" };
  const GRUPOS = [
    { k: "piel", n: "Piel", tonos: ["pielS", "pielL", "nariz", "mejilla"] },
    { k: "pelo", n: "Pelo", tonos: ["peloS", "peloL"] },
    { k: "ropa", n: "Ropa", tonos: ["ropaS", "ropaL"] },
    { k: "cinto", n: "Cinturón", tonos: ["cintoL"], si: (j) => !j.opciones.moderno },
    { k: "sandalia", n: "Sandalias", tonos: [], si: (j) => !j.opciones.moderno },
    { k: "pantalon", n: "Pantalón", tonos: ["pantalonL"], si: (j) => j.opciones.moderno },
    { k: "zapato", n: "Zapatillas", tonos: ["zapatoS"], si: (j) => j.opciones.moderno },
    { k: "boca", n: "Boca", tonos: [] },
  ];
  const NOMBRE_TONO = { pielS: "sombra", pielL: "luz", nariz: "nariz", mejilla: "mejillas", peloS: "sombra", peloL: "brillo", ropaS: "sombra", ropaL: "filo de luz", cintoL: "brillo", pantalonL: "luz", zapatoS: "suela" };
  const POR_DEFECTO = Object.assign({}, T.COLORES, { pantalon: "#2e3a5a", pantalonL: "#56668e", zapato: "#ece6da", zapatoS: "#8a8478" });
  const EMOS = { neutra: "Neutra", alegre: "Alegre", risa: "Risa", triste: "Triste", enfado: "Enfado", sorpresa: "Sorpresa", miedo: "Miedo", pensativo: "Pensativo", verguenza: "Vergüenza" };
  const CAMARAS = { normal: { n: "Normal", c: { tilt: 0.22 } }, picado: { n: "Picado", c: { inclina: 40, distancia: 1300, centro: -300 } },
    contrapicado: { n: "Contrapicado", c: { inclina: -22, distancia: 700, centro: -300 } }, angular: { n: "Gran angular", c: { inclina: 8, distancia: 520, centro: -300 } } };
  const S = Math.sin, PI2 = Math.PI * 2;
  const ARRIBA = { brazoIzq: { lado: 2.2, frente: 0.4, codo: 0.3, hacia: [0, -1, 0], k: 1 }, brazoDer: { lado: 2.2, frente: 0.4, codo: 0.3, hacia: [0, -1, 0], k: 1 }, manoIzq: "abierta", manoDer: "abierta", palmaIzq: [0, 0, 1], palmaDer: [0, 0, 1] };
  const ACCIONES = {
    quieto: { n: "Quieto", f: () => ({}) },
    andar: { n: "Andar", f: (t) => ({ amp: 1, fase: t * 0.95 }) },
    correr: { n: "Correr", f: (t) => ({ amp: 1, correr: 1, fase: t * 1.45 }), cara: { alegre: 0.5 } },
    saltar: { n: "Saltar", f: (t) => { const u = t % 1.8, vu = Math.max(0, Math.min(1, (u - 0.45) / 0.6));
      return { agacha: 0.8 * Math.max(0, 1 - Math.abs(u - 0.35) / 0.2) + 0.6 * Math.max(0, 1 - Math.abs(u - 1.1) / 0.15), altura: u > 0.45 && u < 1.05 ? 200 * 4 * vu * (1 - vu) : 0, recoge: vu > 0.15 && vu < 0.85 ? 1 : 0,
        brazoIzq: u > 0.4 && u < 1.1 ? { lado: 2.2, frente: 0.5, codo: 0.35, hacia: [-0.3, -1, 0.3], k: 1 } : null, brazoDer: u > 0.4 && u < 1.1 ? { lado: 2.2, frente: 0.5, codo: 0.35, hacia: [-0.3, -1, 0.3], k: 1 } : null }; }, cara: { risa: 0.7 } },
    saludar: { n: "Saludar", f: (t) => ({ brazoDer: { lado: 1.25, frente: 0.25, codo: 1.35 + 0.42 * S(PI2 * 2.2 * t), hacia: [0.35, -1, 0.5], k: 1 }, manoDer: "abierta", palmaDer: [0, 0, 1], ladeo: 4 * S(PI2 * 1.1 * t) }), cara: { alegre: 1 } },
    senalar: { n: "Señalar", f: () => ({ brazoIzq: { lado: 1.35, frente: 0.45, codo: 0.08, k: 1 }, manoIzq: "senala" }), cara: { sorpresa: 0.4, alegre: 0.4 } },
    pulgar: { n: "Pulgar arriba", f: () => ({ brazoDer: { lado: 0.5, frente: 1.05, codo: 1.75, hacia: [-1, -0.2, 0], k: 1 }, manoDer: "pulgar", palmaDer: [0, 0, -1] }), cara: { alegre: 1 } },
    pensar: { n: "Pensar", f: () => ({ brazoDer: { lado: 0.1, frente: 0.55, codo: 2.5, hacia: [-0.6, -1, 0.3], k: 1 }, manoDer: { puno: 0.6 } }), cara: { pensativo: 1 } },
    miedo: { n: "Miedo", f: (t) => ({ hombros: 10, ladeo: 1.2 * S(t * 40), brazoIzq: { lado: 0.15, frente: 0.9, codo: 1.9, hacia: [-0.4, -1, 0.2], k: 1 }, brazoDer: { lado: 0.15, frente: 0.9, codo: 1.9, hacia: [-0.4, -1, 0.2], k: 1 }, manoIzq: "puno", manoDer: "puno" }), cara: { miedo: 0.9 } },
    alegria: { n: "Alegría", f: () => ARRIBA, cara: { risa: 0.8 } },
    ofrecer: { n: "Ofrecer la mano", f: () => ({ brazoDer: { lado: -0.2, frente: 1.42, codo: 0.1, hacia: [0, -1, 0.3], k: 1 }, manoDer: "abierta", palmaDer: [0, -0.75, 0.65] }), cara: { alegre: 0.9 } },
  };

  // ---- estado
  let lista = [], actual = null, j = null, guardadoTxt = "", historia = [], futuro = [], tGuardar = null;
  const prueba = Object.assign({ accion: "andar", emocion: "neutra", giro: 20, girar: false, camara: "normal" }, (() => { try { return JSON.parse(localStorage.getItem("ep-prueba") || "{}"); } catch { return {}; } })());
  const guardaPrueba = () => { try { localStorage.setItem("ep-prueba", JSON.stringify(prueba)); } catch {} };

  const aviso = (txt) => { const a = $("#aviso"); a.textContent = txt; a.classList.add("ver"); clearTimeout(aviso.t); aviso.t = setTimeout(() => a.classList.remove("ver"), 2600); };
  const estado = (txt, cls = "") => { const e = $("#estado"); e.textContent = txt; e.className = "estado " + cls; };
  const slug = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "personaje";
  const normaliza = (x) => { x.opciones = Object.assign({ proporciones: "normal", pelo: "corto", barba: false, vestido: false, moderno: false }, x.opciones || {});
    x.colores = Object.assign({}, x.colores || {}); x.colores.auto = Object.assign({}, x.colores.auto || {}); x.notas = x.notas || ""; x.piezas = Array.isArray(x.piezas) ? x.piezas : []; x.variantes = Object.assign({}, x.variantes || {}); x.acciones = Array.isArray(x.acciones) ? x.acciones : []; x.controles = Array.isArray(x.controles) ? x.controles : []; return x; };

  // ---- E/S
  async function cargarLista() { lista = await (await fetch("/api/personajes")).json(); pintarLista(); }
  async function abrir(id) {
    const r = await fetch(`/api/personajes/${id}`); if (!r.ok) return aviso("No se pudo abrir " + id);
    const txt = await r.text(); actual = id; j = normaliza(JSON.parse(txt)); guardadoTxt = JSON.stringify(j); historia = []; futuro = [];
    try { localStorage.setItem("ep-actual", id); } catch {}
    pintarLista(); pintarPanel(); reconstruir(); estado("Guardado", "ok");
  }
  async function guardar() {
    if (!j) return; const txt = JSON.stringify(j); if (txt === guardadoTxt) return;
    estado("Guardando…"); const r = await fetch(`/api/personajes/${actual}`, { method: "PUT", body: txt });
    if (r.ok) { guardadoTxt = txt; estado("Guardado", "ok"); const it = lista.find((x) => x.id === actual); if (it && it.nombre !== j.nombre) { it.nombre = j.nombre; pintarLista(); } else pintarLista(); }
    else estado("Error al guardar", "cambio");
  }
  // cambio: modifica j, registra en el historial (agrupando un mismo arrastre) y programa el guardado
  let ultimaClave = null, tClave = 0;
  function cambio(fn, clave) {
    const antes = JSON.stringify(j), ahora = Date.now();
    if (!(clave && clave === ultimaClave && ahora - tClave < 900)) { historia.push(antes); if (historia.length > 200) historia.shift(); futuro = []; }
    ultimaClave = clave; tClave = ahora;
    fn(j); estado("Sin guardar…", "cambio"); clearTimeout(tGuardar); tGuardar = setTimeout(guardar, 450);
    pintarPanel(); reconstruir(); botonesHistoria();
  }
  function deshacer() { if (!historia.length) return; futuro.push(JSON.stringify(j)); j = JSON.parse(historia.pop()); ultimaClave = null; trasHistoria(); }
  function rehacer() { if (!futuro.length) return; historia.push(JSON.stringify(j)); j = JSON.parse(futuro.pop()); ultimaClave = null; trasHistoria(); }
  function trasHistoria() { pintarPanel(); reconstruir(); botonesHistoria(); clearTimeout(tGuardar); tGuardar = setTimeout(guardar, 300); }
  const botonesHistoria = () => { $("#b-deshacer").disabled = !historia.length; $("#b-rehacer").disabled = !futuro.length; };

  // cambios en disco (Claude edita el JSON): si no es nuestro último guardado, se recarga y se avisa
  function escuchar() {
    const es = new EventSource("/api/eventos");
    es.onmessage = async (ev) => { const { id, tipo } = JSON.parse(ev.data); if (tipo && tipo !== "personajes") return;
      if (!lista.find((x) => x.id === id)) await cargarLista();
      if (id !== actual) { cargarLista(); return; }
      const r = await fetch(`/api/personajes/${id}`); if (!r.ok) { aviso("El archivo de " + id + " ya no existe"); return cargarLista(); }
      let nuevo; try { nuevo = normaliza(JSON.parse(await r.text())); } catch { return estado("El JSON en disco no es válido", "cambio"); }
      const txt = JSON.stringify(nuevo); if (txt === guardadoTxt || txt === JSON.stringify(j)) return;
      historia.push(JSON.stringify(j)); futuro = []; j = nuevo; guardadoTxt = txt; pintarPanel(); reconstruir(); botonesHistoria(); cargarLista();
      estado("Actualizado desde el archivo", "ok"); aviso("Cambios recibidos del archivo (puedes deshacerlos)"); };
    es.onerror = () => estado("Sin conexión con el servidor", "cambio");
  }

  // ---- reparto
  function pintarLista() {
    const ul = $("#lista"); ul.replaceChildren();
    for (const it of lista) {
      const li = h("li", { class: it.id === actual ? "activo" : "", onclick: () => it.id !== actual && abrir(it.id) });
      const mini = h("span", { class: "mini" }); mini.append(h("b"));
      const col = it.id === actual ? P.colores(j) : null;
      mini.style.background = col?.piel || "#7a6a8a"; mini.firstChild.style.background = col?.pelo || "#3a2e46";
      li.append(mini, h("span", {}, it.id === actual ? j.nombre : it.nombre)); ul.append(li);
      if (it.id !== actual) fetch(`/personajes/${it.id}.json`).then((r) => r.json()).then((x) => { const c = P.colores(normaliza(x)); mini.style.background = c.piel || "#7a6a8a"; mini.firstChild.style.background = c.pelo || "#3a2e46"; }).catch(() => {});
    }
  }
  function pedirNombre(base) {
    const f = $("#form-nuevo"), inp = $("#nombre-nuevo"); f.hidden = false; f.dataset.base = base ? "1" : ""; inp.value = base ? j.nombre + " (copia)" : ""; inp.placeholder = base ? "Nombre de la copia" : "Nombre del personaje"; inp.focus(); inp.select();
  }
  async function nuevo(base, nombre) {
    if (!nombre) return;
    let id = slug(nombre); while (lista.find((x) => x.id === id)) id = id.replace(/-\d+$/, "") + "-" + Math.floor(Math.random() * 90 + 10);
    const x = base ? JSON.parse(JSON.stringify(j)) : { opciones: { proporciones: "normal", pelo: "corto", barba: false }, colores: { piel: "#c98a5e", pelo: "#3a2a2a", ropa: "#6a7aa8", cinto: "#d8a860", auto: { piel: true, pelo: true, ropa: true, cinto: true } } };
    x.id = id; x.nombre = nombre; delete x.origen;
    await fetch(`/api/personajes/${id}`, { method: "PUT", body: JSON.stringify(x) }); await cargarLista(); await abrir(id); aviso("Creado " + nombre);
  }
  let tPapelera = 0;
  async function papelera() {
    const b = $("#b-papelera"); if (!actual) return;
    if (Date.now() - tPapelera > 3000) { tPapelera = Date.now(); b.textContent = "¿Seguro?"; b.classList.add("armado"); setTimeout(() => { b.textContent = "Papelera"; b.classList.remove("armado"); }, 3000); return; }
    tPapelera = 0; b.textContent = "Papelera"; b.classList.remove("armado"); aviso(`«${j.nombre}» movido a personajes/papelera`);
    await fetch(`/api/personajes/${actual}/papelera`, { method: "POST" }); await cargarLista(); if (lista[0]) abrir(lista[0].id);
  }

  // ---- panel
  function seg(contenedor, opciones, valor, alElegir) {
    const c = $(contenedor); c.replaceChildren();
    for (const [k, n] of Object.entries(opciones)) c.append(h("button", { class: k === valor ? "activo" : "", onclick: () => alElegir(k) }, n));
  }
  function pintarPanel() {
    if (!j) return; const o = j.opciones, tipo = TIPOS[o.proporciones] || TIPOS.normal;
    if (document.activeElement !== $("#nombre")) $("#nombre").value = j.nombre || "";
    if (document.activeElement !== $("#notas")) $("#notas").value = j.notas || "";
    $("#archivo").textContent = `personajes/${actual}.json`;
    seg("#proporciones", Object.fromEntries(Object.entries(TIPOS).map(([k, v]) => [k, v.n])), o.proporciones, (k) => cambio((x) => { x.opciones.proporciones = k; x.opciones.cuerpoX = x.opciones.cuerpoY = x.opciones.cabezaK = null; }));
    ["cuerpoX", "cuerpoY", "cabezaK"].forEach((k, i) => { const inp = $("#" + k), v = o[k] ?? tipo.m[i]; inp.value = v; inp.nextElementSibling.textContent = Math.round(v * 100) + "%"; inp.classList.toggle("tocado", o[k] != null); });
    seg("#pelo", PELOS, o.pelo, (k) => cambio((x) => { x.opciones.pelo = k; }));
    $("#barba").checked = !!o.barba; $("#pestanas").checked = o.pestanas ?? o.pelo === "largo"; $("#arrugas").checked = o.arrugas ?? !!o.barba;
    seg("#ropa", ROPAS, o.moderno ? "moderno" : o.vestido ? "vestido" : "tunica", (k) => cambio((x) => { x.opciones.moderno = k === "moderno"; x.opciones.vestido = k === "vestido"; }));
    pintarColores(); pintarPiezas(); window.EPA?.pintar();
    $("#codigo").textContent = `<script src="…/comun/personajes.js"><\/script>\n<script src="…/personajes/todos.js"><\/script>\n\nconst ${actual.replace(/-(.)/g, (_, c) => c.toUpperCase())} = Personajes.crear(grupoSVG, PERSONAJES["${actual}"]);`;
  }
  function pintarColores() {
    const cont = $("#colores"), efectivos = P.colores(j); cont.replaceChildren();
    for (const g of GRUPOS) { if (g.si && !g.si(j)) continue;
      const auto = !!j.colores.auto[g.k] && !!P.DERIVA[g.k], base = efectivos[g.k] || POR_DEFECTO[g.k];
      const inpBase = h("input", { type: "color", value: base });
      inpBase.addEventListener("input", () => cambio((x) => { x.colores[g.k] = inpBase.value; }, "color-" + g.k));
      const caja = h("label", { class: "base" }, inpBase); caja.style.background = base;
      const tonos = h("div", { class: "tonos" });
      for (const t of g.tonos) { const v = efectivos[t] || POR_DEFECTO[t] || "#888888", inp = h("input", { type: "color", value: v });
        inp.addEventListener("input", () => cambio((x) => { if (x.colores.auto[g.k]) { Object.assign(x.colores, P.DERIVA[g.k](x.colores[g.k] || base)); x.colores.auto[g.k] = false; } x.colores[t] = inp.value; }, "color-" + t));
        const sw = h("label", { class: "tono" + (auto ? "" : " fijo"), title: NOMBRE_TONO[t] || t }, inp); sw.style.background = v; tonos.append(sw); }
      const nom = h("div", { class: "nom" }, h("b", {}, g.n), tonos);
      const der = P.DERIVA[g.k] ? h("label", { class: "auto", title: "Calcular sombras y luces a partir del color base" }, (() => { const c = h("input", { type: "checkbox" }); c.checked = auto;
        c.addEventListener("change", () => cambio((x) => { x.colores.auto[g.k] = c.checked; if (!c.checked) Object.assign(x.colores, P.DERIVA[g.k](x.colores[g.k] || base)); })); return c; })(), "auto") : h("span");
      cont.append(h("div", { class: "grupo" }, caja, nom, der)); }
  }

  // ---- dibujo
  const principal = $("#principal"), tira = $("#tira"), suelo = $("#suelo");
  let m = null, vistas = [];
  const VISTAS = [0, 40, 90, 140, 180];
  function reconstruir() {
    if (!j) return; principal.replaceChildren(); tira.replaceChildren();
    m = P.crear(principal, j, { id: "ed-" + actual });
    vistas = VISTAS.map((a, i) => { const g = el("g", { transform: `translate(${160 + i * 320} 0) scale(0.95)` }, tira); el("ellipse", { cx: 0, cy: 4, rx: 120, ry: 14, fill: "#0004" }, g);
      const tx = el("text", { x: 160 + i * 320, y: 92, "text-anchor": "middle", fill: "#d6cfe8", "font-size": 54, "font-weight": 700, "font-family": "Inter, Segoe UI, sans-serif" }, tira); tx.textContent = ["Frente", "3/4", "Perfil", "3/4 atrás", "Espaldas"][i]; return { a, m: P.crear(g, j, { id: `ed-v${i}-${actual}` }) }; });
    pintarVistas(); pintarLista(); encuadrar(); window.EPA?.reconstruir();
  }
  // encuadre: mide al personaje quieto con la cámara elegida y ajusta el lienzo (deja aire arriba para saltos y brazos)
  function encuadrar() {
    if (!m) return; T.camara(CAMARAS[prueba.camara].c); m.dibujar({ torso: rad(prueba.giro), cabeza: rad(prueba.giro), brazos: rad(prueba.giro) });
    const b = principal.getBBox(), alto = b.height * 1.55, cy = b.y + b.height / 2 - b.height * 0.12;
    const lz = $("#lienzo"), r = lz.clientWidth / Math.max(1, lz.clientHeight), ancho = Math.max(alto * r, b.width * 1.6);
    lz.setAttribute("viewBox", `${f1(b.x + b.width / 2 - ancho / 2)} ${f1(cy - alto / 2)} ${f1(ancho)} ${f1(alto)}`); }
  const f1 = (x) => x.toFixed(1);
  window.addEventListener("resize", () => encuadrar());
  function caraActual(base) { if (prueba.emocion !== "neutra") return { [prueba.emocion]: 1 }; return base || {}; }
  function pintarVistas() { T.camara({ tilt: 0.16 });
    for (const v of vistas) v.m.dibujar({ torso: rad(v.a), cabeza: rad(v.a), ojos: rad(v.a), brazos: rad(v.a), cara: caraActual(), parpadeo: 1, variantes: prueba.variantes }); }
  function pintarSuelo() { const c = CAMARAS[prueba.camara].c; T.camara(c); suelo.replaceChildren();
    for (let i = -6; i <= 6; i++) { const a = T.PR([i * 120, 0, -700]), b = T.PR([i * 120, 0, 500]); el("line", { x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: "#ffffff", "stroke-opacity": 0.06, "stroke-width": 2 }, suelo); }
    for (let k = -6; k <= 4; k++) { const a = T.PR([-720, 0, k * 120]), b = T.PR([720, 0, k * 120]); el("line", { x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: "#ffffff", "stroke-opacity": 0.06, "stroke-width": 2 }, suelo); } }
  let t0 = performance.now(), giroAnim = prueba.giro;
  function bucle(ahora) {
    const t = (ahora - t0) / 1000;
    if (m && window.EPA && EPA.activo()) { if (prueba.girar) { giroAnim = ((giroAnim + 0.6 + 180) % 360) - 180; $("#giro").value = Math.round(giroAnim); $("#giro-v").textContent = Math.round(giroAnim) + "°"; } else giroAnim = prueba.giro;
      T.camara(CAMARAS[prueba.camara].c); EPA.dibujar(t, giroAnim, m); }
    else if (m) {
      if (prueba.girar) { giroAnim = ((giroAnim + 0.6 + 180) % 360) - 180; $("#giro").value = Math.round(giroAnim); $("#giro-v").textContent = Math.round(giroAnim) + "°"; } else giroAnim = prueba.giro;
      const A = ACCIONES[prueba.accion], a = rad(giroAnim), e = A.f(t);
      T.camara(CAMARAS[prueba.camara].c);
      m.dibujar(Object.assign({ torso: a, cabeza: a + 0.12 * S(t * 0.7), ojos: a + 0.15 * S(t * 0.7), brazos: a, cara: caraActual(A.cara), parpadeo: Math.max(0.1, Math.min(1, Math.abs((t % 3.4) - 3.3) / 0.08)), variantes: prueba.variantes }, e));
    }
    requestAnimationFrame(bucle);
  }

  // ---- prueba (acción, emoción, giro, cámara)
  function pintarPrueba() {
    seg("#acciones", Object.fromEntries(Object.entries(ACCIONES).map(([k, v]) => [k, v.n])), prueba.accion, (k) => { prueba.accion = k; guardaPrueba(); pintarPrueba(); });
    seg("#emociones", EMOS, prueba.emocion, (k) => { prueba.emocion = k; guardaPrueba(); pintarPrueba(); pintarVistas(); });
    seg("#camaras", Object.fromEntries(Object.entries(CAMARAS).map(([k, v]) => [k, v.n])), prueba.camara, (k) => { prueba.camara = k; guardaPrueba(); pintarPrueba(); pintarSuelo(); encuadrar(); });
    $("#giro").value = prueba.giro; $("#giro-v").textContent = prueba.giro + "°"; $("#b-girar").classList.toggle("activo", prueba.girar);
  }

  // ---- eventos de la interfaz
  $("#nombre").addEventListener("input", (ev) => cambio((x) => { x.nombre = ev.target.value; }, "nombre"));
  $("#notas").addEventListener("input", (ev) => cambio((x) => { x.notas = ev.target.value; }, "notas"));
  ["cuerpoX", "cuerpoY", "cabezaK"].forEach((k) => $("#" + k).addEventListener("input", (ev) => cambio((x) => { x.opciones[k] = Number(ev.target.value); }, k)));
  $("#b-cuerpo-tipo").addEventListener("click", () => cambio((x) => { x.opciones.cuerpoX = x.opciones.cuerpoY = x.opciones.cabezaK = null; }));
  $("#barba").addEventListener("change", (ev) => cambio((x) => { x.opciones.barba = ev.target.checked; }));
  $("#pestanas").addEventListener("change", (ev) => cambio((x) => { x.opciones.pestanas = ev.target.checked; }));
  $("#arrugas").addEventListener("change", (ev) => cambio((x) => { x.opciones.arrugas = ev.target.checked; }));
  $("#giro").addEventListener("input", (ev) => { prueba.giro = Number(ev.target.value); prueba.girar = false; $("#giro-v").textContent = prueba.giro + "°"; $("#b-girar").classList.remove("activo"); guardaPrueba(); });
  $("#b-girar").addEventListener("click", () => { prueba.girar = !prueba.girar; giroAnim = prueba.giro; guardaPrueba(); pintarPrueba(); });
  $("#b-deshacer").addEventListener("click", deshacer); $("#b-rehacer").addEventListener("click", rehacer);
  // paquete de personaje: el JSON entero (piezas, acciones, controles, emociones, poses) más las acciones comunes que sus acciones no traen
  $("#b-exportar-pj").addEventListener("click", () => { if (!j) return; const paq = { formato: "fe-en-beta/personaje", version: 1, exportado: new Date().toISOString(), personaje: JSON.parse(JSON.stringify(j)) };
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(paq, null, 1)], { type: "application/json" })); a.download = `personaje-${actual}.json`; a.click(); aviso("Paquete descargado: personaje-" + actual + ".json"); });
  $("#b-importar-pj").addEventListener("click", () => $("#archivo-pj").click());
  $("#archivo-pj").addEventListener("change", async (ev) => { const f = ev.target.files[0]; ev.target.value = ""; if (!f) return;
    try { const d = JSON.parse(await f.text()), pj = d.personaje || d; if (!pj || typeof pj !== "object" || !pj.opciones && !pj.colores && !pj.piezas) throw new Error("no parece un personaje");
      let id = slug(pj.nombre || pj.id || "personaje"), n = 2; const base = id; while (lista.some((x) => x.id === id)) id = `${base}-${n++}`;
      pj.id = id; const r = await fetch(`/api/personajes/${id}`, { method: "PUT", body: JSON.stringify(pj) }); if (!r.ok) throw new Error(await r.text());
      await cargarLista(); await abrir(id); aviso(`Importado «${pj.nombre || id}» como ${id}`); } catch (e) { aviso("No se pudo importar: " + (e.message || e)); } });
  $("#b-nuevo").addEventListener("click", () => pedirNombre(false)); $("#b-duplicar").addEventListener("click", () => pedirNombre(true));
  $("#form-nuevo").addEventListener("submit", (ev) => { ev.preventDefault(); const f = ev.target, n = $("#nombre-nuevo").value.trim(); f.hidden = true; nuevo(!!f.dataset.base, n); });
  $("#b-cancelar-nuevo").addEventListener("click", () => { $("#form-nuevo").hidden = true; }); $("#b-papelera").addEventListener("click", papelera);
  $("#b-copiar").addEventListener("click", async () => { try { await navigator.clipboard.writeText($("#codigo").textContent); aviso("Copiado"); } catch { aviso("No se pudo copiar"); } });
  document.addEventListener("keydown", (ev) => { if (document.body.classList.contains("con-taller")) return; if (!(ev.ctrlKey || ev.metaKey) || ["INPUT", "TEXTAREA"].includes(document.activeElement.tagName) && document.activeElement.type === "text") return;
    if (ev.key.toLowerCase() === "z" && !ev.shiftKey) { ev.preventDefault(); deshacer(); } else if (ev.key.toLowerCase() === "y" || (ev.key.toLowerCase() === "z" && ev.shiftKey)) { ev.preventDefault(); rehacer(); } });
  window.addEventListener("beforeunload", () => { if (j && JSON.stringify(j) !== guardadoTxt) navigator.sendBeacon && fetch(`/api/personajes/${actual}`, { method: "PUT", body: JSON.stringify(j), keepalive: true }); });

  // =====================================================================================================
  // ---- PIEZAS PROPIAS (fase 2): SVG atados a huesos, variantes, arrastrar en el escenario
  const OCULTABLES = ["melena", "cinto", "pelo", "barba", "ojos", "cejas", "boca", "nariz", "orejas", "cabeza", "torso", "brazoIzq", "brazoDer", "manoIzq", "manoDer", "piernaIzq", "piernaDer"];
  const HUESOS = { cabeza: "Cabeza", pecho: "Pecho", cintura: "Cintura", brazoIzq: "Brazo izq.", brazoDer: "Brazo der.", antebrazoIzq: "Antebrazo izq.", antebrazoDer: "Antebrazo der.", manoIzq: "Mano izq.", manoDer: "Mano der.", musloIzq: "Muslo izq.", musloDer: "Muslo der.", piernaIzq: "Pierna izq.", piernaDer: "Pierna der.", pieIzq: "Pie izq.", pieDer: "Pie der." };
  const CAPAS = { delante: "Delante", detras: "Detrás" }, VISTAS_PZ = { siempre: "Siempre", frente: "De frente", espaldas: "De espaldas" }, MODOS = { silueta: "Fija (sombrero)", superficie: "Gira con la cara" };
  let sel = null;   // id de la pieza elegida
  prueba.variantes = prueba.variantes || {};
  const pieza = () => j && j.piezas.find((x) => x.id === sel);
  const nuevoIdPieza = (base) => { let id = slug(base || "pieza"), n = 2; while (j.piezas.some((x) => x.id === id)) id = slug(base) + "-" + n++; return id; };
  const estiloSel = document.createElement("style"); document.head.appendChild(estiloSel);
  function marcarSel() { estiloSel.textContent = sel ? `#principal [data-pieza="${CSS.escape(sel)}"] { filter: drop-shadow(0 0 3px #f0a33a) drop-shadow(0 0 1px #f0a33a); }` : ""; }
  function anadirPieza(spec) {
    const id = nuevoIdPieza(spec.nombre); const pz = Object.assign({ hueso: "cabeza", modo: "silueta", capa: "delante", vista: "siempre", x: 0, y: 0, escala: 1, rot: 0, grupo: "", activo: true }, JSON.parse(JSON.stringify(spec)), { id });
    sel = id; prueba.variantes = {};
    cambio((x) => { x.piezas.push(pz); if (pz.grupo) x.variantes[pz.grupo] = id; }); marcarSel(); aviso("Añadida: " + pz.nombre);
  }
  // SVG importado: se limpia (sin scripts ni enlaces) y se centra en el origen con un tamaño de ~cabeza (140 u)
  function limpiarSVG(txt) {
    const doc = new DOMParser().parseFromString(txt, "image/svg+xml"), svg = doc.querySelector("svg"); if (!svg || doc.querySelector("parsererror")) throw new Error("no es un SVG válido");
    svg.querySelectorAll("script, foreignObject, iframe").forEach((n) => n.remove());
    svg.querySelectorAll("*").forEach((n) => [...n.attributes].forEach((a) => { if (/^on/i.test(a.name) || /javascript:/i.test(a.value) || (/href$/i.test(a.name) && /^https?:/i.test(a.value))) n.removeAttribute(a.name); }));
    let vb = (svg.getAttribute("viewBox") || "").trim().split(/[\s,]+/).map(Number);
    if (vb.length !== 4 || vb.some(isNaN)) vb = [0, 0, parseFloat(svg.getAttribute("width")) || 100, parseFloat(svg.getAttribute("height")) || 100];
    const k = 140 / Math.max(vb[2], vb[3]), cx = vb[0] + vb[2] / 2, cy = vb[1] + vb[3] / 2;
    return `<g transform="scale(${k.toFixed(4)}) translate(${(-cx).toFixed(2)} ${(-cy).toFixed(2)})">${svg.innerHTML}</g>`;
  }
  $("#b-importar").addEventListener("click", () => $("#archivo-svg").click());
  $("#archivo-svg").addEventListener("change", async (ev) => {
    for (const f of ev.target.files) { try { const svg = limpiarSVG(await f.text()); anadirPieza({ nombre: f.name.replace(/\.svg$/i, ""), svg }); } catch (e) { aviso(`${f.name}: ${e.message}`); } }
    ev.target.value = ""; });
  $("#b-biblio").addEventListener("click", () => { const b = $("#biblio"); b.hidden = !b.hidden; $("#b-biblio").classList.toggle("activo", !b.hidden); });
  // biblioteca: los ejemplos que trae el editor y la biblioteca común (shorts-flow/piezas, lo que se comparte desde cualquier personaje)
  async function pintarBiblio() { let comunes = []; try { const l = await (await fetch("/api/piezas")).json(); comunes = await Promise.all(l.map(async (x) => { try { return await (await fetch("/api/piezas/" + x.id)).json(); } catch { return null; } })); } catch {}
    $("#biblio").replaceChildren(...(window.BIBLIOTECA || []).map((spec) => h("button", { onclick: () => anadirPieza(spec), title: HUESOS[spec.hueso] }, spec.nombre)),
      ...comunes.filter(Boolean).map((spec) => h("button", { class: "comun", onclick: () => { const c = JSON.parse(JSON.stringify(spec)); delete c.origen; anadirPieza(c); }, title: "Biblioteca común · " + (HUESOS[spec.hueso] || spec.hueso) }, "★ " + spec.nombre))); }
  pintarBiblio();
  $("#pz-compartir").addEventListener("click", async () => { const pz = j?.piezas.find((x) => x.id === sel); if (!pz) return; const id = slug(pz.nombre || pz.id);
    const c = JSON.parse(JSON.stringify(pz)); delete c.id; c.origen = actual;
    const r = await fetch("/api/piezas/" + id, { method: "PUT", body: JSON.stringify(c) }); if (r.ok) { aviso(`«${pz.nombre}» está en la biblioteca común (★ en «Biblioteca»)`); pintarBiblio(); } else aviso("No se pudo compartir"); });

  function pintarPiezas() {
    if (!j) return; const ul = $("#piezas"); ul.replaceChildren();
    if (!j.piezas.length) ul.append(h("li", { class: "vacio" }, "Aún no tiene piezas. Importa un SVG o prueba la biblioteca."));
    if (sel && !pieza()) sel = null;
    // piezas con el mismo nombre (copias): se numeran para distinguirlas («Rodillera 2») y se avisa de que son copias
    const nNom = {}, iNom = {}; for (const q of j.piezas) nNom[q.nombre || q.id] = (nNom[q.nombre || q.id] || 0) + 1;
    const etiqueta = (q) => { const n = q.nombre || q.id; if (nNom[n] < 2) return n; iNom[n] = (iNom[n] || 0) + 1; return `${n} ${iNom[n]}`; };
    const etq = new Map(j.piezas.map((q) => [q, etiqueta(q)]));
    [...j.piezas].reverse().forEach((pz) => {   // la de más arriba en la lista es la que se dibuja encima
      const vis = pz.grupo ? (prueba.variantes[pz.grupo] ?? j.variantes[pz.grupo]) === pz.id : pz.activo !== false;
      const ojo = h("button", { class: "ojo" + (vis ? "" : " apagado"), title: pz.grupo ? "Elegir esta variante" : "Mostrar u ocultar", onclick: (ev) => { ev.stopPropagation();
        delete prueba.variantes[pz.grupo];
        cambio((x) => { const q = x.piezas.find((y) => y.id === pz.id); if (q.grupo) x.variantes[q.grupo] = x.variantes[q.grupo] === q.id ? "" : q.id; else q.activo = !vis; }); } }, vis ? "●" : "○");
      ul.append(h("li", { class: pz.id === sel ? "activo" : "", onclick: () => { sel = pz.id === sel ? null : pz.id; pintarPiezas(); marcarSel(); } },
        ojo, h("span", nNom[pz.nombre || pz.id] > 1 ? { title: "Hay varias piezas con este nombre (copias): renómbralas o borra las que sobren" } : {}, etq.get(pz)), pz.grupo ? h("span", { class: "grupo-et" }, pz.grupo) : h("span"), h("span", { class: "hueso" }, HUESOS[pz.hueso] || pz.hueso)));
    });
    const pz = pieza(), d = $("#detalle-pieza"); d.hidden = !pz;
    if (pz) {
      if (document.activeElement !== $("#pz-nombre")) $("#pz-nombre").value = pz.nombre || "";
      if (document.activeElement !== $("#pz-grupo")) $("#pz-grupo").value = pz.grupo || "";
      const set = (k) => (v) => cambioPz((q) => { q[k] = v; });
      seg("#pz-hueso", HUESOS, pz.hueso, set("hueso")); seg("#pz-capa", CAPAS, pz.capa || "delante", set("capa")); seg("#pz-vista", VISTAS_PZ, pz.vista || "siempre", set("vista"));
      $("#campo-modo").hidden = pz.hueso !== "cabeza"; seg("#pz-modo", MODOS, pz.modo || "silueta", set("modo"));
      const prof0 = { cabeza: pz.modo === "superficie" ? 58 : 0, pecho: 47, cintura: 52 }[pz.hueso] ?? 0;
      [["x", 0, (v) => Math.round(v)], ["y", 0, (v) => Math.round(v)], ["escala", 1, (v) => Math.round(v * 100) + "%"], ["rot", 0, (v) => Math.round(v) + "°"], ["prof", prof0, (v) => Math.round(v)]]
        .forEach(([k, def, fmt]) => { const inp = $("#pz-" + k), v = pz[k] ?? def; inp.value = v; inp.nextElementSibling.textContent = fmt(v); });
      for (const v of ["perfil", "espaldas"]) { const tiene = !!pz["svg" + v[0].toUpperCase() + v.slice(1)]; $("#pz-tiene-" + v).textContent = tiene ? "sí" : "no"; $("#pz-quita-" + v).disabled = !tiene; }
      const F = pz.fisica && pz.fisica.activa !== false ? pz.fisica : null; $("#pz-fis").checked = !!F; $("#pz-fis-det").hidden = !F;
      if (F) [["rig", F.rigidez ?? 0.4, (v) => Math.round(v * 100) + "%"], ["amo", F.amortiguacion ?? 0.35, (v) => Math.round(v * 100) + "%"], ["peso", F.peso ?? 1, (v) => v.toFixed(2)], ["px", (F.pivote || [0, 0])[0], (v) => Math.round(v)], ["py", (F.pivote || [0, 0])[1], (v) => Math.round(v)]]
        .forEach(([k, v, fmt]) => { const inp = $("#pz-fis-" + k); if (document.activeElement !== inp) inp.value = v; inp.nextElementSibling.textContent = fmt(v); });
      OCULTABLES.forEach((k) => { $("#pz-oc-" + k).checked = (pz.oculta || []).includes(k); });
      $("#pz-dob-campo").hidden = !/^(brazo|muslo)/.test(pz.hueso); $("#pz-dob").checked = !!pz.doblar; $("#pz-dob-det").hidden = !pz.doblar;
      { const zi = $("#pz-dob-zona"), zv = pz.doblarZona ?? 18; if (document.activeElement !== zi) zi.value = zv; zi.nextElementSibling.textContent = Math.round(zv); }
      const Cd = pz.cadena && pz.cadena.activa !== false ? pz.cadena : null; $("#pz-cad").checked = !!Cd; $("#pz-cad-det").hidden = !Cd;
      if (Cd) { for (const [k, v, fmt] of CADENA_UI(Cd)) { const inp = $("#pz-cad-" + k); if (document.activeElement !== inp) inp.value = v; inp.nextElementSibling.textContent = fmt(v); } $("#pz-cad-color").value = Cd.color || "{pelo}"; }
      $("#pz-prof").parentElement.hidden = !/^(pecho|cintura)$/.test(pz.hueso) && !(pz.hueso === "cabeza" && pz.modo === "superficie");
    }
    pintarVariantes();
  }
  function cambioPz(fn, clave) { cambio((x) => { const q = x.piezas.find((y) => y.id === sel); if (q) fn(q, x); }, clave); }
  ["x", "y", "escala", "rot", "prof"].forEach((k) => $("#pz-" + k).addEventListener("input", (ev) => cambioPz((q) => { q[k] = Number(ev.target.value); }, "pz-" + k + sel)));
  OCULTABLES.forEach((k) => $("#pz-oc-" + k).addEventListener("change", (ev) => cambioPz((q) => { const o = new Set(q.oculta || []); ev.target.checked ? o.add(k) : o.delete(k); q.oculta = [...o]; })));
  let vistaImp = null;
  for (const v of ["perfil", "espaldas"]) { const campo = "svg" + v[0].toUpperCase() + v.slice(1);
    $("#pz-imp-" + v).addEventListener("click", () => { vistaImp = campo; $("#archivo-vista").click(); });
    $("#pz-quita-" + v).addEventListener("click", () => cambioPz((q) => { delete q[campo]; })); }
  $("#archivo-vista").addEventListener("change", async (ev) => { const f = ev.target.files[0]; ev.target.value = ""; if (!f || !vistaImp) return;
    try { const svg = limpiarSVG(await f.text()), campo = vistaImp; cambioPz((q) => { q[campo] = svg; }); aviso("Dibujo de " + (campo === "svgPerfil" ? "perfil" : "espaldas") + " importado"); } catch (e) { aviso(`${f.name}: ${e.message}`); } });
  const CADENA_UI = (C) => [["seg", C.segmentos ?? 6, (v) => Math.round(v)], ["largo", C.largo ?? 160, (v) => Math.round(v)], ["gro", C.grosor ?? 18, (v) => Math.round(v)], ["fin", C.fin ?? 4, (v) => Math.round(v)],
    ["rig", C.rigidez ?? 0.25, (v) => Math.round(v * 100) + "%"], ["amo", C.amortiguacion ?? 0.3, (v) => Math.round(v * 100) + "%"], ["ang", C.angulo ?? 0, (v) => Math.round(v) + "°"], ["ax", (C.ancla || [0, 0])[0], (v) => Math.round(v)], ["ay", (C.ancla || [0, 0])[1], (v) => Math.round(v)]];
  $("#pz-dob").addEventListener("change", (ev) => cambioPz((q) => { if (ev.target.checked) q.doblar = true; else delete q.doblar; }));
  $("#pz-dob-zona").addEventListener("input", (ev) => cambioPz((q) => { q.doblarZona = +ev.target.value; }, "dobz" + sel));
  $("#pz-cad").addEventListener("change", (ev) => cambioPz((q) => { if (ev.target.checked) q.cadena = Object.assign({ segmentos: 6, largo: 160, grosor: 18, fin: 4, rigidez: 0.25, amortiguacion: 0.3, color: "{pelo}" }, q.cadena || {}, { activa: true }); else if (q.cadena) q.cadena.activa = false; }));
  for (const [k, campo] of [["seg", "segmentos"], ["largo", "largo"], ["gro", "grosor"], ["fin", "fin"], ["rig", "rigidez"], ["amo", "amortiguacion"], ["ang", "angulo"], ["ax", 0], ["ay", 1]])
    $("#pz-cad-" + k).addEventListener("input", (ev) => cambioPz((q) => { q.cadena = q.cadena || { activa: true }; const v = Number(ev.target.value); if (typeof campo === "number") { q.cadena.ancla = [...(q.cadena.ancla || [0, 0])]; q.cadena.ancla[campo] = v; } else q.cadena[campo] = v; }, "cad-" + k + sel));
  $("#pz-cad-color").addEventListener("change", (ev) => cambioPz((q) => { if (q.cadena) q.cadena.color = ev.target.value; }));
  $("#pz-fis").addEventListener("change", (ev) => cambioPz((q) => { if (ev.target.checked) q.fisica = Object.assign({ rigidez: 0.4, amortiguacion: 0.35, peso: 1, pivote: [0, 0] }, q.fisica || {}, { activa: true }); else if (q.fisica) q.fisica.activa = false; }));
  for (const [k, campo] of [["rig", "rigidez"], ["amo", "amortiguacion"], ["peso", "peso"], ["px", 0], ["py", 1]])
    $("#pz-fis-" + k).addEventListener("input", (ev) => cambioPz((q) => { q.fisica = q.fisica || { activa: true }; const v = Number(ev.target.value); if (typeof campo === "number") { q.fisica.pivote = [...(q.fisica.pivote || [0, 0])]; q.fisica.pivote[campo] = v; } else q.fisica[campo] = v; }, "fis-" + k + sel));
  $("#pz-nombre").addEventListener("input", (ev) => cambioPz((q) => { q.nombre = ev.target.value; }, "pz-nombre" + sel));
  const slugGrupo = (t) => t.trim().toLowerCase().slice(0, 30);
  $("#pz-grupo").addEventListener("change", (ev) => cambioPz((q, x) => { const g = slugGrupo(ev.target.value); q.grupo = g; if (g && !x.variantes[g]) x.variantes[g] = q.id; }));
  $("#pz-quitar").addEventListener("click", () => { const pz = pieza(); if (!pz) return; sel = null; cambio((x) => { x.piezas = x.piezas.filter((y) => y.id !== pz.id); }); marcarSel(); aviso(`Quitada «${pz.nombre}» (Ctrl+Z la recupera)`); });
  $("#pz-duplicar").addEventListener("click", () => { const pz = pieza(); if (pz) anadirPieza(Object.assign({}, pz, { nombre: pz.nombre + " 2", x: (pz.x || 0) + 20 })); });
  const mover = (d) => { const pz = pieza(); if (!pz) return; cambio((x) => { const i = x.piezas.findIndex((y) => y.id === pz.id), k = i + d; if (k < 0 || k >= x.piezas.length) return; [x.piezas[i], x.piezas[k]] = [x.piezas[k], x.piezas[i]]; }); };
  $("#pz-arriba").addEventListener("click", () => mover(1)); $("#pz-abajo").addEventListener("click", () => mover(-1));

  // ---- taller de dibujo: dibujar una pieza nueva o editar los vectores de una existente (también las importadas o de la biblioteca)
  const VISTAS_DIB = { frente: "De frente", perfil: "De perfil (mirando a la derecha)", espaldas: "De espaldas" };
  const CAMPO = { frente: ["svg", "dibujo"], perfil: ["svgPerfil", "dibujoPerfil"], espaldas: ["svgEspaldas", "dibujoEspaldas"] };
  function referencia(hueso) { return (g, vista) => {
    const NSs = "http://www.w3.org/2000/svg", gg = document.createElementNS(NSs, "g"); gg.setAttribute("opacity", "0.4"); g.append(gg);
    if (/^(cabeza|pecho|cintura)$/.test(hueso)) {
      const m2 = P.crear(gg, j, { id: "ref-taller", piezas: [] }), a = rad({ frente: 0, perfil: 90, espaldas: 180 }[vista] || 0); T.camara({ tilt: 0.16 });
      m2.dibujar({ torso: a, cabeza: a, ojos: a, brazos: a }); const q = m2.puntos[hueso], kh = hueso === "cabeza" ? (j.opciones.cabezaK ?? (TIPOS[j.opciones.proporciones] || TIPOS.normal).m[2]) : 1;
      gg.setAttribute("transform", `scale(${1 / kh}) translate(${-q[0]} ${-q[1]})`); return; }
    // manos, brazos y pies: un esquema del hueso (x positivo a lo largo del hueso)
    const piel = P.colores(j).piel || "#c98a5e", forma = /^mano/.test(hueso) ? `<rect x="-6" y="-12" width="30" height="26" rx="12" fill="${piel}"/><rect x="18" y="-11" width="18" height="8" rx="4" fill="${piel}"/><rect x="18" y="-2" width="20" height="8" rx="4" fill="${piel}"/><rect x="18" y="7" width="16" height="7" rx="3.5" fill="${piel}"/><rect x="4" y="-22" width="8" height="16" rx="4" fill="${piel}"/>`
      : /^pie/.test(hueso) ? `<rect x="-20" y="-60" width="40" height="70" rx="12" fill="${piel}"/><ellipse cx="0" cy="10" rx="18" ry="10" fill="#5a3424"/>`
      : `<rect x="0" y="-14" width="${/^ante/.test(hueso) ? 75 : 90}" height="28" rx="14" fill="${piel}"/>`;
    gg.innerHTML = forma; }; }
  function abrirTaller(pz) {
    const hueso = pz ? pz.hueso : "cabeza", dibujos = {}, svgs = {};
    if (pz) for (const [v, [cs, cd]] of Object.entries(CAMPO)) { if (pz[cd]) dibujos[v] = pz[cd]; else if (pz[cs]) svgs[v] = pz[cs]; }
    Taller.abrir({ nombre: pz ? pz.nombre || "" : "Dibujo " + (j.piezas.length + 1), titulo: pz ? `Editar · ${HUESOS[hueso]}` : "Dibujar pieza nueva · Cabeza (cambia el hueso después en la pieza)", vistas: /^(mano|brazo|antebrazo)/.test(hueso) ? null : VISTAS_DIB, vista: "frente",
      dibujos, svgs, colores: P.colores(j), referencia: referencia(hueso),
      alGuardar: (out, info = {}) => { if (info.nombre) campos0.nombre = info.nombre;
        const campos = Object.assign({}, campos0); for (const [v, o] of Object.entries(out)) { const [cs, cd] = CAMPO[v]; if (o.dibujo.formas.length) { campos[cs] = o.svg; campos[cd] = o.dibujo; } else if (v !== "frente") { campos[cs] = undefined; campos[cd] = undefined; } }
        if (!campos.svg && !pz) return aviso("La pieza está vacía: no se guarda");
        if (pz) { cambio((x) => { const q = x.piezas.find((y) => y.id === pz.id); for (const k in campos) { if (campos[k] === undefined) delete q[k]; else q[k] = campos[k]; } }); aviso("Dibujo guardado"); }
        else anadirPieza(Object.assign({ nombre: "Dibujo " + (j.piezas.length + 1), hueso: "cabeza", modo: "silueta", capa: "delante", vista: "siempre" }, campos)); } });
    var campos0 = {};
  }
  $("#b-dibujar").addEventListener("click", () => abrirTaller(null));
  // REDIBUJAR UNA PARTE DEL MUÑECO: crea una pieza en el hueso de esa parte que oculta la original y abre el taller para dibujarla
  const PARTES = { cabeza: ["Cabeza entera", "cabeza"], pelo: ["Pelo", "cabeza"], melena: ["Melena", "cabeza"], barba: ["Barba", "cabeza"], ojos: ["Ojos", "cabeza"], cejas: ["Cejas", "cabeza"],
    nariz: ["Nariz", "cabeza"], boca: ["Boca", "cabeza"], orejas: ["Orejas", "cabeza"], torso: ["Torso y túnica", "pecho"], cinto: ["Cinturón", "cintura"],
    brazoIzq: ["Brazo izq. (entero, se dobla en el codo)", "brazoIzq"], brazoDer: ["Brazo der. (entero, se dobla en el codo)", "brazoDer"], manoIzq: ["Mano izq.", "manoIzq"], manoDer: ["Mano der.", "manoDer"],
    piernaIzq: ["Pierna izq. (entera, se dobla en la rodilla)", "musloIzq"], piernaDer: ["Pierna der. (entera, se dobla en la rodilla)", "musloDer"] };
  $("#b-parte").replaceChildren(...Object.entries(PARTES).map(([k, [n]]) => h("option", { value: k }, n)));
  $("#b-redibujar").addEventListener("click", () => { const k = $("#b-parte").value, [n, hueso] = PARTES[k] || []; if (!hueso || !j) return;
    anadirPieza({ nombre: "Mi " + n.split(" (")[0].toLowerCase(), hueso, oculta: [k], doblar: /^(brazo|pierna)/.test(k) || undefined, modo: "silueta", capa: k === "torso" || /^pierna/.test(k) ? "detras" : "delante" });
    const pz = pieza(); if (pz) abrirTaller(pz); });
  $("#pz-editar").addEventListener("click", () => { const pz = pieza(); if (pz) abrirTaller(pz); });

  function pintarVariantes() {
    const grupos = {}; for (const pz of j?.piezas || []) if (pz.grupo) (grupos[pz.grupo] = grupos[pz.grupo] || []).push(pz);
    const fila = $("#fila-variantes"), c = $("#variantes"); fila.hidden = !Object.keys(grupos).length; c.replaceChildren();
    for (const [g, lista] of Object.entries(grupos)) {
      const actual = prueba.variantes[g] ?? j.variantes[g] ?? "";
      c.append(h("span", { class: "grupo-var" }, g));
      for (const op of [{ id: "", nombre: "ninguna" }, ...lista]) c.append(h("button", { class: op.id === actual ? "activo" : "", onclick: () => { prueba.variantes[g] = op.id; pintarPiezas(); pintarVistas(); } }, op.nombre));
    }
  }

  // arrastrar una pieza en el escenario (se mueve en las coordenadas de su hueso)
  const lienzo = $("#lienzo"); let arrastre = null;
  lienzo.addEventListener("pointerdown", (ev) => {
    if (window.EPA?.activo()) return;   // pestaña Animación: arrastrar posa al personaje, no mueve accesorios
    const g = ev.target.closest && ev.target.closest("#principal [data-pieza]"); if (!g) return;
    const id = g.getAttribute("data-pieza"); if (sel !== id) { sel = id; pintarPiezas(); marcarSel(); }
    const pz = pieza(); if (!pz) return; ev.preventDefault(); try { lienzo.setPointerCapture(ev.pointerId); } catch {} lienzo.classList.add("arrastrando");
    arrastre = { id, x0: pz.x || 0, y0: pz.y || 0, p0: aLocal(g, ev) };
  });
  lienzo.addEventListener("pointermove", (ev) => { if (!arrastre) return; const g = lienzo.querySelector(`#principal [data-pieza="${CSS.escape(arrastre.id)}"]`); if (!g) return;
    const p = aLocal(g, ev), a = arrastre; cambioPz((q) => { q.x = Math.round(a.x0 + p[0] - a.p0[0]); q.y = Math.round(a.y0 + p[1] - a.p0[1]); }, "arrastre" + a.id); });
  const soltar = () => { if (!arrastre) return; arrastre = null; lienzo.classList.remove("arrastrando"); };
  lienzo.addEventListener("pointerup", soltar); lienzo.addEventListener("pointercancel", soltar);
  function aLocal(g, ev) { const m = g.getScreenCTM(); if (!m) return [0, 0]; const pt = lienzo.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY; const q = pt.matrixTransform(m.inverse()); return [q.x, q.y]; }

  // ---- exportar PNG (escenario o la hoja de giro) en alta resolución, sin servidor: SVG → imagen → lienzo
  async function exportarPNG(svg, nombre, ancho) {
    const r = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal, k = ancho / (vb.width || r.width), alto = Math.round((vb.height || r.height) * k);
    const copia = svg.cloneNode(true); copia.setAttribute("width", ancho); copia.setAttribute("height", alto); copia.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(copia)], { type: "image/svg+xml" }));
    const img = new Image(); await new Promise((ok, mal) => { img.onload = ok; img.onerror = mal; img.src = url; });
    const c = document.createElement("canvas"); c.width = ancho; c.height = alto; const g = c.getContext("2d"); g.fillStyle = "#1b1830"; g.fillRect(0, 0, ancho, alto); g.drawImage(img, 0, 0, ancho, alto); URL.revokeObjectURL(url);
    c.toBlob((b) => { const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = nombre; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); aviso("Descargado " + nombre); }, "image/png"); }
  $("#b-png-escenario").addEventListener("click", () => exportarPNG($("#lienzo"), `${actual}.png`, 1600));
  $("#b-png-giro").addEventListener("click", () => exportarPNG($("#tira"), `${actual}-giro.png`, 2400));

  // API para editor-anim.js (fase 3: posar, controles, línea de tiempo)
  window.EP = { get j() { return j; }, get actual() { return actual; }, get m() { return m; }, cambio, h, el, seg, aviso, prueba, guardaPrueba, P, T, rad, slug, encuadrar, CAMARAS };

  // ---- arranque
  (async () => {
    pintarPrueba(); botonesHistoria(); await cargarLista(); escuchar();
    let ini = null; try { ini = localStorage.getItem("ep-actual"); } catch {}
    const id = lista.find((x) => x.id === ini) ? ini : lista[0]?.id; if (id) await abrir(id);
    pintarSuelo(); requestAnimationFrame(bucle);
  })();
  window.CTX_HISTORIAL = () => ({ tipo: "personajes", id: actual, nombre: j?.nombre });
})();
