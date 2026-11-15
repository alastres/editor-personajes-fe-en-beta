// MARIONETA LIBRE en el editor (como los huesos de Moho): cualquier dibujo o PNG con su propio esqueleto (comun/libre.js).
// Diseño: dibujar huesos arrastrando sobre el lienzo, moverlos por sus puntas, y añadir capas (dibujadas en el taller o PNG) que se
// doblan con los huesos o van pegadas a uno. Animación: deslizadores por hueso y arrastrar la punta de un hueso para girarlo; todo
// se guarda en la pose como huesos: { nombre: grados } y se anima con claves como el muñeco.
(() => {
  const E = window.EP, P = E.P, $ = (s) => document.querySelector(s), h = E.h, NS = "http://www.w3.org/2000/svg";
  const sv = (t, at = {}, p) => { const e = document.createElementNS(NS, t); for (const k in at) e.setAttribute(k, at[k]); if (p) p.appendChild(e); return e; };
  const j = () => E.j, esLibre = () => j()?.tipo === "libre", L = () => j().libre;
  let sel = null, modo = null, arr = null, capa = null;

  // ---- ejemplo de partida: un gusano de tres huesos con un cuerpo que se dobla y un ojo pegado a la cabeza
  const EJEMPLO = () => ({ huesos: [{ nombre: "cola", padre: null, o: [-160, -40], e: [-55, -40] }, { nombre: "medio", padre: "cola", o: [-55, -40], e: [50, -40] }, { nombre: "cabeza", padre: "medio", o: [50, -40], e: [160, -65] }],
    capas: [{ id: "cuerpo", nombre: "Cuerpo", svg: '<path d="M-185 -40 C -185 -75 -160 -85 -120 -82 C -60 -78 0 -82 60 -88 C 120 -94 185 -100 185 -58 C 185 -20 130 -10 60 -10 C 0 -10 -60 -6 -120 -2 C -160 0 -185 -10 -185 -40 Z" fill="#7fb069"/><path d="M-150 -30 C -100 -26 0 -28 100 -36" fill="none" stroke="#5c8a4a" stroke-width="6" stroke-linecap="round"/>' },
      { id: "ojo", nombre: "Ojo", hueso: "cabeza", svg: '<path d="M140 -70 C 140 -62 134 -56 126 -56 C 118 -56 112 -62 112 -70 C 112 -78 118 -84 126 -84 C 134 -84 140 -78 140 -70 Z" fill="#fff"/><path d="M133 -70 C 133 -66 130 -63 127 -63 C 124 -63 121 -66 121 -70 C 121 -74 124 -77 127 -77 C 130 -77 133 -74 133 -70 Z" fill="#14171e"/>' }] });

  // ---- panel de Diseño
  function pintar() { if (!esLibre()) return; const l = L(), ul = $("#lb-huesos"), uc = $("#lb-capas"); if (!ul) return;
    if (sel && !l.huesos.some((x) => x.nombre === sel)) sel = null;
    ul.replaceChildren(...l.huesos.map((b) => { const nom = h("input", { type: "text", value: b.nombre, title: "Nombre del hueso" });
      nom.addEventListener("change", () => renombrar(b.nombre, nom.value.trim()));
      const pad = h("select", { title: "Hueso padre (al girar el padre, este le sigue)" }, h("option", { value: "" }, "— sin padre —"), ...l.huesos.filter((x) => x.nombre !== b.nombre && !desciende(x.nombre, b.nombre)).map((x) => h("option", { value: x.nombre }, x.nombre)));
      pad.value = b.padre || ""; pad.addEventListener("change", () => E.cambio((x) => { const q = x.libre.huesos.find((y) => y.nombre === b.nombre); q.padre = pad.value || null; ordenar(x.libre); }));
      const clav = (l.clavados || []).includes(b.nombre), pin = h("button", { class: "lb-pin" + (clav ? " activo" : ""), title: b.padre ? (clav ? "Clavado: su punta se queda en el suelo. Pulsa para soltarlo" : "Clavar: su punta se queda quieta (un pie en el suelo) y él y su padre se doblan solos") : "Solo se clava un hueso con padre (la pata de una pierna)", ...(b.padre ? {} : { disabled: "" }),
        onclick: () => E.cambio((x) => { const c = new Set(x.libre.clavados || []); c.has(b.nombre) ? c.delete(b.nombre) : c.add(b.nombre); x.libre.clavados = [...c]; if (!x.libre.clavados.length) delete x.libre.clavados; }) }, "📌");
      return h("li", { class: b.nombre === sel ? "activo" : "", onclick: (ev) => { if (ev.target.closest("input,select,button")) return; sel = b.nombre; pintar(); fotograma(E.m); } }, h("span", {}, "╱"), nom, pad, pin,
        h("button", { title: "Borrar el hueso (sus hijos pasan a su padre)", onclick: () => borrarHueso(b.nombre) }, "✕")); }));
    uc.replaceChildren(...l.capas.map((c, i) => { const hs = h("select", { title: "Con qué hueso se mueve" }, h("option", { value: "" }, c.imagen ? "Rígida, al hueso más cercano" : "Se dobla con todos los huesos"), ...l.huesos.map((x) => h("option", { value: x.nombre }, "Pegada a «" + x.nombre + "»")));
      hs.value = c.hueso || ""; hs.addEventListener("change", () => E.cambio((x) => { const q = x.libre.capas[i]; if (hs.value) q.hueso = hs.value; else delete q.hueso; }));
      // SMART BONES: cada forma clave de la capa puede ir conducida por un hueso (entra sola al girarlo, entre dos ángulos)
      const fcBloque = c.formasClave?.length ? h("div", { class: "lb-fc" }, h("div", { class: "lb-fc-tit" }, "Formas clave: ¿qué hueso las mueve?"), ...c.formasClave.map((k, n) => {
        const cd = k.conductor || {}, sh = h("select", { title: "El hueso que, al girar, mete esta forma clave (como los Smart Bones de Moho)" }, h("option", { value: "" }, "a mano (deslizador)"), ...l.huesos.map((x) => h("option", { value: x.nombre }, "🦴 " + x.nombre)));
        sh.value = cd.hueso || ""; const num = (v, t) => { const inp = h("input", { type: "number", step: 5, value: v, title: t, style: "width:4.2em" }); inp.disabled = !cd.hueso; return inp; };
        const de = num(cd.desde ?? 0, "Ángulo del hueso en que la forma clave empieza (0 %)"), ha = num(cd.hasta ?? 30, "Ángulo del hueso en que la forma clave está entera (100 %)");
        const guarda = () => E.cambio((x) => { const q = x.libre.capas[i].formasClave[n]; if (sh.value) q.conductor = { hueso: sh.value, desde: +de.value || 0, hasta: +ha.value || 0 }; else delete q.conductor; });
        sh.addEventListener("change", guarda); de.addEventListener("change", guarda); ha.addEventListener("change", guarda);
        return h("div", { class: "lb-fc-fila" }, h("span", { title: k.nombre }, k.nombre), sh, h("span", { class: "tenue" }, "de"), de, h("span", { class: "tenue" }, "a"), ha, h("span", { class: "tenue" }, "°")); })) : null;
      return h("li", {}, h("span", {}, c.imagen ? "🖼" : "◆"), h("span", {}, c.nombre || c.id), hs, ...(fcBloque ? [fcBloque] : []),
        ...(c.imagen ? [] : [h("button", { title: "Editar en el taller", onclick: () => editarCapa(i) }, "✎")]),
        h("button", { title: "Más atrás", onclick: () => mover(i, -1) }, "↑"), h("button", { title: "Más delante", onclick: () => mover(i, 1) }, "↓"),
        h("button", { title: "Borrar la capa", onclick: async () => { if (await Dialogo.confirmar(`Se borra la capa «${c.nombre || c.id}».`, { titulo: "¿Borrar la capa?", aceptar: "Borrar", peligro: true })) E.cambio((x) => { x.libre.capas.splice(i, 1); }); } }, "✕")); }));
    $("#lb-hueso-nuevo").classList.toggle("activo", modo === "hueso"); $("#lb-hueso-nuevo").textContent = modo === "hueso" ? "Arrastra en el lienzo… (Esc)" : "＋ Dibujar un hueso";
    $("#lb-vacio").hidden = l.capas.length > 0; }
  const desciende = (a, b) => { let x = L().huesos.find((y) => y.nombre === a); while (x?.padre) { if (x.padre === b) return true; x = L().huesos.find((y) => y.nombre === x.padre); } return false; };
  // rig2d necesita los padres antes que los hijos
  function ordenar(l) { const fuera = [], vistos = new Set(); let resto = [...l.huesos]; while (resto.length) { const n = resto.length;
      resto = resto.filter((b) => { if (!b.padre || vistos.has(b.padre) || !l.huesos.some((y) => y.nombre === b.padre)) { if (b.padre && !l.huesos.some((y) => y.nombre === b.padre)) b.padre = null; fuera.push(b); vistos.add(b.nombre); return false; } return true; });
      if (resto.length === n) { resto.forEach((b) => { b.padre = null; fuera.push(b); }); break; } } l.huesos = fuera; }
  function renombrar(a, b) { if (!b || a === b) return pintar(); if (L().huesos.some((x) => x.nombre === b)) { E.aviso("Ya hay un hueso con ese nombre"); return pintar(); }
    E.cambio((x) => { for (const q of x.libre.huesos) { if (q.nombre === a) q.nombre = b; if (q.padre === a) q.padre = b; } for (const c of x.libre.capas) if (c.hueso === a) c.hueso = b;
      for (const ac of x.acciones || []) for (const k of ac.claves || []) if (k.pose?.huesos && a in k.pose.huesos) { k.pose.huesos[b] = k.pose.huesos[a]; delete k.pose.huesos[a]; } }); if (sel === a) sel = b; }
  function borrarHueso(n) { E.cambio((x) => { const b = x.libre.huesos.find((y) => y.nombre === n); for (const q of x.libre.huesos) if (q.padre === n) q.padre = b?.padre || null;
      x.libre.huesos = x.libre.huesos.filter((y) => y.nombre !== n); for (const c of x.libre.capas) if (c.hueso === n) delete c.hueso; if (x.libre.clavados) x.libre.clavados = x.libre.clavados.filter((y) => y !== n); }); }
  function mover(i, d) { const k = i + d; if (k < 0 || k >= L().capas.length) return; E.cambio((x) => { const c = x.libre.capas; [c[i], c[k]] = [c[k], c[i]]; }); }

  // ---- capas: dibujar en el taller (con el resto y el esqueleto de calco) o traer un PNG
  function editarCapa(i) { const l = L(), c = i == null ? null : l.capas[i];
    const caja = (() => { const xs = [], ys = []; for (const b of l.huesos) { xs.push(b.o[0], b.e[0]); ys.push(b.o[1], b.e[1]); } return xs.length ? [Math.min(...xs) - 200, Math.min(...ys) - 200, Math.max(...xs) + 200, Math.max(...ys, 0) + 80] : [-300, -450, 300, 50]; })();
    Taller.abrir({ titulo: c ? `Marioneta libre · ${c.nombre}` : "Marioneta libre · capa nueva", textoGuardar: "Guardar", colores: P.colores(j()), dibujos: { frente: c?.dibujo || (c?.svg ? Taller.deSVG(c.svg) : { formas: [] }) }, vistas: null, vista: "frente", encuadre: caja,
      huesos: l.huesos.map((b) => b.nombre),
      formasClave: (c?.formasClave || []).map((k) => ({ id: k.id, nombre: k.nombre, dibujo: k.dibujo || Taller.deSVG(k.svg || "") })),
      referencia: (g) => { const r = sv("g", { opacity: 0.35, "pointer-events": "none" }, g); r.innerHTML = l.capas.filter((x, k) => k !== i).map((x) => x.imagen ? `<image href="${x.imagen.href}" x="${x.imagen.x}" y="${x.imagen.y}" width="${x.imagen.w}" height="${x.imagen.h}"/>` : x.svg || "").join("");
        for (const b of l.huesos) { sv("line", { x1: b.o[0], y1: b.o[1], x2: b.e[0], y2: b.e[1], stroke: "#f0a33a", "stroke-width": 4 }, g); sv("circle", { cx: b.o[0], cy: b.o[1], r: 6, fill: "#f0a33a" }, g); } },
      alGuardar: async (out, info = {}) => { const r = out.frente; if (!r) return; const tinta = (t) => t.replace(/\{(\w+)\}/g, (m_, k) => P.colores(j())[k] || "#888888"), svg = tinta(Taller.aSVG(r.dibujo));
        const fc = info.formasClave?.length ? info.formasClave.map(({ id, nombre, dibujo, svg: s }) => ({ id, nombre, dibujo, svg: tinta(s) })) : undefined;
        let nombre = c?.nombre; if (!c) { nombre = await Dialogo.pedir("Nombre de la capa", { valor: "Capa " + (l.capas.length + 1), aceptar: "Guardar" }); if (nombre == null) return; }
        E.cambio((x) => { if (c) { Object.assign(x.libre.capas[i], { dibujo: r.dibujo, svg }); if (fc) x.libre.capas[i].formasClave = fc; else delete x.libre.capas[i].formasClave; } else x.libre.capas.push(Object.assign({ id: "capa-" + Date.now().toString(36), nombre: nombre || "Capa", dibujo: r.dibujo, svg }, fc ? { formasClave: fc } : {})); }); E.aviso("Capa guardada"); } }); }
  function traerPNG(file) { const fr = new FileReader(); fr.onload = () => { const im = new Image(); im.onload = () => { const alto = 320, w = (im.naturalWidth / im.naturalHeight) * alto;
      E.cambio((x) => { x.libre.capas.push({ id: "png-" + Date.now().toString(36), nombre: file.name.replace(/\.\w+$/, ""), imagen: { href: fr.result, x: -w / 2, y: -alto, w: +w.toFixed(1), h: alto } }); });
      E.aviso("Imagen añadida: dibuja huesos y elige a cuál va pegada"); }; im.src = fr.result; }; fr.readAsDataURL(file); }

  // ---- el esqueleto encima del personaje (dentro de su grupo, así sigue al reflejo y al elástico)
  let capaE = null;
  function fotograma(m) { if (!esLibre() || !m?.libre) { capaE?.remove(); capaE = null; return; } const cuerpo = m.g.lastChild;
    if (!capaE || capaE.parentNode !== cuerpo) { capaE?.remove(); capaE = sv("g", { class: "lb-esqueleto" }, cuerpo); }
    capaE.replaceChildren(); const anim = document.body.classList.contains("modo-anim");
    for (const b of m.esqueleto()) { const elegido = b.nombre === sel, col = elegido ? "#ffd27a" : "#f0a33a";
      const dx = b.e[0] - b.o[0], dy = b.e[1] - b.o[1], L2 = Math.hypot(dx, dy) || 1, nx = (-dy / L2) * 9, ny = (dx / L2) * 9;
      sv("path", { d: `M${b.o[0]} ${b.o[1]} L${b.o[0] + dx * 0.2 + nx} ${b.o[1] + dy * 0.2 + ny} L${b.e[0]} ${b.e[1]} L${b.o[0] + dx * 0.2 - nx} ${b.o[1] + dy * 0.2 - ny} Z`, fill: col, "fill-opacity": 0.55, stroke: col, "stroke-width": 2, "data-hueso": b.nombre }, capaE);
      sv("circle", { cx: b.o[0], cy: b.o[1], r: 7, fill: "#13111f", stroke: col, "stroke-width": 3, "data-hueso": b.nombre, "data-punto": "o" }, capaE);
      sv("circle", { cx: b.e[0], cy: b.e[1], r: anim ? 10 : 7, fill: col, "data-hueso": b.nombre, "data-punto": "e", style: "cursor:grab" }, capaE).append(Object.assign(document.createElementNS(NS, "title"), { textContent: anim ? `Arrastra para girar «${b.nombre}»` : `«${b.nombre}»: arrastra para mover la punta` })); } }
  // coordenadas del personaje (las del grupo del cuerpo) desde el ratón
  const local = (ev) => { const g = E.m?.g?.lastChild; if (!g) return [0, 0]; const pt = $("#lienzo").createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY; const q = pt.matrixTransform(g.getScreenCTM().inverse()); return [q.x, q.y]; };
  const lienzo = $("#lienzo");
  lienzo.addEventListener("pointerdown", (ev) => { if (!esLibre()) return; const anim = document.body.classList.contains("modo-anim"), t = ev.target.closest("[data-hueso]"), p = local(ev);
    if (!anim && modo === "hueso") { ev.preventDefault(); ev.stopPropagation(); arr = { tipo: "nuevo", o: p, e: p }; try { lienzo.setPointerCapture(ev.pointerId); } catch {} return; }
    if (!t) return; ev.preventDefault(); ev.stopPropagation(); sel = t.dataset.hueso; try { lienzo.setPointerCapture(ev.pointerId); } catch {}
    arr = anim ? { tipo: "girar", n: sel } : { tipo: "punto", n: sel, punto: t.dataset.punto || "e", p0: p }; pintar(); fotograma(E.m); }, true);
  lienzo.addEventListener("pointermove", (ev) => { if (!arr) return; const p = local(ev);
    if (arr.tipo === "nuevo") { arr.e = p; fotograma(E.m); const g = capaE; if (g) sv("line", { x1: arr.o[0], y1: arr.o[1], x2: p[0], y2: p[1], stroke: "#ffd27a", "stroke-width": 5, "stroke-dasharray": "8 5" }, g); return; }
    if (arr.tipo === "punto") { E.cambio((x) => { const b = x.libre.huesos.find((y) => y.nombre === arr.n); if (!b) return; const viejo = b[arr.punto].slice(); b[arr.punto] = [+p[0].toFixed(1), +p[1].toFixed(1)];
        // la punta arrastra el arranque de los hijos que estaban pegados a ella
        if (arr.punto === "e") for (const q of x.libre.huesos) if (q.padre === b.nombre && Math.hypot(q.o[0] - viejo[0], q.o[1] - viejo[1]) < 2) q.o = b.e.slice(); }, "lb-punto-" + arr.n); return; }
    if (arr.tipo === "girar" && ikActivo() && E.m.ikGrados) { const n = arr.n, hs0 = (window.EPA.poseActual?.() || {}).huesos || {}, r = E.m.ikGrados(hs0, n, p);
      if (r) { window.EPA.editar((q) => { q.huesos = Object.assign({}, q.huesos, r); }, "lb-ik-" + n); return; } }
    if (arr.tipo === "girar") { const b = E.m.esqueleto().find((y) => y.nombre === arr.n); if (!b) return;
      const ahora = Math.atan2(b.e[1] - b.o[1], b.e[0] - b.o[0]), quiere = Math.atan2(p[1] - b.o[1], p[0] - b.o[0]); let d = ((quiere - ahora) * 180) / Math.PI; while (d > 180) d -= 360; while (d < -180) d += 360;
      if (Math.abs(d) < 0.2) return; const n = arr.n; window.EPA.editar((q) => { const hs = Object.assign({}, q.huesos); hs[n] = +(((hs[n] || 0) + d)).toFixed(1); q.huesos = hs; }, "lb-girar-" + n); } });
  const soltar = () => { if (!arr) return; const a = arr; arr = null;
    if (a.tipo === "nuevo") { if (Math.hypot(a.e[0] - a.o[0], a.e[1] - a.o[1]) < 12) { fotograma(E.m); return; }
      // el padre: el hueso con la punta más cerca del arranque (a menos de 40), o el elegido
      const hs = L().huesos; let padre = null, mejor = 40; for (const b of E.m.esqueleto()) { const d = Math.hypot(b.e[0] - a.o[0], b.e[1] - a.o[1]); if (d < mejor) { mejor = d; padre = b.nombre; } }
      if (padre) { const b = hs.find((y) => y.nombre === padre); a.o = b.e.slice(); } else padre = sel;
      let k = hs.length + 1; while (hs.some((y) => y.nombre === "hueso " + k)) k++; const nombre = "hueso " + k;
      E.cambio((x) => { x.libre.huesos.push({ nombre, padre: padre || null, o: a.o.map((v) => +v.toFixed(1)), e: a.e.map((v) => +v.toFixed(1)) }); ordenar(x.libre); }); sel = nombre; E.aviso(`«${nombre}» creado${padre ? ` (hijo de «${padre}»)` : ""}: dibuja otro o pulsa Esc`); } };
  lienzo.addEventListener("pointerup", soltar); lienzo.addEventListener("pointercancel", soltar);
  document.addEventListener("keydown", (ev) => { if (ev.key === "Escape" && modo) { modo = null; pintar(); } });

  // ---- animación: un deslizador por hueso (en Posar)
  function pintarPosar() { const c = $("#lb-posar"); if (!c) return; if (!esLibre()) { c.replaceChildren(); return; } const pose = window.EPA.poseActual?.() || {}, hs = pose.huesos || {};
    const firma = L().huesos.map((b) => b.nombre).join("|"); if (c.dataset.firma !== firma) { c.dataset.firma = firma;
      const desl = (k, et, mn, mx, u) => { const inp = h("input", { type: "range", min: mn, max: mx, step: 1, "data-lb": k }), out = h("output");
        inp.addEventListener("input", () => { out.textContent = inp.value + u; window.EPA.editar((q) => { q.huesos = Object.assign({}, q.huesos, { [k]: +inp.value }); }, "lb-hueso-" + k); });
        return h("div", { class: "deslizador" }, h("label", {}, et), inp, out); };
      c.replaceChildren(h("label", { class: "chk", title: "Al arrastrar la punta de un hueso con padre, se doblan los dos para llegar al ratón (como un brazo o una pata). Sin marcar, solo gira ese hueso" }, h("input", { type: "checkbox", id: "lb-ik", checked: "" }), " Arrastrar con IK (dobla también al padre)"),
        desl("__x", "Mover el cuerpo ↔", -400, 400, ""), desl("__y", "Mover el cuerpo ↕", -400, 200, ""),
        ...L().huesos.map((b) => desl(b.nombre, "Girar «" + b.nombre + "»" + ((L().clavados || []).includes(b.nombre) ? " 📌" : ""), -180, 180, "°")),
        h("p", { class: "ayuda" }, "También puedes arrastrar la punta de un hueso en el lienzo. Los huesos con 📌 (clavados en Diseño) dejan su punta en el suelo aunque muevas el cuerpo.")); }
    for (const i of c.querySelectorAll("[data-lb]")) { if (document.activeElement === i) continue; const v = Math.round(hs[i.dataset.lb] || 0); i.value = v; i.nextElementSibling.textContent = v + (i.dataset.lb.startsWith("__") ? "" : "°"); } }
  const ikActivo = () => document.querySelector("#lb-ik")?.checked !== false;

  $("#lb-hueso-nuevo")?.addEventListener("click", () => { modo = modo === "hueso" ? null : "hueso"; pintar(); });
  $("#lb-capa-dibujo")?.addEventListener("click", () => editarCapa(null));
  $("#lb-capa-png")?.addEventListener("click", () => $("#lb-png").click());
  $("#lb-png")?.addEventListener("change", (ev) => { const f = ev.target.files?.[0]; if (f) traerPNG(f); ev.target.value = ""; });
  window.EPL = { reconstruir: () => { document.body.classList.toggle("es-libre", esLibre()); pintar(); pintarPosar(); fotograma(E.m); }, fotograma: (m) => { fotograma(m); pintarPosar(); }, EJEMPLO };
})();
