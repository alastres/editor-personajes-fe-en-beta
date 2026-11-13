// TALLER DE DIBUJO del editor de personajes: dibujar piezas con vectores editables, sin salir del editor.
//   Taller.abrir({ titulo, textoGuardar, hueso, vista, dibujo, svg, colores, referencia(svgG, vista), alGuardar({ svg, dibujo }) })
// Modelo (se guarda en la pieza como `dibujo`, y el SVG resultante en `svg`):
//   { formas: [{ puntos: [{ x, y, ix, iy, ox, oy, esquina }], cerrada, relleno, trazo, grosor, opacidad, oculta }] }
//   ix/iy = tirador de entrada, ox/oy = de salida (coordenadas absolutas del hueso). Relleno y trazo pueden ser tokens:
//   "{piel}", "{ropa}", "{pelo}"… que en el vídeo toman los colores de cada personaje.
(() => {
  const NS = "http://www.w3.org/2000/svg", KAP = 0.5523;
  const $ = (s, r = document) => r.querySelector(s);
  const el = (tag, at = {}, padre) => { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); if (padre) padre.appendChild(e); return e; };
  const h = (tag, at = {}, ...hijos) => { const e = document.createElement(tag); for (const k in at) k === "class" ? (e.className = at[k]) : k.startsWith("on") ? e.addEventListener(k.slice(2), at[k]) : e.setAttribute(k, at[k]); hijos.forEach((c) => e.append(c)); return e; };
  const f2 = (x) => +x.toFixed(2), clon = (x) => JSON.parse(JSON.stringify(x));
  const TOKENS = [["{piel}", "Piel"], ["{pielS}", "Piel sombra"], ["{pielL}", "Piel luz"], ["{pelo}", "Pelo"], ["{peloS}", "Pelo sombra"], ["{peloL}", "Pelo brillo"], ["{ropa}", "Ropa"], ["{ropaS}", "Ropa sombra"], ["{ropaL}", "Ropa luz"], ["{cinto}", "Cinturón"], ["{boca}", "Boca"], ["{tinta}", "Tinta"]];
  const LIBRES = ["#f7f1e5", "#e6d6b4", "#d8b060", "#b8302a", "#be3f1c", "#7a9a5a", "#3f6fa0", "#5a5aa0", "#8a5a3a", "#3a2a2a", "#1d1a26", "#ffffff"];
  const HERR = [["sel", "Seleccionar y editar puntos", "V", "⬚"], ["pincel", "Pincel (trazo a mano alzada)", "B", "✎"], ["lazo", "Lazo (forma rellena a mano)", "L", "◌"], ["pluma", "Pluma (clic = esquina, arrastrar = curva; clic en el primer punto cierra)", "P", "✒"],
    ["elipse", "Elipse", "E", "◯"], ["rect", "Rectángulo redondeado", "R", "▢"], ["capsula", "Cápsula", "C", "⬭"]];

  // ---------------- geometría
  const d = (f) => { const P = f.puntos; if (!P.length) return ""; let s = `M${f2(P[0].x)} ${f2(P[0].y)}`;
    const seg = (a, b) => (s += ` C ${f2(a.ox ?? a.x)} ${f2(a.oy ?? a.y)} ${f2(b.ix ?? b.x)} ${f2(b.iy ?? b.y)} ${f2(b.x)} ${f2(b.y)}`);
    for (let i = 1; i < P.length; i++) seg(P[i - 1], P[i]); if (f.cerrada && P.length > 2) { seg(P[P.length - 1], P[0]); s += " Z"; } return s; };
  const pto = (x, y) => ({ x, y, ix: x, iy: y, ox: x, oy: y, esquina: true });
  // simplificación de Ramer-Douglas-Peucker y suavizado (Catmull-Rom → Bézier): el pulso tembloroso queda limpio
  function rdp(P, eps) { if (P.length < 3) return P; const [a, b] = [P[0], P[P.length - 1]]; let dm = 0, im = 0;
    for (let i = 1; i < P.length - 1; i++) { const dd = distSeg(P[i], a, b); if (dd > dm) { dm = dd; im = i; } }
    return dm > eps ? [...rdp(P.slice(0, im + 1), eps).slice(0, -1), ...rdp(P.slice(im), eps)] : [a, b]; }
  function distSeg(p, a, b) { const vx = b.x - a.x, vy = b.y - a.y, l = vx * vx + vy * vy || 1, t = Math.max(0, Math.min(1, ((p.x - a.x) * vx + (p.y - a.y) * vy) / l)); return Math.hypot(p.x - a.x - t * vx, p.y - a.y - t * vy); }
  function suavizar(P, cerrada) { const n = P.length, o = P.map((p) => pto(p.x, p.y));
    for (let i = 0; i < n; i++) { const prev = P[cerrada ? (i - 1 + n) % n : Math.max(0, i - 1)], next = P[cerrada ? (i + 1) % n : Math.min(n - 1, i + 1)];
      const tx = (next.x - prev.x) / 6, ty = (next.y - prev.y) / 6; Object.assign(o[i], { ix: P[i].x - tx, iy: P[i].y - ty, ox: P[i].x + tx, oy: P[i].y + ty, esquina: false }); }
    if (!cerrada && n > 1) { Object.assign(o[0], { ix: o[0].x, iy: o[0].y }); Object.assign(o[n - 1], { ox: o[n - 1].x, oy: o[n - 1].y }); } return o; }
  function elipse(cx, cy, rx, ry) { const k = KAP; return [
    { x: cx + rx, y: cy, ix: cx + rx, iy: cy - ry * k, ox: cx + rx, oy: cy + ry * k }, { x: cx, y: cy + ry, ix: cx + rx * k, iy: cy + ry, ox: cx - rx * k, oy: cy + ry },
    { x: cx - rx, y: cy, ix: cx - rx, iy: cy + ry * k, ox: cx - rx, oy: cy - ry * k }, { x: cx, y: cy - ry, ix: cx - rx * k, iy: cy - ry, ox: cx + rx * k, oy: cy - ry }].map((p) => Object.assign(p, { esquina: false })); }
  function rectR(x0, y0, x1, y1, r) { const [a, b] = [Math.min(x0, x1), Math.max(x0, x1)], [c, e] = [Math.min(y0, y1), Math.max(y0, y1)]; r = Math.min(r, (b - a) / 2, (e - c) / 2); const k = r * (1 - KAP);
    const P = [[a + r, c, a + k, c, a + r, c], [b - r, c, b - r, c, b - k, c], [b, c + r, b, c + k, b, c + r], [b, e - r, b, e - r, b, e - k], [b - r, e, b - k, e, b - r, e], [a + r, e, a + r, e, a + k, e], [a, e - r, a, e - k, a, e - r], [a, c + r, a, c + r, a, c + k]];
    return P.map(([x, y, ix, iy, ox, oy]) => ({ x, y, ix, iy, ox, oy, esquina: false })); }
  // punto de una Bézier (para insertar puntos sobre el trazo: de Casteljau)
  const lerpP = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  function partir(f, i, t) { const P = f.puntos, a = P[i], b = P[(i + 1) % P.length];
    const p0 = a, p1 = { x: a.ox, y: a.oy }, p2 = { x: b.ix, y: b.iy }, p3 = b, q0 = lerpP(p0, p1, t), q1 = lerpP(p1, p2, t), q2 = lerpP(p2, p3, t), r0 = lerpP(q0, q1, t), r1 = lerpP(q1, q2, t), s = lerpP(r0, r1, t);
    a.ox = q0.x; a.oy = q0.y; b.ix = q2.x; b.iy = q2.y; P.splice(i + 1, 0, { x: s.x, y: s.y, ix: r0.x, iy: r0.y, ox: r1.x, oy: r1.y, esquina: false }); }
  function bez(a, b, t) { const u = 1 - t; return { x: u * u * u * a.x + 3 * u * u * t * a.ox + 3 * u * t * t * b.ix + t * t * t * b.x, y: u * u * u * a.y + 3 * u * u * t * a.oy + 3 * u * t * t * b.iy + t * t * t * b.y }; }

  // ---------------- SVG ⇄ formas (para guardar y para convertir piezas existentes en editables)
  function aSVG(D) { return D.formas.filter((f) => !f.oculta && f.puntos.length > 1).map((f) => `<path d="${d(f)}" fill="${f.cerrada ? f.relleno || "none" : "none"}"${f.trazo && f.grosor ? ` stroke="${f.trazo}" stroke-width="${f2(f.grosor)}" stroke-linecap="round" stroke-linejoin="round"` : ""}${f.opacidad != null && f.opacidad < 1 ? ` opacity="${f2(f.opacidad)}"` : ""}/>`).join("\n"); }
  // lee path (M L H V C S Q T Z, absolutos y relativos), circle, ellipse, rect, line, polygon; aplica translate/scale/matrix de los grupos
  function deSVG(svgTxt) {
    const doc = new DOMParser().parseFromString(`<svg xmlns="${NS}">${svgTxt}</svg>`, "image/svg+xml"), raiz = doc.documentElement, formas = [];
    const mat = (n) => { let m = [1, 0, 0, 1, 0, 0]; const tr = n.getAttribute && n.getAttribute("transform"); if (!tr) return m;
      for (const [, f, args] of tr.matchAll(/(\w+)\(([^)]*)\)/g)) { const v = args.split(/[\s,]+/).filter(Boolean).map(Number); let t;
        if (f === "translate") t = [1, 0, 0, 1, v[0], v[1] || 0]; else if (f === "scale") t = [v[0], 0, 0, v[1] ?? v[0], 0, 0];
        else if (f === "rotate") { const a = (v[0] * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a), cx = v[1] || 0, cy = v[2] || 0; t = [c, s, -s, c, cx - c * cx + s * cy, cy - s * cx - c * cy]; } else if (f === "matrix") t = v; else continue;
        m = mul(m, t); } return m; };
    const mul = (a, b) => [a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1], a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3], a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5]];
    const ap = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
    function forma(n, m, estilo) { const at = (k) => n.getAttribute(k) ?? estilo[k]; const op = parseFloat(at("opacity") ?? 1) * parseFloat(at("fill-opacity") ?? 1);
      const base = { relleno: at("fill") ?? "#000000", trazo: at("stroke") && at("stroke") !== "none" ? at("stroke") : null, grosor: at("stroke") && at("stroke") !== "none" ? parseFloat(at("stroke-width") || 1) * Math.hypot(m[0], m[1]) : 0, opacidad: op < 1 ? op : undefined };
      const T = (p) => { const [x, y] = ap(m, p.x, p.y), [ix, iy] = ap(m, p.ix, p.iy), [ox, oy] = ap(m, p.ox, p.oy); return { x, y, ix, iy, ox, oy, esquina: p.esquina }; };
      const tag = n.tagName.toLowerCase(); let subs = [];
      if (tag === "circle" || tag === "ellipse") { const cx = +at("cx") || 0, cy = +at("cy") || 0, rx = +(at("r") ?? at("rx")) || 0, ry = +(at("r") ?? at("ry")) || 0; subs = [{ puntos: elipse(cx, cy, rx, ry), cerrada: true }]; }
      else if (tag === "rect") { const x = +at("x") || 0, y = +at("y") || 0, w = +at("width") || 0, hh = +at("height") || 0, r = +(at("rx") ?? at("ry") ?? 0); subs = [{ puntos: r ? rectR(x, y, x + w, y + hh, r) : [pto(x, y), pto(x + w, y), pto(x + w, y + hh), pto(x, y + hh)], cerrada: true }]; }
      else if (tag === "line") subs = [{ puntos: [pto(+at("x1"), +at("y1")), pto(+at("x2"), +at("y2"))], cerrada: false }];
      else if (tag === "polygon" || tag === "polyline") { const v = (at("points") || "").trim().split(/[\s,]+/).map(Number), P = []; for (let i = 0; i + 1 < v.length; i += 2) P.push(pto(v[i], v[i + 1])); subs = [{ puntos: P, cerrada: tag === "polygon" }]; }
      else if (tag === "path") subs = rutas(at("d") || "");
      for (const sb of subs) if (sb.puntos.length > 1) formas.push(Object.assign({}, base, sb, { puntos: sb.puntos.map(T), relleno: sb.cerrada || base.relleno === "none" ? base.relleno : "none", trazo: base.trazo || (!sb.cerrada && base.relleno !== "none" ? base.relleno : base.trazo), grosor: base.grosor || (!sb.cerrada ? 4 : 0) })); }
    function recorre(n, m, estilo) { for (const c of n.children) { const m2 = mul(m, mat(c)), est = Object.assign({}, estilo); for (const k of ["fill", "stroke", "stroke-width", "opacity"]) if (c.getAttribute(k) != null && c.tagName === "g") est[k] = c.getAttribute(k);
      if (c.tagName === "g") recorre(c, m2, est); else forma(c, m2, est); } }
    recorre(raiz, [1, 0, 0, 1, 0, 0], {}); return { formas };
  }
  function rutas(dtxt) { const tok = dtxt.match(/[a-zA-Z]|-?\d*\.?\d+(?:e[-+]?\d+)?/g) || []; let i = 0, cmd = "", cx = 0, cy = 0, sx = 0, sy = 0, lastC = null, lastQ = null; const out = []; let cur = null;
    const num = () => parseFloat(tok[i++]);
    const nueva = (x, y) => { cur = { puntos: [pto(x, y)], cerrada: false }; out.push(cur); };
    const curva = (x1, y1, x2, y2, x, y) => { const a = cur.puntos[cur.puntos.length - 1]; a.ox = x1; a.oy = y1; a.esquina = false; cur.puntos.push({ x, y, ix: x2, iy: y2, ox: x, oy: y, esquina: false }); lastC = [x2, y2]; };
    while (i < tok.length) { if (/[a-zA-Z]/.test(tok[i])) cmd = tok[i++]; const rel = cmd === cmd.toLowerCase(), C = cmd.toUpperCase(), ox = rel ? cx : 0, oy = rel ? cy : 0;
      if (C === "Z") { if (cur) { const a = cur.puntos[0], b = cur.puntos[cur.puntos.length - 1]; if (cur.puntos.length > 1 && Math.hypot(a.x - b.x, a.y - b.y) < 0.01) { a.ix = b.ix; a.iy = b.iy; cur.puntos.pop(); } cur.cerrada = true; cx = sx; cy = sy; } lastC = lastQ = null; continue; }
      if (C === "M") { const x = num() + ox, y = num() + oy; nueva(x, y); cx = sx = x; cy = sy = y; cmd = rel ? "l" : "L"; lastC = lastQ = null; continue; }
      if (!cur) nueva(cx, cy);
      if (C === "L") { const x = num() + ox, y = num() + oy; cur.puntos.push(pto(x, y)); cx = x; cy = y; lastC = lastQ = null; }
      else if (C === "H") { const x = num() + ox; cur.puntos.push(pto(x, cy)); cx = x; lastC = lastQ = null; }
      else if (C === "V") { const y = num() + oy; cur.puntos.push(pto(cx, y)); cy = y; lastC = lastQ = null; }
      else if (C === "C") { const a = [num() + ox, num() + oy, num() + ox, num() + oy, num() + ox, num() + oy]; curva(...a); cx = a[4]; cy = a[5]; lastQ = null; }
      else if (C === "S") { const r1 = lastC ? [2 * cx - lastC[0], 2 * cy - lastC[1]] : [cx, cy]; const a = [num() + ox, num() + oy, num() + ox, num() + oy]; curva(r1[0], r1[1], a[0], a[1], a[2], a[3]); cx = a[2]; cy = a[3]; lastQ = null; }
      else if (C === "Q" || C === "T") { const q = C === "Q" ? [num() + ox, num() + oy] : lastQ ? [2 * cx - lastQ[0], 2 * cy - lastQ[1]] : [cx, cy]; const x = num() + ox, y = num() + oy;
        curva(cx + (2 / 3) * (q[0] - cx), cy + (2 / 3) * (q[1] - cy), x + (2 / 3) * (q[0] - x), y + (2 / 3) * (q[1] - y), x, y); lastQ = q; cx = x; cy = y; }
      else if (C === "A") { for (let k = 0; k < 5; k++) num(); const x = num() + ox, y = num() + oy; cur.puntos.push(pto(x, y)); cx = x; cy = y; }   // arcos: aproximados a recta
      else i++; }
    return out; }

  // ---------------- interfaz
  let raiz = null, cfg = null, D = null, sel = null, herr = "sel", hist = [], fut = [], vista = { x: -200, y: -200, w: 400, h: 400 }, estilo = { relleno: "{ropa}", trazo: "{tinta}", grosor: 0 };
  let colores = {};
  const res = (c) => (c && c.startsWith("{") ? colores[c.slice(1, -1)] || "#888" : c || "none");
  function construir() {
    raiz = h("div", { class: "taller", hidden: "" });
    raiz.innerHTML = `
      <div class="taller-barra"><b id="tl-titulo">Dibujar pieza</b><div class="seg pequeno" id="tl-vista"></div><span class="tenue" id="tl-ayuda"></span>
        <button id="tl-cancelar">Cancelar</button><button id="tl-guardar" class="primario">Guardar pieza</button></div>
      <div class="taller-cuerpo">
        <div class="taller-herr" id="tl-herr"></div>
        <div class="taller-lienzo"><svg id="tl-svg"><g id="tl-ref"></g><g id="tl-ejes"></g><g id="tl-formas"></g><g id="tl-asas"></g><path id="tl-trazo" fill="none" stroke="#f0a33a" stroke-width="2" stroke-dasharray="4 3"/></svg>
          <div class="tl-zoom"><button id="tl-zm">−</button><button id="tl-z0">Encajar</button><button id="tl-zp">+</button><label class="chk"><input type="checkbox" id="tl-verref" checked> Ver el personaje</label></div></div>
        <div class="taller-panel">
          <h4>Relleno</h4><div class="paleta" id="tl-relleno"></div>
          <h4>Contorno</h4><div class="paleta" id="tl-trazo-c"></div>
          <div class="deslizador"><label>Grosor del contorno o pincel</label><input type="range" id="tl-grosor" min="0" max="30" step="0.5"><output></output></div>
          <div class="deslizador"><label>Opacidad</label><input type="range" id="tl-opac" min="0.1" max="1" step="0.05"><output></output></div>
          <h4>Formas <span class="tenue">(la de arriba se ve encima)</span></h4><ul class="capas" id="tl-capas"></ul>
          <div class="fila-botones tres"><button id="tl-dup">Duplicar</button><button id="tl-refl">Reflejar ↔</button><button id="tl-reflv">Reflejar ↕</button>
            <button id="tl-menos">Encoger</button><button id="tl-mas">Agrandar</button><button id="tl-rot">Girar 15°</button>
            <button id="tl-subir">Subir</button><button id="tl-bajar">Bajar</button><button id="tl-borrar" class="peligro">Borrar</button></div>
          <label class="chk"><input type="checkbox" id="tl-cerrada"> Forma cerrada (con relleno)</label>
          <p class="ayuda">Con <b>Seleccionar</b>: arrastra la forma para moverla, los cuadrados para mover puntos y los círculos para curvar. Doble clic en un punto: esquina ⇄ curva. Doble clic en el trazo: añade un punto. Alt + clic en un punto: lo quita. Supr borra; Ctrl+Z deshace; rueda = zoom; espacio + arrastrar = mover la vista.</p>
        </div>
      </div>`;
    document.body.append(raiz);
    for (const [k, t, tecla, ic] of HERR) $("#tl-herr", raiz).append(h("button", { "data-h": k, title: `${t} (${tecla})`, onclick: () => ponerHerr(k) }, h("span", { class: "ic" }, ic), h("span", { class: "tx" }, t.split(" (")[0])));
    $("#tl-cancelar", raiz).onclick = () => cerrar(); $("#tl-guardar", raiz).onclick = guardar;
    $("#tl-zm", raiz).onclick = () => zoom(1.25); $("#tl-zp", raiz).onclick = () => zoom(0.8); $("#tl-z0", raiz).onclick = encajar;
    $("#tl-verref", raiz).onchange = (ev) => { $("#tl-ref", raiz).style.display = ev.target.checked ? "" : "none"; };
    $("#tl-grosor", raiz).oninput = (ev) => { const v = +ev.target.value; estilo.grosor = v; if (sel !== null) editarForma((f) => { f.grosor = v; if (v && !f.trazo) f.trazo = estilo.trazo || "{tinta}"; }, "grosor"); pintarPanel(); };
    $("#tl-opac", raiz).oninput = (ev) => { if (sel !== null) editarForma((f) => { f.opacidad = +ev.target.value; }, "opac"); };
    $("#tl-cerrada", raiz).onchange = (ev) => { if (sel !== null) editarForma((f) => { f.cerrada = ev.target.checked; if (f.cerrada && (!f.relleno || f.relleno === "none")) f.relleno = estilo.relleno; }); };
    const accion = (id, fn) => ($("#" + id, raiz).onclick = () => { if (sel === null) return; fn(); });
    accion("tl-dup", () => { guardarHist(); const f = clon(D.formas[sel]); f.puntos.forEach((p) => { for (const k of ["x", "ix", "ox"]) p[k] += 12; for (const k of ["y", "iy", "oy"]) p[k] += 12; }); D.formas.splice(sel + 1, 0, f); sel++; pintar(); });
    const transf = (fn) => { guardarHist(); const f = D.formas[sel], c = centro(f); f.puntos.forEach((p) => { for (const [a, b] of [["x", "y"], ["ix", "iy"], ["ox", "oy"]]) { const [x, y] = fn(p[a] - c.x, p[b] - c.y); p[a] = x + c.x; p[b] = y + c.y; } }); pintar(); };
    accion("tl-refl", () => { transf((x, y) => [-x, y]); D.formas[sel].puntos.reverse().forEach((p) => { [p.ix, p.iy, p.ox, p.oy] = [p.ox, p.oy, p.ix, p.iy]; }); pintar(); });
    accion("tl-reflv", () => { transf((x, y) => [x, -y]); D.formas[sel].puntos.reverse().forEach((p) => { [p.ix, p.iy, p.ox, p.oy] = [p.ox, p.oy, p.ix, p.iy]; }); pintar(); });
    accion("tl-menos", () => transf((x, y) => [x * 0.9, y * 0.9])); accion("tl-mas", () => transf((x, y) => [x * 1.1, y * 1.1]));
    accion("tl-rot", () => { const a = (15 * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a); transf((x, y) => [x * c - y * s, x * s + y * c]); });
    accion("tl-subir", () => { if (sel >= D.formas.length - 1) return; guardarHist(); [D.formas[sel], D.formas[sel + 1]] = [D.formas[sel + 1], D.formas[sel]]; sel++; pintar(); });
    accion("tl-bajar", () => { if (sel <= 0) return; guardarHist(); [D.formas[sel], D.formas[sel - 1]] = [D.formas[sel - 1], D.formas[sel]]; sel--; pintar(); });
    accion("tl-borrar", borrarForma);
    eventosLienzo(); document.addEventListener("keydown", teclas);
  }
  const centro = (f) => { const xs = f.puntos.map((p) => p.x), ys = f.puntos.map((p) => p.y); return { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 }; };
  function ponerHerr(k) { herr = k; [...$("#tl-herr", raiz).children].forEach((b) => b.classList.toggle("activo", b.dataset.h === k));
    $("#tl-ayuda", raiz).textContent = { sel: "Clic en una forma para editarla.", pincel: "Dibuja un trazo: se suaviza al soltar.", lazo: "Dibuja el contorno de una forma rellena.", pluma: "Clic = punto de esquina · arrastrar = curva · clic en el primer punto o Intro = terminar.", elipse: "Arrastra para dibujar una elipse.", rect: "Arrastra para dibujar un rectángulo redondeado.", capsula: "Arrastra para dibujar una cápsula." }[k];
    $("#tl-svg", raiz).style.cursor = k === "sel" ? "default" : "crosshair"; if (k !== "pluma") plumaFin(); pintarAsas(); }
  function guardarHist() { hist.push(JSON.stringify(D)); if (hist.length > 150) hist.shift(); fut = []; }
  let ultClave = null, tClave = 0;
  function editarForma(fn, clave) { if (!(clave && clave === ultClave && Date.now() - tClave < 800)) guardarHist(); ultClave = clave; tClave = Date.now(); fn(D.formas[sel]); pintar(); }
  function deshacer() { if (!hist.length) return; fut.push(JSON.stringify(D)); D = JSON.parse(hist.pop()); if (sel !== null && sel >= D.formas.length) sel = null; pintar(); }
  function rehacer() { if (!fut.length) return; hist.push(JSON.stringify(D)); D = JSON.parse(fut.pop()); pintar(); }
  function borrarForma() { if (sel === null) return; guardarHist(); D.formas.splice(sel, 1); sel = null; pintar(); }

  // ---- vista (zoom y desplazamiento)
  function aplicarVista() { $("#tl-svg", raiz).setAttribute("viewBox", `${f2(vista.x)} ${f2(vista.y)} ${f2(vista.w)} ${f2(vista.h)}`); pintarAsas(); }
  function zoom(k, cx, cy) { const s = $("#tl-svg", raiz), r = s.getBoundingClientRect(); cx = cx ?? vista.x + vista.w / 2; cy = cy ?? vista.y + vista.h / 2;
    const ar = r.width / Math.max(1, r.height); vista.w *= k; vista.h = vista.w / ar; vista.x = cx - (cx - vista.x) * k; vista.y = cy - (cy - vista.y) * k; aplicarVista(); }
  function encajar() { const s = $("#tl-svg", raiz), r = s.getBoundingClientRect(), ar = r.width / Math.max(1, r.height); let x0 = -150, y0 = -150, x1 = 150, y1 = 150;
    for (const f of D.formas) for (const p of f.puntos) { x0 = Math.min(x0, p.x - 40); y0 = Math.min(y0, p.y - 40); x1 = Math.max(x1, p.x + 40); y1 = Math.max(y1, p.y + 40); }
    let w = x1 - x0, hh = y1 - y0; if (w / hh > ar) hh = w / ar; else w = hh * ar; vista = { x: (x0 + x1) / 2 - w / 2, y: (y0 + y1) / 2 - hh / 2, w, h: hh }; aplicarVista(); }
  const escalaPx = () => vista.w / Math.max(1, $("#tl-svg", raiz).getBoundingClientRect().width);   // unidades por píxel de pantalla
  function local(ev) { const s = $("#tl-svg", raiz), m = s.getScreenCTM().inverse(), p = s.createSVGPoint(); p.x = ev.clientX; p.y = ev.clientY; const q = p.matrixTransform(m); return { x: q.x, y: q.y }; }

  // ---- pintar
  function pintar() { pintarFormas(); pintarAsas(); pintarPanel(); }
  function pintarFormas() { const g = $("#tl-formas", raiz); g.replaceChildren();
    D.formas.forEach((f, i) => { if (f.oculta) return; el("path", { d: d(f), fill: f.cerrada ? res(f.relleno) : "none", stroke: f.trazo && f.grosor ? res(f.trazo) : (f.cerrada ? "none" : "#888"), "stroke-width": f.grosor || (f.cerrada ? 0 : 2), "stroke-linecap": "round", "stroke-linejoin": "round", opacity: f.opacidad ?? 1, "data-i": i, class: "forma" + (i === sel ? " sel" : "") }, g); }); }
  function pintarAsas() { if (!raiz) return; const g = $("#tl-asas", raiz); g.replaceChildren(); if (sel === null || herr !== "sel" || !D.formas[sel]) return; const f = D.formas[sel], k = escalaPx();
    el("path", { d: d(f), fill: "none", stroke: "#f0a33a", "stroke-width": 1.5 * k, "pointer-events": "none" }, g);
    f.puntos.forEach((p, i) => { if (!p.esquina) { for (const [hx, hy, t] of [[p.ix, p.iy, "i"], [p.ox, p.oy, "o"]]) { if (Math.hypot(hx - p.x, hy - p.y) < 0.5) continue;
          el("line", { x1: p.x, y1: p.y, x2: hx, y2: hy, stroke: "#7ab8ff", "stroke-width": 1.2 * k }, g); el("circle", { cx: hx, cy: hy, r: 4.5 * k, fill: "#1b1830", stroke: "#7ab8ff", "stroke-width": 1.5 * k, "data-asa": t, "data-p": i, class: "asa" }, g); } }
      el("rect", { x: p.x - 5 * k, y: p.y - 5 * k, width: 10 * k, height: 10 * k, fill: p.esquina ? "#f0a33a" : "#fff", stroke: "#1b1830", "stroke-width": 1.5 * k, "data-p": i, class: "punto" }, g); }); }
  function paleta(cont, actual, alElegir, conNinguno) { const c = $(cont, raiz); c.replaceChildren();
    if (conNinguno) c.append(h("button", { class: "sw ninguno" + (!actual || actual === "none" ? " activo" : ""), title: "Sin color", onclick: () => alElegir(null) }, "∅"));
    for (const [tk, n] of TOKENS) { const b = h("button", { class: "sw token" + (actual === tk ? " activo" : ""), title: n + " (color del personaje)", onclick: () => alElegir(tk) }); b.style.background = res(tk); c.append(b); }
    for (const col of LIBRES) { const b = h("button", { class: "sw" + (actual === col ? " activo" : ""), title: col, onclick: () => alElegir(col) }); b.style.background = col; c.append(b); }
    const otro = h("input", { type: "color", value: actual && actual.startsWith("#") ? actual : "#888888", title: "Otro color" }); otro.oninput = () => alElegir(otro.value); c.append(h("label", { class: "sw otro", title: "Otro color" }, "+", otro)); }
  function pintarPanel() { if (!raiz) return; const f = sel !== null ? D.formas[sel] : null;
    paleta("#tl-relleno", f ? (f.cerrada ? f.relleno : "none") : estilo.relleno, (c) => { estilo.relleno = c || "none"; if (f) editarForma((x) => { x.relleno = c || "none"; if (c) x.cerrada = true; }); else pintarPanel(); }, true);
    paleta("#tl-trazo-c", f ? (f.grosor ? f.trazo : null) : estilo.trazo, (c) => { estilo.trazo = c; if (f) editarForma((x) => { x.trazo = c; if (c && !x.grosor) x.grosor = estilo.grosor || 4; if (!c) x.grosor = 0; }); else pintarPanel(); }, true);
    const g = $("#tl-grosor", raiz); if (document.activeElement !== g) g.value = f ? f.grosor || 0 : estilo.grosor; g.nextElementSibling.textContent = (+g.value).toFixed(1);
    const o = $("#tl-opac", raiz); if (document.activeElement !== o) o.value = f?.opacidad ?? 1; o.nextElementSibling.textContent = Math.round((+o.value) * 100) + "%";
    $("#tl-cerrada", raiz).checked = !!f?.cerrada; $("#tl-cerrada", raiz).disabled = !f;
    raiz.querySelectorAll(".taller-panel .fila-botones button").forEach((b) => (b.disabled = !f));
    const ul = $("#tl-capas", raiz); ul.replaceChildren(); if (!D.formas.length) ul.append(h("li", { class: "vacio" }, "Aún no hay formas: elige una herramienta y dibuja."));
    [...D.formas.keys()].reverse().forEach((i) => { const fo = D.formas[i], mini = h("span", { class: "mini" }); mini.style.background = fo.cerrada ? res(fo.relleno) : "transparent"; mini.style.borderColor = fo.grosor ? res(fo.trazo) : "#4a4466";
      const ojo = h("button", { class: "ojo" + (fo.oculta ? " apagado" : ""), title: "Mostrar u ocultar", onclick: (ev) => { ev.stopPropagation(); guardarHist(); fo.oculta = !fo.oculta; pintar(); } }, fo.oculta ? "○" : "●");
      ul.append(h("li", { class: i === sel ? "activo" : "", onclick: () => { sel = i; ponerHerr("sel"); pintar(); } }, ojo, mini, h("span", {}, `Forma ${i + 1} · ${fo.puntos.length} puntos${fo.cerrada ? "" : " · trazo"}`))); }); }

  // ---- ratón
  let arr = null, espacio = false, pluma = null;
  function plumaFin() { if (pluma && pluma.forma.puntos.length < 2) D.formas.splice(D.formas.indexOf(pluma.forma), 1); pluma = null; $("#tl-trazo", raiz) && $("#tl-trazo", raiz).setAttribute("d", ""); }
  function eventosLienzo() { const s = $("#tl-svg", raiz);
    s.addEventListener("wheel", (ev) => { ev.preventDefault(); const p = local(ev); zoom(ev.deltaY > 0 ? 1.12 : 0.89, p.x, p.y); }, { passive: false });
    s.addEventListener("pointerdown", (ev) => { try { s.setPointerCapture(ev.pointerId); } catch {} const p = local(ev);
      if (espacio || ev.button === 1) { arr = { pan: true, x0: ev.clientX, y0: ev.clientY, v: Object.assign({}, vista) }; return; }
      if (herr === "sel") {
        const t = ev.target, fi = sel;
        if (t.classList.contains("punto")) { const i = +t.dataset.p, f = D.formas[fi];
          if (ev.altKey) { if (f.puntos.length > 2) { guardarHist(); f.puntos.splice(i, 1); pintar(); } return; }
          guardarHist(); arr = { punto: i, p0: p, orig: clon(f.puntos[i]) }; return; }
        if (t.classList.contains("asa")) { guardarHist(); arr = { asa: t.dataset.asa, punto: +t.dataset.p }; return; }
        if (t.classList.contains("forma")) { sel = +t.dataset.i; guardarHist(); arr = { mover: true, p0: p, orig: clon(D.formas[sel].puntos) }; pintar(); return; }
        sel = null; pintar(); return; }
      if (herr === "pincel" || herr === "lazo") { arr = { dibujo: [p] }; return; }
      if (herr === "pluma") { if (!pluma) { guardarHist(); const f = { puntos: [], cerrada: false, relleno: estilo.relleno === "none" ? "{ropa}" : estilo.relleno, trazo: estilo.trazo || "{tinta}", grosor: estilo.grosor || 3 }; D.formas.push(f); sel = D.formas.length - 1; pluma = { forma: f }; }
        const f = pluma.forma, P = f.puntos, k = escalaPx();
        if (P.length > 2 && Math.hypot(p.x - P[0].x, p.y - P[0].y) < 10 * k) { f.cerrada = true; f.grosor = estilo.grosor; plumaFin(); ponerHerr("sel"); pintar(); return; }
        P.push(pto(p.x, p.y)); arr = { pluma: P.length - 1, p0: p }; pintar(); return; }
      if (["elipse", "rect", "capsula"].includes(herr)) { guardarHist(); const f = { puntos: [], cerrada: true, relleno: estilo.relleno === "none" ? "{ropa}" : estilo.relleno, trazo: estilo.trazo, grosor: estilo.grosor }; D.formas.push(f); sel = D.formas.length - 1; arr = { forma: herr, p0: p, f }; } });
    s.addEventListener("pointermove", (ev) => { if (!arr) { if (pluma && pluma.forma.puntos.length) { const p = local(ev), P = pluma.forma.puntos, u = P[P.length - 1]; $("#tl-trazo", raiz).setAttribute("d", `M${u.x} ${u.y} L ${p.x} ${p.y}`); } return; }
      const p = local(ev);
      if (arr.pan) { const k = vista.w / s.getBoundingClientRect().width; vista.x = arr.v.x - (ev.clientX - arr.x0) * k; vista.y = arr.v.y - (ev.clientY - arr.y0) * k; aplicarVista(); return; }
      if (arr.punto !== undefined && !arr.asa) { const f = D.formas[sel], q = f.puntos[arr.punto], dx = p.x - arr.p0.x, dy = p.y - arr.p0.y, o = arr.orig;
        Object.assign(q, { x: o.x + dx, y: o.y + dy, ix: o.ix + dx, iy: o.iy + dy, ox: o.ox + dx, oy: o.oy + dy }); pintarFormas(); pintarAsas(); return; }
      if (arr.asa) { const q = D.formas[sel].puntos[arr.punto], [a, b] = arr.asa === "i" ? ["ix", "iy"] : ["ox", "oy"], [c, e] = arr.asa === "i" ? ["ox", "oy"] : ["ix", "iy"];
        q[a] = p.x; q[b] = p.y; if (!ev.altKey) { const l = Math.hypot(q[c] - q.x, q[e] - q.y) || Math.hypot(p.x - q.x, p.y - q.y), v = Math.hypot(p.x - q.x, p.y - q.y) || 1; q[c] = q.x - ((p.x - q.x) / v) * l; q[e] = q.y - ((p.y - q.y) / v) * l; }   // Alt = romper la simetría
        pintarFormas(); pintarAsas(); return; }
      if (arr.mover) { const dx = p.x - arr.p0.x, dy = p.y - arr.p0.y; D.formas[sel].puntos.forEach((q, i) => { const o = arr.orig[i]; Object.assign(q, { x: o.x + dx, y: o.y + dy, ix: o.ix + dx, iy: o.iy + dy, ox: o.ox + dx, oy: o.oy + dy }); }); pintarFormas(); pintarAsas(); return; }
      if (arr.dibujo) { arr.dibujo.push(p); $("#tl-trazo", raiz).setAttribute("d", "M" + arr.dibujo.map((q) => `${f2(q.x)} ${f2(q.y)}`).join(" L ")); return; }
      if (arr.pluma !== undefined) { const q = pluma.forma.puntos[arr.pluma]; if (Math.hypot(p.x - arr.p0.x, p.y - arr.p0.y) > 3 * escalaPx()) { q.esquina = false; q.ox = p.x; q.oy = p.y; q.ix = 2 * q.x - p.x; q.iy = 2 * q.y - p.y; pintarFormas(); } return; }
      if (arr.forma) { const a = arr.p0, f = arr.f, w = Math.abs(p.x - a.x), hh = Math.abs(p.y - a.y);
        f.puntos = arr.forma === "elipse" ? elipse((a.x + p.x) / 2, (a.y + p.y) / 2, w / 2, hh / 2) : rectR(a.x, a.y, p.x, p.y, arr.forma === "capsula" ? Math.min(w, hh) / 2 : Math.min(w, hh) * 0.2); pintarFormas(); } });
    const soltar = () => { if (!arr) return; const a = arr; arr = null;
      if (a.dibujo) { $("#tl-trazo", raiz).setAttribute("d", ""); const lazo = herr === "lazo"; if (a.dibujo.length < 3) return;
        const P = rdp(a.dibujo, 2.2 * escalaPx()); if (P.length < 2) return; guardarHist();
        D.formas.push({ puntos: suavizar(lazo && P.length > 3 && Math.hypot(P[0].x - P[P.length - 1].x, P[0].y - P[P.length - 1].y) < 1e-6 ? P.slice(0, -1) : P, lazo), cerrada: lazo, relleno: lazo ? (estilo.relleno === "none" ? "{ropa}" : estilo.relleno) : "none", trazo: lazo ? estilo.trazo : estilo.trazo || "{tinta}", grosor: lazo ? estilo.grosor : estilo.grosor || 6 });
        sel = D.formas.length - 1; pintar(); return; }
      if (a.forma) { if (a.f.puntos.length < 2 || Math.abs(a.f.puntos[0].x - a.f.puntos[2].x) < 2 * escalaPx()) { D.formas.splice(D.formas.indexOf(a.f), 1); hist.pop(); sel = null; } ponerHerr("sel"); pintar(); return; }
      pintar(); };
    s.addEventListener("pointerup", soltar); s.addEventListener("pointercancel", soltar);
    // doble clic: en un punto, esquina ⇄ curva; en el trazo de la forma elegida, añadir un punto
    s.addEventListener("dblclick", (ev) => { if (herr !== "sel" || sel === null) return; const t = ev.target, f = D.formas[sel], p = local(ev);
      if (t.classList.contains("punto")) { guardarHist(); const i = +t.dataset.p, q = f.puntos[i];
        if (q.esquina) { const n = f.puntos.length, prev = f.puntos[(i - 1 + n) % n], next = f.puntos[(i + 1) % n], tx = (next.x - prev.x) / 6, ty = (next.y - prev.y) / 6; Object.assign(q, { esquina: false, ix: q.x - tx, iy: q.y - ty, ox: q.x + tx, oy: q.y + ty }); }
        else Object.assign(q, { esquina: true, ix: q.x, iy: q.y, ox: q.x, oy: q.y }); pintar(); return; }
      let mejor = null; const n = f.puntos.length, segs = f.cerrada ? n : n - 1;
      for (let i = 0; i < segs; i++) for (let k = 1; k < 20; k++) { const t2 = k / 20, b = bez(f.puntos[i], f.puntos[(i + 1) % n], t2), dd = Math.hypot(b.x - p.x, b.y - p.y); if (!mejor || dd < mejor.d) mejor = { d: dd, i, t: t2 }; }
      if (mejor && mejor.d < 14 * escalaPx()) { guardarHist(); partir(f, mejor.i, mejor.t); pintar(); } });
  }
  function teclas(ev) { if (!raiz || raiz.hidden) return; const a = document.activeElement; if (a && ["INPUT", "TEXTAREA"].includes(a.tagName) && a.type !== "range" && a.type !== "checkbox") return;
    if (ev.code === "Space") { espacio = ev.type === "keydown"; ev.preventDefault(); return; }
    if (ev.type !== "keydown") return; ev.stopPropagation();
    const k = ev.key.toLowerCase();
    if ((ev.ctrlKey || ev.metaKey) && k === "z" && !ev.shiftKey) { ev.preventDefault(); deshacer(); return; }
    if ((ev.ctrlKey || ev.metaKey) && (k === "y" || (k === "z" && ev.shiftKey))) { ev.preventDefault(); rehacer(); return; }
    if (k === "delete" || k === "backspace") { ev.preventDefault(); borrarForma(); return; }
    if (k === "enter" || k === "escape") { if (pluma) { plumaFin(); ponerHerr("sel"); pintar(); } else if (k === "escape") { sel = null; pintar(); } return; }
    const m = HERR.find(([, , tecla]) => tecla.toLowerCase() === k); if (m && !ev.ctrlKey) ponerHerr(m[0]); }
  document.addEventListener("keyup", (ev) => { if (ev.code === "Space") espacio = false; });

  // ---- abrir / guardar
  function ponerVista(v) { cfg.vista = v; seg(); $("#tl-ref", raiz).replaceChildren(); if (cfg.referencia) cfg.referencia($("#tl-ref", raiz), v);
    const ej = $("#tl-ejes", raiz); ej.replaceChildren(); el("line", { x1: -2000, y1: 0, x2: 2000, y2: 0, stroke: "#ffffff", "stroke-opacity": 0.12 }, ej); el("line", { x1: 0, y1: -2000, x2: 0, y2: 2000, stroke: "#ffffff", "stroke-opacity": 0.12 }, ej);
    el("circle", { cx: 0, cy: 0, r: 4, fill: "#ff6a4a" }, ej); }
  function seg() { const c = $("#tl-vista", raiz); c.replaceChildren(); if (!cfg.vistas) return;
    for (const [k, n] of Object.entries(cfg.vistas)) c.append(h("button", { class: k === cfg.vista ? "activo" : "", onclick: () => { if (k === cfg.vista) return; cfg.dibujos[cfg.vista] = D; D = cfg.dibujos[k] || { formas: [] }; sel = null; hist = []; fut = []; ponerVista(k); pintar(); } }, n)); }
  function abrir(op) {
    if (!raiz) construir(); cfg = Object.assign({ vistas: null, vista: "frente", dibujos: {} }, op); colores = op.colores || {};
    // un dibujo por vista; si la pieza venía de un SVG (biblioteca o importado), se convierte en vectores editables
    for (const v of Object.keys(cfg.vistas || { frente: 1 })) if (!cfg.dibujos[v] && cfg.svgs?.[v]) { try { cfg.dibujos[v] = deSVG(cfg.svgs[v]); } catch { cfg.dibujos[v] = { formas: [] }; } }
    D = clon(cfg.dibujos[cfg.vista] || { formas: [] }); Object.keys(cfg.dibujos).forEach((k) => (cfg.dibujos[k] = clon(cfg.dibujos[k])));
    sel = null; hist = []; fut = []; $("#tl-titulo", raiz).textContent = op.titulo || "Dibujar pieza"; $("#tl-guardar", raiz).textContent = op.textoGuardar || "Guardar pieza"; raiz.hidden = false; document.body.classList.add("con-taller");
    ponerVista(cfg.vista); ponerHerr(D.formas.length ? "sel" : "lazo"); requestAnimationFrame(() => { encajar(); pintar(); }); }
  function cerrar() { plumaFin(); raiz.hidden = true; document.body.classList.remove("con-taller"); }
  function guardar() { plumaFin(); cfg.dibujos[cfg.vista] = D; const out = {};
    for (const [v, dib] of Object.entries(cfg.dibujos)) if (dib) out[v] = { dibujo: dib, svg: aSVG(dib) };
    cfg.alGuardar(out); cerrar(); }
  window.Taller = { abrir, deSVG, aSVG };
})();
