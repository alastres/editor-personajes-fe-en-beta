// Fase 3 del editor: POSAR (deslizadores del cuerpo), CONTROLES (smart bones) y LÍNEA DE TIEMPO (acciones por claves, papel cebolla).
// Todo se guarda en el JSON del personaje: acciones[] y controles[] (formato en comun/personajes.js).
(() => {
  const E = window.EP, P = E.P, $ = (s) => document.querySelector(s), h = E.h;
  const MANOS_N = { relajada: "Suelta", abierta: "Abierta", puno: "Puño", senala: "Señala", agarra: "Agarra", pulgar: "Pulgar", plana: "Plana" };
  const PALMAS_N = { auto: "Auto", adelante: "Adelante", arriba: "Arriba", cuerpo: "Al cuerpo" };
  const EMOS_N = { neutra: "Neutra", alegre: "Alegre", risa: "Risa", triste: "Triste", enfado: "Enfado", sorpresa: "Sorpresa", miedo: "Miedo", pensativo: "Pensativo", verguenza: "Vergüenza" };
  const LOCO = { quieto: { n: "Quieto", v: { amp: 0 } }, andar: { n: "Andando", v: { amp: 1, correr: 0 } }, correr: { n: "Corriendo", v: { amp: 1, correr: 1 } } };
  // deslizadores de Posar: [clave, etiqueta, min, max, paso, formato]
  const gr = (g) => (v) => Math.round(v) + "°", pc = (v) => Math.round(v * 100) + "%", n2 = (v) => v.toFixed(2);
  const CUERPO = [["torso", "Girar el torso", -90, 90, 1, gr()], ["cabeza", "Girar la cabeza", -60, 60, 1, gr()], ["miraY", "Mirar abajo / arriba", -1, 1, 0.01, n2],
    ["inclina", "Inclinarse", -0.3, 0.5, 0.01, n2], ["ladeo", "Ladear la cabeza", -20, 20, 0.5, gr()], ["hombros", "Encoger hombros", -10, 20, 0.5, (v) => Math.round(v)],
    ["agacha", "Agacharse (sentarse, arrodillarse)", 0, 1.6, 0.01, pc], ["altura", "Despegar del suelo", 0, 260, 1, (v) => Math.round(v)], ["tumbado", "Tumbarse", 0, 1, 0.01, pc],
    ["pieDerFrente", "Pie derecho: adelante / atrás", -160, 160, 1, (v) => Math.round(v)], ["pieDerLado", "Pie derecho: abrir", -30, 120, 1, (v) => Math.round(v)], ["pieDerAlto", "Pie derecho: levantar", 0, 220, 1, (v) => Math.round(v)],
    ["pieIzqFrente", "Pie izquierdo: adelante / atrás", -160, 160, 1, (v) => Math.round(v)], ["pieIzqLado", "Pie izquierdo: abrir", -30, 120, 1, (v) => Math.round(v)], ["pieIzqAlto", "Pie izquierdo: levantar", 0, 220, 1, (v) => Math.round(v)]];
  const BRAZO = (L) => [["b" + L + "K", "Cuánto manda la pose", 0, 1, 0.01, pc], ["b" + L + "Lado", "Abrir hacia fuera", -0.5, 2.4, 0.01, n2], ["b" + L + "Frente", "Hacia delante / atrás", -1, 1.6, 0.01, n2],
    ["b" + L + "Codo", "Doblar el codo", 0, 2.6, 0.01, n2], ["b" + L + "Hacia", "El codo dobla hacia dentro / fuera", -1, 1, 0.01, n2]];

  let libre = false, activo = false, acc = null, tiempo = 0, play = false, tAnt = null, claveSel = null, poseLibre = P.completa({}), ctrl = {}, construido = false, fantasmas = [];
  const j = () => E.j;
  const accion = () => j()?.acciones.find((a) => a.id === acc) || null;
  const durac = (a) => Math.max(0.4, a?.duracion || 2);
  const claveEn = (a, t) => a ? a.claves.findIndex((k) => Math.abs(k.t - t) < 0.02) : -1;
  const poseActual = () => { const a = accion(); return a && a.claves.length ? P.accionPose(a, tiempo) : poseLibre; };

  // ---- modo
  function ponerModo(m) { activo = m === "anim"; if (!activo) document.querySelector("#asas-rig")?.replaceChildren(); document.body.classList.toggle("modo-anim", activo); E.prueba.modo = m; E.guardaPrueba();
    [...$("#modo").children].forEach((b) => b.classList.toggle("activo", b.dataset.m === m)); if (activo) { construir(); pintar(); } setTimeout(E.encuadrar, 30); }
  [...$("#modo").children].forEach((b) => b.addEventListener("click", () => ponerModo(b.dataset.m)));

  // ---- Posar: se construye una vez y luego solo se actualizan los valores (si no, se perdería el arrastre del deslizador)
  const entradas = {};
  function deslizador(cont, [k, et, mn, mx, st, fmt]) {
    const inp = h("input", { type: "range", min: mn, max: mx, step: st }), out = h("output");
    inp.addEventListener("input", () => { editar((p) => { p[k] = Number(inp.value); }, "posar-" + k); });
    entradas[k] = { inp, out, fmt }; cont.append(h("div", { class: "deslizador" }, h("label", {}, et), inp, out)); }
  function chips(cont, id, opciones, alElegir) { const d = h("div", { class: "seg pequeno", id }); cont.append(d); entradas[id] = { seg: d, opciones, alElegir }; }
  function construir() {
    if (construido) return; construido = true; const c = $("#posar");
    const bloque = (t) => { const d = h("details", { class: "bloque", open: "" }, h("summary", {}, t)); c.append(d); return d; };
    const cu = bloque("Cuerpo"); CUERPO.forEach((d) => deslizador(cu, d));
    for (const [L, nom] of [["Der", "Brazo derecho"], ["Izq", "Brazo izquierdo"]]) { const b = bloque(nom);
      BRAZO(L).forEach((d) => deslizador(b, d));
      b.append(h("label", { class: "et" }, "Mano")); chips(b, "pm" + L, MANOS_N, (v) => editar((p) => { p["m" + L] = { [v]: 1 }; }));
      b.append(h("label", { class: "et" }, "Palma")); chips(b, "pp" + L, PALMAS_N, (v) => editar((p) => { p["p" + L] = v; })); }
    const ca = bloque("Cara"); chips(ca, "pemo", EMOS_N, (v) => editar((p) => { const k = Object.values(p.cara || {})[0] || 0.8; p.cara = v === "neutra" ? {} : { [v]: k || 0.8 }; }));
    deslizador(ca, ["_emoK", "Intensidad", 0, 1, 0.01, pc]);
    entradas._emoK.inp.addEventListener("input", () => {}); // la maneja editar() vía la clave especial
    // emociones propias: se crean moviendo cejas, ojos y boca, y se guardan en el personaje (j.emociones) como las que trae
    const fe = h("details", { class: "sub-bloque" }, h("summary", {}, "Crear o editar una emoción propia")); ca.append(fe);
    const nomE = h("input", { type: "text", placeholder: "Nombre (p. ej. asombro)", id: "emo-nombre" }); fe.append(h("div", { class: "campo" }, nomE));
    for (const [k, et, mn, mx, st] of RASGOS) { const inp = h("input", { type: "range", min: mn, max: mx, step: st, "data-rasgo": k }), out = h("output");
      inp.addEventListener("input", () => { out.textContent = (+inp.value).toFixed(2); guardarEmo(); }); fe.append(h("div", { class: "deslizador" }, h("label", {}, et), inp, out)); }
    fe.append(h("div", { class: "fila-botones dos" }, h("button", { onclick: () => { nomE.value = ""; cargarEmo(null); } }, "Nueva"), h("button", { class: "peligro", onclick: borrarEmo }, "Borrar esta emoción")));
    fe.append(h("p", { class: "ayuda" }, "Parte de la emoción elegida arriba. Al mover un rasgo, se guarda en el personaje con ese nombre y se pone en la pose."));
    // biblioteca de poses del personaje: instantáneas reutilizables
    const bp = bloque("Poses guardadas"); bp.append(h("div", { class: "chips", id: "poses-lista" }));
    bp.append(h("div", { class: "fila-anadir" }, h("input", { type: "text", id: "pose-nombre", placeholder: "Nombre de la pose" }), h("button", { onclick: guardarPose }, "Guardar pose")));
    bp.append(h("p", { class: "ayuda" }, "Clic en una pose para ponerla en el cabezal (o en la pose libre); clic derecho para borrarla."));
  }
  const RASGOS = [["sonrisa", "Sonrisa (− triste)", -1, 1.2, 0.01], ["abre", "Abrir la boca", 0, 1, 0.01], ["ancho", "Ancho de la boca", 0.5, 1.4, 0.01], ["cejaY", "Subir las cejas", -6, 10, 0.1],
    ["cejaIn", "Ceja por dentro", -10, 10, 0.1], ["cejaOut", "Ceja por fuera", -6, 6, 0.1], ["ojoK", "Tamaño de los ojos", 0.8, 1.25, 0.01], ["parpado", "Párpado de arriba", 0, 1, 0.01],
    ["entorna", "Ojos sonrientes", 0, 1, 0.01], ["rubor", "Rubor", 0, 1, 0.01], ["miraY", "Mirar abajo", -1, 1, 0.01]];
  const RASGO0 = { sonrisa: 0, abre: 0, ancho: 1, cejaY: 0, cejaIn: 0, cejaOut: 0, ojoK: 1, parpado: 0, entorna: 0, rubor: 0, miraY: 0 };
  const emoActual = () => Object.entries(poseActual().cara || {}).sort((x, y) => y[1] - x[1])[0]?.[0];
  function cargarEmo(n) { const em = Object.assign({}, RASGO0, (j().emociones || {})[n] || E.T.EMOCIONES[n] || {});
    for (const i of document.querySelectorAll("[data-rasgo]")) { if (document.activeElement === i) continue; i.value = em[i.dataset.rasgo]; i.nextElementSibling.textContent = (+i.value).toFixed(2); } }
  function guardarEmo() { const nombre = $("#emo-nombre").value.trim().toLowerCase(); if (!nombre) return E.aviso ? E.aviso("Ponle nombre a la emoción") : null;
    const em = {}; for (const i of document.querySelectorAll("[data-rasgo]")) { const v = +i.value, k = i.dataset.rasgo; if (Math.abs(v - RASGO0[k]) > 1e-3) em[k] = v; }
    E.cambio((x) => { x.emociones = Object.assign({}, x.emociones, { [nombre]: em }); }, "emo-" + nombre); editar((p) => { p.cara = { [nombre]: 1 }; }, "emo-cara"); }
  function borrarEmo() { const n = $("#emo-nombre").value.trim().toLowerCase(); if (!n || !(j().emociones || {})[n]) return; E.cambio((x) => { delete x.emociones[n]; }); }
  function guardarPose() { const nombre = $("#pose-nombre").value.trim(); if (!nombre) return; const pz = limpia(P.completa(poseActual()));
    E.cambio((x) => { x.poses = (x.poses || []).filter((q) => q.nombre !== nombre); x.poses.push({ nombre, pose: pz }); }); $("#pose-nombre").value = ""; }
  // copiar y pegar claves (también entre acciones y personajes: se guarda en el navegador)
  let copiada = null; try { copiada = JSON.parse(localStorage.getItem("ep-clave-copiada") || "null"); } catch {}
  // edición: en una acción, cambia la clave del cabezal (si no hay, la crea ahí con la pose interpolada: «autoclave»); sin acción, la pose libre
  function editar(fn, clave) {
    const a = accion();
    const aplicar = (p) => { fn(p); if ("_emoK" in p) { const k = p._emoK; delete p._emoK; const n = Object.keys(p.cara || {})[0]; if (n) p.cara = { [n]: k }; } };
    if (!a) { const p = P.completa(poseLibre); aplicar(p); poseLibre = p; pintar(); return; }
    E.cambio((x) => { const ax = x.acciones.find((y) => y.id === a.id); let i = claveEn(ax, tiempo);
      if (i < 0) { ax.claves.push({ t: +tiempo.toFixed(2), pose: P.completa(P.accionPose(ax, tiempo)) }); ax.claves.sort((m, n) => m.t - n.t); i = claveEn(ax, tiempo); }
      const p = P.completa(ax.claves[i].pose); aplicar(p); ax.claves[i].pose = limpia(p); claveSel = i; }, clave ? clave + "@" + tiempo.toFixed(2) : null);
  }
  // guarda solo lo que se aparta del reposo (JSON más corto y legible)
  function limpia(p) { const o = {}; for (const k in p) { const v = p[k], z = P.POSE0[k];
    if (typeof v === "number") { if (Math.abs(v - z) > 1e-4) o[k] = +v.toFixed(3); }
    else if (v && typeof v === "object") { const r = {}; for (const kk in v) if (Math.abs(v[kk]) > 1e-3) r[kk] = +v[kk].toFixed(3); if (JSON.stringify(r) !== JSON.stringify(z)) o[k] = r; }
    else if (v !== z) o[k] = v; } return o; }

  // ---- pintar el panel y la línea de tiempo
  function pintar() {
    if (!activo || !j()) return; construir();
    const lista = j().acciones; if (acc && !accion()) acc = null; if (!acc && !libre && lista.length) acc = lista[0].id;
    const sel = $("#a-lista"); sel.replaceChildren(h("option", { value: "" }, lista.length ? "— Pose libre (sin acción) —" : "— Pose libre: crea una acción con «+ Nueva» —"), ...lista.map((a) => h("option", { value: a.id }, a.nombre || a.id))); sel.value = acc || "";
    const a = accion(); $("#a-detalle").hidden = !a; $("#a-duplicar").disabled = $("#a-borrar").disabled = !a;
    if (a) { if (document.activeElement !== $("#a-nombre")) $("#a-nombre").value = a.nombre || ""; $("#a-dur").value = durac(a); $("#a-dur").nextElementSibling.textContent = durac(a).toFixed(1) + " s"; $("#a-bucle").checked = !!a.bucle;
      const lo = a.locomocion || {}; E.seg("#a-loco", Object.fromEntries(Object.entries(LOCO).map(([k, v]) => [k, v.n])), !lo.amp ? "quieto" : lo.correr ? "correr" : "andar", (k) => E.cambio((x) => { x.acciones.find((y) => y.id === a.id).locomocion = Object.assign({}, LOCO[k].v); })); }
    // valores de Posar
    const p = poseActual(), i = claveEn(a, tiempo);
    for (const k in entradas) { const en = entradas[k]; if (en.inp && k !== "_emoK") { if (document.activeElement !== en.inp) en.inp.value = p[k]; en.out.textContent = en.fmt(p[k]); } }
    const emo = Object.entries(p.cara || {}).sort((x, y) => y[1] - x[1])[0]; entradas._emoK.inp.value = emo ? emo[1] : 0; entradas._emoK.out.textContent = Math.round((emo ? emo[1] : 0) * 100) + "%";
    for (const L of ["Izq", "Der"]) { const m = Object.entries(p["m" + L] || {}).sort((x, y) => y[1] - x[1])[0]?.[0] || "relajada";
      segEn("pm" + L, m); segEn("pp" + L, p["p" + L] || "auto"); }
    const propias = Object.keys(j().emociones || {}); entradas.pemo.opciones = Object.assign({}, EMOS_N, Object.fromEntries(propias.map((n) => [n, "★ " + n])));
    segEn("pemo", emo && emo[1] > 0.05 ? emo[0] : "neutra");
    if (document.activeElement?.dataset?.rasgo === undefined && document.activeElement !== $("#emo-nombre")) { const n = emo && emo[1] > 0.05 ? emo[0] : null; if (n) $("#emo-nombre").value = propias.includes(n) ? n : ""; cargarEmo(n); }
    const pl = $("#poses-lista"); pl.replaceChildren(...(j().poses || []).map((q, i) => h("button", { title: "Clic: poner · clic derecho: borrar", onclick: () => editar((p) => { Object.assign(p, P.completa(q.pose)); }),
      oncontextmenu: (ev) => { ev.preventDefault(); E.cambio((x) => { x.poses.splice(i, 1); }); } }, q.nombre))); if (!(j().poses || []).length) pl.append(h("span", { class: "tenue" }, "Aún no hay poses guardadas."));
    $("#t-pegar").disabled = !copiada;
    $("#posar-info").textContent = !a ? "(pose libre: para crear controles)" : i >= 0 ? `· clave en ${fmtT(a.claves[i].t)}` : "· mueve algo y se crea una clave aquí";
    pintarControles(); pintarLinea();
    $("#codigo-anim").textContent = a ? `// en el reloj de la escena (t en segundos):\nconst e = Personajes.accion(PERSONAJES["${E.actual}"], "${a.id}", t, { giro: 20 }${Object.keys(ctrl).some((k) => ctrl[k]) ? ", " + JSON.stringify(Object.fromEntries(Object.entries(ctrl).filter(([, v]) => v))) : ""});\nmuneco.dibujar(e);` : "Crea una acción para ver el código.";
  }
  function segEn(id, valor) { const en = entradas[id]; E.seg("#" + id, en.opciones, valor, en.alElegir); }
  const fmtT = (t) => t.toFixed(2).replace(".", ",") + " s";

  // ---- controles
  function pintarControles() {
    const c = $("#controles"), lista = j().controles;
    if (c.dataset.firma !== lista.map((x) => x.id + x.nombre).join("|")) { c.dataset.firma = lista.map((x) => x.id + x.nombre).join("|"); c.replaceChildren();
      if (!lista.length) c.append(h("p", { class: "ayuda" }, "Aún no hay controles. Pon una postura en «Posar» y guárdala."));
      for (const k of lista) { const inp = h("input", { type: "range", min: 0, max: 1, step: 0.01, value: ctrl[k.id] || 0 }), out = h("output");
        inp.addEventListener("input", () => { ctrl[k.id] = Number(inp.value); out.textContent = Math.round(ctrl[k.id] * 100) + "%"; pintarCodigo(); });
        const nom = h("input", { type: "text", value: k.nombre, class: "nom-ctrl" }); nom.addEventListener("change", () => E.cambio((x) => { x.controles.find((y) => y.id === k.id).nombre = nom.value; }));
        const quitar = h("button", { class: "mini peligro", title: "Quitar control", onclick: () => { delete ctrl[k.id]; E.cambio((x) => { x.controles = x.controles.filter((y) => y.id !== k.id); }); E.aviso("Control quitado (Ctrl+Z lo recupera)"); } }, "✕");
        c.append(h("div", { class: "control", "data-id": k.id }, nom, quitar, inp, out)); } }
    for (const el of c.querySelectorAll(".control")) { const v = ctrl[el.dataset.id] || 0, inp = el.querySelector("input[type=range]"); if (document.activeElement !== inp) inp.value = v; el.querySelector("output").textContent = Math.round(v * 100) + "%"; }
  }
  const pintarCodigo = () => pintar();
  $("#c-nuevo").addEventListener("click", () => { const base = poseActual(), nombre = "Control " + (j().controles.length + 1);
    if (!Object.keys(limpia(P.completa(base))).length) return E.aviso("La postura está en reposo: muévela en «Posar» antes de guardarla");
    const id = E.slug(nombre) + "-" + Date.now().toString(36).slice(-3); E.cambio((x) => { x.controles.push({ id, nombre, pose: limpia(P.completa(base)) }); });
    ctrl[id] = 0; E.aviso("Control guardado: cámbiale el nombre en la lista"); });
  $("#c-cero").addEventListener("click", () => { ctrl = {}; pintar(); });

  // ---- acciones
  const nuevaAccion = (base) => { const n = j().acciones.length + 1, nombre = base ? base.nombre + " (copia)" : "Acción " + n, id = E.slug(nombre) + "-" + Date.now().toString(36).slice(-3);
    const a = base ? Object.assign(JSON.parse(JSON.stringify(base)), { id, nombre }) : { id, nombre, duracion: 2, bucle: true, locomocion: { amp: 0 }, claves: [{ t: 0, pose: limpia(poseLibre) }] };
    E.cambio((x) => { x.acciones.push(a); }); acc = id; libre = false; tiempo = 0; claveSel = 0; pintar(); };
  $("#a-nueva").addEventListener("click", () => nuevaAccion(null));
  $("#a-duplicar").addEventListener("click", () => accion() && nuevaAccion(accion()));
  let tBorrar = 0; $("#a-borrar").addEventListener("click", () => { const a = accion(); if (!a) return; const b = $("#a-borrar");
    if (Date.now() - tBorrar > 3000) { tBorrar = Date.now(); b.textContent = "¿Seguro?"; b.classList.add("armado"); setTimeout(() => { b.textContent = "Borrar"; b.classList.remove("armado"); }, 3000); return; }
    tBorrar = 0; b.textContent = "Borrar"; b.classList.remove("armado"); E.cambio((x) => { x.acciones = x.acciones.filter((y) => y.id !== a.id); }); acc = null; E.aviso("Acción borrada (Ctrl+Z la recupera)"); });
  $("#a-lista").addEventListener("change", (ev) => { acc = ev.target.value || null; libre = !acc; tiempo = 0; play = false; pintar(); });
  $("#a-nombre").addEventListener("input", (ev) => { const a = accion(); if (a) E.cambio((x) => { x.acciones.find((y) => y.id === a.id).nombre = ev.target.value; }, "a-nombre"); });
  $("#a-dur").addEventListener("input", (ev) => { const a = accion(); if (!a) return; const d = Number(ev.target.value);
    E.cambio((x) => { const ax = x.acciones.find((y) => y.id === a.id), k = d / durac(ax); ax.claves.forEach((c) => { c.t = +(c.t * k).toFixed(2); }); ax.duracion = d; }, "a-dur"); tiempo = Math.min(tiempo, d); });
  $("#a-bucle").addEventListener("change", (ev) => { const a = accion(); if (a) E.cambio((x) => { x.acciones.find((y) => y.id === a.id).bucle = ev.target.checked; }); });

  // ---- línea de tiempo
  const pista = $("#pista");
  function pintarLinea() {
    const a = accion(), D = durac(a); $("#t-tiempo").textContent = fmtT(tiempo) + (a ? " / " + fmtT(D) : ""); $("#t-play").textContent = play ? "❚❚" : "▶";
    $("#t-play").disabled = $("#t-clave").disabled = !a; $("#t-borrar").disabled = !a || claveEn(a, tiempo) < 0;
    const ic = a ? claveEn(a, tiempo) : -1; $("#t-curva").disabled = ic < 0; if (ic >= 0) $("#t-curva").value = Array.isArray(a.claves[ic].curva) ? "propia" : a.claves[ic].curva || "suave"; $("#t-curva-ed").disabled = ic < 0;
    $("#t-ayuda").textContent = a ? (a.claves.length < 2 ? "Mueve el cabezal, cambia la postura en «Posar» y se crea otra clave." : "Arrastra las claves para cambiar el ritmo.") : "Crea una acción en el panel de la derecha.";
    const regla = $("#regla"); if (regla.dataset.d !== String(D)) { regla.dataset.d = D; regla.replaceChildren(); for (let t = 0; t <= D + 1e-6; t += 0.25) { const mayor = Math.abs(t % 1) < 1e-6 || Math.abs((t % 1) - 1) < 1e-6;
      regla.append(h("span", { class: mayor ? "mayor" : "", style: `left:${(t / D) * 100}%` }, mayor ? String(Math.round(t)) : "")); } }
    const cl = $("#claves"); cl.replaceChildren(); if (a) a.claves.forEach((k, i) => { const d = h("div", { class: "clave" + (Math.abs(k.t - tiempo) < 0.02 ? " activa" : ""), style: `left:${(k.t / D) * 100}%`, title: fmtT(k.t), "data-i": i }); cl.append(d); });
    $("#cabezal").style.left = (Math.min(tiempo, D) / D) * 100 + "%";
  }
  let arr = null;
  pista.addEventListener("pointerdown", (ev) => { const a = accion(); if (!a) return; try { pista.setPointerCapture(ev.pointerId); } catch {} play = false;
    const cl = ev.target.closest(".clave"), r = pista.getBoundingClientRect(), t = Math.max(0, Math.min(durac(a), ((ev.clientX - r.left) / r.width) * durac(a)));
    if (cl) { const i = Number(cl.dataset.i); tiempo = a.claves[i].t; arr = { i, t0: a.claves[i].t, x0: ev.clientX, movida: false }; } else { tiempo = +t.toFixed(2); arr = { cabezal: true }; } pintar(); });
  pista.addEventListener("pointermove", (ev) => { if (!arr) return; const a = accion(), r = pista.getBoundingClientRect(), D = durac(a);
    if (arr.cabezal) { tiempo = +Math.max(0, Math.min(D, ((ev.clientX - r.left) / r.width) * D)).toFixed(2); pintar(); return; }
    const t = +Math.max(0, Math.min(D, arr.t0 + ((ev.clientX - arr.x0) / r.width) * D)).toFixed(2); if (!arr.movida && Math.abs(ev.clientX - arr.x0) < 3) return; arr.movida = true;
    const t0 = a.claves[arr.i].t; E.cambio((x) => { const ax = x.acciones.find((y) => y.id === a.id); ax.claves[arr.i].t = t; }, "mover-clave" + arr.i); tiempo = t; });
  const soltarP = () => { if (arr && !arr.cabezal && arr.movida) E.cambio((x) => { x.acciones.find((y) => y.id === acc).claves.sort((m, n) => m.t - n.t); }, "mover-clave" + arr.i); arr = null; };
  pista.addEventListener("pointerup", soltarP); pista.addEventListener("pointercancel", soltarP);
  const reproducir = () => { if (!accion()) return; play = !play; tAnt = null; pintarLinea(); };
  $("#t-play").addEventListener("click", reproducir);
  const anadirClave = () => { const a = accion(); if (!a || claveEn(a, tiempo) >= 0) return; E.cambio((x) => { const ax = x.acciones.find((y) => y.id === a.id); ax.claves.push({ t: +tiempo.toFixed(2), pose: limpia(P.completa(P.accionPose(ax, tiempo))) }); ax.claves.sort((m, n) => m.t - n.t); }); };
  $("#t-clave").addEventListener("click", anadirClave);
  $("#t-borrar").addEventListener("click", () => { const a = accion(), i = claveEn(a, tiempo); if (i < 0) return; if (a.claves.length === 1) return E.aviso("Una acción necesita al menos una clave");
    E.cambio((x) => { x.acciones.find((y) => y.id === a.id).claves.splice(i, 1); }); });
  const ponCurva = (v) => { const a = accion(), i = claveEn(a, tiempo); if (i < 0) return; E.cambio((x) => { const k = x.acciones.find((y) => y.id === a.id).claves[i]; if (v === "suave") delete k.curva; else k.curva = v; }); };
  const editarCurva = () => { const a = accion(), i = claveEn(a, tiempo); if (i < 0) return; EditorCurva.abrir($("#t-curva"), a.claves[i].curva || "suave", (c) => ponCurva(c)); };
  $("#t-curva").addEventListener("change", (ev) => { if (ev.target.value === "propia") editarCurva(); else ponCurva(ev.target.value); });
  $("#t-curva-ed").addEventListener("click", editarCurva);
  $("#t-copiar").addEventListener("click", () => { copiada = limpia(P.completa(poseActual())); try { localStorage.setItem("ep-clave-copiada", JSON.stringify(copiada)); } catch {} $("#t-pegar").disabled = false; });
  $("#t-pegar").addEventListener("click", () => { if (copiada) editar((p) => { Object.assign(p, P.completa(copiada)); }); });
  // biblioteca común de acciones (shorts-flow/acciones): traer una a este personaje o compartir la actual
  async function cargarBiblio() { try { const l = await (await fetch("/api/acciones")).json(); $("#a-biblio").replaceChildren(h("option", { value: "" }, l.length ? "— biblioteca común —" : "— la biblioteca común está vacía —"), ...l.map((x) => h("option", { value: x.id }, "★ " + x.nombre))); } catch {} }
  cargarBiblio();
  $("#a-traer").addEventListener("click", async () => { const id = $("#a-biblio").value; if (!id) return; const a = await (await fetch(`/api/acciones/${id}`)).json();
    const nid = id + "-" + Date.now().toString(36).slice(-3); E.cambio((x) => { x.acciones.push(Object.assign(a, { id: nid })); }); acc = nid; libre = false; tiempo = 0; pintar(); E.aviso(`«${a.nombre}» copiada a este personaje`); });
  $("#a-compartir").addEventListener("click", async () => { const a = accion(); if (!a) return; const id = E.slug(a.nombre || a.id);
    const r = await fetch(`/api/acciones/${id}`, { method: "PUT", body: JSON.stringify(Object.assign(JSON.parse(JSON.stringify(a)), { id, origen: E.actual })) });
    if (r.ok) { E.aviso(`«${a.nombre}» está en la biblioteca común: cualquier personaje puede usarla`); cargarBiblio(); } else E.aviso("No se pudo compartir"); });
  $("#t-cebolla").addEventListener("change", () => { E.prueba.cebolla = $("#t-cebolla").checked; E.guardaPrueba(); });
  document.addEventListener("keydown", (ev) => { if (document.body.classList.contains("con-taller")) return; if (!activo || ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName) && document.activeElement.type !== "range") return;
    if (ev.code === "Space") { ev.preventDefault(); reproducir(); } else if (ev.key.toLowerCase() === "k" && !ev.ctrlKey) anadirClave(); });

  // ---- dibujo (lo llama el bucle del editor en modo Animación)
  function reconstruir() { const g = $("#fantasmas"); g.replaceChildren(); fantasmas = [0, 1].map((i) => { const gg = E.el("g", { opacity: 0.38 }, g); return { g: gg, m: P.crear(gg, j(), { id: `ed-f${i}-${E.actual}`, piezas: [] }) }; }); }
  function dibujar(tReal, giro, m) {
    const a = accion(), D = durac(a);
    if (play && a) { if (tAnt !== null) { tiempo += tReal - tAnt; if (tiempo > D) tiempo = a.bucle ? tiempo % D : (play = false, D); } tAnt = tReal; if (Math.floor(tReal * 15) !== Math.floor((tReal - 0.02) * 15)) pintarLinea(); }
    const lo = a?.locomocion || {}, base = { giro }, pv = E.prueba.variantes;
    const pp = P.conControles(poseActual(), j().controles, ctrl), e = P.pose(pp, base);
    if (lo.amp) Object.assign(e, { amp: lo.amp, correr: lo.correr || 0, fase: tiempo * (lo.cad || (lo.correr ? 1.45 : 0.95)) });
    m.dibujar(Object.assign(e, { variantes: pv, parpadeo: Math.max(0.1, Math.min(1, Math.abs((tReal % 3.4) - 3.3) / 0.08)) }));
    pintarAsas();
    // papel cebolla: la clave anterior y la siguiente, en transparente (solo parado)
    const ver = !play && a && a.claves.length > 1 && E.prueba.cebolla !== false;
    const ks = a ? [...a.claves].sort((x, y) => x.t - y.t) : [], ant = ks.filter((k) => k.t < tiempo - 0.02).pop() || (a?.bucle ? ks[ks.length - 1] : null), sig = ks.find((k) => k.t > tiempo + 0.02) || (a?.bucle ? ks[0] : null);
    [ant, sig].forEach((k, i) => { const f = fantasmas[i]; if (!f) return; if (!ver || !k || claveEn(a, tiempo) >= 0 && k === ks[claveEn(a, tiempo)]) { f.g.setAttribute("display", "none"); return; }
      f.g.setAttribute("display", "inline"); f.g.setAttribute("filter", i ? "url(#fantasma-sig)" : "url(#fantasma-ant)");
      const ef = P.pose(P.conControles(k.pose, j().controles, ctrl), base); if (lo.amp) Object.assign(ef, { amp: lo.amp, correr: lo.correr || 0, fase: k.t * (lo.cad || (lo.correr ? 1.45 : 0.95)) }); f.m.dibujar(ef); });
  }

  // ---- CONTROL DEL RIG: asas sobre el personaje (modo Animación, parado). Manos con cinemática inversa, cabeza y pecho.
  // La cinemática directa replica la del títere (comun/titere25d.js, brazos) para resolver lado / frente / codo que llevan la mano al ratón.
  const NSs = "http://www.w3.org/2000/svg", lienzoR = $("#lienzo"), gAsas = document.createElementNS(NSs, "g"); gAsas.id = "asas-rig"; lienzoR.appendChild(gAsas);
  const T = E.T, v3 = { add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], mul: (a, k) => [a[0] * k, a[1] * k, a[2] * k], dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2] };
  v3.nrm = (a) => v3.mul(a, 1 / (Math.hypot(...a) || 1));
  // la IK de manos está en comun/personajes.js (la usan también las escenas para «agarrar»)
  const medidas = () => P.medidas(j()), manoFK = (p, L, giro) => P.manoFK(j(), p, L, giro), ik = (p, L, giro, objetivo) => P.ikMano(j(), p, L, giro, objetivo);
  function pintarAsas() { gAsas.replaceChildren(); const m = E.m; if (!activo || play || !m || !j()) return; const P2 = m.puntos;
    const asa = (id, q, color, titulo) => { if (!q) return; const c = document.createElementNS(NSs, "circle"); c.setAttribute("cx", q[0]); c.setAttribute("cy", q[1]); c.setAttribute("r", 16); c.setAttribute("fill", color); c.setAttribute("fill-opacity", "0.35"); c.setAttribute("stroke", color); c.setAttribute("stroke-width", 3); c.setAttribute("data-rig", id); c.style.cursor = "grab";
      const t = document.createElementNS(NSs, "title"); t.textContent = titulo; c.append(t); gAsas.append(c); };
    asa("manoDer", P2.manoDer, "#ff7a5a", "Mano derecha: arrástrala (el brazo la sigue)"); asa("manoIzq", P2.manoIzq, "#7ab8ff", "Mano izquierda: arrástrala (el brazo la sigue)");
    asa("cabeza", P2.cabeza && [P2.cabeza[0], P2.cabeza[1] - 10], "#f0d27a", "Cabeza: ← → gira · ↑ ↓ mira"); asa("pecho", P2.pecho, "#a8e08a", "Pecho: ← → gira el torso · ↑ ↓ se inclina");
    asa("cadera", P2.cadera, "#c8a0ff", "Cadera: ↑ ↓ se agacha o se levanta (las rodillas se doblan solas)");
    asa("pieDer", P2.pieDer, "#ff7a5a", "Pie derecho: arrástralo (adelante, atrás, a un lado; hacia arriba lo levanta)"); asa("pieIzq", P2.pieIzq, "#7ab8ff", "Pie izquierdo: arrástralo (adelante, atrás, a un lado; hacia arriba lo levanta)"); }
  let rig = null;
  const localP = (ev) => { const m = $("#principal").getScreenCTM().inverse(), pt = lienzoR.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY; const q = pt.matrixTransform(m); return [q.x, q.y]; };
  lienzoR.addEventListener("pointerdown", (ev) => { const c = ev.target.closest && ev.target.closest("[data-rig]"); if (!c || !activo) return; ev.preventDefault(); ev.stopPropagation(); play = false;
    try { lienzoR.setPointerCapture(ev.pointerId); } catch {} rig = { id: c.getAttribute("data-rig"), p0: localP(ev), pose: P.completa(poseActual()), giro: E.prueba.giro || 0 }; }, true);
  lienzoR.addEventListener("pointermove", (ev) => { if (!rig) return; const p = localP(ev), dx = p[0] - rig.p0[0], dy = p[1] - rig.p0[1], r = rig;
    if (r.id.startsWith("mano")) { const L = r.id.slice(4), q = ik(r.pose, L, r.giro, p); editar((x) => { for (const c of ["K", "Lado", "Frente", "Codo"]) x["b" + L + c] = +q["b" + L + c].toFixed(3); }, "rig-" + r.id); }
    else if (r.id === "cabeza") editar((x) => { x.cabeza = Math.max(-60, Math.min(60, r.pose.cabeza + dx * 0.5)); x.miraY = Math.max(-1, Math.min(1, r.pose.miraY + dy / 60)); }, "rig-cabeza");
    else if (r.id === "cadera") editar((x) => { x.agacha = +Math.max(0, Math.min(1.6, (r.pose.agacha || 0) + dy / 62)).toFixed(3); }, "rig-cadera");
    else if (r.id.startsWith("pie")) { const L = r.id.slice(3), sg = L === "Izq" ? 1 : -1, ang = E.rad(r.giro + (r.pose.torso || 0)), [kx, ky] = medidas();
      // el arrastre en pantalla se reparte entre «a un lado» y «adelante» según hacia dónde mira; hacia arriba lo levanta
      const ux = dx / kx, c = Math.cos(ang), s2 = Math.sin(ang), alto = Math.max(0, (r.pose["pie" + L + "Alto"] || 0) - dy / ky);
      editar((x) => { x["pie" + L + "Lado"] = +Math.max(-30, Math.min(120, (r.pose["pie" + L + "Lado"] || 0) + ux * c * sg)).toFixed(1); x["pie" + L + "Frente"] = +Math.max(-160, Math.min(160, (r.pose["pie" + L + "Frente"] || 0) + ux * s2)).toFixed(1);
        x["pie" + L + "Alto"] = +Math.min(220, alto).toFixed(1); }, "rig-" + r.id); }
    else if (r.id === "pecho") editar((x) => { x.torso = Math.max(-90, Math.min(90, r.pose.torso + dx * 0.4)); x.inclina = Math.max(-0.3, Math.min(0.5, r.pose.inclina + dy / 300)); }, "rig-pecho"); });
  const soltarRig = () => { rig = null; }; lienzoR.addEventListener("pointerup", soltarRig); lienzoR.addEventListener("pointercancel", soltarRig);

  window.EPA = { activo: () => activo, dibujar, reconstruir, pintar };
  $("#t-cebolla").checked = E.prueba.cebolla !== false;
  // tintes del papel cebolla (anterior en rojo, siguiente en verde, como en Moho)
  const defs = document.querySelector("#lienzo defs");
  defs.insertAdjacentHTML("beforeend", `<filter id="fantasma-ant"><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 0.35  0 0 0 0 0.35  0 0 0 1 0"/></filter><filter id="fantasma-sig"><feColorMatrix type="matrix" values="0 0 0 0 0.35  0 0 0 0 1  0 0 0 0 0.55  0 0 0 1 0"/></filter>`);
  ponerModo(E.prueba.modo === "anim" ? "anim" : "diseno");
})();
