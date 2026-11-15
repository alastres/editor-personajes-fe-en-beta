// SMART BONES en el editor (como en Moho), para la marioneta libre (comun/libre.js evalúa hueso.smart).
// Un hueso con «⚡» entra en el modo Smart Bone: arriba del panel aparece su línea de tiempo EN GRADOS. Giras el hueso (deslizador,
// la línea o arrastrando su punta) y, en ese ángulo, arrastras los PUNTOS del dibujo sobre el lienzo o giras OTROS HUESOS por su punta:
// todo se graba en una clave de ese ángulo (si no la hay, se crea con lo que se ve en ese momento). El reposo (0°) es la base vacía.
// Entre claves, la curva de cada clave. Los desplazamientos se guardan en el reposo de cada punto (siguen a los huesos).
(() => {
  const E = window.EP, $ = (s) => document.querySelector(s), h = E.h, NS = "http://www.w3.org/2000/svg";
  const sv = (t, at = {}, p) => { const e = document.createElementNS(NS, t); for (const k in at) e.setAttribute(k, at[k]); if (p) p.appendChild(e); return e; };
  const j = () => E.j, esLibre = () => j()?.tipo === "libre", L = () => j().libre;
  let S = null;   // { hueso, ang }
  const CURVAS = { lineal: (t) => t, suave: (t) => t * t * (3 - 2 * t), acelera: (t) => t * t, frena: (t) => 1 - (1 - t) * (1 - t), mantener: () => 0 };
  const huesoD = () => L().huesos.find((b) => b.nombre === S?.hueso);
  const claves = () => huesoD()?.smart?.claves || [];
  const claveEn = (ang) => claves().find((k) => Math.abs(k.ang - ang) < 0.5);

  // lo que la acción de ESTE hueso vale en un ángulo (para crear una clave nueva con lo que se ve)
  function interp(ang) { const ks0 = [...claves()].sort((a, b) => a.ang - b.ang), ks = ks0.some((k) => Math.abs(k.ang) < 0.01) ? ks0 : [...ks0, { ang: 0, reposo: true }].sort((a, b) => a.ang - b.ang);
    const out = { puntos: {}, huesos: {} }; if (!ks0.length) return out;
    const suma = (k, w) => { if (!k || k.reposo || w < 1e-4) return;
      for (const [ca, tr] of Object.entries(k.puntos || {})) for (const [i, arr] of Object.entries(tr)) { const o = ((out.puntos[ca] = out.puntos[ca] || {})[i] = out.puntos[ca][i] || new Array(arr.length).fill(0)); arr.forEach((v, n) => (o[n] += (v || 0) * w)); }
      for (const [n, g] of Object.entries(k.huesos || {})) out.huesos[n] = (out.huesos[n] || 0) + g * w; };
    const ult = ks[ks.length - 1]; if (ang <= ks[0].ang) suma(ks[0], 1); else if (ang >= ult.ang) suma(ult, 1);
    else for (let i = 0; i < ks.length - 1; i++) { const A = ks[i], B = ks[i + 1]; if (ang < A.ang || ang > B.ang) continue; const t = (ang - A.ang) / (B.ang - A.ang || 1), f = (CURVAS[(ang >= 0 ? B : A).curva || "suave"] || CURVAS.suave)(t); suma(A, 1 - f); suma(B, f); break; }
    for (const ca in out.puntos) for (const i in out.puntos[ca]) out.puntos[ca][i] = out.puntos[ca][i].map((v) => +v.toFixed(2));
    return out; }
  // editar la clave del ángulo actual (creándola si hace falta) dentro de un cambio con deshacer
  function enClave(fn, agrupar) { const ang = Math.round(S.ang), base = claveEn(ang) ? null : interp(ang);
    E.cambio((x) => { const b = x.libre.huesos.find((y) => y.nombre === S.hueso); if (!b) return; b.smart = b.smart || { claves: [] };
      let k = b.smart.claves.find((q) => Math.abs(q.ang - ang) < 0.5); if (!k) { k = { ang, curva: "suave", puntos: base.puntos, huesos: base.huesos }; b.smart.claves.push(k); b.smart.claves.sort((p, q) => p.ang - q.ang); }
      fn(k, x); }, agrupar); }

  // ---- panel: la línea de tiempo en grados
  function caja() { let c = $("#lb-smart"); if (!c) { const ref = $("#lb-huesos"); if (!ref) return null; c = h("div", { id: "lb-smart", class: "lb-smart", hidden: "" }); ref.parentNode.insertBefore(c, ref.previousElementSibling || ref); } return c; }
  function pintarPanel() { const c = caja(); if (!c) return; c.hidden = !S || !esLibre(); if (c.hidden) return; const b = huesoD(); if (!b) { salir(); return; }
    const k = claveEn(Math.round(S.ang)), sel = h("select", { title: "Cómo llega a esta clave desde la anterior (la más cercana al reposo)" }, ...[["suave", "Suave"], ["lineal", "Lineal"], ["acelera", "Acelerar"], ["frena", "Frenar"], ["mantener", "Mantener"]].map(([v, n]) => h("option", { value: v }, n)));
    sel.value = k?.curva || "suave"; sel.disabled = !k; sel.addEventListener("change", () => enClave((kk) => { kk.curva = sel.value; }));
    const rango = h("input", { type: "range", min: -180, max: 180, step: 1, value: Math.round(S.ang), id: "sb-ang" }), num = h("input", { type: "number", min: -180, max: 180, step: 1, value: Math.round(S.ang), style: "width:4.6em" });
    const pon = (v) => { S.ang = Math.max(-180, Math.min(180, +v || 0)); pintarPanel(); }; rango.addEventListener("input", () => { S.ang = +rango.value; num.value = rango.value; pintarLinea(); pintarBotones(); }); num.addEventListener("change", () => pon(num.value));
    const dial = h("label", { class: "chk", title: "Un mando: no mueve el dibujo por sí mismo ni se ve en el vídeo; solo sirve para conducir su acción (como los diales de Moho)" }, h("input", { type: "checkbox", ...(b.dial ? { checked: "" } : {}), onchange: (ev) => E.cambio((x) => { const q = x.libre.huesos.find((y) => y.nombre === S.hueso); if (ev.target.checked) q.dial = true; else delete q.dial; }) }), " Dial (mando que no se dibuja)");
    c.replaceChildren(h("div", { class: "sb-cab" }, h("b", {}, "⚡ Smart Bone «" + b.nombre + "»"), h("span", { class: "tenue" }, claves().length + " clave" + (claves().length === 1 ? "" : "s")), h("button", { class: "sb-salir", onclick: salir, title: "Salir del modo Smart Bone (Esc)" }, "Listo")),
      h("svg", { class: "sb-linea", id: "sb-linea", viewBox: "0 0 360 44", preserveAspectRatio: "none" }),
      h("div", { class: "sb-fila" }, h("label", {}, "Ángulo"), rango, num, h("span", { class: "tenue" }, "°")),
      h("div", { class: "sb-fila" }, h("button", { id: "sb-clave", onclick: () => enClave(() => {}) }, "◆ Clave aquí"), h("button", { id: "sb-borrar", onclick: borrarClave }, "Borrar clave"), h("label", {}, "Curva"), sel),
      h("div", { class: "sb-fila" }, h("button", { onclick: () => pon(0), title: "Volver al reposo" }, "0°"), h("button", { onclick: () => saltar(-1), title: "Clave anterior" }, "◀"), h("button", { onclick: () => saltar(1), title: "Clave siguiente" }, "▶"), dial),
      h("p", { class: "ayuda" }, "Gira el hueso (deslizador, la línea o arrastrando su punta) y, en ese ángulo, arrastra los puntos del dibujo o las puntas de otros huesos: se graba en una clave de ese ángulo. Funciona hacia los dos lados; el reposo (0°) es la forma de partida."));
    // la línea se dibuja con SVG de verdad (h() crea elementos HTML)
    const svgL = c.querySelector("#sb-linea"), nuevo = document.createElementNS(NS, "svg"); for (const a of svgL.attributes) nuevo.setAttribute(a.name, a.value); svgL.replaceWith(nuevo);
    nuevo.addEventListener("pointerdown", (ev) => { const r = nuevo.getBoundingClientRect(), mover = (e2) => { const v = Math.round(((e2.clientX - r.left) / r.width) * 360 - 180); S.ang = Math.max(-180, Math.min(180, v)); const ri = $("#sb-ang"); if (ri) ri.value = S.ang; pintarLinea(); pintarBotones(); };
      mover(ev); const up = () => { window.removeEventListener("pointermove", mover); window.removeEventListener("pointerup", up); pintarPanel(); }; window.addEventListener("pointermove", mover); window.addEventListener("pointerup", up); });
    pintarLinea(); pintarBotones(); }
  function pintarLinea() { const s = $("#sb-linea"); if (!s) return; s.replaceChildren(); const X = (a) => a + 180;
    sv("rect", { x: 0, y: 14, width: 360, height: 16, rx: 4, fill: "#ffffff0d" }, s);
    for (let a = -180; a <= 180; a += 45) { sv("line", { x1: X(a), y1: a % 90 ? 18 : 12, x2: X(a), y2: a % 90 ? 26 : 32, stroke: "#ffffff40", "stroke-width": a === 0 ? 1.6 : 0.8, "vector-effect": "non-scaling-stroke" }, s); sv("text", { x: X(a), y: 42, "font-size": 7, fill: "#a39bb3", "text-anchor": "middle" }, s).textContent = a + "°"; }
    for (const k of claves()) sv("path", { d: `M${X(k.ang)} 16 l6 6 l-6 6 l-6 -6 Z`, fill: Math.abs(k.ang - S.ang) < 0.5 ? "#fff" : "#f2a541", stroke: "#13111f", "stroke-width": 0.8, "vector-effect": "non-scaling-stroke" }, s);
    sv("line", { x1: X(S.ang), y1: 4, x2: X(S.ang), y2: 36, stroke: "#ff6a4a", "stroke-width": 2, "vector-effect": "non-scaling-stroke" }, s); }
  function pintarBotones() { const k = claveEn(Math.round(S.ang)), b1 = $("#sb-clave"), b2 = $("#sb-borrar"); if (b1) b1.disabled = !!k || Math.round(S.ang) === 0; if (b2) b2.disabled = !k; }
  function saltar(dir) { const ks = [...claves().map((k) => k.ang), 0].sort((a, b) => a - b), cand = dir > 0 ? ks.find((a) => a > S.ang + 0.5) : [...ks].reverse().find((a) => a < S.ang - 0.5); if (cand != null) { S.ang = cand; pintarPanel(); } }
  async function borrarClave() { const ang = Math.round(S.ang); if (!claveEn(ang)) return;
    E.cambio((x) => { const b = x.libre.huesos.find((y) => y.nombre === S.hueso); b.smart.claves = b.smart.claves.filter((k) => Math.abs(k.ang - ang) >= 0.5); if (!b.smart.claves.length) delete b.smart; }); }

  // ---- entrar y salir
  function editar(nombre) { if (S?.hueso === nombre) return salir(); S = { hueso: nombre, ang: claves().length ? 0 : 0 }; S.ang = 0; pintarPanel(); window.EPL?.pintar?.(); }
  function salir() { S = null; const c = $("#lb-smart"); if (c) c.hidden = true; capa?.remove(); capa = null; window.EPL?.pintar?.(); }
  document.addEventListener("keydown", (ev) => { if (ev.key === "Escape" && S && !document.querySelector(".hm-fondo, .taller:not([hidden])")) salir(); });

  // ---- lienzo: el personaje en el ángulo elegido, con sus puntos y huesos para arrastrar
  let capa = null, arr = null;
  function dibujar(m) { if (!S || !m?.libre) return; m.dibujar({ huesos: { [S.hueso]: S.ang } }); window.EPL?.fotograma(m); const cuerpo = m.g.lastChild;
    if (!capa || capa.parentNode !== cuerpo) { capa?.remove(); capa = sv("g", { class: "sb-puntos" }, cuerpo); }
    if (arr?.tipo === "punto") return;   // mientras se arrastra, los puntos se repintan al soltar (no se pierde el que se coge)
    capa.replaceChildren(); const k = E.escala?.() || 1;
    // tiradores: una línea fina hasta su punto (el primero de un tramo es del punto anterior; el segundo, del siguiente)
    for (const ed of m.editables()) ed.puntos.forEach(([x, y], i) => { if (ed.anclas?.[i] !== false) return; const q = ed.anclas[i - 1] ? ed.puntos[i - 1] : ed.anclas[i + 1] ? ed.puntos[i + 1] : null;
      if (q) sv("line", { x1: x.toFixed(1), y1: y.toFixed(1), x2: q[0].toFixed(1), y2: q[1].toFixed(1), stroke: "#7ab8ff", "stroke-width": 1.2, "stroke-opacity": 0.8, "pointer-events": "none" }, capa); });
    for (const ed of m.editables()) ed.puntos.forEach(([x, y, th], i) => { const an = ed.anclas?.[i] !== false;
      sv("circle", { cx: x.toFixed(1), cy: y.toFixed(1), r: an ? 4.5 : 3, fill: an ? "#ffffff" : "#7ab8ff", stroke: "#13111f", "stroke-width": 1.2, "fill-opacity": an ? 0.95 : 0.7, "data-sb": `${ed.capa}|${ed.idx}|${i}`, "data-th": th, style: "cursor:move" }, capa); }); }
  const local = (ev) => { const g = E.m?.g?.lastChild; if (!g) return [0, 0]; const pt = $("#lienzo").createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY; const q = pt.matrixTransform(g.getScreenCTM().inverse()); return [q.x, q.y]; };
  const lienzo = $("#lienzo");
  lienzo.addEventListener("pointerdown", (ev) => { if (!S || !esLibre()) return; const t = ev.target, p = local(ev);
    if (t.dataset?.sb) { ev.preventDefault(); ev.stopImmediatePropagation(); const [capaId, idx, i] = t.dataset.sb.split("|"), ed = E.m.editables().find((q) => q.capa === capaId && String(q.idx) === idx);
      // un ancla arrastra también sus dos tiradores (los puntos vecinos que no son anclas), como al mover un punto de una curva
      const n = +i, mov = [n]; if (ed?.anclas?.[n] !== false) { if (ed.anclas[n - 1] === false) mov.push(n - 1); if (ed.anclas[n + 1] === false) mov.push(n + 1); }
      const ths = mov.map((q) => ed.puntos[q]?.[2] || 0), act = interp(Math.round(S.ang)).puntos?.[capaId]?.[idx] || null, k0 = claveEn(Math.round(S.ang))?.puntos?.[capaId]?.[idx] || act;
      arr = { tipo: "punto", capa: capaId, idx, mov, ths, p0: p, base: k0 ? k0.slice() : new Array(ed.n * 2).fill(0) }; try { lienzo.setPointerCapture(ev.pointerId); } catch {} return; }
    const hb = t.closest?.("[data-hueso][data-punto='e']"); if (hb) { ev.preventDefault(); ev.stopImmediatePropagation(); arr = { tipo: hb.dataset.hueso === S.hueso ? "angulo" : "hueso", n: hb.dataset.hueso }; try { lienzo.setPointerCapture(ev.pointerId); } catch {} } }, true);
  lienzo.addEventListener("pointermove", (ev) => { if (!arr || !S) return; const p = local(ev);
    if (arr.tipo === "punto") { const dx = p[0] - arr.p0[0], dy = p[1] - arr.p0[1], v = arr.base.slice();
      arr.mov.forEach((q, n) => { const th = -arr.ths[n], c = Math.cos(th), s = Math.sin(th); v[2 * q] = +(arr.base[2 * q] + dx * c - dy * s).toFixed(2); v[2 * q + 1] = +(arr.base[2 * q + 1] + dx * s + dy * c).toFixed(2); });
      enClave((k) => { k.puntos = k.puntos || {}; (k.puntos[arr.capa] = k.puntos[arr.capa] || {})[arr.idx] = v; }, "sb-p-" + arr.capa + arr.idx + Math.round(S.ang));
      // el punto que se arrastra se mueve con el ratón (los demás se repintan al soltar)
      const c = capa?.querySelector(`[data-sb="${arr.capa}|${arr.idx}|${arr.mov[0]}"]`); if (c) { c.setAttribute("cx", p[0].toFixed(1)); c.setAttribute("cy", p[1].toFixed(1)); } return; }
    const b = E.m.esqueleto().find((y) => y.nombre === arr.n); if (!b) return;
    const ahora = Math.atan2(b.e[1] - b.o[1], b.e[0] - b.o[0]), quiere = Math.atan2(p[1] - b.o[1], p[0] - b.o[0]); let d = ((quiere - ahora) * 180) / Math.PI; while (d > 180) d -= 360; while (d < -180) d += 360; if (Math.abs(d) < 0.3) return;
    if (arr.tipo === "angulo") { S.ang = Math.max(-180, Math.min(180, Math.round(S.ang + d))); const ri = $("#sb-ang"); if (ri) ri.value = S.ang; pintarLinea(); pintarBotones(); return; }
    enClave((k) => { k.huesos = k.huesos || {}; k.huesos[arr.n] = +((k.huesos[arr.n] || 0) + d).toFixed(1); }, "sb-h-" + arr.n + Math.round(S.ang)); });
  const soltar = () => { if (!arr) return; const a = arr; arr = null; if (a.tipo === "angulo") pintarPanel(); else pintarPanel(); };
  lienzo.addEventListener("pointerup", soltar); lienzo.addEventListener("pointercancel", soltar);

  window.EPS = { editar, salir, activo: () => !!S && esLibre(), dibujar, get estado() { return S; }, reconstruir: () => { if (S && (!esLibre() || !huesoD())) salir(); else pintarPanel(); } };
})();
