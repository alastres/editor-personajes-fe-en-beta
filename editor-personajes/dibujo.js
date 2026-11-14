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
    ["elipse", "Elipse", "E", "◯"], ["rect", "Rectángulo redondeado", "R", "▢"], ["capsula", "Cápsula", "C", "⬭"], ["gotas", "Cuentagotas (copia el color de una forma)", "I", "💧"], ["texto", "Texto (clic donde va)", "T", "T"], ["goma", "Goma (borra un trazo de la forma elegida)", "X", "⌫"]];

  // ---------------- geometría
  const d = (f) => { const P = f.puntos; if (!P.length) return ""; let s = `M${f2(P[0].x)} ${f2(P[0].y)}`;
    const seg = (a, b) => (s += ` C ${f2(a.ox ?? a.x)} ${f2(a.oy ?? a.y)} ${f2(b.ix ?? b.x)} ${f2(b.iy ?? b.y)} ${f2(b.x)} ${f2(b.y)}`);
    for (let i = 1; i < P.length; i++) seg(P[i - 1], P[i]); if (f.cerrada && P.length > 1) { seg(P[P.length - 1], P[0]); s += " Z"; } return s; };   // > 1: una forma de lente (dos puntos y dos curvas, como la boca) también se cierra
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
  // formas → SVG. f.simetrica: se dibuja también reflejada en el eje (x = 0); f.agujero: recorta la forma de debajo (máscara);
  // f.tipo === "texto": un texto (cartel, inscripción) con su tamaño y color. R resuelve colores; ed = modo editor (clases y contornos)
  const escT = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  // relleno de una forma: color liso o degradado (f.degradado = { tipo: "lineal" | "radial", a: color final, angulo }), sale como <defs> + url()
  function relleno(f, R, defs) { if (!f.degradado || !f.cerrada) return R(f.relleno || "none"); const g = f.degradado, id = "dg" + Math.abs([...JSON.stringify([f.relleno, g, f.puntos[0]])].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7)).toString(36);
    const c0 = R(f.relleno || "#888"), c1 = R(g.a || "#000"), ang = ((g.angulo ?? 90) * Math.PI) / 180, dx = Math.cos(ang) / 2, dy = Math.sin(ang) / 2;
    defs.push(g.tipo === "radial" ? `<radialGradient id="${id}"><stop offset="0" stop-color="${c0}"/><stop offset="1" stop-color="${c1}"/></radialGradient>`
      : `<linearGradient id="${id}" x1="${f2(0.5 - dx)}" y1="${f2(0.5 - dy)}" x2="${f2(0.5 + dx)}" y2="${f2(0.5 + dy)}"><stop offset="0" stop-color="${c0}"/><stop offset="1" stop-color="${c1}"/></linearGradient>`);
    return `url(#${id})`; }
  function svgFormas(F, R, ed) { const out = [], defs = [];
    const op = (f) => (f.opacidad != null && f.opacidad < 1 ? ` opacity="${f2(f.opacidad)}"` : "");
    const uno = (f, extra) => { if (f.tipo === "texto") { const q = f.puntos[0]; return `<text x="${f2(q.x)}" y="${f2(q.y)}" font-size="${f2(f.tam || 48)}" text-anchor="middle" dominant-baseline="central" font-family="Inter, Figtree, Segoe UI, sans-serif" font-weight="${f.peso || 800}" fill="${R(f.relleno || "{tinta}")}"${op(f)}${extra}>${escT(f.texto || "")}</text>`; }
      if (f.puntos.length < 2) return "";
      const st = f.trazo && f.grosor ? ` stroke="${R(f.trazo)}" stroke-width="${f2(f.grosor)}" stroke-linecap="round" stroke-linejoin="round"` : ed && !f.cerrada ? ` stroke="#888" stroke-width="2"` : "";
      let tx = ""; if (f.textura && window.Pinceles) { const fl = Pinceles.filtro(f.textura); if (fl) { if (!defs.includes(fl)) defs.push(fl); tx = ` filter="url(#tx-${f.textura})"`; } }
      return `<path d="${d(f)}" fill="${f.cerrada ? relleno(f, R, defs) : "none"}"${st}${op(f)}${tx}${f.ref != null ? ` data-ref="${escT(f.ref)}"` : ""}${extra}/>`; };
    const conEspejo = (f, extra) => uno(f, extra) + (f.simetrica && f.tipo !== "texto" ? `<g transform="scale(-1 1)"${ed ? ' pointer-events="none"' : ""}>${uno(f, "")}</g>` : "");
    F.forEach((f, i) => { if (f.oculta) return; const ex = ed ? ` data-i="${i}" class="forma${ed.sel(i) ? " sel" : ""}"` : "";
      if (f.agujero) { if (ed && f.puntos.length > 1) out.push(`<path d="${d(f)}" fill="#ffffff" fill-opacity="0.05" stroke="#f0a33a" stroke-width="${f2(1.5 * ed.k)}" stroke-dasharray="${f2(5 * ed.k)} ${f2(4 * ed.k)}"${ex}/>`); return; }
      const cortes = []; for (let k = i + 1; k < F.length && F[k].agujero; k++) if (!F[k].oculta && F[k].puntos.length > 1) cortes.push(F[k]);
      const cuerpo = conEspejo(f, ex); if (!cortes.length) { out.push(cuerpo); return; }
      const id = "ag" + Math.abs([...(d(f) + cortes.map(d).join(""))].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7)).toString(36);
      const corte = (c) => c.cerrada ? `fill="#000"` : `fill="none" stroke="#000" stroke-width="${f2(c.grosor || 12)}" stroke-linecap="round" stroke-linejoin="round"`;   // la goma recorta con su trazo
      const hueco = cortes.map((c) => `<path d="${d(c)}" ${corte(c)}/>` + (c.simetrica ? `<path d="${d(c)}" ${corte(c)} transform="scale(-1 1)"/>` : "")).join("");
      out.push(`<mask id="${id}" maskUnits="userSpaceOnUse" x="-4000" y="-4000" width="8000" height="8000"><rect x="-4000" y="-4000" width="8000" height="8000" fill="#fff"/>${hueco}</mask><g mask="url(#${id})">${cuerpo}</g>`); });
    return (defs.length ? `<defs>${defs.join("")}</defs>\n` : "") + out.join("\n"); }
  function aSVG(D) { return svgFormas(D.formas, (c) => c, null); }
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
      const base = { ref: n.getAttribute("data-ref") ?? undefined, relleno: at("fill") ?? "#000000", trazo: at("stroke") && at("stroke") !== "none" ? at("stroke") : null, grosor: at("stroke") && at("stroke") !== "none" ? parseFloat(at("stroke-width") || 1) * Math.hypot(m[0], m[1]) : 0, opacidad: op < 1 ? op : undefined };
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
  // arco SVG (endpoint) → tramos cúbicos de ≤ 90° (método de la especificación SVG, F.6.5)
  function arcoABezier(x1, y1, rx, ry, rotG, fa, fs, x2, y2) { if (!rx || !ry || (x1 === x2 && y1 === y2)) return [[x1, y1, x2, y2, x2, y2]];
    const fi = (rotG * Math.PI) / 180, cf = Math.cos(fi), sf = Math.sin(fi), dx = (x1 - x2) / 2, dy = (y1 - y2) / 2, x1p = cf * dx + sf * dy, y1p = -sf * dx + cf * dy;
    let l = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry); if (l > 1) { rx *= Math.sqrt(l); ry *= Math.sqrt(l); }
    const num2 = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p, den = rx * rx * y1p * y1p + ry * ry * x1p * x1p, co = (fa === fs ? -1 : 1) * Math.sqrt(Math.max(0, num2 / den));
    const cxp = (co * rx * y1p) / ry, cyp = (-co * ry * x1p) / rx, ccx = cf * cxp - sf * cyp + (x1 + x2) / 2, ccy = sf * cxp + cf * cyp + (y1 + y2) / 2;
    const ang = (ux, uy, vx, vy) => { const a = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy); return a; };
    const t1 = ang(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry); let dt = ang((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
    if (!fs && dt > 0) dt -= 2 * Math.PI; else if (fs && dt < 0) dt += 2 * Math.PI;
    const n = Math.max(1, Math.ceil(Math.abs(dt) / (Math.PI / 2))), d = dt / n, k = (4 / 3) * Math.tan(d / 4), out = [];
    const P = (t) => [ccx + rx * Math.cos(t) * cf - ry * Math.sin(t) * sf, ccy + rx * Math.cos(t) * sf + ry * Math.sin(t) * cf];
    const D = (t) => [-rx * Math.sin(t) * cf - ry * Math.cos(t) * sf, -rx * Math.sin(t) * sf + ry * Math.cos(t) * cf];
    for (let i = 0; i < n; i++) { const a = t1 + i * d, b = a + d, pa = P(a), pb = P(b), da = D(a), db = D(b);
      out.push([pa[0] + k * da[0], pa[1] + k * da[1], pb[0] - k * db[0], pb[1] - k * db[1], pb[0], pb[1]]); }
    out[out.length - 1][4] = x2; out[out.length - 1][5] = y2; return out; }
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
      else if (C === "A") { const rx0 = Math.abs(num()), ry0 = Math.abs(num()), rot = num(), fa = num(), fs = num(), x = num() + ox, y = num() + oy;   // arco elíptico → curvas Bézier
        for (const c of arcoABezier(cx, cy, rx0, ry0, rot, fa, fs, x, y)) curva(...c); cx = x; cy = y; lastQ = null; }
      else i++; }
    return out; }

  // ---------------- interfaz
  let raiz = null, cfg = null, D = null, sel = null, herr = "sel", hist = [], fut = [], vista = { x: -200, y: -200, w: 400, h: 400 }, estilo = { relleno: "{ropa}", trazo: "{tinta}", grosor: 0 };
  let colores = {};
  const res = (c) => (c && c.startsWith("{") ? colores[c.slice(1, -1)] || "#888" : c || "none");
  function construir() {
    raiz = h("div", { class: "taller", hidden: "" });
    raiz.innerHTML = `
      <div class="taller-barra"><b id="tl-titulo">Dibujar pieza</b><input id="tl-nombre" placeholder="Nombre" title="Nombre con el que se guarda" /><div class="seg pequeno" id="tl-vista"></div><span class="tenue" id="tl-ayuda"></span>
        <button id="tl-deshacer" title="Deshacer (Ctrl + Z)">↶ Deshacer</button><button id="tl-rehacer" title="Rehacer (Ctrl + Y)">↷ Rehacer</button><button id="tl-atajos" title="Atajos de teclado">⌨ Atajos</button>
        <button id="tl-cancelar">Cancelar</button><button id="tl-guardar" class="primario">Guardar pieza</button></div>
      <div class="tl-atajos" id="tl-atajos-caja" hidden><b>Atajos de teclado</b><ul>
        <li><kbd>V</kbd> Seleccionar · <kbd>B</kbd> Pincel · <kbd>L</kbd> Lazo · <kbd>P</kbd> Pluma · <kbd>E</kbd> Elipse · <kbd>R</kbd> Rectángulo · <kbd>C</kbd> Cápsula · <kbd>I</kbd> Cuentagotas · <kbd>T</kbd> Texto · <kbd>X</kbd> Goma</li>
        <li><kbd>Ctrl</kbd>+<kbd>Z</kbd> deshacer · <kbd>Ctrl</kbd>+<kbd>Y</kbd> rehacer · <kbd>Supr</kbd> borrar la forma · <kbd>Ctrl</kbd>+<kbd>D</kbd> duplicar · flechas: mover (con <kbd>Mayús</kbd>, de 10 en 10)</li>
        <li><kbd>Espacio</kbd> + arrastrar: mover la vista · rueda: zoom · <kbd>Mayús</kbd> + clic: elegir varias · <kbd>Intro</kbd> / <kbd>Esc</kbd>: terminar la pluma</li>
        <li>Puntos: doble clic = esquina ⇄ curva · doble clic en el trazo = añadir punto · <kbd>Alt</kbd> + clic = quitar punto · <kbd>Alt</kbd> al mover un tirador = romper la curva</li></ul></div>
      <div class="taller-cuerpo">
        <div class="taller-herr" id="tl-herr"></div>
        <div class="taller-lienzo"><svg id="tl-svg"><g id="tl-calco"></g><g id="tl-ref"></g><g id="tl-ejes"></g><g id="tl-formas"></g><g id="tl-ref2" pointer-events="none"></g><g id="tl-asas"></g><path id="tl-trazo" fill="none" stroke="#f0a33a" stroke-width="2" stroke-dasharray="4 3"/><circle id="tl-cursor" r="0" fill="none" stroke="#ffffff" stroke-opacity="0.7" pointer-events="none"/></svg>
          <div class="tl-zoom"><button id="tl-zm">−</button><button id="tl-z0">Encajar</button><button id="tl-zp">+</button><label class="chk"><input type="checkbox" id="tl-verref" checked> Ver el personaje</label></div></div>
        <div class="taller-panel">
          <div id="tl-pincel" hidden>
            <h4>Pincel <span class="tenue" id="tl-lapiz">sin lápiz: la velocidad hace de presión</span></h4>
            <div class="tl-pinceles" id="tl-pinceles"></div>
            <p class="ayuda" id="tl-pz-ayuda"></p>
            <div class="deslizador"><label>Tamaño <span class="tenue">([ y ])</span></label><input type="range" id="tl-pz-tam" min="0.5" max="80" step="0.5"><output></output></div>
            <div class="deslizador"><label>Sensibilidad a la presión</label><input type="range" id="tl-pz-sens" min="0" max="1" step="0.05"><output></output></div>
            <div class="deslizador"><label>Curva de presión <span class="tenue">(suave ↔ dura)</span></label><input type="range" id="tl-pz-curva" min="-1" max="1" step="0.1"><output></output></div>
            <div class="deslizador"><label>Estabilizador <span class="tenue">(quita el temblor)</span></label><input type="range" id="tl-pz-estab" min="0" max="0.95" step="0.05"><output></output></div>
            <div class="deslizador"><label>Afinar las puntas</label><input type="range" id="tl-pz-afinar" min="0" max="1" step="0.05"><output></output></div>
            <div class="deslizador"><label>Opacidad del pincel</label><input type="range" id="tl-pz-opac" min="0.1" max="1" step="0.05"><output></output></div>
            <label class="chk" title="Con el ratón o el dedo: cuanto más rápido, más fino"><input type="checkbox" id="tl-pz-simular"> Sin lápiz, la velocidad hace de presión</label>
            <label class="chk" title="Lápiz inclinado: el lápiz y el pincel seco ensanchan; la pluma caligráfica gira la punta"><input type="checkbox" id="tl-pz-incl"> Usar la inclinación del lápiz</label>
            <div class="fila-botones dos"><button id="tl-pz-guardar" title="Guarda estos ajustes como un pincel tuyo (en este navegador)">Guardar como pincel propio</button><button id="tl-pz-reset" title="Vuelve a los ajustes de serie de este pincel">Ajustes de serie</button></div>
            <p class="ayuda">El color del pincel es el de <b>Contorno</b>. Cada trazo queda como una forma (se dobla con los huesos y se edita con Seleccionar). El otro extremo del lápiz borra. Con dos dedos se mueve y se acerca la vista.</p>
          </div>
          <h4>Relleno</h4><div class="paleta" id="tl-relleno"></div>
          <div class="campo"><label>Relleno</label><div class="seg pequeno" id="tl-tipo-rell"></div></div>
          <div id="tl-deg" hidden><h4>Color final del degradado</h4><div class="paleta" id="tl-deg-c"></div><div class="deslizador"><label>Dirección del degradado</label><input type="range" id="tl-deg-ang" min="0" max="360" step="5"><output></output></div></div>
          <h4>Contorno <span class="tenue">(y color del pincel)</span></h4><div class="paleta" id="tl-trazo-c"></div>
          <div class="deslizador"><label>Grosor del contorno o pincel</label><input type="range" id="tl-grosor" min="0" max="30" step="0.5"><output></output></div>
          <div class="deslizador"><label>Opacidad</label><input type="range" id="tl-opac" min="0.1" max="1" step="0.05"><output></output></div>
          <div class="deslizador"><label>Suavizado del pincel y del lazo</label><input type="range" id="tl-suave" min="0.5" max="8" step="0.5" value="2.2"><output>2.2</output></div>
          <div class="deslizador"><label>Grosor de la goma</label><input type="range" id="tl-goma" min="2" max="80" step="1" value="16"><output>16</output></div>
          <h4>Formas <span class="tenue">(la de arriba se ve encima · doble clic en el nombre para cambiarlo)</span></h4><ul class="capas" id="tl-capas"></ul>
          <div class="deslizador"><label>Girar la selección</label><input type="range" id="tl-giro" min="-180" max="180" step="1" value="0"><output>0°</output></div>
          <h4>Combinar dos o más formas <span class="tenue">(Mayús + clic para elegirlas)</span></h4>
          <div class="fila-botones tres"><button id="tl-union" title="Une las formas elegidas en una sola">Unir</button><button id="tl-resta" title="A la de más abajo le quita las demás">Restar</button><button id="tl-inter" title="Deja solo la parte común">Intersección</button></div>
          <div class="fila-botones tres"><button id="tl-dup">Duplicar</button><button id="tl-refl">Reflejar ↔</button><button id="tl-reflv">Reflejar ↕</button>
            <button id="tl-menos">Encoger</button><button id="tl-mas">Agrandar</button><button id="tl-rot">Girar 15°</button>
            <button id="tl-subir">Subir</button><button id="tl-bajar">Bajar</button><button id="tl-borrar" class="peligro">Borrar</button></div>
          <label class="chk"><input type="checkbox" id="tl-cerrada"> Forma cerrada (con relleno)</label>
          <label class="chk" title="Se dibuja también reflejada en el eje (la línea vertical del centro): media cara, medio sombrero"><input type="checkbox" id="tl-sim"> Simetría: se refleja sola en el eje</label>
          <label class="chk" title="Esta forma no se pinta: recorta la forma que tiene justo debajo (restar)"><input type="checkbox" id="tl-agujero"> Agujero: recorta la forma de debajo</label>
          <div id="tl-texto-det" hidden><div class="campo"><input id="tl-texto" type="text" placeholder="Texto"></div><div class="deslizador"><label>Tamaño del texto</label><input type="range" id="tl-tam" min="8" max="240" step="1"><output></output></div></div>
          <h4>Varias formas <span class="tenue">(Mayús + clic para elegir más)</span></h4>
          <div class="fila-botones tres tl-multi"><button data-al="izq" title="Alinear a la izquierda">⇤ Izq.</button><button data-al="cx" title="Centrar en horizontal (una sola: en el eje)">↔ Centro</button><button data-al="der" title="Alinear a la derecha">Der. ⇥</button>
            <button data-al="arr" title="Alinear arriba">⤒ Arriba</button><button data-al="cy" title="Centrar en vertical">↕ Medio</button><button data-al="aba" title="Alinear abajo">⤓ Abajo</button>
            <button id="tl-dist-x" title="Repartir a la misma distancia en horizontal (3 o más)">Repartir ↔</button><button id="tl-dist-y" title="Repartir en vertical (3 o más)">Repartir ↕</button><button id="tl-agrupar" title="Agrupar o desagrupar: el grupo se elige y se mueve junto">Agrupar</button></div>
          <h4>Ayudas</h4>
          <label class="chk"><input type="checkbox" id="tl-iman"> Ajustar a la cuadrícula y al eje</label>
          <div class="fila-botones dos"><button id="tl-calco-b" title="Una imagen (PNG, JPG: un boceto, una referencia de Flow) semitransparente debajo, para dibujar encima. No se guarda en la pieza">Calco: abrir imagen…</button><button id="tl-calco-x">Quitar calco</button></div>
          <input type="file" id="tl-calco-f" accept="image/*" hidden>
          <div class="deslizador"><label>Opacidad del calco</label><input type="range" id="tl-calco-op" min="0.05" max="1" step="0.05" value="0.4"><output>40%</output></div>
          <div class="deslizador"><label>Tamaño del calco</label><input type="range" id="tl-calco-k" min="0.1" max="4" step="0.05" value="1"><output>100%</output></div>
          <p class="ayuda">Con <b>Seleccionar</b>: arrastra la forma para moverla, los cuadrados para mover puntos y los círculos para curvar. Doble clic en un punto: esquina ⇄ curva. Doble clic en el trazo: añade un punto. Alt + clic en un punto: lo quita. Supr borra; Ctrl+Z deshace; rueda = zoom; espacio + arrastrar = mover la vista.</p>
        </div>
      </div>`;
    document.body.append(raiz);
    for (const [k, t, tecla, ic] of HERR) $("#tl-herr", raiz).append(h("button", { "data-h": k, title: `${t} (${tecla})`, onclick: () => ponerHerr(k) }, h("span", { class: "ic" }, ic), h("span", { class: "tx" }, t.split(" (")[0])));
    $("#tl-cancelar", raiz).onclick = () => cerrar(); $("#tl-guardar", raiz).onclick = guardar;
    $("#tl-zm", raiz).onclick = () => zoom(1.25); $("#tl-zp", raiz).onclick = () => zoom(0.8); $("#tl-z0", raiz).onclick = encajar;
    $("#tl-verref", raiz).onchange = (ev) => { $("#tl-ref", raiz).style.display = $("#tl-ref2", raiz).style.display = ev.target.checked ? "" : "none"; };
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
    $("#tl-sim", raiz).onchange = (ev) => { estilo.simetrica = ev.target.checked; for (const i of selSet()) { guardarHist(); D.formas[i].simetrica = ev.target.checked || undefined; } pintar(); };
    $("#tl-agujero", raiz).onchange = (ev) => { if (sel !== null) editarForma((f) => { f.agujero = ev.target.checked || undefined; if (f.agujero) f.cerrada = true; }); };
    $("#tl-texto", raiz).oninput = (ev) => { if (sel !== null && D.formas[sel].tipo === "texto") editarForma((f) => { f.texto = ev.target.value; }, "texto"); };
    $("#tl-tam", raiz).oninput = (ev) => { if (sel !== null && D.formas[sel].tipo === "texto") editarForma((f) => { f.tam = +ev.target.value; }, "tam"); };
    raiz.querySelectorAll("[data-al]").forEach((b) => (b.onclick = () => alinear(b.dataset.al)));
    $("#tl-dist-x", raiz).onclick = () => distribuir("x"); $("#tl-dist-y", raiz).onclick = () => distribuir("y");
    $("#tl-agrupar", raiz).onclick = () => { const idx = [...selSet()]; if (!idx.length) return; guardarHist(); const juntos = idx.length > 1 && idx.every((i) => D.formas[i].grupo && D.formas[i].grupo === D.formas[idx[0]].grupo);
      const g = "g" + Date.now().toString(36); idx.forEach((i) => { if (juntos) delete D.formas[i].grupo; else D.formas[i].grupo = g; }); if (juntos) multi.clear(); pintar(); };
    $("#tl-iman", raiz).onchange = (ev) => { iman = ev.target.checked; pintarRejilla(); };
    $("#tl-calco-b", raiz).onclick = () => $("#tl-calco-f", raiz).click();
    $("#tl-calco-f", raiz).onchange = (ev) => { const f = ev.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { const im = new Image(); im.onload = () => { calco = { src: r.result, w: im.width, h: im.height }; pintarCalco(); }; im.src = r.result; }; r.readAsDataURL(f); ev.target.value = ""; };
    $("#tl-calco-x", raiz).onclick = () => { calco = null; pintarCalco(); };
    for (const id of ["tl-calco-op", "tl-calco-k"]) $("#" + id, raiz).oninput = (ev) => { ev.target.nextElementSibling.textContent = Math.round(ev.target.value * 100) + "%"; pintarCalco(); };
    $("#tl-deshacer", raiz).onclick = deshacer; $("#tl-rehacer", raiz).onclick = rehacer;
    $("#tl-atajos", raiz).onclick = () => { const c = $("#tl-atajos-caja", raiz); c.hidden = !c.hidden; };
    $("#tl-suave", raiz).oninput = (ev) => { ev.target.nextElementSibling.textContent = ev.target.value; };
    $("#tl-goma", raiz).oninput = (ev) => { ev.target.nextElementSibling.textContent = ev.target.value; };
    $("#tl-deg-ang", raiz).oninput = (ev) => { if (sel !== null) editarForma((f) => { if (f.degradado) f.degradado.angulo = +ev.target.value; }, "dgang"); };
    // giro libre: desde la forma tal como estaba al tocar el deslizador
    const giro = $("#tl-giro", raiz); let giroBase = null;
    giro.addEventListener("pointerdown", () => { const idx = [...selSet()]; if (!idx.length) return; guardarHist(); giroBase = { idx, P: idx.map((i) => clon(D.formas[i].puntos)), c: centroSel(idx) }; });
    giro.oninput = (ev) => { const a = (+ev.target.value * Math.PI) / 180, co = Math.cos(a), si = Math.sin(a); ev.target.nextElementSibling.textContent = ev.target.value + "°"; if (!giroBase) return;
      giroBase.idx.forEach((i, n) => D.formas[i].puntos.forEach((q, j) => { const o = giroBase.P[n][j]; for (const [x, y] of [["x", "y"], ["ix", "iy"], ["ox", "oy"]]) { const dx = o[x] - giroBase.c.x, dy = o[y] - giroBase.c.y; q[x] = giroBase.c.x + dx * co - dy * si; q[y] = giroBase.c.y + dx * si + dy * co; } })); pintarFormas(); pintarAsas(); };
    giro.addEventListener("change", () => { giroBase = null; giro.value = 0; giro.nextElementSibling.textContent = "0°"; pintar(); });
    $("#tl-union", raiz).onclick = () => combinar("union"); $("#tl-resta", raiz).onclick = () => combinar("resta"); $("#tl-inter", raiz).onclick = () => combinar("inter");
    for (const k of ["tam", "sens", "curva", "estab", "afinar", "opac"]) $("#tl-pz-" + k, raiz).oninput = (ev) => { pz[k] = +ev.target.value; recordarPincel(); pintarPincel(); };
    $("#tl-pz-simular", raiz).onchange = (ev) => { pz.simular = ev.target.checked; recordarPincel(); };
    $("#tl-pz-incl", raiz).onchange = (ev) => { pz.inclinacion = ev.target.checked; recordarPincel(); };
    $("#tl-pz-reset", raiz).onclick = () => { const base = Pinceles.PRESETS[pzId] || Pinceles.propios()[pzId]; if (base) { pz = clon(base); recordarPincel(); pintarPincel(); } };
    $("#tl-pz-guardar", raiz).onclick = async () => { const n = window.Dialogo ? await Dialogo.pedir("Nombre del pincel", { valor: (pz.n || "Pincel") + " (mío)", aceptar: "Guardar" }) : prompt("Nombre del pincel", "Mi pincel"); if (!n) return;
      const id = "p-" + Date.now().toString(36); Pinceles.guardarPropio(id, Object.assign(clon(pz), { n: n.trim(), ic: "⭐", propio: true })); pzId = id; recordarPincel(); pintarPincel(); };
    eventosLienzo(); document.addEventListener("keydown", teclas);
  }
  const centroSel = (idx) => { const C = idx.map((i) => caja(D.formas[i])); return { x: (Math.min(...C.map((c) => c.x0)) + Math.max(...C.map((c) => c.x1))) / 2, y: (Math.min(...C.map((c) => c.y0)) + Math.max(...C.map((c) => c.y1))) / 2 }; };
  // UNIR, RESTAR, INTERSECCIÓN de verdad: se pintan las formas en un lienzo (alta resolución), se combinan con los modos de composición del
  // navegador y el resultado se vuelve a convertir en curvas (contornos por «marching squares», simplificados y suavizados).
  // Los huecos que salgan se guardan como formas «agujero» justo encima de la forma resultante.
  function combinar(modo) { const idx = [...selSet()].filter((i) => D.formas[i].tipo !== "texto" && D.formas[i].cerrada).sort((a, b) => a - b);
    if (idx.length < 2) return avisoT("Elige dos o más formas cerradas (Mayús + clic)");
    const C = idx.map((i) => caja(D.formas[i])), x0 = Math.min(...C.map((c) => c.x0)) - 6, y0 = Math.min(...C.map((c) => c.y0)) - 6, x1 = Math.max(...C.map((c) => c.x1)) + 6, y1 = Math.max(...C.map((c) => c.y1)) + 6;
    const N = 700, k = N / Math.max(x1 - x0, y1 - y0), W = Math.ceil((x1 - x0) * k) + 2, H = Math.ceil((y1 - y0) * k) + 2, cv = document.createElement("canvas"); cv.width = W; cv.height = H; const g = cv.getContext("2d");
    g.setTransform(k, 0, 0, k, -x0 * k, -y0 * k); const camino = (f) => new Path2D(d(f));
    g.fillStyle = "#000"; g.fill(camino(D.formas[idx[0]]));
    for (const i of idx.slice(1)) { g.globalCompositeOperation = modo === "union" ? "source-over" : modo === "resta" ? "destination-out" : "destination-in"; g.fill(camino(D.formas[i])); }
    const px = g.getImageData(0, 0, W, H).data, dentro = (x, y) => x >= 0 && y >= 0 && x < W && y < H && px[(y * W + x) * 4 + 3] > 127;
    const lazos = contornos(dentro, W, H).map((L) => L.map(([x, y]) => ({ x: x / k + x0, y: y / k + y0 })));
    if (!lazos.length) return avisoT("No queda nada: las formas no se tocan");
    guardarHist(); const base = D.formas[idx[0]], nuevas = [];
    const area = (L) => L.reduce((s, p, i) => { const q = L[(i + 1) % L.length]; return s + p.x * q.y - q.x * p.y; }, 0) / 2;
    // todos los lazos van en el mismo sentido: el mayor es un contorno exterior; los de sentido contrario, huecos
    const sgn = Math.sign(area(lazos.reduce((m, L) => (Math.abs(area(L)) > Math.abs(area(m)) ? L : m)))), ext = lazos.filter((L) => Math.sign(area(L)) === sgn), hue = lazos.filter((L) => Math.sign(area(L)) !== sgn);
    for (const L of [...ext, ...hue]) { const P = rdp(L.concat([L[0]]), 3.2 / k).slice(0, -1); if (P.length < 3) continue;
      nuevas.push(Object.assign(clon(base), { puntos: suavizar(P, true), cerrada: true, agujero: ext.includes(L) ? undefined : true, grupo: undefined, nombre: undefined })); }
    for (const i of [...idx].reverse()) D.formas.splice(i, 1);
    D.formas.splice(idx[0], 0, ...nuevas); sel = idx[0]; multi = new Set(); pintar(); avisoT({ union: "Unidas", resta: "Restadas", inter: "Intersección hecha" }[modo] + ` (${nuevas.length} forma${nuevas.length > 1 ? "s" : ""})`); }
  // contornos de una máscara binaria (marching squares): lista de lazos cerrados en coordenadas de píxel
  function contornos(dentro, W, H) { const segs = new Map(), clave = (x, y) => x + "," + y, add = (a, b) => { segs.set(clave(...a), b); };
    for (let y = -1; y < H; y++) for (let x = -1; x < W; x++) { const c = (dentro(x, y) ? 8 : 0) | (dentro(x + 1, y) ? 4 : 0) | (dentro(x + 1, y + 1) ? 2 : 0) | (dentro(x, y + 1) ? 1 : 0);
      const N2 = [x + 1, y + 0.5], E = [x + 1.5, y + 1], S = [x + 1, y + 1.5], O = [x + 0.5, y + 1];
      switch (c) { case 1: add(S, O); break; case 2: add(E, S); break; case 3: add(E, O); break; case 4: add(N2, E); break; case 5: add(N2, O); add(S, E); break; case 6: add(N2, S); break; case 7: add(N2, O); break;
        case 8: add(O, N2); break; case 9: add(S, N2); break; case 10: add(O, S); add(E, N2); break; case 11: add(E, N2); break; case 12: add(O, E); break; case 13: add(S, E); break; case 14: add(O, S); break; } }
    const lazos = [], vistos = new Set();
    for (const [k0, primero] of segs) { if (vistos.has(k0)) continue; const L = []; let k = k0, p = primero;
      while (!vistos.has(k)) { vistos.add(k); const [px, py] = k.split(",").map(Number); L.push([px - 0.5, py - 0.5]); k = clave(...p); p = segs.get(k); if (!p) break; }
      if (L.length > 6) lazos.push(L); }
    return lazos; }
  const avisoT = (t) => { const a = $("#tl-ayuda", raiz); if (a) a.textContent = t; };
  // ---- PINCELES (pinceles.js): el elegido y sus ajustes se recuerdan en este navegador
  let pzId = "tinta", pz = null, penVisto = false;
  try { const g = JSON.parse(localStorage.getItem("pincel-actual") || "null"); if (g && g.id && g.pz) { pzId = g.id; pz = g.pz; } } catch {}
  const pincelBase = () => { pz = pz || clon((window.Pinceles && (Pinceles.todos()[pzId] || Pinceles.PRESETS.tinta)) || {}); return pz; };
  const recordarPincel = () => { try { localStorage.setItem("pincel-actual", JSON.stringify({ id: pzId, pz })); } catch {} };
  function pintarPincel() { if (!raiz || !window.Pinceles) return; pincelBase(); const caja = $("#tl-pincel", raiz); caja.hidden = herr !== "pincel"; if (caja.hidden) return;
    const c = $("#tl-pinceles", raiz); c.replaceChildren();
    for (const [id, p] of Object.entries(Pinceles.todos())) { const b = h("button", { class: "tl-pz" + (id === pzId ? " activo" : ""), title: p.ayuda || p.n, onclick: () => { pzId = id; pz = clon(p); recordarPincel(); pintarPincel(); } }, h("span", { class: "ic" }, p.ic || "•"), h("span", {}, p.n));
      if (p.propio) b.append(h("span", { class: "x", title: "Borrar este pincel", onclick: (ev) => { ev.stopPropagation(); Pinceles.guardarPropio(id, null); if (pzId === id) { pzId = "tinta"; pz = clon(Pinceles.PRESETS.tinta); recordarPincel(); } pintarPincel(); } }, "✕"));
      c.append(b); }
    $("#tl-pz-ayuda", raiz).textContent = pz.ayuda || "";
    for (const [k, fmt] of [["tam", (v) => (+v).toFixed(1)], ["sens", (v) => Math.round(v * 100) + "%"], ["curva", (v) => (v > 0 ? "+" : "") + (+v).toFixed(1)], ["estab", (v) => Math.round(v * 100) + "%"], ["afinar", (v) => Math.round(v * 100) + "%"], ["opac", (v) => Math.round(v * 100) + "%"]]) {
      const i = $("#tl-pz-" + k, raiz); if (document.activeElement !== i) i.value = pz[k] ?? 0; i.nextElementSibling.textContent = fmt(pz[k] ?? 0); }
    $("#tl-pz-simular", raiz).checked = !!pz.simular; $("#tl-pz-incl", raiz).checked = !!pz.inclinacion; }
  // una muestra del lápiz (o del ratón): posición, presión, inclinación (altitud y acimut, en radianes) y tiempo
  function muestra(e, p) { let alt = e.altitudeAngle, azi = e.azimuthAngle;
    if (alt == null && (e.tiltX || e.tiltY)) { const tx = Math.tan((e.tiltX * Math.PI) / 180), ty = Math.tan((e.tiltY * Math.PI) / 180); alt = Math.atan(1 / Math.hypot(tx, ty)); azi = Math.atan2(ty, tx); }
    return { x: p.x, y: p.y, p: e.pointerType === "pen" ? (e.pressure || 0.5) : pz.simular ? 0.55 : 0.85, alt: e.pointerType === "pen" ? alt : null, azi: e.pointerType === "pen" ? azi : null, t: e.timeStamp, cx: e.clientX, cy: e.clientY }; }
  const colorPincel = () => estilo.trazo || "{tinta}";
  function vistaPincel(M) { const P = Pinceles.contorno(M, pz); const t = $("#tl-trazo", raiz);
    t.setAttribute("d", P.length ? "M" + P.map((q) => `${f2(q.x)} ${f2(q.y)}`).join(" L ") + " Z" : ""); t.setAttribute("fill", res(colorPincel())); t.setAttribute("fill-opacity", pz.opac ?? 1); t.setAttribute("stroke", "none"); }
  function trazoLimpio() { const t = $("#tl-trazo", raiz); if (!t) return; t.setAttribute("d", ""); t.setAttribute("fill", "none"); t.removeAttribute("fill-opacity"); t.setAttribute("stroke", "#f0a33a"); }
  // ---- selección múltiple (Mayús + clic) y grupos: la selección incluye todo el grupo de cada forma elegida
  let multi = new Set(), iman = false, calco = null;
  function selSet() { const base = new Set(multi); if (sel !== null) base.add(sel); const grupos = new Set([...base].map((i) => D.formas[i]?.grupo).filter(Boolean));
    D.formas.forEach((f, i) => { if (f.grupo && grupos.has(f.grupo)) base.add(i); }); return new Set([...base].filter((i) => D.formas[i])); }
  const caja = (f) => { if (f.tipo === "texto") { const q = f.puntos[0], w = (f.texto || "").length * (f.tam || 48) * 0.55, hh = f.tam || 48; return { x0: q.x - w / 2, x1: q.x + w / 2, y0: q.y - hh / 2, y1: q.y + hh / 2 }; }
    const xs = f.puntos.map((q) => q.x), ys = f.puntos.map((q) => q.y); return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) }; };
  const desplazar = (f, dx, dy) => f.puntos.forEach((q) => { q.x += dx; q.ix += dx; q.ox += dx; q.y += dy; q.iy += dy; q.oy += dy; });
  function alinear(modo) { const idx = [...selSet()]; if (!idx.length) return; guardarHist(); const C = idx.map((i) => caja(D.formas[i])), solo = idx.length === 1;
    const T = { x0: Math.min(...C.map((c) => c.x0)), x1: Math.max(...C.map((c) => c.x1)), y0: Math.min(...C.map((c) => c.y0)), y1: Math.max(...C.map((c) => c.y1)) };
    idx.forEach((i, n) => { const c = C[n]; let dx = 0, dy = 0;     // una sola forma se alinea con el eje (x = 0) o con el origen del hueso (y = 0)
      if (modo === "izq") dx = (solo ? 0 : T.x0) - c.x0; else if (modo === "der") dx = (solo ? 0 : T.x1) - c.x1; else if (modo === "cx") dx = (solo ? 0 : (T.x0 + T.x1) / 2) - (c.x0 + c.x1) / 2;
      else if (modo === "arr") dy = (solo ? 0 : T.y0) - c.y0; else if (modo === "aba") dy = (solo ? 0 : T.y1) - c.y1; else if (modo === "cy") dy = (solo ? 0 : (T.y0 + T.y1) / 2) - (c.y0 + c.y1) / 2;
      desplazar(D.formas[i], dx, dy); }); pintar(); }
  function distribuir(eje) { const idx = [...selSet()]; if (idx.length < 3) return; guardarHist(); const [a0, a1] = eje === "x" ? ["x0", "x1"] : ["y0", "y1"];
    const it = idx.map((i) => { const c = caja(D.formas[i]); return { i, m: (c[a0] + c[a1]) / 2 }; }).sort((u, v) => u.m - v.m), A = it[0].m, B = it[it.length - 1].m;
    it.forEach((o, n) => { const obj = A + ((B - A) * n) / (it.length - 1); desplazar(D.formas[o.i], eje === "x" ? obj - o.m : 0, eje === "y" ? obj - o.m : 0); }); pintar(); }
  function pintarCalco() { const g = $("#tl-calco", raiz); g.replaceChildren(); if (!calco) return; const k = +$("#tl-calco-k", raiz).value, w = 400 * k, hh = (w * calco.h) / calco.w;
    el("image", { href: calco.src, x: f2(-w / 2), y: f2(-hh / 2), width: f2(w), height: f2(hh), opacity: $("#tl-calco-op", raiz).value, "pointer-events": "none" }, g); }
  function pintarRejilla() { const g = $("#tl-ejes", raiz); g.querySelectorAll(".rejilla").forEach((x) => x.remove()); if (!iman) return;
    for (let v = -600; v <= 600; v += 10) { const fuerte = v % 50 === 0; for (const [x1, y1, x2, y2] of [[v, -600, v, 600], [-600, v, 600, v]]) el("line", { x1, y1, x2, y2, stroke: "#ffffff", "stroke-opacity": fuerte ? 0.07 : 0.03, class: "rejilla", "pointer-events": "none" }, g); } }
  // imán: a la cuadrícula de 10 y, si está cerca, al eje (x = 0)
  const pega = (v, eje) => { const k = escalaPx(); if (eje === "x" && Math.abs(v) < 8 * k) return 0; return Math.round(v / 10) * 10; };
  function nueva(f) { if (estilo.simetrica && f.simetrica === undefined) f.simetrica = true; D.formas.push(f); }
  const centro = (f) => { const xs = f.puntos.map((p) => p.x), ys = f.puntos.map((p) => p.y); return { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 }; };
  function ponerHerr(k) { herr = k; [...$("#tl-herr", raiz).children].forEach((b) => b.classList.toggle("activo", b.dataset.h === k));
    $("#tl-ayuda", raiz).textContent = { sel: "Clic en una forma para editarla.", pincel: "Dibuja: con lápiz, el grosor sigue la presión. Teclas [ y ] = tamaño.", lazo: "Dibuja el contorno de una forma rellena.", pluma: "Clic = punto de esquina · arrastrar = curva · clic en el primer punto o Intro = terminar.", elipse: "Arrastra para dibujar una elipse.", rect: "Arrastra para dibujar un rectángulo redondeado.", capsula: "Arrastra para dibujar una cápsula." }[k];
    $("#tl-svg", raiz).style.cursor = k === "sel" ? "default" : "crosshair"; if (k !== "pluma") plumaFin(); pintarAsas(); pintarPincel(); if (k !== "pincel") $("#tl-cursor", raiz)?.setAttribute("r", 0); }
  function guardarHist() { hist.push(JSON.stringify(D)); if (hist.length > 150) hist.shift(); fut = []; }
  let ultClave = null, tClave = 0;
  function editarForma(fn, clave) { if (!(clave && clave === ultClave && Date.now() - tClave < 800)) guardarHist(); ultClave = clave; tClave = Date.now(); fn(D.formas[sel]); pintar(); }
  function deshacer() { if (!hist.length) return; fut.push(JSON.stringify(D)); D = JSON.parse(hist.pop()); if (sel !== null && sel >= D.formas.length) sel = null; pintar(); }
  function rehacer() { if (!fut.length) return; hist.push(JSON.stringify(D)); D = JSON.parse(fut.pop()); pintar(); }
  function borrarForma() { if (sel === null) return; guardarHist(); const idx = [...selSet()].sort((a, b) => b - a); idx.forEach((i) => D.formas.splice(i, 1)); sel = null; multi = new Set(); pintar(); }

  // ---- vista (zoom y desplazamiento)
  function aplicarVista() { $("#tl-svg", raiz).setAttribute("viewBox", `${f2(vista.x)} ${f2(vista.y)} ${f2(vista.w)} ${f2(vista.h)}`); pintarAsas(); }
  function zoom(k, cx, cy) { const s = $("#tl-svg", raiz), r = s.getBoundingClientRect(); cx = cx ?? vista.x + vista.w / 2; cy = cy ?? vista.y + vista.h / 2;
    const ar = r.width / Math.max(1, r.height); vista.w *= k; vista.h = vista.w / ar; vista.x = cx - (cx - vista.x) * k; vista.y = cy - (cy - vista.y) * k; aplicarVista(); }
  function encajar() { const s = $("#tl-svg", raiz), r = s.getBoundingClientRect(), ar = r.width / Math.max(1, r.height); let [x0, y0, x1, y1] = cfg?.encuadre || [-150, -150, 150, 150];
    for (const f of D.formas) for (const p of f.puntos) { x0 = Math.min(x0, p.x - 40); y0 = Math.min(y0, p.y - 40); x1 = Math.max(x1, p.x + 40); y1 = Math.max(y1, p.y + 40); }
    let w = x1 - x0, hh = y1 - y0; if (w / hh > ar) hh = w / ar; else w = hh * ar; vista = { x: (x0 + x1) / 2 - w / 2, y: (y0 + y1) / 2 - hh / 2, w, h: hh }; aplicarVista(); }
  const escalaPx = () => vista.w / Math.max(1, $("#tl-svg", raiz).getBoundingClientRect().width);   // unidades por píxel de pantalla
  function local(ev) { const s = $("#tl-svg", raiz), m = s.getScreenCTM().inverse(), p = s.createSVGPoint(); p.x = ev.clientX; p.y = ev.clientY; const q = p.matrixTransform(m); return { x: q.x, y: q.y }; }

  // ---- pintar
  function pintar() { pintarFormas(); pintarAsas(); pintarPanel(); }
  function pintarFormas() { const g = $("#tl-formas", raiz), S = selSet(); g.innerHTML = svgFormas(D.formas, res, { sel: (i) => S.has(i), k: escalaPx() }); }
  function pintarAsas() { if (!raiz) return; const g = $("#tl-asas", raiz); g.replaceChildren();
    if (D) { const kk = escalaPx(); for (const i of selSet()) { if (i === sel && D.formas[i].tipo !== "texto") continue; const c = caja(D.formas[i]);
      el("rect", { x: c.x0 - 4 * kk, y: c.y0 - 4 * kk, width: c.x1 - c.x0 + 8 * kk, height: c.y1 - c.y0 + 8 * kk, fill: "none", stroke: "#f0a33a", "stroke-width": 1.2 * kk, "stroke-dasharray": `${4 * kk} ${3 * kk}`, "pointer-events": "none" }, g); } } if (sel === null || herr !== "sel" || !D.formas[sel]) return; const f = D.formas[sel], k = escalaPx();
    el("path", { d: d(f), fill: "none", stroke: "#f0a33a", "stroke-width": 1.5 * k, "pointer-events": "none" }, g);
    f.puntos.forEach((p, i) => { if (!p.esquina) { for (const [hx, hy, t] of [[p.ix, p.iy, "i"], [p.ox, p.oy, "o"]]) { if (Math.hypot(hx - p.x, hy - p.y) < 0.5) continue;
          el("line", { x1: p.x, y1: p.y, x2: hx, y2: hy, stroke: "#7ab8ff", "stroke-width": 1.2 * k }, g); el("circle", { cx: hx, cy: hy, r: 4.5 * k, fill: "#1b1830", stroke: "#7ab8ff", "stroke-width": 1.5 * k, "data-asa": t, "data-p": i, class: "asa" }, g); } }
      el("rect", { x: p.x - 5 * k, y: p.y - 5 * k, width: 10 * k, height: 10 * k, fill: p.esquina ? "#f0a33a" : "#fff", stroke: "#1b1830", "stroke-width": 1.5 * k, "data-p": i, class: "punto" }, g); }); }
  function paleta(cont, actual, alElegir, conNinguno) { const c = $(cont, raiz); c.replaceChildren();
    if (conNinguno) c.append(h("button", { class: "sw ninguno" + (!actual || actual === "none" ? " activo" : ""), title: "Sin color", onclick: () => alElegir(null) }, "∅"));
    for (const [tk, n] of cfg?.sinTokens ? [] : TOKENS) { const b = h("button", { class: "sw token" + (actual === tk ? " activo" : ""), title: n + " (color del personaje)", onclick: () => alElegir(tk) }); b.style.background = res(tk); c.append(b); }
    for (const col of LIBRES) { const b = h("button", { class: "sw" + (actual === col ? " activo" : ""), title: col, onclick: () => alElegir(col) }); b.style.background = col; c.append(b); }
    const otro = h("input", { type: "color", value: actual && actual.startsWith("#") ? actual : "#888888", title: "Otro color" }); otro.oninput = () => alElegir(otro.value); c.append(h("label", { class: "sw otro", title: "Otro color" }, "+", otro));
    // color escrito en hexadecimal (#a8c4ff): para copiar colores exactos de la marca o de una referencia
    const hx = h("input", { class: "hex", type: "text", maxlength: "7", placeholder: "#rrggbb", title: "Escribe un color en hexadecimal y pulsa Intro", value: actual && /^#[0-9a-f]{6}$/i.test(actual) ? actual : "" });
    hx.onkeydown = (ev) => { if (ev.key !== "Enter") return; const v = hx.value.trim(); if (/^#?[0-9a-f]{6}$/i.test(v)) alElegir((v[0] === "#" ? v : "#" + v).toLowerCase()); else hx.style.outline = "1px solid #be3f1c"; }; c.append(hx); }
  function pintarPanel() { if (!raiz) return; const f = sel !== null ? D.formas[sel] : null;
    paleta("#tl-relleno", f ? (f.cerrada ? f.relleno : "none") : estilo.relleno, (c) => { estilo.relleno = c || "none"; if (f) editarForma((x) => { x.relleno = c || "none"; if (c) x.cerrada = true; }); else pintarPanel(); }, true);
    const tr = $("#tl-tipo-rell", raiz); tr.replaceChildren(); for (const [k, n] of [["", "Liso"], ["lineal", "Degradado"], ["radial", "Degradado redondo"]]) tr.append(h("button", { class: (f?.degradado?.tipo || "") === k ? "activo" : "", disabled: !f || !f.cerrada || f.tipo === "texto" ? "" : null, onclick: () => editarForma((x) => { if (k) x.degradado = Object.assign({ a: "#1d1a26", angulo: 90 }, x.degradado, { tipo: k }); else delete x.degradado; }) }, n));
    tr.querySelectorAll("button").forEach((b) => { if (b.getAttribute("disabled") === "null") b.removeAttribute("disabled"); });
    $("#tl-deg", raiz).hidden = !f?.degradado; $("#tl-deg-ang", raiz).closest(".deslizador").hidden = f?.degradado?.tipo === "radial"; if (f?.degradado) { paleta("#tl-deg-c", f.degradado.a, (c) => editarForma((x) => { x.degradado.a = c || "#000000"; })); const da = $("#tl-deg-ang", raiz); if (document.activeElement !== da) da.value = f.degradado.angulo ?? 90; da.nextElementSibling.textContent = (f.degradado.angulo ?? 90) + "°"; }
    paleta("#tl-trazo-c", f ? (f.grosor ? f.trazo : null) : estilo.trazo, (c) => { estilo.trazo = c; if (f) editarForma((x) => { x.trazo = c; if (c && !x.grosor) x.grosor = estilo.grosor || 4; if (!c) x.grosor = 0; }); else pintarPanel(); }, true);
    const g = $("#tl-grosor", raiz); if (document.activeElement !== g) g.value = f ? f.grosor || 0 : estilo.grosor; g.nextElementSibling.textContent = (+g.value).toFixed(1);
    const o = $("#tl-opac", raiz); if (document.activeElement !== o) o.value = f?.opacidad ?? 1; o.nextElementSibling.textContent = Math.round((+o.value) * 100) + "%";
    $("#tl-cerrada", raiz).checked = !!f?.cerrada; $("#tl-cerrada", raiz).disabled = !f;
    $("#tl-sim", raiz).checked = f ? !!f.simetrica : !!estilo.simetrica; $("#tl-agujero", raiz).checked = !!f?.agujero; $("#tl-agujero", raiz).disabled = !f || f.tipo === "texto";
    const esT = f?.tipo === "texto"; $("#tl-texto-det", raiz).hidden = !esT; if (esT) { if (document.activeElement !== $("#tl-texto", raiz)) $("#tl-texto", raiz).value = f.texto || ""; const tm = $("#tl-tam", raiz); if (document.activeElement !== tm) tm.value = f.tam || 48; tm.nextElementSibling.textContent = Math.round(f.tam || 48); }
    const n = selSet().size; raiz.querySelectorAll(".tl-multi button").forEach((b) => (b.disabled = !n)); $("#tl-dist-x", raiz).disabled = $("#tl-dist-y", raiz).disabled = n < 3;
    $("#tl-agrupar", raiz).textContent = n > 1 && [...selSet()].every((i) => D.formas[i].grupo && D.formas[i].grupo === D.formas[[...selSet()][0]].grupo) ? "Desagrupar" : "Agrupar";
    raiz.querySelectorAll(".taller-panel .fila-botones:not(.tl-multi) button").forEach((b) => { if (!/tl-calco/.test(b.id)) b.disabled = !f; });
    const ul = $("#tl-capas", raiz); ul.replaceChildren(); if (!D.formas.length) ul.append(h("li", { class: "vacio" }, "Aún no hay formas: elige una herramienta y dibuja."));
    [...D.formas.keys()].reverse().forEach((i) => { const fo = D.formas[i], mini = h("span", { class: "mini" }); mini.style.background = fo.cerrada ? res(fo.relleno) : "transparent"; mini.style.borderColor = fo.grosor ? res(fo.trazo) : "#4a4466";
      const ojo = h("button", { class: "ojo" + (fo.oculta ? " apagado" : ""), title: "Mostrar u ocultar", onclick: (ev) => { ev.stopPropagation(); guardarHist(); fo.oculta = !fo.oculta; pintar(); } }, fo.oculta ? "○" : "●");
      const candado = h("button", { class: "ojo" + (fo.bloqueada ? "" : " apagado"), title: fo.bloqueada ? "Bloqueada: no se puede tocar en el lienzo. Clic para desbloquear" : "Bloquear (no se toca en el lienzo)", onclick: (ev) => { ev.stopPropagation(); guardarHist(); fo.bloqueada = !fo.bloqueada || undefined; pintar(); } }, fo.bloqueada ? "🔒" : "🔓");
      const tipoN = fo.tipo === "texto" ? `Texto «${(fo.texto || "").slice(0, 18)}»` : fo.agujero ? (fo.cerrada ? "Agujero" : "Goma") : `${fo.cerrada ? "Forma" : "Trazo"} · ${fo.puntos.length} puntos`;
      const nom = h("span", { title: "Doble clic para ponerle nombre" }, fo.nombre ? `${fo.nombre}` : `${tipoN}`);
      nom.ondblclick = async (ev) => { ev.stopPropagation(); const n = window.Dialogo ? await Dialogo.pedir("Nombre de la forma", { valor: fo.nombre || tipoN, aceptar: "Cambiar" }) : prompt("Nombre de la forma", fo.nombre || tipoN); if (n === null) return; guardarHist(); fo.nombre = n.trim() || undefined; pintar(); };
      ul.append(h("li", { class: i === sel ? "activo" : "", onclick: () => { sel = i; ponerHerr("sel"); pintar(); } }, ojo, candado, mini, nom)); }); }

  // ---- ratón
  let arr = null, espacio = false, pluma = null; const toques = new Map();
  function plumaFin() { if (pluma && pluma.forma.puntos.length < 2) D.formas.splice(D.formas.indexOf(pluma.forma), 1); pluma = null; $("#tl-trazo", raiz) && $("#tl-trazo", raiz).setAttribute("d", ""); }
  function eventosLienzo() { const s = $("#tl-svg", raiz);
    s.addEventListener("wheel", (ev) => { ev.preventDefault(); const p = local(ev); zoom(ev.deltaY > 0 ? 1.12 : 0.89, p.x, p.y); }, { passive: false });
    s.addEventListener("pointerdown", (ev) => { try { s.setPointerCapture(ev.pointerId); } catch {} const p = local(ev);
      if (ev.pointerType === "pen") penVisto = true;
      // DEDOS: con dos se mueve y se acerca la vista (si había un trazo a medias, se descarta); si ya se ha usado el lápiz, un dedo solo
      // mueve la vista (la palma o un dedo apoyados no pintan)
      if (ev.pointerType === "touch") { toques.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
        if (toques.size === 2) { if (arr?.pinc || arr?.dibujo) trazoLimpio(); const [a, b] = [...toques.values()]; arr = { pellizco: true, d0: Math.hypot(a.x - b.x, a.y - b.y), c0: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, v: Object.assign({}, vista) }; return; }
        if (penVisto) { arr = { pan: true, x0: ev.clientX, y0: ev.clientY, v: Object.assign({}, vista) }; return; } }
      if (espacio || ev.button === 1) { arr = { pan: true, x0: ev.clientX, y0: ev.clientY, v: Object.assign({}, vista) }; return; }
      // el OTRO EXTREMO DEL LÁPIZ borra (como la goma de un lápiz de verdad), sobre la forma que haya debajo
      if (ev.pointerType === "pen" && (ev.button === 5 || (ev.buttons & 32))) { const t = ev.target.closest?.(".forma"); if (t) sel = +t.dataset.i; if (sel === null) return; arr = { dibujo: [p], pres: [], goma: true }; return; }
      if (herr === "pincel" && window.Pinceles) { pincelBase(); const m = muestra(ev, p); arr = { pinc: true, M: [m], s: { x: p.x, y: p.y }, ult: m }; vistaPincel(arr.M); return; }
      if (herr === "sel") {
        const t = ev.target, fi = sel;
        if (t.classList.contains("punto")) { const i = +t.dataset.p, f = D.formas[fi];
          if (ev.altKey) { if (f.puntos.length > 2) { guardarHist(); f.puntos.splice(i, 1); pintar(); } return; }
          guardarHist(); arr = { punto: i, p0: p, orig: clon(f.puntos[i]) }; return; }
        if (t.classList.contains("asa")) { guardarHist(); arr = { asa: t.dataset.asa, punto: +t.dataset.p }; return; }
        if (t.classList.contains("forma") && D.formas[+t.dataset.i]?.bloqueada) { sel = null; multi = new Set(); pintar(); avisoT("Esa forma está bloqueada (🔒 en la lista de formas)"); return; }
        if (t.classList.contains("forma")) { const i = +t.dataset.i;
          if (ev.shiftKey) { if (sel !== null) multi.add(sel); if (multi.has(i)) multi.delete(i); else multi.add(i); sel = i; pintar(); return; }
          if (!selSet().has(i)) multi = new Set(); sel = i; const idx = [...selSet()]; guardarHist(); arr = { mover: true, p0: p, idx, orig: idx.map((k) => clon(D.formas[k].puntos)) }; pintar(); return; }
        sel = null; multi = new Set(); pintar(); return; }
      if (herr === "gotas") { const t = ev.target; if (!t.classList.contains("forma")) return; const o = D.formas[+t.dataset.i];
        estilo.relleno = o.cerrada || o.tipo === "texto" ? o.relleno : estilo.relleno; estilo.trazo = o.trazo || estilo.trazo; estilo.grosor = o.grosor ?? estilo.grosor;
        if (sel !== null && sel !== +t.dataset.i) editarForma((f) => { if (o.cerrada || o.tipo === "texto") f.relleno = o.relleno; if (o.grosor) { f.trazo = o.trazo; f.grosor = o.grosor; } }); else pintarPanel(); return; }
      if (herr === "texto") { guardarHist(); nueva({ tipo: "texto", texto: "Texto", tam: 48, puntos: [pto(p.x, p.y)], cerrada: true, relleno: estilo.relleno && estilo.relleno !== "none" ? estilo.relleno : "{tinta}", simetrica: undefined }); sel = D.formas.length - 1; ponerHerr("sel"); pintar(); setTimeout(() => { const i = $("#tl-texto", raiz); i.focus(); i.select(); }, 30); return; }
      if (herr === "goma") { const t = ev.target.closest?.(".forma"); if (t) sel = +t.dataset.i; if (sel === null) { avisoT("Empieza a borrar encima de una forma (o elígela antes con Seleccionar)"); return; } arr = { dibujo: [p], pres: [], goma: true }; return; }
      if (herr === "pincel" || herr === "lazo") { arr = { dibujo: [p], pres: [], lapiz: ev.pointerType === "pen" }; if (ev.pointerType === "pen") arr.pres.push(ev.pressure); return; }
      if (herr === "pluma") { if (!pluma) { guardarHist(); const f = { puntos: [], cerrada: false, relleno: estilo.relleno === "none" ? "{ropa}" : estilo.relleno, trazo: estilo.trazo || "{tinta}", grosor: estilo.grosor || 3 }; nueva(f); sel = D.formas.length - 1; pluma = { forma: f }; }
        const f = pluma.forma, P = f.puntos, k = escalaPx();
        if (P.length > 2 && Math.hypot(p.x - P[0].x, p.y - P[0].y) < 10 * k) { f.cerrada = true; f.grosor = estilo.grosor; plumaFin(); ponerHerr("sel"); pintar(); return; }
        P.push(pto(p.x, p.y)); arr = { pluma: P.length - 1, p0: p }; pintar(); return; }
      if (["elipse", "rect", "capsula"].includes(herr)) { guardarHist(); const f = { puntos: [], cerrada: true, relleno: estilo.relleno === "none" ? "{ropa}" : estilo.relleno, trazo: estilo.trazo, grosor: estilo.grosor }; nueva(f); sel = D.formas.length - 1; arr = { forma: herr, p0: p, f }; } });
    s.addEventListener("pointermove", (ev) => {
      if (ev.pointerType === "pen") { penVisto = true; const L = $("#tl-lapiz", raiz); if (L) L.textContent = `lápiz detectado${ev.buttons ? ` · presión ${Math.round((ev.pressure || 0) * 100)}%` : ""}${ev.tiltX || ev.tiltY ? ` · inclinado ${Math.round(Math.hypot(ev.tiltX, ev.tiltY))}°` : ""}`; }
      if (herr === "pincel" && pz && ev.pointerType !== "touch") { const p = local(ev), c = $("#tl-cursor", raiz); c.setAttribute("cx", f2(p.x)); c.setAttribute("cy", f2(p.y)); c.setAttribute("r", f2(Math.max(pz.tam / 2, escalaPx() * 2))); c.setAttribute("stroke-width", f2(escalaPx())); }
      if (ev.pointerType === "touch" && toques.has(ev.pointerId)) { toques.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
        if (arr?.pellizco && toques.size >= 2) { const [a, b] = [...toques.values()], dd = Math.hypot(a.x - b.x, a.y - b.y) || 1, c = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, r = s.getBoundingClientRect();
          const k = arr.d0 / dd, v = arr.v, w = v.w * k, hh = v.h * k, fx = (arr.c0.x - r.left) / r.width, fy = (arr.c0.y - r.top) / r.height;
          vista = { w, h: hh, x: v.x + v.w * fx - w * fx - ((c.x - arr.c0.x) / r.width) * w, y: v.y + v.h * fy - hh * fy - ((c.y - arr.c0.y) / r.height) * hh }; aplicarVista(); return; } }
      if (arr?.pinc) { const lista = ev.getCoalescedEvents ? ev.getCoalescedEvents() : [ev], a = 1 - (pz.estab || 0) * 0.9;
        for (const e of lista.length ? lista : [ev]) { const p = local(e), m = muestra(e, p);
          // presión simulada (ratón, dedo): rápido = fino, con un poco de inercia
          if (e.pointerType !== "pen" && pz.simular) { const u = arr.ult, dt = Math.max(1, m.t - u.t), v = Math.hypot(m.cx - u.cx, m.cy - u.cy) / dt; m.p = u.p + (Math.max(0.2, Math.min(1, 1.1 - v * 0.45)) - u.p) * 0.3; }
          arr.s.x += (p.x - arr.s.x) * a; arr.s.y += (p.y - arr.s.y) * a; m.x = arr.s.x; m.y = arr.s.y; arr.M.push(m); arr.ult = m; }
        if (!arr.raf) arr.raf = requestAnimationFrame(() => { if (arr?.pinc) { arr.raf = 0; vistaPincel(arr.M); } }); return; }
      if (!arr) { if (pluma && pluma.forma.puntos.length) { const p = local(ev), P = pluma.forma.puntos, u = P[P.length - 1]; $("#tl-trazo", raiz).setAttribute("d", `M${u.x} ${u.y} L ${p.x} ${p.y}`); } return; }
      const p = local(ev);
      if (arr.pan) { const k = vista.w / s.getBoundingClientRect().width; vista.x = arr.v.x - (ev.clientX - arr.x0) * k; vista.y = arr.v.y - (ev.clientY - arr.y0) * k; aplicarVista(); return; }
      if (arr.punto !== undefined && !arr.asa) { const f = D.formas[sel], q = f.puntos[arr.punto], dx = p.x - arr.p0.x, dy = p.y - arr.p0.y, o = arr.orig;
        let ddx = dx, ddy = dy; if (iman) { ddx = pega(o.x + dx, "x") - o.x; ddy = pega(o.y + dy, "y") - o.y; }
        Object.assign(q, { x: o.x + ddx, y: o.y + ddy, ix: o.ix + ddx, iy: o.iy + ddy, ox: o.ox + ddx, oy: o.oy + ddy }); pintarFormas(); pintarAsas(); return; }
      if (arr.asa) { const q = D.formas[sel].puntos[arr.punto], [a, b] = arr.asa === "i" ? ["ix", "iy"] : ["ox", "oy"], [c, e] = arr.asa === "i" ? ["ox", "oy"] : ["ix", "iy"];
        q[a] = p.x; q[b] = p.y; if (!ev.altKey) { const l = Math.hypot(q[c] - q.x, q[e] - q.y) || Math.hypot(p.x - q.x, p.y - q.y), v = Math.hypot(p.x - q.x, p.y - q.y) || 1; q[c] = q.x - ((p.x - q.x) / v) * l; q[e] = q.y - ((p.y - q.y) / v) * l; }   // Alt = romper la simetría
        pintarFormas(); pintarAsas(); return; }
      if (arr.mover) { let dx = p.x - arr.p0.x, dy = p.y - arr.p0.y;
        if (iman) { const c0 = caja({ puntos: arr.orig[0], tipo: D.formas[arr.idx[0]].tipo, texto: D.formas[arr.idx[0]].texto, tam: D.formas[arr.idx[0]].tam }), cx = (c0.x0 + c0.x1) / 2, cy = (c0.y0 + c0.y1) / 2; dx = pega(cx + dx, "x") - cx; dy = pega(cy + dy, "y") - cy; }
        arr.idx.forEach((k, n) => D.formas[k].puntos.forEach((q, i) => { const o = arr.orig[n][i]; Object.assign(q, { x: o.x + dx, y: o.y + dy, ix: o.ix + dx, iy: o.iy + dy, ox: o.ox + dx, oy: o.oy + dy }); })); pintarFormas(); pintarAsas(); return; }
      if (arr.dibujo) { arr.dibujo.push(p); if (arr.lapiz) arr.pres.push(ev.pressure); $("#tl-trazo", raiz).setAttribute("d", "M" + arr.dibujo.map((q) => `${f2(q.x)} ${f2(q.y)}`).join(" L ")); return; }
      if (arr.pluma !== undefined) { const q = pluma.forma.puntos[arr.pluma]; if (Math.hypot(p.x - arr.p0.x, p.y - arr.p0.y) > 3 * escalaPx()) { q.esquina = false; q.ox = p.x; q.oy = p.y; q.ix = 2 * q.x - p.x; q.iy = 2 * q.y - p.y; pintarFormas(); } return; }
      if (arr.forma) { const a = arr.p0, f = arr.f, w = Math.abs(p.x - a.x), hh = Math.abs(p.y - a.y);
        f.puntos = arr.forma === "elipse" ? elipse((a.x + p.x) / 2, (a.y + p.y) / 2, w / 2, hh / 2) : rectR(a.x, a.y, p.x, p.y, arr.forma === "capsula" ? Math.min(w, hh) / 2 : Math.min(w, hh) * 0.2); pintarFormas(); } });
    const soltar = (ev) => { if (ev?.pointerType === "touch") { toques.delete(ev.pointerId); if (arr?.pellizco) { if (toques.size < 2) arr = null; return; } }
      if (!arr) return; const a = arr; arr = null;
      if (a.pinc) { if (a.raf) cancelAnimationFrame(a.raf);
        // el estabilizador va por detrás: al soltar, el trazo llega hasta donde se levantó el lápiz
        const u = a.M[a.M.length - 1], fin = ev ? local(ev) : u; for (let k = 1; k <= 4; k++) a.M.push(Object.assign({}, u, { x: u.x + (fin.x - u.x) * (k / 4), y: u.y + (fin.y - u.y) * (k / 4) }));
        trazoLimpio(); const largo = a.M.reduce((L, q, i) => (i ? L + Math.hypot(q.x - a.M[i - 1].x, q.y - a.M[i - 1].y) : 0), 0);
        if (largo < escalaPx() * 1.5 && a.M.length < 3) { a.M.push(Object.assign({}, u, { x: u.x + 0.3 })); }   // un toque: un punto redondo
        const C = Pinceles.contorno(a.M, pz); if (C.length < 3) return;
        const P = rdp(C.concat([C[0]]), Math.max(0.08, escalaPx() * 0.3, pz.tam * 0.015)).slice(0, -1); if (P.length < 3) return; guardarHist();
        nueva({ puntos: suavizar(P, true), cerrada: true, relleno: colorPincel(), trazo: null, grosor: 0, opacidad: (pz.opac ?? 1) < 1 ? pz.opac : undefined, pincel: pzId, textura: pz.textura || undefined });
        sel = D.formas.length - 1; pintar(); return; }
      if (a.dibujo) { $("#tl-trazo", raiz).setAttribute("d", ""); const lazo = herr === "lazo"; if (a.dibujo.length < 3) return;
        if (lazo && !a.goma) { let ar = 0; const q = a.dibujo; for (let i = 0; i < q.length; i++) { const u = q[i], v = q[(i + 1) % q.length]; ar += u.x * v.y - v.x * u.y; }
          if (Math.abs(ar) / 2 < 60) { const ay = $("#tl-ayuda", raiz); if (ay) ay.textContent = "El lazo era demasiado pequeño o recto: dibuja un contorno cerrado."; return; } }
        const P = rdp(a.dibujo, +($("#tl-suave", raiz)?.value || 2.2) * escalaPx()); if (P.length < 2) return; guardarHist();
        if (a.goma) { const g = { puntos: suavizar(P, false), cerrada: false, agujero: true, grosor: +($("#tl-goma", raiz)?.value || 16), trazo: "#000", relleno: "none" };
          let j = sel + 1; while (j < D.formas.length && D.formas[j].agujero) j++; D.formas.splice(j, 0, g); pintar(); return; }
        nueva({ puntos: suavizar(lazo && P.length > 3 && Math.hypot(P[0].x - P[P.length - 1].x, P[0].y - P[P.length - 1].y) < 1e-6 ? P.slice(0, -1) : P, lazo), cerrada: lazo, relleno: lazo ? (estilo.relleno === "none" ? "{ropa}" : estilo.relleno) : "none", trazo: lazo ? estilo.trazo : estilo.trazo || "{tinta}", grosor: lazo ? estilo.grosor : f2((estilo.grosor || 6) * (a.lapiz && a.pres.length ? 0.4 + 1.2 * a.pres.reduce((x, y) => x + y, 0) / a.pres.length : 1)) });   // con lápiz, el grosor sigue la presión media
        sel = D.formas.length - 1; pintar(); return; }
      if (a.forma) { if (a.f.puntos.length < 2 || Math.abs(a.f.puntos[0].x - a.f.puntos[2].x) < 2 * escalaPx()) { D.formas.splice(D.formas.indexOf(a.f), 1); hist.pop(); sel = null; } ponerHerr("sel"); pintar(); return; }
      pintar(); };
    s.addEventListener("pointerup", soltar); s.addEventListener("pointercancel", soltar);
    s.addEventListener("pointerleave", () => $("#tl-cursor", raiz)?.setAttribute("r", 0));
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
    if ((ev.ctrlKey || ev.metaKey) && k === "d") { ev.preventDefault(); $("#tl-dup", raiz).click(); return; }
    if (k.startsWith("arrow") && sel !== null) { ev.preventDefault(); const st = ev.shiftKey ? 10 : 1, dx = k === "arrowleft" ? -st : k === "arrowright" ? st : 0, dy = k === "arrowup" ? -st : k === "arrowdown" ? st : 0;
      if (!(teclas.ult && Date.now() - teclas.ult < 700)) guardarHist(); teclas.ult = Date.now(); for (const i of selSet()) desplazar(D.formas[i], dx, dy); pintar(); return; }
    if (k === "enter" || k === "escape") { if (pluma) { plumaFin(); ponerHerr("sel"); pintar(); } else if (k === "escape") { sel = null; pintar(); } return; }
    if ((k === "[" || k === "]") && pz) { pz.tam = Math.max(0.5, Math.min(80, +(pz.tam * (k === "]" ? 1.15 : 0.87)).toFixed(1))); recordarPincel(); pintarPincel(); return; }
    const m = HERR.find(([, , tecla]) => tecla.toLowerCase() === k); if (m && !ev.ctrlKey) ponerHerr(m[0]); }
  document.addEventListener("keyup", (ev) => { if (ev.code === "Space") espacio = false; });

  // ---- abrir / guardar
  function ponerVista(v) { cfg.vista = v; seg(); $("#tl-ref", raiz).replaceChildren(); $("#tl-ref2", raiz).replaceChildren(); if (cfg.referencia) cfg.referencia($("#tl-ref", raiz), v); if (cfg.referenciaEncima) cfg.referenciaEncima($("#tl-ref2", raiz), v);
    const ej = $("#tl-ejes", raiz); ej.replaceChildren(); el("line", { x1: -2000, y1: 0, x2: 2000, y2: 0, stroke: "#ffffff", "stroke-opacity": 0.12 }, ej); el("line", { x1: 0, y1: -2000, x2: 0, y2: 2000, stroke: "#ffffff", "stroke-opacity": 0.12 }, ej);
    el("circle", { cx: 0, cy: 0, r: 4, fill: "#ff6a4a" }, ej); pintarRejilla(); }
  function seg() { const c = $("#tl-vista", raiz); c.replaceChildren(); if (!cfg.vistas) return;
    for (const [k, n] of Object.entries(cfg.vistas)) c.append(h("button", { class: k === cfg.vista ? "activo" : "", onclick: () => { if (k === cfg.vista) return; cfg.dibujos[cfg.vista] = D; D = cfg.dibujos[k] || { formas: [] }; sel = null; hist = []; fut = []; ponerVista(k); pintar(); } }, n)); }
  function abrir(op) {
    if (!raiz) construir(); cfg = Object.assign({ vistas: null, vista: "frente", dibujos: {} }, op); colores = op.colores || {};
    // fondos y láminas: sin colores del personaje ({piel}, {ropa}…); se dibuja con colores de verdad
    $("#tl-verref", raiz).closest("label").hidden = !!op.sinTokens;
    if (op.sinTokens) { if (!estilo.relleno || estilo.relleno.startsWith("{")) estilo.relleno = "#7a9a5a"; if (!estilo.trazo || estilo.trazo.startsWith("{")) estilo.trazo = "#1d1a26"; }
    // un dibujo por vista; si la pieza venía de un SVG (biblioteca o importado), se convierte en vectores editables
    for (const v of Object.keys(cfg.vistas || { frente: 1 })) if (!cfg.dibujos[v] && cfg.svgs?.[v]) { try { cfg.dibujos[v] = deSVG(cfg.svgs[v]); } catch { cfg.dibujos[v] = { formas: [] }; } }
    D = clon(cfg.dibujos[cfg.vista] || { formas: [] }); Object.keys(cfg.dibujos).forEach((k) => (cfg.dibujos[k] = clon(cfg.dibujos[k])));
    sel = null; multi = new Set(); pintarCalco(); pintarRejilla(); hist = []; fut = []; $("#tl-titulo", raiz).textContent = op.titulo || "Dibujar pieza"; $("#tl-nombre", raiz).hidden = op.nombre === undefined; $("#tl-nombre", raiz).value = op.nombre || ""; $("#tl-atajos-caja", raiz).hidden = true; $("#tl-guardar", raiz).textContent = op.textoGuardar || "Guardar pieza"; raiz.hidden = false; document.body.classList.add("con-taller");
    ponerVista(cfg.vista); ponerHerr(D.formas.length ? "sel" : "lazo"); requestAnimationFrame(() => { encajar(); pintar(); }); }
  function cerrar() { plumaFin(); raiz.hidden = true; document.body.classList.remove("con-taller"); }
  function guardar() { plumaFin(); cfg.dibujos[cfg.vista] = D; const out = {};
    for (const [v, dib] of Object.entries(cfg.dibujos)) if (dib) out[v] = { dibujo: dib, svg: aSVG(dib) };
    cfg.alGuardar(out, { nombre: $("#tl-nombre", raiz).value.trim() }); cerrar(); }
  window.Taller = { abrir, deSVG, aSVG };
})();
