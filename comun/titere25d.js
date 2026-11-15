// titere25d.js — títere 2,5D de cuerpo entero para Fe en Beta (12 nov 2026): anda, se para y gira hacia los dos lados.
// Probado en Videos/shorts-flow/lab-andar (aprobado: «mejoró muchísimo»). Autosuficiente: no necesita rig2d.js.
//
// Idea: cada punto del cuerpo vive en un espacio 3D ligero (s = costado, s>0 su izquierda; y = altura, +abajo; f = delante)
// y se proyecta con el ángulo hacia el que mira: a = 0 de frente, a > 0 mira a la derecha (3/4 = ±50°). La cámara mira
// un poco desde arriba (TILT): lo que está delante baja en pantalla. Piernas y brazos usan IK de dos huesos en 3D;
// la túnica son anillos elípticos cuya silueta se calcula cada fotograma; las piezas se reordenan por profundidad.
// La cabeza se dibuja DE FRENTE: su silueta (cara, masa de pelo) se queda y solo corren los rasgos de dentro.
//
// Uso:
//   const m = Titere25D.crear(grupoSvg, { id: "moises", barba: true, pelo: "rizado", colores: {...} });
//   m.dibujar({ amp, fase, torso, cabeza, ojos, brazos, pieIzq, pieDer, alzaIzq, alzaDer, parpadeo, avance });
// Coordenadas: los pies en y = 0, la cabeza hacia y ≈ −600. Coloca el grupo con translate(x, suelo) scale(1,5).
(function () {
  const NS = "http://www.w3.org/2000/svg";
  const el = (tag, at, padre) => { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); if (padre) padre.appendChild(e); return e; };
  const cl = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const suave = (x) => { x = cl(x); return x * x * (3 - 2 * x); };
  const rampa = (t, a, b) => suave((t - a) / (b - a));
  const pulso = (t, a, b, c) => rampa(t, a, b) * (1 - rampa(t, b, c));
  const lerp = (a, b, k) => a + (b - a) * k;
  const rad = (g) => (g * Math.PI) / 180;
  const mix = (a, b, k) => { const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); const A = p(a), B = p(b);
    return "#" + A.map((x, i) => Math.round(x + (B[i] - x) * k).toString(16).padStart(2, "0")).join(""); };
  const f1 = (x) => x.toFixed(1);

  // ---------------------------------------------------------------- 3D ligero
  // Cámara (común a todos los personajes de la escena): TILT > 0 mira desde arriba (0,25 normal, ~0,55 picado), TILT < 0 desde abajo
  // (contrapicado). PERS > 0 encoge lo de arriba (cámara baja: los pies cerca, la cabeza lejos); PERS < 0 lo contrario (picado).
  let TILT = 0.25, TILT_H = 0.12, PERS = 0;
  // Perspectiva real (opcional): camara({ inclina: grados (+ desde arriba, − desde abajo), distancia: unidades del personaje,
  // centro: altura que queda fija, p. ej. −300 }). Lo cercano a la cámara crece de verdad: picados y contrapicados extremos,
  // gran angular (una mano que se acerca a la cámara), alguien que corre hacia la cámara.
  let REAL = false, SIN = 0, COS = 1, DIST = 1e9, CY = -300;
  function camara(op = {}) {
    REAL = op.inclina !== undefined || op.distancia !== undefined;
    if (REAL) { const f = ((op.inclina ?? 14) * Math.PI) / 180; SIN = Math.sin(f); COS = Math.cos(f); DIST = op.distancia ?? 1400; CY = op.centro ?? -300;
      TILT = SIN; PERS = 0; TILT_H = 0.12 * SIN / 0.25; return; }
    TILT = op.tilt ?? 0.25; PERS = op.pers ?? 0; TILT_H = 0.12 * TILT / 0.25;
  }
  // escala de perspectiva en un punto 3D (1 sin perspectiva real)
  const escalaEn = (p) => { if (!REAL) return 1 + (PERS * p[1]) / 600; const d = -(p[1] - CY) * SIN + p[2] * COS; return DIST / Math.max(DIST * 0.25, DIST - d); };
  // línea del horizonte (y en coordenadas del personaje) con perspectiva real
  const horizonte = () => (REAL ? CY - DIST * (SIN / Math.max(0.02, Math.abs(COS))) : null);
  const W = (s, y, f, a) => [s * Math.cos(a) + f * Math.sin(a), y, -s * Math.sin(a) + f * Math.cos(a)];
  const PR = (p) => { if (!REAL) { const k = 1 + (PERS * p[1]) / 600; return [p[0] * k, p[1] + TILT * p[2]]; }
    const yr = p[1] - CY, k = escalaEn(p); return [p[0] * k, CY + (yr * COS + p[2] * SIN) * k]; };
  const add = (p, q) => [p[0] + q[0], p[1] + q[1], p[2] + q[2]];
  const sub = (p, q) => [p[0] - q[0], p[1] - q[1], p[2] - q[2]];
  const mul = (p, k) => [p[0] * k, p[1] * k, p[2] * k];
  const len = (p) => Math.hypot(p[0], p[1], p[2]);
  const nrm = (p) => mul(p, 1 / (len(p) || 1));
  const dot = (p, q) => p[0] * q[0] + p[1] * q[1] + p[2] * q[2];
  const P2 = (p) => { const q = PR(p); return `${f1(q[0])} ${f1(q[1])}`; };
  function ik3(A, B, L1, L2, haciaDonde) {          // la rodilla/codo se dobla hacia `haciaDonde`
    const d = sub(B, A); let D = len(d); D = Math.max(Math.abs(L1 - L2) + 0.1, Math.min(L1 + L2 - 0.1, D));
    const u = nrm(d), a1 = (L1 * L1 - L2 * L2 + D * D) / (2 * D), h = Math.sqrt(Math.max(0, L1 * L1 - a1 * a1));
    const pp = nrm(sub(haciaDonde, mul(u, dot(haciaDonde, u))));
    return add(A, add(mul(u, a1), mul(pp, h)));
  }
  const crTramo = (P) => { let s = ""; for (let i = 0; i < P.length - 1; i++) { const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
    s += ` C ${f1(p1[0] + (p2[0] - p0[0]) / 6)} ${f1(p1[1] + (p2[1] - p0[1]) / 6)} ${f1(p2[0] - (p3[0] - p1[0]) / 6)} ${f1(p2[1] - (p3[1] - p1[1]) / 6)} ${f1(p2[0])} ${f1(p2[1])}`; } return s; };
  const n2 = (x, y) => { const l = Math.hypot(x, y) || 1; return [x / l, y / l]; };
  function tubo(a, b, ra, rb) { const d = n2(b[0] - a[0], b[1] - a[1]), p = [-d[1], d[0]], o = (q, u, v) => `${f1(q[0] + p[0] * u + d[0] * v)} ${f1(q[1] + p[1] * u + d[1] * v)}`;
    return `M${o(a, ra, 0)} L ${o(b, rb, 0)} Q ${o(b, rb, rb)} ${o(b, 0, rb)} Q ${o(b, -rb, rb)} ${o(b, -rb, 0)} L ${o(a, -ra, 0)} Q ${o(a, -ra, -ra)} ${o(a, 0, -ra)} Q ${o(a, ra, -ra)} ${o(a, ra, 0)} Z`; }
  // dos tramos redondeados unidos en UNA silueta (para que el contorno no marque el cruce de los tramos, como hacían dos cápsulas)
  function cadena(a, b, c, ra, rb, rc) {
    const d1 = n2(b[0] - a[0] + 1e-6, b[1] - a[1]), d2 = n2(c[0] - b[0] + 1e-6, c[1] - b[1]), n1 = [-d1[1], d1[0]], n2v = [-d2[1], d2[0]];
    const P = (q, n, r) => `${f1(q[0] + n[0] * r)} ${f1(q[1] + n[1] * r)}`, nm = n2(n1[0] + n2v[0] + 1e-6, n1[1] + n2v[1]);
    const giro = d1[0] * d2[1] - d1[1] * d2[0];   // > 0: dobla hacia el lado n
    const ladoN = giro > 0 ? `L ${P(b, nm, rb * 0.8)}` : `Q ${P(b, nm, rb * 1.35)} ${P(b, n2v, rb)}`;
    const ladoM = giro > 0 ? `Q ${P(b, [-nm[0], -nm[1]], rb * 1.35)} ${P(b, [-n1[0], -n1[1]], rb)}` : `L ${P(b, [-nm[0], -nm[1]], rb * 0.8)}`;
    const Q2 = (q, d, n, r) => { const t = [q[0] + d[0] * r, q[1] + d[1] * r];   // media vuelta redonda de +n a −n por delante de d
      return `Q ${f1(q[0] + (n[0] + d[0]) * r)} ${f1(q[1] + (n[1] + d[1]) * r)} ${f1(t[0])} ${f1(t[1])} Q ${f1(q[0] + (-n[0] + d[0]) * r)} ${f1(q[1] + (-n[1] + d[1]) * r)} ${P(q, n, -r)}`; };
    return `M${P(a, n1, ra)} L ${P(b, n1, rb)} ${ladoN} L ${P(c, n2v, rc)} ${Q2(c, d2, n2v, rc)} L ${P(b, n2v, -rb)} ${ladoM} L ${P(a, n1, -ra)} ${Q2(a, [-d1[0], -d1[1]], [-n1[0], -n1[1]], ra)} Z`;
  }
  function ovalo(c, d, ru, rv) { const p = [-d[1], d[0]];
    return "M" + Array.from({ length: 16 }, (_, i) => { const th = (2 * Math.PI * i) / 16, u = Math.sin(th) * ru, v = Math.cos(th) * rv; return `${f1(c[0] + d[0] * u + p[0] * v)} ${f1(c[1] + d[1] * u + p[1] * v)}`; }).join(" L ") + " Z"; }
  // paths SVG absolutos (M L C Q Z) → puntos y vuelta
  const TOK = /[MLCQZ]|-?\d*\.?\d+(?:e-?\d+)?/g;
  function parsear(d) { const t = d.match(TOK), cmds = [], pts = []; let k = 0, cmd = null; const n = { M: 1, L: 1, C: 3, Q: 2, Z: 0 };
    while (k < t.length) { if (/[A-Z]/.test(t[k])) { cmd = t[k++]; if (cmd === "Z") { cmds.push(["Z", 0]); continue; } } else if (cmd === "M") cmd = "L";
      const c = n[cmd]; for (let j = 0; j < c; j++) { pts.push([+t[k], +t[k + 1]]); k += 2; } cmds.push([cmd, c]); }
    return { cmds, pts }; }
  function escribir(cmds, pts) { let s = "", p = 0; for (const [c, m] of cmds) { s += c; for (let j = 0; j < m; j++, p++) s += (j ? " " : "") + f1(pts[p][0]) + " " + f1(pts[p][1]); s += " "; } return s; }

  // ---------------------------------------------------------------- ciclo de andar
  const LS = 42, ST = 0.6;        // media zancada; fracción del ciclo con el pie apoyado
  // R (0 andar … 1 correr): zancada ×1,7, apoyo 36 % del ciclo (el resto es vuelo) y el pie sube hasta 62.
  const zancada = (R) => LS * (1 + 0.7 * R), apoyo = (R) => lerp(ST, 0.36, R);
  function pisada(q, A, R = 0) {
    const LS = zancada(R), ST = apoyo(R);
    q = ((q % 1) + 1) % 1; let f, alza = 0, cab = 0;
    if (q < ST) { const u = q / ST; f = A * LS * (1 - 2 * u);
      cab = -A * rad(14) * (1 - rampa(u, 0, 0.2)) + A * rad(30) * rampa(u, 0.62, 1); }      // apoya el talón; al final despega el talón
    else { const u = (q - ST) / (1 - ST); f = A * LS * (-1 + 2 * suave(u)); alza = A * lerp(26, 62, R) * Math.sin(Math.PI * u);
      cab = A * rad(30) * (1 - rampa(u, 0, 0.45)) - A * rad(14) * rampa(u, 0.55, 1); }
    return { f, alza, cab };
  }
  const velocidad = (cad, R = 0) => (2 * zancada(R) * cad) / apoyo(R);     // velocidad del suelo = la del pie apoyado (unidades del personaje por segundo)

  // Giro por capas (acción encadenada): ojos → cabeza → torso → brazos → cadera; los pies dan 4 pasitos alternos.
  // Devuelve funciones del tiempo en radianes. desde/hasta en grados (p. ej. 50 → −50).
  function giro({ desde, hasta, t0, t1 }) {
    const D = t1 - t0, V = [0, 1, 2, 3].map((i) => [t0 + (i * D) / 4, t0 + ((i + 1) * D) / 4]);
    const ventanas = (sg) => (sg < 0 ? [V[0], V[2]] : [V[1], V[3]]);   // empieza el pie derecho (sg −1)
    return {
      torso: (t) => rad(lerp(desde, hasta, rampa(t, t0, t1 - 0.08 * D))),
      cabeza: (t) => rad(lerp(desde, hasta, rampa(t, t0 - 0.1 * D, t1 - 0.22 * D))),
      pie: (t, sg) => { const w = ventanas(sg); return rad(desde + (hasta - desde) * 0.5 * (rampa(t, w[0][0], w[0][1]) + rampa(t, w[1][0], w[1][1]))); },
      alza: (t, sg) => 18 * ventanas(sg).reduce((s, [a, b]) => s + pulso(t, a, (a + b) / 2, b), 0),
    };
  }
  // Desplazamiento acumulado del suelo (para piedras, matas, fondo): integra la velocidad con la amplitud y el rumbo.
  function desplSuelo(t, amp, rumbo, cad) { let x = 0, z = 0; const dt = 1 / 120, V = velocidad(cad);
    for (let u = 0; u < t; u += dt) { const v = V * amp(u), a = rumbo(u); x -= v * Math.sin(a) * dt; z -= v * Math.cos(a) * dt; }
    return [x, z]; }

  // ---------------------------------------------------------------- manos
  const OPC = { estiloMano: "B" };   // B elegida por el usuario (13 nov): solo la palma más clara + bulto del pulgar          // Titere25D.opciones({ estiloMano: "B" }) para probar variantes
  // dedos: extensión de índice, corazón, anular y meñique (0 cerrado … 1 estirado); abre: separación en abanico; pulgar: 0 pegado … 1 abierto
  const MANOS = {
    relajada: { dedos: [0.62, 0.66, 0.62, 0.58], abre: 0.05, pulgar: 0.35, dobla: -0.35 },
    abierta:  { dedos: [1, 1, 1, 1], abre: 1, pulgar: 1, dobla: 0.1 },
    puno:     { dedos: [0, 0, 0, 0], abre: 0, pulgar: 0.12, dobla: -2.0 },     // el pulgar cruza por delante de los dedos doblados
    senala:   { dedos: [1, 0, 0, 0], abre: 0.15, pulgar: 0.2, dobla: -1.3 },
    agarra:   { dedos: [0.3, 0.3, 0.3, 0.3], abre: 0, pulgar: 0.45, dobla: -1.1 },
    pulgar:   { dedos: [0, 0, 0, 0], abre: 0, pulgar: 1, arriba: 1 },
    plana:    { dedos: [1, 1, 1, 1], abre: 0, pulgar: 0.4, dobla: -0.1 },          // dedos juntos y rectos (saludo militar, bendecir, «alto»)
  };
  // acepta un nombre ("abierta"), pesos ({ abierta: 0.6, puno: 0.4 }) o nada (relajada; corriendo, puños sueltos)
  function poseMano(spec, R = 0) {
    if (!spec) spec = R > 0 ? { relajada: 1 - 0.7 * R, puno: 0.7 * R } : "relajada";
    if (typeof spec === "string") spec = { [spec]: 1 };
    const out = { dedos: [0, 0, 0, 0], abre: 0, pulgar: 0, arriba: 0, dobla: 0 }; let tot = 0;
    for (const n in spec) { const p = MANOS[n], w = spec[n]; if (!p || !w) continue; tot += w;
      p.dedos.forEach((d, i) => (out.dedos[i] += d * w)); out.abre += p.abre * w; out.pulgar += p.pulgar * w; out.arriba += (p.arriba || 0) * w; out.dobla += (p.dobla || 0) * w; }
    if (tot < 1) { const p = MANOS.relajada, w = 1 - tot; p.dedos.forEach((d, i) => (out.dedos[i] += d * w)); out.abre += p.abre * w; out.pulgar += p.pulgar * w; }
    else if (tot > 1) { out.dedos = out.dedos.map((d) => d / tot); out.abre /= tot; out.pulgar /= tot; out.arriba /= tot; out.dobla /= tot; }
    return out;
  }

  // ---------------------------------------------------------------- emociones (cara)
  // sonrisa (−1 triste … 1), abre (boca 0…1), ancho (×), cejaY (suben), cejaIn / cejaOut (lado de dentro / de fuera suben),
  // ojoK (tamaño), parpado (el de arriba baja), entorna (el de abajo sube: ojos sonrientes), rubor, miraY (mira hacia abajo)
  const EMOCIONES = {
    alegre:   { sonrisa: 1, abre: 0.12, ancho: 1.15, cejaY: 2, entorna: 0.3, rubor: 0.3 },
    risa:     { sonrisa: 1.1, abre: 0.85, ancho: 1.25, cejaY: 4, entorna: 0.75, rubor: 0.55 },
    triste:   { sonrisa: -0.8, ancho: 0.85, cejaIn: 7, cejaOut: -3, parpado: 0.35, miraY: 0.7 },
    enfado:   { sonrisa: -0.55, abre: 0.08, ancho: 0.9, cejaY: -2, cejaIn: -8, cejaOut: 3, ojoK: 0.92, parpado: 0.4, rubor: 0.25 },
    sorpresa: { abre: 0.8, ancho: 0.55, cejaY: 9, ojoK: 1.16 },
    miedo:    { sonrisa: -0.45, abre: 0.4, ancho: 0.8, cejaY: 6, cejaIn: 6, cejaOut: -2, ojoK: 1.12 },
    pensativo:{ sonrisa: -0.15, ancho: 0.8, cejaIn: -3, cejaOut: 4, parpado: 0.2, miraY: -0.5 },
    verguenza:{ sonrisa: 0.35, ancho: 0.75, cejaIn: 5, parpado: 0.3, rubor: 1, miraY: 0.8 },
  };

  // ---------------------------------------------------------------- personaje
  const COLORES = {
    piel: "#c8684a", pielS: "#8c3c4a", pielL: "#f4a070", ropa: "#a8553a", ropaS: "#6a2e34", ropaL: "#ffc08a",
    pelo: "#d9d0d6", peloS: "#968aa4", peloL: "#fff1e0", cinto: "#e0b070", cintoL: "#fff0c0", sandalia: "#5a3424",
    tinta: "#14171e", papel: "#f7f1e5", noche: "#1c1230", nariz: "#a8444a", boca: "#3a1424", mejilla: "#e07a6a",
  };
  let cuenta = 0;
  // IDS ÚNICOS por copia: un dibujo con máscaras, recortes o degradados (agujeros, formas líquidas) puede estar varias veces en la
  // página (el personaje grande y las vistas del giro, varios actores). Con el mismo id, todas usarían la máscara de la primera
  // copia, y si los huesos deforman cada copia a su manera, el recorte no seguiría a la suya. Se renombran los id del grupo y sus url(#…).
  let cuentaIds = 0;
  function idsUnicos(raiz) { const conId = raiz.querySelectorAll("[id]"); if (!conId.length) return raiz; const suf = "_" + (++cuentaIds).toString(36), mapa = new Map();
    for (const e of conId) { const v = e.id; mapa.set(v, v + suf); e.id = v + suf; }
    const cambia = (t) => t.replace(/url\(#([^)]+)\)/g, (m, id) => (mapa.has(id) ? `url(#${mapa.get(id)})` : m));
    for (const e of raiz.querySelectorAll("*")) for (const a of ["fill", "stroke", "mask", "clip-path", "filter", "href", "xlink:href", "style"]) { const v = e.getAttribute(a); if (!v) continue;
      if (a === "href" || a === "xlink:href") { if (v[0] === "#" && mapa.has(v.slice(1))) e.setAttribute(a, "#" + mapa.get(v.slice(1))); } else if (v.includes("url(#")) e.setAttribute(a, cambia(v)); }
    return raiz; }

  // FORMAS CLAVE (como animar los puntos en Moho): una pieza o capa guarda otras versiones de su dibujo (formasClave: [{ id, nombre, svg }])
  // con LOS MISMOS PUNTOS movidos de sitio. Cada fotograma, cada trazado <path> (también los de máscaras y recortes: las formas
  // líquidas se recalculan solas) es la base más la suma de (clave − base) × peso. Un trazado de la clave que no tenga la misma
  // estructura (otros comandos u otro número de puntos) se ignora. morfo(raiz, claves) → { aplicar(peso(id)), ds(peso(id)), validas }
  const TOKM = /[a-zA-Z]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi;
  const trozosD = (d) => { const t = String(d || "").match(TOKM) || [], nums = [], letras = []; for (const x of t) { if (/[a-zA-Z]/.test(x)) letras.push(x); else nums.push(+x); } return { t, nums, firma: letras.join("") + "|" + nums.length }; };
  const escribeD = (t, nums) => { let i = 0; return t.map((x) => (/[a-zA-Z]/.test(x) ? x : (Math.round(nums[i++] * 100) / 100).toString())).join(" "); };
  function morfo(raiz, claves) {
    const base = [...raiz.querySelectorAll("path")].map((e) => ({ e, d: e.getAttribute("d") || "", ...trozosD(e.getAttribute("d")) }));
    const K = (claves || []).map((c) => { const doc = new DOMParser().parseFromString(`<svg xmlns="${NS}">${c.svg || ""}</svg>`, "image/svg+xml"), ps = [...doc.querySelectorAll("path")];
      const deltas = base.map((b, i) => { const q = ps[i] && trozosD(ps[i].getAttribute("d")); return q && q.firma === b.firma ? q.nums.map((v, k) => v - b.nums[k]) : null; });
      return { id: c.id, deltas, valida: ps.length === base.length && deltas.every(Boolean) }; });
    let ultimo = "";
    // d de cada trazado con estos pesos (null = como la base)
    const ds = (peso) => base.map((b, i) => { let nums = null; for (const k of K) { const w = +peso(k.id) || 0; if (Math.abs(w) < 0.001 || !k.deltas[i]) continue; nums = nums || b.nums.slice(); for (let n = 0; n < nums.length; n++) nums[n] += k.deltas[i][n] * w; }
      return nums ? escribeD(b.t, nums) : null; });
    function aplicar(peso) { const firma = K.map((k) => (+peso(k.id) || 0).toFixed(3)).join(","); if (firma === ultimo) return false; ultimo = firma;
      ds(peso).forEach((d, i) => base[i].e.setAttribute("d", d ?? base[i].d)); return true; }
    return { aplicar, ds, base, validas: K.filter((k) => k.valida).map((k) => k.id), claves: K };
  }

  function crear(padre, op = {}) {
    const C = Object.assign({}, COLORES, op.colores || {});
    const id = (op.id || "titere") + "-" + ++cuenta;
    const barba = op.barba !== false, tipoPelo = op.pelo || "rizado", rizado = tipoPelo === "rizado", largo = tipoPelo === "largo", calvo = tipoPelo === "calvo";   // calvo: sin pelo (para ponerle una pieza propia)
    const vestido = !!op.vestido, pestanas = op.pestanas ?? largo, moderno = !!op.moderno;   // moderno: sudadera, vaqueros y zapatillas
    if (moderno) Object.assign(C, { pantalon: "#2e3a5a", pantalonL: "#56668e", zapato: "#ece6da", zapatoS: "#8a8478" }, op.colores || {});
    const cPierna = moderno ? C.pantalon : C.piel, cPiernaL = moderno ? C.pantalonL : C.pielL;
    // proporciones: "normal" (≈3,7 cabezas) o "chibi" (≈2,2 cabezas: cuerpo corto y rechoncho, cabeza y ojos grandes).
    // En chibi el cuerpo se dibuja igual y se escala (KBX ancho, KBY alto) desde los pies; la cabeza se escala KH sobre el cuello.
    //   "nino" (≈2,9 cabezas: cuerpo pequeño, cabeza algo menor que la de un adulto, ojos grandes) y "mujer" (algo más estrecha y baja).
    const PROP = { normal: [1, 1, 1, 1, 1, 1, 0], chibi: [0.7, 0.54, 1.12, 1.25, 1.35, 0.55, 8], nino: [0.7, 0.58, 0.9, 1.18, 1.1, 1, 4], mujer: [0.88, 0.95, 0.96, 1.06, 0.92, 1, 0] };
    const pp_ = PROP[op.proporciones] || PROP.normal, chibi = op.proporciones === "chibi";
    const KBX = op.cuerpoX ?? pp_[0], KBY = op.cuerpoY ?? pp_[1], KH = op.cabezaK ?? pp_[2], KO = pp_[3];
    const KG = pp_[4], KBA = pp_[5], HUNDE = pp_[6];   // extremidades (más gruesas en chibi), barba (más corta en chibi), cabeza hundida en los hombros
    const escalaCuerpo = `scale(${KBX} ${KBY})`;
    const raiz = el("g", {}, padre);
    const defs = el("defs", {}, raiz), clip = el("clipPath", { id: id + "-cara" }, defs), clipCara = el("path", { d: "" }, clip);
    const sombra = el("ellipse", { fill: C.noche, opacity: 0.45 }, raiz);
    // desde abajo (contrapicado) las piernas solo se ven por debajo del borde delantero del bajo: se recortan con esta forma
    const clipPiernas = el("path", { d: "" }, el("clipPath", { id: id + "-piernas" }, defs));
    const cuerpo = el("g", {}, raiz);
    let J3 = {}, ANG_T = 0; const JUNTAS = {};
    const VEC = op.vector?.activo && op.vector.juntas && (op.vector.capas || []).length ? { juntas: op.vector.juntas, listas: op.vector.capas.filter((c) => c.svg && c.grupo).map((c) => ({ id: c.id, grupo: c.grupo, huesos: c.huesos || [], svg: c.svg, vista: c.vista, juntas: c.juntas })) } : null;
    const pieza = () => el("g", { transform: escalaCuerpo }, cuerpo);
    const traz = (g, c, w, o = 1) => el("path", { fill: "none", stroke: c, "stroke-width": w, "stroke-linecap": "round", "stroke-linejoin": "round", opacity: o }, g);
    const rell = (g, c, o = 1) => el("path", { fill: c, opacity: o }, g);

    // piernas: tubos cortos que se afinan; pie = sandalia oval oscura con el empeine de piel
    const piernas = [1, -1].map((sg) => { const g = pieza(); return { sg, g, muslo: traz(g, cPierna, 38 * KG * (moderno ? 1.1 : 1)), canilla: el("path", { fill: cPierna }, g), luz: traz(g, cPiernaL, 5, 0.6),
      pie: el("path", { fill: moderno ? C.zapatoS : C.sandalia, stroke: moderno ? C.zapatoS : C.sandalia, "stroke-width": 5, "stroke-linejoin": "round" }, g), empeine: el("path", { fill: moderno ? C.zapato : C.piel }, g), tira: traz(g, moderno ? C.zapato : C.sandalia, 6) }; });
    // brazos: manga acampanada que nace dentro del hombro, puño claro, antebrazo, manopla con pulgar
    const brazos = [1, -1].map((sg) => { const g = pieza(); return { sg, g, ante: traz(g, C.piel, 22 * KG), ...(() => { const manoG = el("g", {}, g);
        return { manoG, mano: el("path", { fill: C.piel }, manoG), palma: el("path", { fill: mix(C.piel, C.pielL, 0.42) }, manoG), curvos: el("path", { "stroke-linejoin": "round" }, manoG), rayasPuno: el("path", { fill: "none", "stroke-linecap": "round" }, manoG),
          linea: el("path", { fill: "none", stroke: mix(C.piel, C.pielS, 0.5), "stroke-linecap": "round" }, manoG),
          unas: el("path", { fill: mix(C.piel, C.pielL, 0.42) }, manoG),
          nudillos: el("path", { fill: "none", stroke: mix(C.piel, C.pielL, 0.55), "stroke-linecap": "round" }, manoG) }; })(), pulgarBorde: el("path", { fill: "none", "stroke-linejoin": "round" }, g), pulgar: el("path", { fill: C.piel }, g),
      manga: el("path", { fill: C.ropa }, g), filo: traz(g, C.ropaL, 6, 0.7), mangaInf: el("path", { fill: C.ropa }, g), puno: traz(g, C.ropaL, 9, 0.9), filo2: traz(g, C.ropaL, 6, 0.7), ...(() => { const gPalo = el("g", { display: "none" }, g);
        return { gPalo, palo: traz(gPalo, "#6a4630", 13), paloL: traz(gPalo, "#a87a50", 4, 0.8), dedosDelante: el("path", { fill: C.piel, display: "none" }, g) }; })() }; });
    const gT = pieza();
    const cuello = traz(gT, mix(C.piel, C.pielS, 0.45), 58);     // por DEBAJO de la túnica: solo asoma por el escote
    const tunica = rell(gT, C.ropa), sombraT = rell(gT, C.ropaS, 0.85), franja = traz(gT, mix(C.ropaS, C.noche, 0.2), 12, 0.8), dobladillo = vestido ? traz(gT, C.ropaL, 12, 0.9) : traz(gT, mix(C.ropa, C.noche, 0.45), 7, 0.6),
      filoT = traz(gT, C.ropaL, 9, 0.9), cinto = traz(gT, C.cinto, 16), cintoL = traz(gT, C.cintoL, 4, 0.8), nudo = traz(gT, C.cinto, 9),
      escoteS = rell(gT, mix(C.ropaS, C.noche, 0.25)), escote = rell(gT, mix(C.piel, C.pielS, 0.45));
    const interior = el("path", { fill: mix(C.ropaS, C.noche, 0.55) }); gT.insertBefore(interior, franja);   // el hueco de la falda visto desde abajo
    const gC = el("g", {}, cuerpo);

    // ---- cabeza DE FRENTE, ordenada por capas y con las medidas de la marca (diseno-personajes.md, ×1,16):
    //   cráneo «U» 116 × 156 (−78…+78), más alto que ancho; ojos y +4 (±24); cejas pegadas (y −17); nariz y +25; boca y +48;
    //   orejas a la altura de los ojos; pelo = masa plana que sobresale ~20 por arriba y ~10 por los lados, frente a ~⅓ (y −30).
    // Capas, de atrás adelante: 1 masa de pelo (silueta) · 2 orejas de atrás · 3 cráneo · 4 orejas y patillas del lado cercano
    //   · 5 rasgos (recortados por el cráneo) · 6 barba · 7 boca, bigote, nariz · 8 flequillo · 9 cejas.
    // Al girar: la silueta (masa, cráneo) se queda; los rasgos y el borde del flequillo corren sobre el cilindro de radio RC.
    // ---- emociones: cada una mueve boca, cejas, ojos y mejillas; se mezclan por pesos ({ alegre: 1 }, { triste: 0.5, miedo: 0.5 }…)
    const EXP0 = { sonrisa: 0, abre: 0, ancho: 1, dientes: 0, cejaY: 0, cejaIn: 0, cejaOut: 0, ojoK: 1, parpado: 0, entorna: 0, rubor: 0, miraY: 0 };
    const EXP = Object.assign({}, EXP0);
    let PESOS_CARA = {};
    function ponerCara(pesos) {
      Object.assign(EXP, EXP0); PESOS_CARA = pesos || {};
      for (const n in pesos) { const em = (op.emociones || {})[n] || EMOCIONES[n], w = pesos[n]; if (!em || !w) continue;   // las del personaje primero
        for (const k in em) if (typeof em[k] === "number") EXP[k] += (em[k] - (k === "ancho" || k === "ojoK" ? 1 : 0)) * w; }
    }
    const KAP = 0.5523, RC = 58;
    // MEDIA ANCHURA DE LA CARA a cada altura (el cráneo en «U»: recta de -30 a 26, curva arriba y barbilla abajo). Los rasgos que la
    // usan (cara: true) se apoyan en ESTE contorno al girar y no en una esfera: antes, en perfil, la boca (a la altura de la mandíbula,
    // donde la cara ya se estrecha) quedaba flotando por delante de la cara
    const WCARA = (() => { const bz = (p, t) => { const u = 1 - t; return u * u * u * p[0] + 3 * u * u * t * p[1] + 3 * u * t * t * p[2] + t * t * t * p[3]; };
      const tab = (xs, ys) => { const o = []; for (let i = 0; i <= 40; i++) o.push([bz(ys, i / 40), bz(xs, i / 40)]); return o.sort((a, b) => a[0] - b[0]); };
      const abajo = tab([58, 58, 32, 0], [26, 56, 78, 78]), arriba = tab([58, 58, 34, 0], [-30, -58, -78, -78]);
      const en = (t, y) => { for (let i = 1; i < t.length; i++) if (y <= t[i][0]) { const [y0, x0] = t[i - 1], [y1, x1] = t[i]; return y1 > y0 ? x0 + (x1 - x0) * (y - y0) / (y1 - y0) : x1; } return t[t.length - 1][1]; };
      return (y) => (y >= -30 && y <= 26 ? RC : y > 26 ? (y >= 78 ? 0 : en(abajo, y)) : (y <= -78 ? 0 : en(arriba, y))); })();
    const elD = (cx, cy, rx, ry) => `M${cx + rx} ${cy} C ${cx + rx} ${cy + ry * KAP} ${cx + rx * KAP} ${cy + ry} ${cx} ${cy + ry} C ${cx - rx * KAP} ${cy + ry} ${cx - rx} ${cy + ry * KAP} ${cx - rx} ${cy} C ${cx - rx} ${cy - ry * KAP} ${cx - rx * KAP} ${cy - ry} ${cx} ${cy - ry} C ${cx + rx * KAP} ${cy - ry} ${cx + rx} ${cy - ry * KAP} ${cx + rx} ${cy} Z`;
    const CABF = []; let OCULTO = new Set();
    // prof: k (cuánto sigue la superficie), z (profundidad extra), w (cuánto se queda quieto: la silueta no gira),
    //       desp (corrimiento de una masa con el giro), lim (no salir del cráneo, con frenado suave), ojo (usa el ángulo de los ojos)
    // cada forma de la cabeza sabe a qué parte pertenece (para que una pieza dibujada la sustituya: oculta: ["pelo", "ojos", "boca"…])
    const catDe = (prof, at, g) => { const pelos = [C.pelo, C.peloS, C.peloL];
      if (g === gMelena || prof === MASA || prof === FLEQ || prof === PATILLA) return "pelo"; if (prof === BARBA) return "barba"; if (prof === OJO) return "ojos"; if (prof === OREJA) return "orejas";
      if (prof.z === 9 && at.stroke === C.pelo) return "barba"; if (prof.z === 4 && at["stroke-width"] === 10) return "cejas"; if (at.fill === C.nariz) return "nariz";
      if (prof.z === 6 && prof.k === 1) return "boca"; if (prof === NUCA_ && (pelos.includes(at.fill) || pelos.includes(at.stroke))) return "pelo"; return null; };
    let NUCA_ = null;
    const CF = (d, prof, at, g = gC, pre = null) => { const e = el("path", at, g); const fz = { e, prof, pre, cat: catDe(prof, at, g) }; Object.assign(fz, parsear(d)); CABF.push(fz); return e; };
    const R_ = (c, o = 1) => ({ fill: c, opacity: o });
    const T_ = (c, w, o = 1) => ({ fill: "none", stroke: c, "stroke-width": w, "stroke-linecap": "round", "stroke-linejoin": "round", opacity: o });
    const MASA = { k: 0, z: 0, w: 1, desp: -16 }, CARA = { k: 0, z: 0, w: 1 };
    const FLEQ = { k: 0.95, z: 2, w: (x, y) => Math.max(rampa(-y, 64, 84), rampa(Math.abs(x), 46, 60)), lim: 60 }, BARBA = { k: 0.9, z: 6, w: 0.45 }, RASGO = { k: 1, z: 0 }, OJO = { k: 1, z: 2, ojo: true };
    const OREJA = { k: 0, z: -6 }, PATILLA = { k: 0, z: 6 };
    const arrugas = op.arrugas ?? barba;
    const gAtras = el("g", {}, gC);
    const gMelena = el("g", {}, cuerpo);      // melena larga: cae por la espalda, DETRÁS de la túnica (nunca por delante del cuello)
    if (largo) {
      CF("M0 -80 C 40 -80 66 -50 68 0 C 72 80 76 150 70 210 C 50 232 -50 232 -70 210 C -76 150 -72 80 -68 0 C -66 -50 -40 -80 0 -80 Z", { k: 0, z: 0, w: 1, desp: -40 }, R_(C.pelo), gMelena);
      CF("M-68 0 C -72 80 -76 150 -70 210 C -60 222 -48 226 -36 226 C -48 150 -52 60 -50 -10 C -50 -40 -40 -62 -24 -74 C -50 -66 -66 -40 -68 0 Z", { k: 0, z: 0, w: 1, desp: -40 }, R_(C.peloS, 0.85), gMelena);
      CF("M-66 -40 C -68 10 -68 50 -62 74 C -56 80 -48 78 -46 72 C -54 40 -56 0 -56 -36 Z M66 -40 C 68 10 68 50 62 74 C 56 80 48 78 46 72 C 54 40 56 0 56 -36 Z", { k: 0, z: 0, w: 1, desp: -10 }, R_(C.pelo), gAtras);   // enmarca la cara hasta la mandíbula, por fuera del cráneo
    }
    // 1 · masa de pelo (silueta), con sombra en el lado izquierdo de la pantalla
    if (!calvo) CF("M0 -86 C 40 -86 62 -62 62 -36 C 62 -24 60 -14 58 -6 L -58 -6 C -60 -14 -62 -24 -62 -36 C -62 -62 -40 -86 0 -86 Z", MASA, R_(C.pelo), gAtras);
    if (rizado) [[-61, -20, 9], [-62, -42, 10], [-54, -64, 10], [-36, -80, 10], [-12, -87, 10], [12, -87, 10], [36, -80, 10], [54, -64, 10], [62, -42, 10], [61, -20, 9]]
      .forEach(([x, y, r]) => CF(elD(x, y, r, r), MASA, R_(C.pelo), gAtras));
    else if (!largo && !calvo) CF("M-16 -84 L -6 -99 L 4 -85 Z M2 -85 L 18 -96 L 22 -82 Z", MASA, R_(C.pelo), gAtras);          // dos mechones de punta
    if (!calvo) CF("M-62 -36 C -62 -24 -60 -14 -58 -6 L -56 -34 C -56 -56 -46 -72 -30 -80 C -50 -76 -62 -60 -62 -36 Z", MASA, R_(C.peloS, 0.85), gAtras);
    // 2 · orejas de atrás (asoman del contorno de frente)
    if (!largo) [-1, 1].forEach((sg) => { CF(elD(sg * 58, 4, 12, 17), OREJA, R_(C.piel), gAtras); CF(elD(sg * 59, 5, 5.5, 9), OREJA, R_(C.pielS), gAtras); });   // el pelo largo tapa las orejas
    // 3 · cráneo en «U»: laterales casi rectos, mentón redondo
    const caraF = CF("M-58 -30 C -58 -58 -34 -78 0 -78 C 34 -78 58 -58 58 -30 L 58 26 C 58 56 32 78 0 78 C -32 78 -58 56 -58 26 Z", CARA, R_(C.piel));
    // 3b · PELO DEL LADO DE ATRÁS al girar: la silueta del pelo no gira, así que en perfil la mitad de atrás del cráneo quedaba de piel
    // («calvo por detrás») y el flequillo se veía como una franja de casco. Esta masa crece con el giro en el lado que se aleja: de la
    // coronilla a la nuca, por detrás de la oreja (que va encima). Se calcula en cada fotograma (dibujarCabeza).
    const peloLado = !calvo && !largo ? el("path", { fill: C.pelo, "data-parte": "pelo" }, gC) : null, bajoLado = rizado ? 52 : 46;
    // 4 · del lado que se acerca: su oreja y su patilla pasan por encima de la cara (opacidad según la profundidad, en dibujar)
    const lados = [-1, 1].map((sg) => {
      const oreja = el("g", {}, gC), patilla = el("g", {}, gC);
      CF(elD(sg * 58, 4, 12, 17), OREJA, R_(C.piel), oreja); CF(elD(sg * 59, 5, 5.5, 9), OREJA, R_(C.pielS), oreja);
      if (!calvo) CF(`M${sg * 60} -28 L ${sg * 59} 2 C ${sg * 57} 5 ${sg * 52} 5 ${sg * 51} 1 L ${sg * 45} -26 Z`, PATILLA, R_(C.pelo), patilla);   // nace ancha del pelo y se afina
      if (largo) { oreja.setAttribute("display", "none"); patilla.setAttribute("display", "none"); }
      return { sg, oreja, patilla };
    });
    // 5 · rasgos, recortados por el cráneo
    const gClip = el("g", { "clip-path": `url(#${id}-cara)` }, gC);
    const mejillas = [-1, 1].map((sg) => CF(elD(sg * 36, 26, 11, 6.5), RASGO, R_(C.mejilla, 0.45), gClip));
    let PARP = 1;
    // ojo: crece (ojoK), el párpado de arriba baja (enfado, tristeza) o el de abajo sube (sonrisa: ojos en media luna); parpadeo encima
    const ojoP = (cx) => (x, y) => { let dx = (x - cx) * EXP.ojoK, dy = (y - 4) * EXP.ojoK;
      dy *= dy < 0 ? 1 - 0.75 * EXP.parpado : 1 - 0.8 * EXP.entorna; return [cx + dx, 4 + dy * PARP]; };
    [-1, 1].forEach((sg) => { const g = el("g", {}, gClip), P = ojoP(sg * 24);
      CF(elD(sg * 24, 4, 9.5 * KO, 12.5 * KO), OJO, R_(C.tinta), g, P);
      CF(elD(sg * 24 + 3.5 * KO, 4 - 5 * KO, 2.9 * KO, 2.9 * KO), OJO, R_(C.papel), g, P);
      if (pestanas) CF(`M${sg * (24 + 7.5 * KO)} ${4 - 8.5 * KO} L ${sg * (24 + 13 * KO)} ${4 - 13 * KO}`, OJO, T_(C.tinta, 4), g, P); });
    if (arrugas) CF("M-16 -40 Q 0 -43 16 -40", RASGO, T_(C.pielS, 4, 0.45), gClip);
    // 6 · barba larga (envuelve la boca) · 7 boca, bigote y nariz
    if (barba) {
      const corta = (x, y) => [x, y > 40 ? 40 + (y - 40) * KBA : y];
      CF("M-54 6 C -60 90 -30 150 0 172 C 30 150 60 90 54 6 C 44 28 24 36 0 36 C -24 36 -44 28 -54 6 Z", BARBA, R_(C.pelo), gC, corta);
      CF("M-54 6 C -60 90 -30 150 0 172 C -22 140 -32 92 -30 36 C -40 30 -48 20 -54 6 Z", BARBA, R_(C.peloS), gC, corta);
      CF("M50 58 C 50 98 36 130 16 150", BARBA, T_(C.peloL, 7, 0.85), gC, corta);
      CF("M-8 90 L -6 128 M 14 90 L 12 126", BARBA, T_(C.peloS, 5, 0.6), gC, corta);
    }
    // boca: interior (más claro con barba, para que se lea sobre el pelo oscuro), dientes de arriba y lengua recortados por ella,
    // y con barba un contorno de labio de color piel; la forma la dan la emoción, la voz y los visemas (abre, ancho, dientes)
    const labios = () => { const so = EXP.sonrisa, ab = EXP.abre, an = 12 * EXP.ancho, arriba = 50.5 + 4 * so - ab * (4 + 2 * Math.max(0, so));
      return { so, ab, an, arriba, abajo: arriba + 0.5 + 24 * ab + 3 * Math.max(0, so) * ab, com: 48 - 6 * so + 2 * ab }; };
    const formaBoca = (x, y) => { const L = labios();
      if (Math.abs(x) > 6) return [Math.sign(x) * L.an, L.com];                                // comisuras: suben al sonreír, bajan tristes
      return y < 51 ? [0, L.arriba] : [0, L.abajo]; };                                         // labio de arriba (más recto si ríe) y de abajo
    const BOCA = { k: 1, z: 6, cara: true, zP: -7 }, bocaIn = barba ? mix(C.boca, "#b0404e", 0.45) : C.boca;
    const clipBoca = el("path", { d: "" }, el("clipPath", { id: id + "-boca" }, defs));
    const bocaF = CF("M-12 48 Q 0 50 12 48 Q 0 52 -12 48 Z", BOCA, { fill: bocaIn, stroke: bocaIn, "stroke-width": barba ? 3 : 6, "stroke-linejoin": "round" }, gC, formaBoca);
    bocaF._copia = clipBoca;
    const gDentro = el("g", { "clip-path": `url(#${id}-boca)` }, gC);
    CF("M-14 46 L 14 46 L 14 56 L -14 56 Z", BOCA, R_(C.papel, 0.95), gDentro, (x, y) => { const L = labios();
      return [x * EXP.ancho, y < 50 ? L.arriba - 6 : L.arriba + 1.2 + (2 + 5 * EXP.dientes) * Math.min(1, L.ab * 4)]; });   // dientes de arriba
    CF(elD(0, 60, 9, 5), BOCA, R_("#d0606e"), gDentro, (x, y) => { const L = labios(); return [x * EXP.ancho, L.abajo - 1 + (y - 60) * 0.9]; });   // lengua
    if (barba) CF("M-12 48 Q 0 50 12 48 Q 0 52 -12 48 Z", BOCA, T_(mix(C.piel, C.mejilla, 0.35), 3.5), gC, (x, y) => { const L = labios();
      if (Math.abs(x) > 6) return [Math.sign(x) * (L.an + 1.5), L.com]; return y < 51 ? [0, L.arriba - 1] : [0, L.abajo + 1.5]; });   // labios
    if (barba) CF("M-26 38 C -13 29 13 29 26 38", { k: 1, z: 9, cara: true, zP: 2 }, T_(C.pelo, 12));
    CF(elD(0, 25, 10, 7.5), { k: 1, z: 12, cara: true, zP: 6 }, R_(C.nariz));   // de perfil asoma pegada al contorno, no suelta
    // la oreja del lado cercano, ENCIMA de la barba (en perfil la barba la tapaba entera) y debajo del flequillo
    for (const o of lados) gC.appendChild(o.oreja);
    // 8 · flequillo: anclado arriba, su borde (la línea de la frente, ~⅓) corre con la cara sin salirse del cráneo
    if (largo) CF("M-58 -6 C -60 -14 -62 -24 -62 -36 C -62 -62 -40 -85 0 -85 C 40 -85 62 -62 62 -36 C 62 -24 60 -14 58 -6 C 54 -30 40 -54 5 -62 L 0 -56 L -5 -62 C -40 -54 -54 -30 -58 -6 Z", FLEQ, R_(C.pelo));   // raya en medio: la frente en arco
    else if (!calvo) CF("M-58 -6 C -60 -14 -62 -24 -62 -36 C -62 -62 -40 -85 0 -85 C 40 -85 62 -62 62 -36 C 62 -24 60 -14 58 -6 C 55 -26 44 -40 28 -40 C 18 -48 6 -45 -2 -39 C -14 -45 -34 -44 -44 -38 C -53 -30 -57 -18 -58 -6 Z", FLEQ, R_(C.pelo));   // el contorno de fuera tapa el cráneo y no se mueve
    if (rizado) [[-42, -68, 11], [-15, -76, 11], [14, -77, 11], [40, -68, 11]].forEach(([x, y, r]) => CF(elD(x, y, r, r), FLEQ, R_(C.pelo)));
    if (!calvo) CF("M8 -77 L 28 -73", FLEQ, T_(C.peloL, 8, 0.55));                                          // brillo-cápsula
    // 9 · cejas: barras gruesas redondeadas, cortas y pegadas a los ojos
    const gClip2 = el("g", { "clip-path": `url(#${id}-cara)` }, gC);
    [-1, 1].forEach((sg) => CF(`M${sg * 13} -17 L ${sg * 35} -15`, { k: 1, z: 4 }, T_(barba ? C.peloS : mix(C.pelo, C.noche, 0.2), 10), gClip2,
      (x, y) => [x, y - EXP.cejaY - (Math.abs(x) < 20 ? EXP.cejaIn : EXP.cejaOut)]));
    // ---- nuca (vista de espaldas): orejas a los lados, cráneo de piel y el pelo cubriéndolo hasta la nuca
    const caraKids = [...gC.children].filter((k) => k.getAttribute("display") !== "none"), puntos = {};
    const gNuca = el("g", { display: "none" }, gC), NUCA = { k: 0, z: 0, w: 1 }; NUCA_ = NUCA;
    if (!largo) [-1, 1].forEach((sg) => { CF(elD(sg * 58, 4, 12, 17), NUCA, R_(C.piel), gNuca); CF(elD(sg * 59, 5, 5.5, 9), NUCA, R_(C.pielS), gNuca); });
    CF("M-58 -30 C -58 -58 -34 -78 0 -78 C 34 -78 58 -58 58 -30 L 58 26 C 58 56 32 78 0 78 C -32 78 -58 56 -58 26 Z", NUCA, R_(mix(C.piel, C.pielS, 0.25)), gNuca);
    const bajoPelo = largo ? 80 : rizado ? 52 : 58;   // corto: el pelo cubre la nuca casi hasta abajo (con 44 quedaba media cabeza de piel)
    if (calvo) CF("M-30 -60 Q 0 -72 30 -60", NUCA, T_(C.pielL, 8, 0.4), gNuca);   // brillo de la calva
    if (!calvo) CF(`M0 -86 C 40 -86 62 -62 62 -36 C 62 0 60 ${bajoPelo - 26} 50 ${bajoPelo - 8} C 34 ${bajoPelo + 4} 12 ${bajoPelo} 0 ${bajoPelo + 2} C -12 ${bajoPelo} -34 ${bajoPelo + 4} -50 ${bajoPelo - 8} C -60 ${bajoPelo - 26} -62 0 -62 -36 C -62 -62 -40 -86 0 -86 Z`, NUCA, R_(C.pelo), gNuca);
    if (rizado) [[-61, -20, 9], [-62, -42, 10], [-54, -64, 10], [-36, -80, 10], [-12, -87, 10], [12, -87, 10], [36, -80, 10], [54, -64, 10], [62, -42, 10], [61, -20, 9], [-58, 4, 9], [58, 4, 9], [-48, 28, 10], [48, 28, 10], [-24, 44, 10], [0, 48, 10], [24, 44, 10]]
      .forEach(([x, y, r]) => CF(elD(x, y, r, r), NUCA, R_(C.pelo), gNuca));
    else if (!largo && !calvo) CF("M-16 -84 L -6 -99 L 4 -85 Z M2 -85 L 18 -96 L 22 -82 Z", NUCA, R_(C.pelo), gNuca);
    if (!calvo) CF("M-62 -36 C -62 0 -60 20 -50 36 L -44 30 C -54 6 -56 -20 -54 -40 C -52 -62 -42 -76 -26 -82 C -50 -78 -62 -60 -62 -36 Z", NUCA, R_(C.peloS, 0.85), gNuca);
    if (!calvo) CF("M-14 -60 L 14 -66", NUCA, T_(C.peloL, 8, 0.45), gNuca);                 // brillo
    if (barba) CF("M-54 20 C -60 40 -58 60 -50 74 L -44 60 Z M54 20 C 60 40 58 60 50 74 L 44 60 Z", NUCA, R_(C.pelo), gNuca);   // la barba asoma por los lados
    // ---- PIEZAS PROPIAS (fase 2 del editor): dibujos SVG atados a un hueso. { id, nombre, hueso: cabeza|pecho|cintura|manoIzq|manoDer,
    //   svg (contenido SVG; {piel}, {ropa}, {pelo}… se cambian por los colores del personaje), x, y, escala, rot (grados), capa: delante|detras,
    //   vista: siempre|frente|espaldas, modo (cabeza): superficie (corre y se estrecha con el giro, como los rasgos) | silueta (no gira: sombrero, pelo),
    //   prof (profundidad sobre el hueso), grupo (variantes: solo se ve la elegida en op.variantes / e.variantes), activo }
    const PIEZAS = (op.piezas || []).map((pz) => {
      // padre según el hueso: cabeza, brazo/antebrazo/mano (grupo de su brazo), pie (grupo de su pierna) o pecho/cintura (túnica)
      const h_ = pz.hueso || "", lado = /Izq$/.test(h_) ? 0 : /Der$/.test(h_) ? 1 : -1;
      const padre = h_ === "cabeza" ? gC : /^(mano|brazo|antebrazo)/.test(h_) && lado >= 0 ? brazos[lado].g : /^(pie|muslo|pierna)/.test(h_) && lado >= 0 ? piernas[lado].g : gT;
      const g = el("g", { "data-pieza": pz.id || "" }, padre), dentro = el("g", {}, g), tinta = (t) => String(t || "").replace(/\{(\w+)\}/g, (m0, k) => C[k] || m0);
      // un dibujo por vista (como las capas de cambio de Moho): frente (svg), perfil (svgPerfil, mirando a la derecha; se refleja) y espaldas
      const vis = { frente: el("g", {}, dentro) }; vis.frente.innerHTML = tinta(pz.svg); idsUnicos(vis.frente);
      for (const [k, src] of [["perfil", pz.svgPerfil], ["espaldas", pz.svgEspaldas]]) if (src) { vis[k] = el("g", { display: "none" }, dentro); vis[k].innerHTML = tinta(src); idsUnicos(vis[k]); }
      const morf = pz.formasClave?.length && !pz.doblar ? morfo(vis.frente, pz.formasClave) : null;
      return { pz, g, dentro, padre, vis, morf };
    });
    const PROF0 = { cabeza: 58, pecho: 47, cintura: 52 };
    const activa = (pz, ve) => { const vari = Object.assign({}, op.variantes || {}, ve || {}); return pz.grupo ? vari[pz.grupo] === pz.id : pz.activo !== false; };
    // FÍSICA por pieza (pz.fisica = { rigidez 0…1, amortiguacion 0…1, peso, pivote: [x, y] en el dibujo }): la pieza se balancea sobre su punto
    // de giro según la aceleración horizontal de ese punto (péndulo amortiguado). El tiempo llega en e.t; si salta hacia atrás o más de
    // 0,25 s, la pieza vuelve al reposo (las escenas precalculan el segundo anterior para que el vídeo salga igual en cualquier orden).
    let TT = 0, MUNDO = [0, 0];
    function fisica(P, ox, oy) {
      const F = P.pz.fisica, st = P.fis, K = 20 + 380 * (F.rigidez ?? 0.4), C = 1 + 14 * (F.amortiguacion ?? 0.35), S = 0.006 * (F.peso ?? 1), x = ox + MUNDO[0], y = oy + MUNDO[1];
      if (st && TT === st.t) return st.th;   // el mismo instante dibujado dos veces: no se reinicia
      if (!st || !(TT > st.t) || TT - st.t > 0.25) { P.fis = { t: TT, x, y, vx: 0, th: 0, w: 0 }; return 0; }
      const dt = TT - st.t, vx = (x - st.x) / dt, ax = Math.max(-25000, Math.min(25000, (vx - st.vx) / dt)), n = Math.ceil(dt * 240), hh = dt / n;
      for (let i = 0; i < n; i++) { st.w += (-K * st.th - C * st.w - S * ax) * hh; st.th = Math.max(-1.2, Math.min(1.2, st.th + st.w * hh)); }
      Object.assign(st, { t: TT, x, y, vx }); return st.th;
    }
    // FÍSICA EN CADENA (pz.cadena = { segmentos, largo, grosor, fin, color, rigidez, amortiguacion, ancla: [x, y], angulo }): una tira que cuelga
    // de la pieza (pelo largo, cuerda, cola, cinta) y se mueve en ola. Verlet en coordenadas del mundo (la inercia sale de andar o correr), con la
    // gravedad hacia abajo y un muelle hacia la forma de reposo; si el tiempo salta, vuelve al reposo (mismo criterio que la física de péndulo).
    function cadena(P, mat) { const Cd = P.pz.cadena, n = Math.max(2, Math.min(16, Math.round(Cd.segmentos ?? 6))), L = (Cd.largo ?? 160) / n;
      const sc = P.pz.escala ?? 1, an = Cd.ancla || [0, 0], a0 = ((P.pz.rot || 0) * Math.PI) / 180, lx = (P.pz.x || 0) + sc * (an[0] * Math.cos(a0) - an[1] * Math.sin(a0)), ly = (P.pz.y || 0) + sc * (an[0] * Math.sin(a0) + an[1] * Math.cos(a0));
      const O = [mat[0] * lx + mat[2] * ly + mat[4] + MUNDO[0], mat[1] * lx + mat[3] * ly + mat[5] + MUNDO[1]];
      const ar = (((Cd.angulo ?? 0) + (P.pz.rot || 0)) * Math.PI) / 180, dx0 = Math.sin(-ar), dy0 = Math.cos(ar), d = [mat[0] * dx0 + mat[2] * dy0, mat[1] * dx0 + mat[3] * dy0], dl = Math.hypot(d[0], d[1]) || 1, D0 = [d[0] / dl, d[1] / dl];
      const reposo = () => Array.from({ length: n + 1 }, (_, i) => [O[0] + D0[0] * L * i * sc, O[1] + D0[1] * L * i * sc]);
      let st = P.cad;       if (!st || !(TT >= st.t) || TT - st.t > 0.25) { const r = reposo(); st = P.cad = { t: TT, p: r, q: r.map((v) => v.slice()) }; }
      else if (TT > st.t) { const dt = TT - st.t, m = Math.ceil(dt * 120), h = dt / m, amo = 1 - 0.01 - 0.06 * (Cd.amortiguacion ?? 0.3), rig = 0.0005 + 0.03 * (Cd.rigidez ?? 0.25), Lr = L * sc;
        for (let k = 0; k < m; k++) { const R = reposo(); st.p[0] = [O[0], O[1]];
          for (let i = 1; i <= n; i++) { const p = st.p[i], q = st.q[i], vx = (p[0] - q[0]) * amo, vy = (p[1] - q[1]) * amo; st.q[i] = p.slice();
            p[0] += vx + (R[i][0] - p[0]) * rig; p[1] += vy + 2400 * h * h + (R[i][1] - p[1]) * rig; }
          for (let it = 0; it < 3; it++) for (let i = 1; i <= n; i++) { const a = st.p[i - 1], b = st.p[i], ex = b[0] - a[0], ey = b[1] - a[1], ll = Math.hypot(ex, ey) || 1, f = (ll - Lr) / ll;
            if (i === 1) { b[0] -= ex * f; b[1] -= ey * f; } else { a[0] += ex * f * 0.5; a[1] += ey * f * 0.5; b[0] -= ex * f * 0.5; b[1] -= ey * f * 0.5; } } }
        st.t = TT; }
      // forma rellena que se afina (grosor → fin), en las coordenadas del padre de la pieza
      const pts = st.p.map((v) => [v[0] - MUNDO[0], v[1] - MUNDO[1]]), g0 = (Cd.grosor ?? 18) * sc, g1 = (Cd.fin ?? 4) * sc, izq = [], der = [];
      pts.forEach((p, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n, i + 1)], tx = b[0] - a[0], ty = b[1] - a[1], tl = Math.hypot(tx, ty) || 1, w = (g0 + (g1 - g0) * (i / n)) / 2;
        izq.push([p[0] - (ty / tl) * w, p[1] + (tx / tl) * w]); der.push([p[0] + (ty / tl) * w, p[1] - (tx / tl) * w]); });
      const curva = (arr) => arr.map((p, i) => (i ? (i < arr.length - 1 ? `Q ${f1(p[0])} ${f1(p[1])} ${f1((p[0] + arr[i + 1][0]) / 2)} ${f1((p[1] + arr[i + 1][1]) / 2)}` : `L ${f1(p[0])} ${f1(p[1])}`) : `M${f1(p[0])} ${f1(p[1])}`)).join(" ");
      const fin = pts[n], dr = der.slice().reverse();
      P.cadEl.setAttribute("d", curva(izq) + ` Q ${f1(fin[0] + (fin[0] - pts[n - 1][0]) * 0.4)} ${f1(fin[1] + (fin[1] - pts[n - 1][1]) * 0.4)} ${f1(dr[0][0])} ${f1(dr[0][1])} ` + curva(dr).replace(/^M/, "L") + " Z");
      P.cadEl.setAttribute("fill", String(Cd.color || "{pelo}").replace(/\{(\w+)\}/g, (m0, k) => C[k] || m0)); }
    // PIEZAS QUE SE DOBLAN (pz.doblar = true; mangas, perneras, faldas cortas): la pieza se dibuja en el hueso de arriba (brazo, muslo) y
    // cada punto se reparte entre ese hueso y el de abajo (antebrazo, pierna) según lo cerca que esté de la articulación (pesos suaves en una
    // franja de ±zona). Así la manga se dobla con el codo en vez de quedarse rígida. Solo trazados (path) con M L C Q Z absolutos (los del taller).
    // J = { eje: 0 (x) | 1 (y), codo: dónde está la articulación en el dibujo del hueso de arriba, desB: lo que hay que restar para pasar al de abajo }
    // trocea rectas (cada ~12 unidades) y curvas (en 4) para que la pieza se doble suave aunque se dibujara con pocos puntos
    function subdividir({ cmds, pts }) { const oc = [], op = []; let k = 0, cur = [0, 0], ini = [0, 0];
      const lerp2 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
      for (const [c, m] of cmds) { const P2 = pts.slice(k, k + m); k += m;
        if (c === "M") { oc.push(["M", 1]); op.push(P2[0]); cur = ini = P2[0]; }
        else if (c === "L") { const b = P2[0], n = Math.max(1, Math.ceil(Math.hypot(b[0] - cur[0], b[1] - cur[1]) / 12)); for (let i = 1; i <= n; i++) { oc.push(["L", 1]); op.push(lerp2(cur, b, i / n)); } cur = b; }
        else if (c === "C" || c === "Q") { const [p1, p2, p3] = c === "C" ? P2 : [lerp2(cur, P2[0], 2 / 3), lerp2(P2[1], P2[0], 2 / 3), P2[1]]; let a = cur, b1 = p1, b2 = p2, d = p3;
          for (const t of [0.25, 1 / 3, 0.5]) { const q0 = lerp2(a, b1, t), q1 = lerp2(b1, b2, t), q2 = lerp2(b2, d, t), r0 = lerp2(q0, q1, t), r1 = lerp2(q1, q2, t), sp = lerp2(r0, r1, t);
            oc.push(["C", 3]); op.push(q0, r0, sp); a = sp; b1 = r1; b2 = q2; }
          oc.push(["C", 3]); op.push(b1, b2, d); cur = d; }
        else { if (Math.hypot(ini[0] - cur[0], ini[1] - cur[1]) > 12) { const n = Math.ceil(Math.hypot(ini[0] - cur[0], ini[1] - cur[1]) / 12); for (let i = 1; i < n; i++) { oc.push(["L", 1]); op.push(lerp2(cur, ini, i / n)); } }
          oc.push(["Z", 0]); cur = ini; } }
      return { cmds: oc, pts: op }; }
    function doblada(P, MA, MB, J, ve) {
      if (!P.mallas) { P.mallas = []; for (const pe of P.vis.frente.querySelectorAll("path")) { const dd = pe.getAttribute("d") || ""; if (/[a-z]|[HVSTA]/.test(dd.replace(/e-?\d/g, ""))) continue; P.mallas.push(Object.assign({ e: pe }, subdividir(parsear(dd)))); } }
      ponerPieza(P, MA, ve); if (P.g.getAttribute("display") === "none") return;
      P.g.setAttribute("transform", ""); P.dentro.setAttribute("transform", "");
      const pz = P.pz, sc = pz.escala ?? 1, a0 = ((pz.rot || 0) * Math.PI) / 180, ca = Math.cos(a0), sa = Math.sin(a0), zona = pz.doblarZona ?? 18;
      const ap = (M, x, y) => [M[0] * x + M[2] * y + M[4], M[1] * x + M[3] * y + M[5]];
      for (const m of P.mallas) { const pts = m.pts.map(([x0, y0]) => { const x = (pz.x || 0) + sc * (x0 * ca - y0 * sa), y = (pz.y || 0) + sc * (x0 * sa + y0 * ca), u = J.eje ? y : x;
          const w = cl((u - (J.codo - zona)) / (2 * zona)), ws = w * w * (3 - 2 * w), a = ap(MA, x, y); if (ws <= 0) return a;
          const b = ap(MB, x - J.desB[0], y - J.desB[1]); return [a[0] + (b[0] - a[0]) * ws, a[1] + (b[1] - a[1]) * ws]; });
        m.e.setAttribute("d", escribir(m.cmds, pts)); } }
    function ponerPieza(P, mat, ve, detrasForzado, ang) {
      const pz = P.pz, act = activa(pz, ve);
      if (P.cadEl) P.cadEl.setAttribute("display", act && mat && pz.cadena && pz.cadena.activa !== false ? "inline" : "none");
      if (!act || !mat) { P.g.setAttribute("display", "none"); return; }
      if (pz.cadena && pz.cadena.activa !== false) { if (!P.cadEl) P.cadEl = el("path", { "data-cadena": pz.id || "" }, P.padre); cadena(P, mat);
        if ((pz.capa || "delante") === "delante" && !detrasForzado) P.padre.appendChild(P.cadEl); else P.padre.insertBefore(P.cadEl, P.padre.firstChild); }
      P.g.setAttribute("display", "inline");
      P.g.setAttribute("transform", `matrix(${mat.map((v) => v.toFixed(4)).join(" ")})`);
      let fis = "";
      if (pz.fisica && pz.fisica.activa !== false) { const pv = pz.fisica.pivote || [0, 0], sc = pz.escala ?? 1, a0 = ((pz.rot || 0) * Math.PI) / 180;
        const px = (pz.x || 0) + sc * (pv[0] * Math.cos(a0) - pv[1] * Math.sin(a0)), py = (pz.y || 0) + sc * (pv[0] * Math.sin(a0) + pv[1] * Math.cos(a0));
        const th = fisica(P, mat[0] * px + mat[2] * py + mat[4], mat[1] * px + mat[3] * py + mat[5]);
        if (Math.abs(th) > 1e-4) fis = ` translate(${f1(pv[0])} ${f1(pv[1])}) rotate(${(th * 180 / Math.PI).toFixed(2)}) translate(${f1(-pv[0])} ${f1(-pv[1])})`; }
      P.dentro.setAttribute("transform", `translate(${f1(pz.x || 0)} ${f1(pz.y || 0)}) rotate(${f1(pz.rot || 0)}) scale(${(pz.escala ?? 1).toFixed(3)})${fis}`);
      // dibujo según el giro: de espaldas a partir de ~115°, de perfil entre ~55° y ~115° (reflejado si mira a la izquierda)
      if (ang !== undefined && (P.vis.perfil || P.vis.espaldas)) { const an = Math.atan2(Math.sin(ang), Math.cos(ang)), ab = Math.abs(an);
        const cual = ab > 2.0 && P.vis.espaldas ? "espaldas" : ab > 0.95 && P.vis.perfil && (ab <= 2.0 || !P.vis.espaldas) ? "perfil" : "frente";
        for (const k in P.vis) P.vis[k].setAttribute("display", k === cual ? "inline" : "none");
        P.vis.perfil?.setAttribute("transform", an < 0 ? "scale(-1 1)" : ""); }
      if ((pz.capa || "delante") === "delante" && !detrasForzado) P.padre.appendChild(P.g); else P.padre.insertBefore(P.g, P.padre.firstChild);
    }
    // matriz afín de un plano 3D (origen O, ejes ex, ey) proyectado con la cámara
    const planoA = (O, ex, ey) => { const o = PR(O), a = PR(add(O, ex)), b = PR(add(O, ey)); return [a[0] - o[0], a[1] - o[1], b[0] - o[0], b[1] - o[1], o[0], o[1]]; };
    const visto = (pz, cara) => { const v = pz.vista || "siempre"; return v === "siempre" || (v === "frente" ? cara > 0.05 : cara < -0.05); };
    function pintarPeloLado(c, a) { if (!peloLado) return; const r = Math.min(1, Math.max(0, (Math.abs(a) - 0.28) / 0.8)), s = r * r * (3 - 2 * r);
      if (s < 0.01 || OCULTO.has("pelo")) { peloLado.setAttribute("d", ""); return; } const t = a > 0 ? 1 : -1, X = (x) => f1(c[0] - t * x), Y = (y) => f1(c[1] + y);
      // de frente hacia la derecha (a > 0) el lado que se aleja es el izquierdo: x negativas (-t·x lo refleja para el otro lado)
      const b = bajoLado, xT = 62 - s * 50, xE = 62 - s * 31, xN = 62 - s * 17;
      // el borde de atrás sigue a la silueta del pelo (MASA, corrida desp·sen a) y baja en curva hasta la nuca: sin escalón donde acaba la masa
      const dm = 16 * Math.abs(Math.sin(a));
      peloLado.setAttribute("d", `M${X(62 + dm)} ${Y(-52)} L${X(xT)} ${Y(-52)} C${X(xT)} ${Y(-26)} ${X(xE - 5)} ${Y(-20)} ${X(xE)} ${Y(-3)} C${X(xE + 4)} ${Y(16)} ${X(xN - 4)} ${Y(b - 16)} ${X(xN)} ${Y(b)} `
        + `C${X(xN + 6)} ${Y(b + 5)} ${X(54)} ${Y(b + 4)} ${X(57)} ${Y(b - 4)} C${X(59 + dm * 0.2)} ${Y(20)} ${X(58 + dm)} ${Y(4)} ${X(58 + dm)} ${Y(-6)} C${X(60 + dm)} ${Y(-18)} ${X(62 + dm)} ${Y(-30)} ${X(62 + dm)} ${Y(-52)} Z`); }
    function dibujarCabeza(c, a, aOjo) { pintarPeloLado(c, a);
      CTRL.cabeza = difG((a * 180) / Math.PI, 0); const corrC = CORR.filter((x) => x.control === "cabeza" && x.d && !Array.isArray(x.d)).map((x) => [x, pesoCorr(x)]).filter((x) => x[1] > 0.001);
      CABF.forEach((fz, fi) => { fz._ci = fi; });
      // EXPRESIONES DIBUJADAS (fase 4): una emoción del personaje puede llevar la cara retocada a mano (emociones[n].dibujo, hecha de
      // frente); entra con el peso de la emoción (su deslizador de intensidad) y, al girar la cabeza, lo de los lados se estrecha con ella
      const exD = Object.entries(PESOS_CARA).map(([n, w]) => [(op.emociones || {})[n]?.dibujo, w]).filter((x) => x[0] && x[1] > 0.001), kx = Math.max(0, Math.cos(a));
      for (const fz of CABF) {
        const aa = fz.prof.ojo ? aOjo : a, pr = fz.prof;
        // OREJAS: un disco que mira hacia el lado; al girar se DESPLAZA con la cabeza (su centro sigue el cráneo) pero no se aplasta:
        // en perfil se ve entera, como es (antes se estrechaba con el coseno y quedaba una astilla)
        // (las PATILLAS igual: antes en perfil quedaban como una raya vertical en mitad de la cara)
        let rig = null; if ((pr === OREJA || pr === PATILLA) && fz.pts.length) { const cx = fz.pts.reduce((s, p) => s + p[0], 0) / fz.pts.length, sup = Math.sqrt(Math.max(0, RC * RC - cx * cx)), z = pr.k * sup + pr.z;
          rig = { dx: cx * Math.cos(aa) + z * Math.sin(aa) - cx, dy: TILT_H * (-cx * Math.sin(aa) + z * Math.cos(aa)) }; }
        const pts = rig ? fz.pts.map(([x, y]) => [c[0] + x + rig.dx, c[1] + y + rig.dy]) : fz.pts.map(([x, y]) => { if (fz.pre) [x, y] = fz.pre(x, y);
          // cara: apoyado en el contorno real a su altura; zP: cuánto sobresale de perfil (de frente sobresale z)
          const R0 = pr.cara ? WCARA(y) : RC, s2 = Math.sin(aa) * Math.sin(aa), z0 = pr.zP == null ? pr.z : pr.z + (pr.zP - pr.z) * s2;
          const sup = Math.sqrt(Math.max(0, R0 * R0 - x * x)), z = pr.f ? pr.f(x, sup) : pr.k * sup + z0;
          let w = typeof pr.w === "function" ? pr.w(x, y) : pr.w || 0; const zr = -x * Math.sin(aa) + z * Math.cos(aa);
          // la barba se queda medio quieta en 3/4 (que no adelgace), pero cerca del perfil gira entera: si no, su frente se quedaba
          // atrás y la boca y el bigote flotaban delante de ella
          if (pr === BARBA) w *= Math.min(1, Math.max(0, (Math.abs(Math.cos(aa)) - 0.3) / 0.4071));
          let xg = x * Math.cos(aa) + z * Math.sin(aa);          // lo que gira; el límite solo frena esto, no el contorno fijo
          // BARBA: el borde del lado que se aleja se convertía en perfil en el frente de la barba y se metía hacia dentro (barba como una
          // tira y la boca por delante); al esconderse va hacia el frente real de la barba (su línea del centro), nunca hacia atrás
          if (pr === BARBA && zr < 0) { const sg = Math.sign(Math.sin(aa)) || 1, xc = (pr.k * R0 + z0) * Math.sin(aa), t = Math.min(1, -zr / RC);
            xg = sg * Math.max(sg * xg, sg * (xg + (xc - xg) * t)); }
          // y el borde del lado cercano, por debajo de la oreja, se va hacia atrás hasta el ángulo de la mandíbula: en perfil quedaba una
          // cuña de piel entre la patilla y la barba (que bajaba en diagonal hasta la barbilla)
          if (pr === BARBA && zr > 0 && y > 20) { const sg = Math.sign(Math.sin(aa)) || 1, s4 = s2 * s2, t = Math.min(1, Math.abs(x) / RC) * s4 * Math.min(1, (y - 20) / 30), xb = -78 * Math.sin(aa);   // (los puntos son de control: la curva queda bastante más adelante)
            xg = sg * Math.min(sg * xg, sg * (xg + (xb - xg) * t)); }
          if (pr.lim) { const l0 = pr.lim * 0.75, ax = Math.abs(xg); if (ax > l0) xg = Math.sign(xg) * (l0 + (pr.lim - l0) * Math.tanh((ax - l0) / (pr.lim - l0))); }
          const xr = lerp(xg, x, w) + (pr.desp || 0) * Math.sin(aa);
          // BARBA: el rincón de arriba del lado que se aleja (junto a la oreja lejana) quedaba en perfil delante de la cara, como una
          // astilla que subía hasta el ojo; cuanto más se esconde, más baja hacia la mandíbula
          if (pr === BARBA && y < 40 && zr < 0) y += 30 * (zr / RC) * (zr / RC);
          return [c[0] + xr, c[1] + y + TILT_H * zr * (1 - w) + EXP.miraY * 9 * Math.min(1, pr.k || 0) * (1 - w)]; });
        for (const [cc, w] of corrC) { const dd = cc.d[fz._ci]; if (dd && dd.length === pts.length) for (let k = 0; k < pts.length; k++) { pts[k][0] += w * dd[k][0]; pts[k][1] += w * dd[k][1]; } }
        for (const [ex, w] of exD) { const dd = ex[fz._ci]; if (dd && dd.length === pts.length) for (let k = 0; k < pts.length; k++) { pts[k][0] += w * kx * dd[k][0]; pts[k][1] += w * dd[k][1]; } }
        const d = escribir(fz.cmds, pts); fz.e.setAttribute("d", d);
        if (fz.e === caraF) clipCara.setAttribute("d", d);
        if (fz.e._copia) fz.e._copia.setAttribute("d", d);
        if (fz.cat) fz.e.setAttribute("visibility", OCULTO.has(fz.cat) ? "hidden" : "visible");
      }
    }

    // ---- túnica: anillos elípticos; hombros anchos (≈1,25 cabezas) y bajo que se abre
    const NIV = [{ y: -418, A: 54, B: 34, k: 1 }, { y: -402, A: 82, B: 42, k: 1 }, { y: -352, A: 80, B: 46, k: 0.85 }, { y: -284, A: 74, B: 46, k: 0.55 }, { y: -206, A: 80, B: 50, k: 0.15 }, { y: -94, A: 102, B: 64, k: 0, bajo: true }];
    if (moderno) NIV.splice(4, 2, { y: -232, A: 76, B: 48, k: 0.3 }, { y: -164, A: 78, B: 51, k: 0.1, bajo: true });   // sudadera hasta la cadera
    if (vestido) NIV.splice(5, 1, { y: -112, A: 96, B: 60, k: 0.05 }, { y: -26, A: 112, B: 70, k: 0, bajo: true });   // falda acampanada hasta los tobillos
    const NA = 40;
    function anillo(lv, ang, cen, df) { const r = [];
      for (let i = 0; i < NA; i++) { const th = (2 * Math.PI * i) / NA, s = lv.A * Math.cos(th);
        const p = W(s + cen.s, lv.y + cen.y, lv.B * Math.sin(th) + cen.f + df(s, lv), ang); r.push({ q: PR(p), z: p[2] }); }
      return r; }
    function extremos(r) { let iL = 0, iR = 0; r.forEach((p, i) => { if (p.q[0] < r[iL].q[0]) iL = i; if (p.q[0] > r[iR].q[0]) iR = i; }); return [iL, iR]; }
    function arcoDelantero(r, iL, iR) { const camino = (paso) => { const c = []; for (let i = iL; ; i = (i + paso + NA) % NA) { c.push(r[i]); if (i === iR) break; } return c; };
      const A = camino(1), B = camino(-1), zm = (c) => c.reduce((s, p) => s + p.z, 0) / c.length; return zm(A) > zm(B) ? A : B; }
    function arcoTrasero(r, iL, iR) { const camino = (paso) => { const c = []; for (let i = iL; ; i = (i + paso + NA) % NA) { c.push(r[i]); if (i === iR) break; } return c; };
      const A = camino(1), B = camino(-1), zm = (c) => c.reduce((s, p) => s + p.z, 0) / c.length; return zm(A) > zm(B) ? B : A; }

    // ---------------------------------------------------------------- dibujar un fotograma
    function dibujar(e = {}) {
      TT = e.t ?? (typeof performance !== "undefined" ? performance.now() / 1000 : 0); MUNDO = e.mundo || [0, 0];
      const A = e.amp || 0, p = e.fase || 0, aT = e.torso || 0;
      const aH = e.cabeza ?? aT, aOjo = e.ojos ?? aH, aA = e.brazos ?? aT;
      const aPie = { 1: e.pieIzq ?? aT, [-1]: e.pieDer ?? aT }, alzaGiro = { 1: e.alzaIzq || 0, [-1]: e.alzaDer || 0 };
      PARP = e.parpadeo ?? 1;
      for (const P of PIEZAS) if (P.morf) P.morf.aplicar((k) => e.formas?.[P.pz.id + "/" + k]);   // formas clave de las piezas
      ponerCara(e.cara || {}); EXP.miraY += e.miraY || 0;
      if (e.visema) { const v = e.visema; EXP.abre = EXP.abre * 0.3 + v.abre * 0.95; EXP.ancho *= v.ancho; EXP.dientes = v.dientes ?? 0; }   // labios por fonemas
      else if (e.boca) { EXP.abre += 0.75 * e.boca; EXP.ancho *= 1 - 0.3 * e.boca + 0.25 * (e.bocaAncho || 0); }   // hablar: la boca se abre con la voz (escenas: envolvente del audio)
      // partes del muñeco que tapa una pieza puesta (oculta: ["melena", "cinto"])
      const mostrar = (g, ver) => { if (!g) return; if (ver) g.removeAttribute("display"); else g.setAttribute("display", "none"); };   // sin atributo si se ve: el SVG queda igual que antes
      const oculto = new Set(); for (const P of PIEZAS) if (activa(P.pz, e.variantes)) (P.pz.oculta || []).forEach((k) => oculto.add(k)); OCULTO = oculto;
      const R = e.correr || 0, AG = e.agacha || 0, REC = e.recoge || 0, ALT = e.altura || 0;
      // vaivén: andando baja al apoyar; corriendo baja a mitad del apoyo y sube en el vuelo; agacharse baja la cadera (las rodillas se doblan solas por IK)
      const bobW = 6 * A * Math.cos(4 * Math.PI * p), bobR = 15 * A * Math.cos(4 * Math.PI * (p - 0.18));
      const bob = lerp(bobW, bobR, R) + 5 * (alzaGiro[1] + alzaGiro[-1]) / 18 + 62 * AG, sway = lerp(5, 3, R) * A * Math.sin(2 * Math.PI * p);
      const vuelo = R * A * 12 * Math.max(0, -Math.cos(4 * Math.PI * (p - 0.18)));
      const tau = A * rad(lerp(8, 13, R)) * Math.cos(2 * Math.PI * p), tauS = -A * rad(lerp(7, 11, R)) * Math.cos(2 * Math.PI * p - 0.25);
      const incl = A * lerp(0.07, 0.2, R) + 0.22 * AG + (e.inclina || 0);
      const aCad = (aPie[1] + aPie[-1]) / 2, lean = (y) => incl * (-192 - y);
      const subir = ALT + vuelo;          // todo el cuerpo despega; la sombra se queda en el suelo y encoge
      // tumbado (0…1): el cuerpo gira sobre los pies hasta quedar en el suelo, boca arriba (tumbadoLado: 1 la cabeza a la derecha, −1 a la izquierda)
      const TB = cl(e.tumbado || 0), tbL = e.tumbadoLado || 1;
      // ELÁSTICO (squash & stretch): estira > 0 alarga y estrecha, < 0 aplasta y ensancha, desde los pies y conservando el volumen
      const EST = Math.max(-0.6, Math.min(0.8, e.estira || 0)), sy = 1 + EST, sx = 1 / Math.sqrt(sy);
      cuerpo.setAttribute("transform", `translate(0 ${f1(-subir * KBY - 66 * TB)})${TB > 0.001 ? ` rotate(${f1(90 * TB * tbL)} 0 0)` : ""}${Math.abs(EST) > 0.001 ? ` scale(${sx.toFixed(4)} ${sy.toFixed(4)})` : ""}`);
      sombra.setAttribute("opacity", (0.45 * (1 - cl(subir / 500) * 0.6) * (1 - 0.55 * cl((TILT - 0.35) / 0.3))).toFixed(2));   // desde muy arriba la sombra parecía un agujero
      const kP = escalaEn([0, 0, 0]), qS = PR([0, 0, 0]);
      sombra.setAttribute("cx", f1(qS[0] * KBX)); sombra.setAttribute("cy", f1(qS[1] * KBY));
      sombra.setAttribute("rx", 135 * KBX * kP * (1 - cl(subir / 500) * 0.45)); sombra.setAttribute("ry", 135 * kP * Math.max(0.04, TILT) * 0.6);

      const orden = [], bajoDf = {}, tobillos = {}; J3 = {};
      for (const L of piernas) {
        // paso propio de cada pie (rig de piernas): lado (hacia fuera), alto (levantarlo) y frente (adelantarlo); las rodillas siguen por IK
        const sg = L.sg, ap = aPie[sg], pz = pisada(p + (sg > 0 ? 0 : 0.5), A, R), pp = (sg > 0 ? e.pasoIzq : e.pasoDer) || {}, alza = pz.alza + alzaGiro[sg] + 55 * REC + (pp.alto || 0);
        bajoDf[sg] = 0.4 * pz.f;
        const local = (df, dy) => { const c = Math.cos(pz.cab), s = Math.sin(pz.cab), piv = pz.cab > 0 ? [34, 0] : [-12, 0], rx = df - piv[0], ry = dy - piv[1];
          return [piv[0] + rx * c - ry * s, piv[1] + rx * s + ry * c]; };          // el pie gira sobre la punta o sobre el talón
        const P3 = (ds, df, dy) => { const [lf, ly] = local(df, dy); return W(sg * (20 + (pp.lado || 0)) + ds, ly - alza, pz.f + lf + (pp.frente || 0), ap); };
        const tobillo = P3(0, 0, -18), cad = W(sg * 22 + sway, -192 + bob, 0, aCad - tau); tobillos[sg] = tobillo;
        const rod = ik3(cad, tobillo, 92, 90, W(0, 0, 1, ap));
        { const ld = sg > 0 ? "Izq" : "Der"; J3["cadera" + ld] = cad; J3["rodilla" + ld] = rod; J3["tobillo" + ld] = tobillo; }
        L.muslo.setAttribute("d", `M${P2(cad)} L ${P2(rod)}`); L.muslo.setAttribute("stroke-width", f1(38 * KG * escalaEn(mul(add(cad, rod), 0.5))));
        L.canilla.setAttribute("d", tubo(PR(rod), PR(tobillo), (moderno ? 21 : 17) * KG * escalaEn(rod), (moderno ? 18 : 12) * KG * escalaEn(tobillo)));
        L.luz.setAttribute("d", `M${P2(add(rod, W(9, 6, 0, ap)))} L ${P2(add(tobillo, W(9, -8, 0, ap)))}`);
        const ov = (rs, rf, cf, dy) => "M" + Array.from({ length: 14 }, (_, i) => { const th = (2 * Math.PI * i) / 14; return P2(P3(rs * Math.cos(th), cf + rf * Math.sin(th), dy)); }).join(" L ") + " Z";
        if (moderno) { L.pie.setAttribute("d", ov(17, 30, 12, 0)); L.empeine.setAttribute("d", ov(15, 25, 8, -9)); } else { L.pie.setAttribute("d", ov(14, 26, 10, 0)); L.empeine.setAttribute("d", ov(9, 15, 4, -7)); }
        L.tira.setAttribute("d", `M${P2(P3(-12, 12, -6))} L ${P2(P3(12, 12, -6))}`);
        // piezas en el pie (calzado, tobillera…): plano del empeine, que gira con el pie y se apoya con él
        for (const P of PIEZAS) { if (P.pz.hueso !== (sg > 0 ? "pieIzq" : "pieDer")) continue;
          const O = P3(0, 8, -10); ponerPieza(P, planoA(O, W(1, 0, 0, ap), [0, 1, 0]), e.variantes, false, ap); }
        // piezas en el muslo (cadera → rodilla) y en la pierna (rodilla → tobillo): el eje y del dibujo sigue el hueso; el origen es su punto medio
        const LADO = sg > 0 ? "Izq" : "Der";
        for (const P of PIEZAS) { const hu = P.pz.hueso; if (hu !== "muslo" + LADO && hu !== "pierna" + LADO) continue;
          const [A0, B0] = hu.startsWith("muslo") ? [cad, rod] : [rod, tobillo], O = mul(add(A0, B0), 0.5), ey = nrm(sub(B0, A0)), MA = planoA(O, W(1, 0, 0, ap), ey);
          if (P.pz.doblar && hu.startsWith("muslo")) { const O2 = mul(add(rod, tobillo), 0.5), MB = planoA(O2, W(1, 0, 0, ap), nrm(sub(tobillo, rod))), lm = len(sub(rod, cad)) / 2, lp = len(sub(tobillo, rod)) / 2;
            doblada(P, MA, MB, { eje: 1, codo: lm, desB: [0, lm + lp] }, e.variantes); }
          else ponerPieza(P, MA, e.variantes, false, ap); }
        const z = (rod[2] + tobillo[2]) / 2, os = cl(-z / 50) * 0.35;
        L.muslo.setAttribute("stroke", mix(cPierna, C.noche, os)); L.canilla.setAttribute("fill", mix(cPierna, C.noche, os)); L.empeine.setAttribute("fill", mix(moderno ? C.zapato : C.piel, C.noche, os));
        L.luz.setAttribute("opacity", (0.6 * (1 - os * 2.5)).toFixed(2));
        L.g.setAttribute("clip-path", `url(#${id}-piernas)`);
        mostrar(L.g, !oculto.has(L.sg > 0 ? "piernaIzq" : "piernaDer"));   // sustituida por una pieza dibujada
        orden.push({ g: L.g, z: TILT < -0.02 ? 10 + z * 0.01 : z - 1000 });   // desde abajo, delante del hueco de la falda                // las piernas siempre detrás de la túnica
      }

      // túnica con torsión (cadera → pecho) y el bajo empujado por las rodillas
      const df = (s, lv) => lv.bajo ? lerp(bajoDf[-1], bajoDf[1], cl((s / lv.A + 1) / 2)) : lv.y > -230 ? 0.15 * lerp(bajoDf[-1], bajoDf[1], cl((s / lv.A + 1) / 2)) : 0;
      const angNiv = (k) => lerp(aCad - tau, aT - tauS, k);
      // al agacharse, el bajo de la falda no se hunde en el suelo: se queda apoyado y se abre (la tela se arruga contra el suelo)
      const suelo = (lv) => { const tope = -10 - lv.y, hund = bob - tope; if (!(lv.bajo || lv.y > -130) || hund <= 0) return { y: bob, lv };
        const k = cl(hund / 70); return { y: tope, lv: Object.assign({}, lv, { A: lv.A * (1 + 0.32 * k), B: lv.B * (1 + 0.3 * k) }) }; };
      const anillos = NIV.map((lv0) => { const { y, lv } = suelo(lv0); return anillo(lv, angNiv(lv.k), { s: sway, y, f: lv.y > -192 ? lean(lv.y) * 0.15 : lean(lv.y) }, df); }), ext = anillos.map(extremos);   // por debajo de la cadera la tela no se inclina con el torso
      const izq = anillos.map((r, i) => r[ext[i][0]].q), der = anillos.map((r, i) => r[ext[i][1]].q);
      const nB = anillos.length - 1, arco = arcoDelantero(anillos[nB], ext[nB][0], ext[nB][1]);
      // contrapicado: el borde de la silueta es el arco de ATRÁS del bajo y se ve el hueco de dentro con las piernas
      const desdeAbajo = TILT < -0.02, arcoT = desdeAbajo ? arcoTrasero(anillos[nB], ext[nB][0], ext[nB][1]) : arco;
      interior.setAttribute("d", desdeAbajo ? "M" + anillos[nB].map((p) => `${f1(p.q[0])} ${f1(p.q[1])}`).join(" L ") + " Z" : "");
      clipPiernas.setAttribute("d", desdeAbajo ? "M" + arco.map((p) => `${f1(p.q[0])} ${f1(p.q[1])}`).join(" L ") + ` L ${f1(arco[arco.length - 1].q[0])} 4000 L ${f1(arco[0].q[0])} 4000 Z` : "M-9000 -9000 H9000 V9000 H-9000 Z");
      const cTop = [(izq[0][0] + der[0][0]) / 2, (izq[0][1] + der[0][1]) / 2 + 6];   // borde de arriba casi recto: el cuello entra directo al escote
      tunica.setAttribute("d", `M${f1(izq[0][0])} ${f1(izq[0][1])}${crTramo(izq)} ${arcoT.map((q) => `L ${f1(q.q[0])} ${f1(q.q[1])}`).join(" ")}${crTramo([...der].reverse())} Q ${f1(cTop[0])} ${f1(cTop[1])} ${f1(izq[0][0])} ${f1(izq[0][1])} Z`);
      dobladillo.setAttribute("d", "M" + arco.map((q) => `${f1(q.q[0])} ${f1(q.q[1] - (vestido ? 9 : 5))}`).join(" L "));
      const dentro = izq.map((q, i) => [lerp(q[0], der[i][0], 0.27), lerp(q[1], der[i][1], 0.27)]);   // sombra: lado izquierdo de la pantalla
      const xIn = dentro[nB][0], arcoS = []; for (const pt of arcoT) { arcoS.push(pt.q); if (pt.q[0] >= xIn) break; }
      sombraT.setAttribute("d", `M${f1(izq[0][0])} ${f1(izq[0][1])}${crTramo(izq)} ${arcoS.map((q) => `L ${f1(q[0])} ${f1(q[1])}`).join(" ")}${crTramo([...dentro].reverse())} Z`);
      filoT.setAttribute("d", `M${f1(der[1][0])} ${f1(der[1][1])}${crTramo(der.slice(1))}`);
      const frente = NIV.slice(1).map((lv) => PR(W(sway, lv.y + bob, lv.B + lean(lv.y) + df(0, lv) - 2, angNiv(lv.k))));
      franja.setAttribute("d", `M${f1(frente[0][0])} ${f1(frente[0][1])}${crTramo(frente)}`);
      const deFrente = cl((Math.cos(aT) + 0.15) / 0.3);
      franja.setAttribute("opacity", (0.8 * deFrente).toFixed(2)); nudo.setAttribute("opacity", moderno ? 0 : deFrente.toFixed(2));
      if (moderno) { franja.setAttribute("opacity", (0.5 * deFrente).toFixed(2)); cinto.setAttribute("opacity", 0); cintoL.setAttribute("opacity", 0); }
      const lvC = { y: -266, A: 76, B: 48 }, aC = angNiv(0.45), rC = anillo(lvC, aC, { s: sway, y: bob, f: lean(-266) }, () => 0), eC = extremos(rC), arcoC = arcoDelantero(rC, eC[0], eC[1]);
      cinto.setAttribute("d", "M" + arcoC.map((q) => `${f1(q.q[0])} ${f1(q.q[1])}`).join(" L ")); cintoL.setAttribute("d", "M" + arcoC.map((q) => `${f1(q.q[0])} ${f1(q.q[1] - 5)}`).join(" L "));
      const kn = W(sway - 30, -266 + bob, 46 + lean(-266), aC), sw = 6 * Math.sin(2 * Math.PI * p - 1) * A;
      nudo.setAttribute("d", `M${P2(kn)} Q ${P2(add(kn, [sw, 30, 4]))} ${P2(add(kn, [sw * 1.6, 62, 6]))} M${P2(add(kn, [6, 0, 0]))} Q ${P2(add(kn, [12 + sw, 26, 4]))} ${P2(add(kn, [14 + sw * 1.4, 50, 6]))}`);
      // cuello corto y ancho, casi tapado por el escote (la cabeza se apoya baja)
      cuello.setAttribute("d", `M${P2(W(sway, -410 + bob, lean(-410) - 4, aT))} L ${P2(W(sway, -436 + bob, lean(-436), aT))}`);
      const anilloD = (lv, dy) => "M" + anillo(lv, aT - tauS, { s: sway, y: bob + dy, f: lean(lv.y) + 4 }, () => 0).map((q) => `${f1(q.q[0])} ${f1(q.q[1])}`).join(" L ") + " Z";
      // sombra = misma forma algo más abajo: media luna por delante, sin «collar» detrás
      escoteS.setAttribute("d", anilloD({ y: -414, A: 35, B: 23 }, 5));
      escote.setAttribute("d", anilloD({ y: -414, A: 34, B: 22 }, -1));
      mostrar(gT, !oculto.has("torso"));
      orden.push({ g: gT, z: 0 });
      if (oculto.has("cinto")) [cinto, cintoL, nudo].forEach((x) => x.setAttribute("opacity", 0));
      else { cinto.setAttribute("opacity", moderno ? 0 : 1); cintoL.setAttribute("opacity", moderno ? 0 : 0.8); }
      for (const P of PIEZAS) { const pz = P.pz; if (pz.hueso !== "pecho" && pz.hueso !== "cintura") continue;
        const y0 = pz.hueso === "pecho" ? -340 : -266, ang = angNiv(pz.hueso === "pecho" ? 0.85 : 0.45), pf = pz.prof ?? PROF0[pz.hueso];
        const O = W(sway, y0 + bob, lean(y0) + pf, ang), cara = Math.cos(ang) * Math.sign(pf || 1);
        ponerPieza(P, visto(pz, cara) ? planoA(O, W(1, 0, 0, ang), [0, 1, 0]) : null, e.variantes, cara < 0, ang); }

      // brazos: braceo opuesto a las piernas; el hombro en el borde; cuelgan por fuera; delante o detrás según la profundidad
      for (const B of brazos) {
        // desde abajo (contrapicado) la perspectiva acerca la mano a la cara: al correr se dobla menos el codo y se bracea algo menos
        const bajo = cl(-TILT / 0.35), sg = B.sg, ang = aA - tauS, ampB = rad(lerp(24, 38, R)) * (1 - 0.3 * bajo * R), sig = -sg * A * ampB * Math.cos(2 * Math.PI * (p - 0.04));
        const codoB = rad(14) + A * rad(16) * cl(sig / ampB) + R * A * rad(56) * (1 - 0.7 * bajo) +   /* corriendo, codo a ~85°: con 100° las manos subían a la cara */ AG * rad(30);
        const hom = W(sg * 76 + sway, -392 + bob - (e.hombros || 0), lean(-392), ang);
        // pose libre: { lado (abre hacia fuera, rad), frente (adelante, rad), codo (rad), hacia: [s,y,f] hacia dónde dobla, k: mezcla con el braceo }
        const ov = sg > 0 ? e.brazoIzq : e.brazoDer, k = ov ? ov.k ?? 1 : 0;
        const Lb = lerp(0.29, ov?.lado ?? 0.29, k), Fb = lerp(sig, ov?.frente ?? 0, k), Cb = lerp(codoB, ov?.codo ?? codoB, k);
        const uL = [sg * Math.sin(Lb), Math.cos(Lb) * Math.cos(Fb), Math.cos(Lb) * Math.sin(Fb)];
        const h0 = ov?.hacia ? [ov.hacia[0] * sg, ov.hacia[1], ov.hacia[2]] : [0, 0, 1], hh = lerp(0, 1, k);
        const hL = nrm([h0[0] * hh, h0[1] * hh, lerp(1, h0[2], hh)]);
        let nL = sub(hL, mul(uL, dot(hL, uL))); if (len(nL) < 0.15) nL = [-sg * 0.3, -1, 0.2]; nL = nrm(nL);
        const fL = add(mul(uL, Math.cos(Cb)), mul(nL, Math.sin(Cb)));
        const dU = W(uL[0], uL[1], uL[2], ang), dF = W(fL[0], fL[1], fL[2], ang);
        const codo = add(hom, mul(nrm(dU), 88)), mun = add(codo, mul(nrm(dF), 70)), mano = add(mun, mul(nrm(dF), 16)), _j = (() => { const ld = sg > 0 ? "Izq" : "Der"; J3["hombro" + ld] = hom; J3["codo" + ld] = codo; J3["muneca" + ld] = mun; J3["mano" + ld] = mano; })(), puno = add(codo, mul(nrm(dF), moderno ? 62 : 36));   // sudadera: manga hasta la muñeca
        // manga en dos tramos (hombro → codo → puño) con el codo redondo: con el codo muy doblado (saludar, correr) el tramo
        // único tapaba el codo y el antebrazo parecía salir de un bloque recto
        const S0 = PR(hom), E0 = PR(codo), Cp = PR(puno), dd = n2(E0[0] - S0[0], E0[1] - S0[1]), pp = [-dd[1], dd[0]];
        const d2 = n2(Cp[0] - E0[0], Cp[1] - E0[1]), p2 = [-d2[1], d2[0]];
        const o2 = (q, a, b) => `${f1(q[0] + pp[0] * a + dd[0] * b)} ${f1(q[1] + pp[1] * a + dd[1] * b)}`;
        const o3 = (q, a, b) => `${f1(q[0] + p2[0] * a + d2[0] * b)} ${f1(q[1] + p2[1] * a + d2[1] * b)}`;
        const kH = escalaEn(hom), kC = escalaEn(codo), kU = escalaEn(puno), RE = (moderno ? 24 : 27) * kC, RP = (moderno ? 16 : 31) * kU;
        // la manga en DOS piezas: brazo (con el codo redondo) y antebrazo. Con el codo muy doblado el antebrazo pasa por delante del
        // brazo y debe dibujarse encima; antes era una sola pieza y la piel del antebrazo quedaba siempre DEBAJO: la mano flotaba
        B.manga.setAttribute("d", `M${o2(S0, 22 * kH, 0)} L ${o2(E0, RE, 0)} L ${o2(E0, -RE, 0)} L ${o2(S0, -22 * kH, 0)} Q ${o2(S0, 0, -30 * kH)} ${o2(S0, 22 * kH, 0)} Z `
          + `M${f1(E0[0] + RE)} ${f1(E0[1])} A ${RE} ${RE} 0 1 0 ${f1(E0[0] - RE)} ${f1(E0[1])} A ${RE} ${RE} 0 1 0 ${f1(E0[0] + RE)} ${f1(E0[1])} Z`);
        B.mangaInf.setAttribute("d", `M${o3(E0, RE, 0)} L ${o3(Cp, RP, 0)} Q ${o3(Cp, 0, 9 * kU)} ${o3(Cp, -RP, 0)} L ${o3(E0, -RE, 0)} Z `
          + `M${f1(E0[0] + RE)} ${f1(E0[1])} A ${RE} ${RE} 0 1 0 ${f1(E0[0] - RE)} ${f1(E0[1])} A ${RE} ${RE} 0 1 0 ${f1(E0[0] + RE)} ${f1(E0[1])} Z`);   // con el codo entero: sin hueco por donde asome la piel
        B.puno.setAttribute("d", `M${o3(Cp, RP - 4, -3)} Q ${o3(Cp, 0, 5)} ${o3(Cp, -RP + 4, -3)}`);
        const lado = pp[0] > 0 ? 1 : -1;
        const lado2 = p2[0] > 0 ? 1 : -1, doblado = d2[0] * dd[0] + d2[1] * dd[1] < 0.8;   // con el codo doblado, cada tramo lleva su propio filo
        B.filo.setAttribute("d", `M${o2(S0, 19 * lado, 2)} L ${o2(E0, 23 * lado, doblado ? -6 : 0)}`);
        B.filo2.setAttribute("d", `M${o3(E0, (RE - 4) * (doblado ? lado2 : lado), doblado ? 10 : 0)} L ${o3(Cp, (RP - 4) * (doblado ? lado2 : lado), -8)}`);
        B.ante.setAttribute("d", `M${P2(codo)} L ${P2(mun)}`); B.ante.setAttribute("stroke-width", f1(22 * KG * escalaEn(mun)));
        const kM = escalaEn(mano);
        const qm = PR(mano), qw = PR(mun), dh = n2(qm[0] - qw[0], qm[1] - qw[1]);
        puntos[sg > 0 ? "manoIzq" : "manoDer"] = [qm[0] * KBX, qm[1] * KBY - subir * KBY];
        // pulgar: hacia delante y adentro, perpendicular al antebrazo y girado con la muñeca (giroManoIzq/Der, radianes: π = palma arriba al
        // ofrecer la mano). La normal de la palma = antebrazo × pulgar (con el signo del lado) dice si la cámara ve la palma o el dorso.
        // el pulgar gira con la flexión del codo (antebrazo sin pronar): colgando apunta adelante, con el codo a 90° arriba y con el
        // puño en alto hacia el cuerpo. Antes apuntaba siempre adelante y, con el puño en alto y el cuerpo en 3/4, cada mano
        // enseñaba la cara de la otra (la derecha la palma y la izquierda los nudillos)
        const tFlex = add(mul(uL, -Math.sin(Cb)), mul(nL, Math.cos(Cb)));
        const fd = nrm(dF), dP0 = add(W(tFlex[0], tFlex[1], tFlex[2], ang), mul(W(-sg, 0, 0, ang), 0.7));
        let t0 = sub(dP0, mul(fd, dot(dP0, fd))); if (len(t0) < 0.1) t0 = W(-sg, 0, 0, ang); t0 = nrm(t0);
        const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
        // palmaIzq / palmaDer: hacia dónde mira la palma, en ejes del personaje [s, y, f] ([0, 0, 1] = hacia delante: saludar,
        // bendecir; [0, −1, 0] = arriba: ofrecer). Fija el pulgar para que esa sea la cara de la palma (si no, la postura del brazo decide).
        const pdir = sg > 0 ? e.palmaIzq : e.palmaDer;
        if (pdir) { const nW = W(pdir[0], pdir[1], pdir[2], ang), n0 = sub(nW, mul(fd, dot(nW, fd))); if (len(n0) > 0.1) t0 = nrm(mul(cruz(nrm(n0), fd), -sg)); }
        const gM = (sg > 0 ? e.giroManoIzq : e.giroManoDer) || 0, dP3 = add(mul(t0, Math.cos(gM)), mul(cruz(fd, t0), Math.sin(gM)));
        const dP = n2(dP3[0], dP3[1] + TILT * dP3[2]), nPal = mul(cruz(fd, dP3), -sg), vista = dot(nPal, nrm([0, -TILT, 1]));
        // tres casos claros, sin medias tintas: PALMA (vista > 0,12), DORSO (vista < −0,12) o DE CANTO (en medio: ni palma ni uñas,
        // la mano se estrecha). Antes, con la mano colgando de lado salía media palma y medias uñas y no se sabía qué cara se veía.
        const palmK = cl((vista - 0.12) / 0.25), dorsoK = cl((-vista - 0.12) / 0.25), verPalma = palmK;
        puntos[sg > 0 ? "caraIzq" : "caraDer"] = palmK > 0.5 ? "palma" : dorsoK > 0.5 ? "dorso" : "canto";
        // pulgar delante si se ve la palma, DETRÁS si se ve el dorso (también en el pulgar arriba: ahí se ve el dorso y el pulgar asoma por detrás);
        // de canto, delante si apunta hacia la cámara
        const pulgarDelante = palmK > 0.5 || (dorsoK < 0.5 && dot(dP3, nrm([0, -TILT, 1])) > 0);
        const dP3s = [dP3[0], dP3[1] + TILT * dP3[2]], fv = cl(Math.hypot(dP3s[0], dP3s[1]), 0.55, 1);   // de canto, la mano se ve más estrecha
        // mano articulada: palma, cuatro dedos (índice del lado del pulgar) y pulgar, en coordenadas de la mano (u: de la muñeca
        // hacia los dedos; v: hacia el pulgar). La pose se mezcla por pesos; en escorzo (apuntando a la cámara) u se acorta.
        const pm = poseMano(sg > 0 ? e.manoIzq : e.manoDer, R), cierre = 1 - (pm.dedos[0] + pm.dedos[1] + pm.dedos[2] + pm.dedos[3]) / 4, esc = 1.15 * KG * kM * (1 + 0.14 * cierre);   // el puño, algo más grande   // ×1,15: a tamaño de plano medio las manos casi no se leían
        const fu = cl(Math.hypot(qm[0] - qw[0], qm[1] - qw[1]) / (16 * kM), 0.38, 1);
        let pv = [-dh[1], dh[0]]; const sgv = pv[0] * dP[0] + pv[1] * dP[1]; // lado del pulgar por la QUIRALIDAD: mano izquierda con la palma a la vista → pulgar a −pv; dorso → +pv; la derecha al revés.
        // Antes se decidía por la proyección del pulgar, que con el puño en alto y el torso girado casi coincide con el antebrazo
        // y salía al azar: el puño derecho se dibujaba como uno izquierdo
        const quiral = (vista >= 0 ? -1 : 1) * sg;
        if (Math.abs(vista) > 0.05 ? quiral < 0 : Math.abs(sgv) > 0.15 ? sgv < 0 : sg > 0) pv = [-pv[0], -pv[1]];
        const L2 = (u, v) => [qw[0] + (dh[0] * u * fu + pv[0] * v * fv) * esc, qw[1] + (dh[1] * u * fu + pv[1] * v * fv) * esc];
        let dDedos = ""; const puntas = []; let dMano = ovalo(L2(12, 0), n2(dh[0] * fu + 1e-6, dh[1] * fu), 12.5 * esc * (0.55 + 0.45 * fu), 13 * esc);
        const LD = [14.5, 16, 15, 12], VD = [9, 3, -3, -9];
        for (let i = 0; i < 4; i++) { const e0 = pm.dedos[i], a0 = pm.abre * (1.5 - i) * 0.15, b = [21, VD[i] * (1 + 0.18 * pm.abre)], L = LD[i] * (0.18 + 0.82 * e0);
          const tip = [b[0] + Math.cos(a0) * L, b[1] + Math.sin(a0) * L];
          const tf = tubo(L2(b[0], b[1]), L2(tip[0], tip[1]), 5.1 * esc, 4.6 * esc); dMano += " " + tf; dDedos += " " + tf; puntas.push({ b, tip, a0, e0 }); }
        B.mano.setAttribute("d", dMano);
        // pulgar arriba (arriba = 1): el pulgar sale de lo alto del puño, perpendicular a los dedos, recto y CORTO (sobresale ~1/2 puño).
        // Que apunte arriba lo decide el giro de la muñeca (palmaIzq/Der hacia el cuerpo, antebrazo horizontal), no un truco de pantalla.
        const aP = lerp(0.22 + 0.62 * pm.pulgar, 1.5, pm.arriba), bP = [lerp(8, 13.5, pm.arriba), lerp(10, 10.5, pm.arriba)];
        // pulgar de DOS huesos: la base sale con el ángulo aP y la punta se dobla `dobla` radianes (negativo = hacia los dedos).
        // En el puño la punta cruza por delante de los dedos doblados; `doblaPulgarIzq/Der` añade flexión animable.
        const dob = lerp(pm.dobla, 0, pm.arriba) + ((sg > 0 ? e.doblaPulgarIzq : e.doblaPulgarDer) || 0), L1 = lerp(6.5 + 2.5 * pm.pulgar + 2 * cierre, 6, pm.arriba), L2p = lerp(5.5 + 3 * pm.pulgar + 5 * cierre, 5.5, pm.arriba);   // cerrado, la punta cruza el índice y el corazón
        const j1 = [bP[0] + Math.cos(aP) * L1, bP[1] + Math.sin(aP) * L1], j2 = [j1[0] + Math.cos(aP + dob) * L2p, j1[1] + Math.sin(aP + dob) * L2p];
        const p0n = L2(bP[0], bP[1]), pJ = L2(j1[0], j1[1]), p1 = L2(j2[0], j2[1]);
        const p0 = p0n, pMid = pJ, pFin = p1;
        // dos cápsulas; el contorno va en una copia DETRÁS con el doble de grosor, así solo asoma la silueta de fuera y no el cruce de los tramos
        const dPul = tubo(p0, pMid, 5.2 * esc, 4.7 * esc) + " " + tubo(pMid, pFin, 4.7 * esc, 4.1 * esc);
        B.pulgar.setAttribute("d", dPul); B.pulgarBorde.setAttribute("d", dPul);
        // palma (clara, se ve más cuanto más abierta) o dorso (nudillos en la base de los dedos)
        const abierta = (pm.dedos[0] + pm.dedos[1] + pm.dedos[2] + pm.dedos[3]) / 4;
        // PUÑO: los dedos doblados se ven como cuatro tiras un poco más claras, separadas por una raya fina más oscura
        // (del mismo color que la mano, el puño era un bloque y solo se distinguía el pulgar). Del lado del dorso mandan los nudillos.
        const curva = cl((0.55 - abierta) / 0.35) * (1 - dorsoK);
        let dc = ""; for (let i = 0; i < 4; i++) { const v = VD[i] * 1.0, uT = 24.5 - (i === 3 ? 1.5 : 0);
          dc += tubo(L2(uT, v), L2(uT - 9.5 + (i === 3 ? 1 : 0), v), 2.3 * esc * fv, 2.15 * esc * fv) + " "; }   // separadas por un hueco del tono de la mano, sin contorno
        B.curvos.setAttribute("d", dc); B.curvos.setAttribute("opacity", curva.toFixed(2)); B.curvos.setAttribute("stroke-width", "0");
        let dr = ""; for (const v of [6, 0, -6]) { const a = L2(23.5, v), b = L2(15.5, v); dr += `M${f1(a[0])} ${f1(a[1])} L ${f1(b[0])} ${f1(b[1])} `; }   // la raya entre dedo y dedo
        B.rayasPuno.setAttribute("d", dr); B.rayasPuno.setAttribute("opacity", (0.85 * curva).toFixed(2)); B.rayasPuno.setAttribute("stroke-width", f1(1.25 * esc));
        // PALMA: toda la cara interior más clara (palma y dedos) y un pliegue que cruza la palma
        if (OPC.estiloMano === "B") {   // B: solo la palma (no los dedos) más clara + el bulto de la base del pulgar: se lee por la FORMA
          const dir = n2(dh[0] * fu + 1e-6, dh[1] * fu);
          B.palma.setAttribute("d", ovalo(L2(11, -1.5), dir, 9.5 * esc * (0.55 + 0.45 * fu), 9.5 * esc * fv) + " " + ovalo(L2(7.5, 6.5), dir, 7.5 * esc * (0.55 + 0.45 * fu), 5.8 * esc * fv));
        } else B.palma.setAttribute("d", dMano);
        B.palma.setAttribute("opacity", (palmK * cl((abierta - 0.4) / 0.35)).toFixed(2));   // con la mano cerrada la palma no se ve: el disco claro sobre el puño confundía
        const l0 = L2(4, -9.5), l1 = L2(13, -2), l2 = L2(17.5, 7.5);
        B.linea.setAttribute("d", `M${f1(l0[0])} ${f1(l0[1])} Q ${f1(l1[0])} ${f1(l1[1])} ${f1(l2[0])} ${f1(l2[1])}`);
        B.linea.setAttribute("stroke-width", f1(1.9 * esc)); B.linea.setAttribute("opacity", (0.5 * palmK * cl(abierta * 1.6 - 0.2)).toFixed(2));
        // DORSO: uñas claras en las puntas de los dedos estirados y nudillos (bultos claros; más marcados con el puño cerrado)
        let du = "", dn = "";
        for (const f of puntas) { const dir = [Math.cos(f.a0), Math.sin(f.a0)];
          // uña: cápsula estrecha y alargada pegada a la punta, dentro del dedo (con óvalos claros y redondos parecía la huella de una zarpa)
          if (f.e0 > 0.35) du += tubo(L2(f.tip[0] - dir[0] * 4.6, f.tip[1] - dir[1] * 4.6), L2(f.tip[0] - dir[0] * 1.3, f.tip[1] - dir[1] * 1.3), 2.0 * esc, 1.9 * esc) + " ";
          const k0 = L2(f.b[0] - 0.5, f.b[1] - 2.2), k1 = L2(f.b[0] - 0.5, f.b[1] + 2.2); dn += `M${f1(k0[0])} ${f1(k0[1])} L ${f1(k1[0])} ${f1(k1[1])} `; }
        const backK = dorsoK, extMed = cl((abierta - 0.35) / 0.45);
        B.unas.setAttribute("d", du); B.unas.setAttribute("opacity", (0.6 * backK * extMed).toFixed(2));
        B.nudillos.setAttribute("d", dn); B.nudillos.setAttribute("stroke-width", f1(3.2 * esc)); B.nudillos.setAttribute("opacity", (0.3 * backK * cl((0.6 - abierta) / 0.4)).toFixed(2));   // solo con la mano cerrada
        // objeto en la mano (palo, cayado, lanza): pasa por el centro del puño, detrás de los dedos y delante de la manga
        const ob = sg > 0 ? e.objetoIzq : e.objetoDer;
        if (ob) { const c = L2(13, 0), up = ob.dir || [0, -1], A0 = [c[0] + up[0] * ob.arriba, c[1] + up[1] * ob.arriba], ab = ob.abajo === "suelo" ? subir - c[1] : ob.abajo, B0 = [c[0] - up[0] * ab, c[1] - up[1] * ab];
          let d = `M${f1(B0[0])} ${f1(B0[1])} L ${f1(A0[0])} ${f1(A0[1])}`;
          if (ob.cayado) d += ` Q ${f1(A0[0] + up[0] * 50)} ${f1(A0[1] + up[1] * 50)} ${f1(A0[0] + 34)} ${f1(A0[1] + up[1] * 50)} Q ${f1(A0[0] + 62)} ${f1(A0[1] + up[1] * 48)} ${f1(A0[0] + 56)} ${f1(A0[1] + up[1] * 18)}`;
          B.palo.setAttribute("d", d); B.paloL.setAttribute("d", `M${f1(B0[0] + 4)} ${f1(B0[1])} L ${f1(A0[0] + 4)} ${f1(A0[1])}`);
          B.palo.setAttribute("stroke-width", f1((ob.grosor || 13) * kM)); B.gPalo.setAttribute("display", "inline"); }
        else B.gPalo.setAttribute("display", "none");
        const z = (codo[2] + hom[2]) / 2, os = cl(-z / 50) * 0.4;
        B.manga.setAttribute("fill", mix(C.ropa, C.noche, os)); B.mangaInf.setAttribute("fill", mix(C.ropa, C.noche, cl(-(codo[2] + mun[2]) / 100) * 0.4)); B.filo2.setAttribute("opacity", B.filo.getAttribute("opacity")); B.ante.setAttribute("stroke", mix(C.piel, C.noche, os)); [B.mano, B.pulgar].forEach((x) => x.setAttribute("fill", mix(C.piel, C.noche, os)));
        B.curvos.setAttribute("fill", mix(mix(C.piel, C.pielL, 0.3), C.noche, os)); B.rayasPuno.setAttribute("stroke", mix(mix(C.piel, C.pielS, 0.6), C.noche, os));
        // pulgar: recortado con una raya fina cuando cae sobre el puño, para que no se funda con la mano
        const sobrePuno = cl((0.6 - abierta) / 0.3) * (pulgarDelante ? 1 : 0);   // contorno y tono claro solo si el pulgar va por DELANTE del puño
        B.pulgarBorde.setAttribute("stroke", mix(mix(C.piel, C.pielS, 0.55), C.noche, os)); B.pulgarBorde.setAttribute("stroke-width", f1(1.9 * esc)); B.pulgarBorde.setAttribute("opacity", sobrePuno.toFixed(2));
        B.pulgar.setAttribute("fill", mix(mix(C.piel, C.pielL, Math.max(0.2 * palmK, 0.28 * sobrePuno)), C.noche, os)); B.palma.setAttribute("fill", mix(mix(C.piel, C.pielL, OPC.estiloMano === "B" ? 0.42 : 0.24), C.noche, os));   // contraste suave   // palma y yema del pulgar, claras
        B.puno.setAttribute("stroke", mix(C.ropaL, C.noche, os * 1.4)); B.filo.setAttribute("opacity", (0.7 * (1 - os * 2.5)).toFixed(2));
        // la mano del lado lejano que pasa por DELANTE del pecho (miedo, pensativo, manos juntas) se dibuja delante del cuerpo:
        // antes solo contaba la profundidad del brazo de arriba y esa mano se escondía tras la túnica
        // la mano que viene hacia la cámara (antebrazo en escorzo) va delante de su propia manga; si no, la campana la tapa
        // el pulgar va DELANTE de la mano si se ve la palma y DETRÁS si se ve el dorso
        // pulgar delante si se ve la palma, detrás si se ve el dorso; de canto, delante si apunta hacia la cámara
        const [m1, m2] = pulgarDelante ? [B.manoG, B.pulgar] : [B.pulgar, B.manoG];
        // orden: el tramo más cercano a la cámara encima. Antebrazo (piel + su manga + mano) delante del brazo si viene hacia delante.
        const manoDelante = mano[2] > codo[2] + 8, anteDelante = mun[2] > codo[2] - 6;
        const inf = manoDelante ? [B.ante, B.mangaInf, B.puno, B.filo2, m1, m2] : [m1, m2, B.ante, B.mangaInf, B.puno, B.filo2];
        const sup = [B.manga, B.filo];
        (anteDelante ? [...sup, ...inf] : [...inf, ...sup]).forEach((x) => B.g.appendChild(x));
        B.g.insertBefore(B.pulgarBorde, B.pulgar);
        // agarrar: palma DETRÁS del palo y dedos DELANTE, para que se vea que lo rodean (con todo detrás la mano parecía apoyada al lado)
        if (ob) { B.g.insertBefore(B.gPalo, m1.nextSibling); B.g.insertBefore(B.dedosDelante, B.gPalo.nextSibling);
          B.dedosDelante.setAttribute("d", dDedos); B.dedosDelante.setAttribute("display", "inline"); B.dedosDelante.setAttribute("fill", B.mano.getAttribute("fill")); }
        else B.dedosDelante.setAttribute("display", "none");
        // piezas en el brazo (desde el hombro) o el antebrazo (desde el codo): +x a lo largo del hueso, siguen su ángulo en pantalla
        for (const P of PIEZAS) { const L = sg > 0 ? "Izq" : "Der", hz = P.pz.hueso; if (hz !== "brazo" + L && hz !== "antebrazo" + L) continue;
          const ante = hz.startsWith("ante"), o = ante ? E0 : S0, d = ante ? d2 : dd, k = (ante ? kC : kH) * KG;
          const MA = [d[0] * k, d[1] * k, -d[1] * k * sg, d[0] * k * sg, o[0], o[1]];
          if (P.pz.doblar && !ante) { const kb = kC * KG, MB = [d2[0] * kb, d2[1] * kb, -d2[1] * kb * sg, d2[0] * kb * sg, E0[0], E0[1]];
            doblada(P, MA, MB, { eje: 0, codo: 88 / KG, desB: [88 / KG, 0] }, e.variantes); }
          else ponerPieza(P, MA, e.variantes); }
        for (const P of PIEZAS) { if (P.pz.hueso !== (sg > 0 ? "manoIzq" : "manoDer")) continue;
          const k = kM * KG, u = dh, v = [-dh[1], dh[0]]; ponerPieza(P, [u[0] * k, u[1] * k, v[0] * k * sg, v[1] * k * sg, qm[0], qm[1]], e.variantes); }
        const manoS = sg * 76 + 88 * uL[0] + 86 * fL[0], manoF = 88 * uL[2] + 86 * fL[2], delPecho = Math.abs(manoS) < 72 && manoF > 22;
        const ladoB = sg > 0 ? "Izq" : "Der", conMano = !oculto.has("mano" + ladoB);
        mostrar(B.g, !oculto.has("brazo" + ladoB)); for (const x of [B.manoG, B.pulgar, B.pulgarBorde]) mostrar(x, conMano);
        orden.push({ g: B.g, z: z < -6 && !delPecho ? -500 + z : 500 + z });
      }

      // cabeza: baja sobre los hombros; gira 0,8 del ángulo (3/4 de cara = 40°; más y los rasgos se pegan al borde)
      const KGIRO = 0.8, cc = PR(W(sway, -508 + bob * 0.9 - (e.hombros || 0) * 0.6 + 6 * EXP.miraY, lean(-508), aT));   // el mentón justo encima del escote
      // de espaldas (|ángulo| > 90°): se oculta la cara y se ve la nuca; la melena pasa por DELANTE del cuerpo
      const aHn = Math.atan2(Math.sin(aH), Math.cos(aH)), espaldas = Math.cos(aHn) < 0, aDet = Math.atan2(Math.sin(Math.PI - aHn), Math.cos(Math.PI - aHn));
      caraKids.forEach((k) => k.setAttribute("display", espaldas ? "none" : "inline")); gNuca.setAttribute("display", espaldas ? "inline" : "none");
      dibujarCabeza(cc, espaldas ? -aDet * KGIRO : aH * KGIRO, espaldas ? -aDet * KGIRO : aOjo * KGIRO);
      // línea de acción: el cuello se une detrás de la cara, así que al girar la cabeza avanza hacia donde mira (su masa queda
      // sobre el cuerpo y no colgando hacia la nuca); se hunde un poco en los hombros y se ladea con el vaivén y la inclinación al andar.
      const avH = 16 * (espaldas ? Math.sin(aHn) : Math.sin(aH * KGIRO)), hunde = HUNDE, KHp = KH * escalaEn(W(sway, -508 + bob, lean(-508), aT));
      // el mentón se coloca donde la cámara proyecta el punto 3D del mentón (con perspectiva real, desde arriba el cuello se acorta
      // y la cabeza lo tapa; antes se sumaban 78 fijos al centro y en el picado sobraba cuello)
      const yMen = -508 + bob * 0.9 - (e.hombros || 0) * 0.6 + 6 * EXP.miraY + 78, qMen = PR(W(sway, yMen, lean(yMen) + (REAL ? 18 : 0), aT));
      const yc = KBY * (REAL ? qMen[1] : cc[1] + 78) - 78 * KHp + hunde, xc = KBX * cc[0] + KHp * avH;
      const ladeo = 0.9 * sway * (chibi ? 1.4 : 1) + A * 3 * Math.sin(aT) + (e.ladeo || 0);
      gC.setAttribute("transform", `translate(${f1(xc)} ${f1(yc)}) rotate(${f1(ladeo)} 0 ${f1(78 * KHp)}) scale(${f1(KHp * 1000) / 1000}) translate(${f1(-cc[0])} ${f1(-cc[1])})`);
      const ah = aH * KGIRO, zrDe = (x, z) => -x * Math.sin(ah) + z * Math.cos(ah);
      lados.forEach((o) => { o.oreja.setAttribute("opacity", rampa(zrDe(o.sg * 58, -6), 3, 18).toFixed(2)); o.patilla.setAttribute("opacity", rampa(zrDe(o.sg * 54, 6), -4, 6).toFixed(2)); });
      gMelena.setAttribute("transform", gC.getAttribute("transform")); gMelena.setAttribute("display", oculto.has("melena") ? "none" : "inline");
      const aCab = espaldas ? -aDet * KGIRO : aH * KGIRO;
      for (const P of PIEZAS) { const pz = P.pz; if (pz.hueso !== "cabeza") continue;
        const sil = pz.modo === "silueta", pf = pz.prof ?? (sil ? 0 : PROF0.cabeza), cara = espaldas ? -1 : 1;
        const sx = sil ? 1 : Math.cos(aCab), tx = sil ? 0 : pf * Math.sin(aCab) * (espaldas ? -1 : 1);
        ponerPieza(P, visto(pz, cara) && (sil || sx > 0.08) ? [sx, 0, 0, 1, cc[0] + tx, cc[1]] : null, e.variantes, false, aH); }
      mostrar(gC, !oculto.has("cabeza"));
      orden.push({ g: gC, z: 400 }, { g: gMelena, z: espaldas ? 350 : -700 });
      // puntos del cuerpo en las coordenadas del grupo del personaje (para encuadrar: cabeza, pecho, cintura, manos, pies)
      const dy = -subir * KBY, Q = (p) => { const q = PR(p); return [q[0] * KBX, q[1] * KBY + dy]; };
      puntos.cabeza = [xc, yc + dy]; puntos.pecho = Q(W(sway, -340 + bob, lean(-340), aT)); puntos.cintura = Q(W(sway, -266 + bob, lean(-266), aT));
      puntos.pies = [0, dy]; puntos.alto = 600 * KBY;
      puntos.pieIzq = Q(tobillos[1]); puntos.pieDer = Q(tobillos[-1]); puntos.cadera = Q(W(sway, -192 + bob, 0, aCad - tau));
      mejillas.forEach((m) => m.setAttribute("opacity", (0.45 + 0.45 * EXP.rubor).toFixed(2)));
      orden.sort((a, b) => a.z - b.z).forEach((o) => cuerpo.appendChild(o.g));
      J3.cintura = W(sway, -266 + bob, lean(-266), aT); J3.cuello = W(sway, -420 + bob, lean(-420), aT);
      for (const k in J3) JUNTAS[k] = PR(J3[k]);
      ANG_T = aT; controles(); if (VEC) vectorial();
    }
    // ---------------------------------------------------------------- MARIONETA VECTORIAL (op.vector)
    // Las partes del cuerpo (torso, brazos, piernas) son dibujos vectoriales guardados en el personaje (vector.capas, hechos al
    // «Convertir a marioneta vectorial» en el editor y editables en el taller). Cada punto de cada trazo va atado a los huesos con
    // pesos (los que tiene más cerca en reposo) y sigue a las juntas de este fotograma; el torso sigue a la cintura y los hombros
    // (se estrecha al girar). La cabeza y las piezas propias siguen como siempre.
    function vectorial() {
      const Rj = VEC.juntas, Cj = JUNTAS, gT_ = ((ANG_T * 180) / Math.PI) % 360;
      const torsos = VEC.listas.filter((L) => L.grupo === "torso" && L.vista != null), dif = (a, b) => { let x = (a - b) % 360; if (x > 180) x -= 360; if (x < -180) x += 360; return x; };
      const vistaT = torsos.length ? torsos.reduce((m, L) => (Math.abs(dif(gT_, L.vista)) < Math.abs(dif(gT_, m.vista)) ? L : m)) : null;
      for (const L of VEC.listas) {
        if (!L.g) { L.g = { torso: gT, brazoIzq: brazos.find((b) => b.sg > 0).g, brazoDer: brazos.find((b) => b.sg < 0).g, piernaIzq: piernas.find((b) => b.sg > 0).g, piernaDer: piernas.find((b) => b.sg < 0).g }[L.grupo];
          if (!L.g) continue; L.vg = el("g", { "data-vector": L.id }); L.vg.innerHTML = L.svg; idsUnicos(L.vg); L.paths = [...L.vg.querySelectorAll("path")].map((e) => ({ e, ...parsearV(e.getAttribute("d") || "") }));
          for (const P of L.paths) P.w = P.pts.map((v) => pesosV(L.huesos, v)); }
        if (!L.g) continue;
        // lo dibujado por código se esconde; quedan las piezas propias (data-pieza) y la capa vectorial
        for (const k of L.g.children) if (k !== L.vg && !k.hasAttribute("data-pieza") && !k.hasAttribute("data-vector")) k.setAttribute("display", "none");
        if (L.vg.parentNode !== L.g) L.g.insertBefore(L.vg, L.g.firstChild);
        if (L.grupo === "torso" && L.vista != null) { if (L !== vistaT) { L.vg.setAttribute("display", "none"); continue; } L.vg.removeAttribute("display");
          const giraT = cilindro(L, dif(gT_, L.vista), Cj); L.paths.forEach((P, pi) => P.e.setAttribute("d", escribirV(P.cmds, corregir(L, pi, P.pts.map(giraT))))); continue; }
        const T = L.grupo === "torso" ? afin3([Rj.cintura, Rj.hombroIzq, Rj.hombroDer], [Cj.cintura, Cj.hombroIzq, Cj.hombroDer]) : null;
        for (const P of L.paths) { const out = P.pts.map((v, i) => { if (T) return [T[0] * v[0] + T[2] * v[1] + T[4], T[1] * v[0] + T[3] * v[1] + T[5]];
            let x = 0, y = 0; for (const [b, w] of P.w[i]) { const q = huesoV(b, v); x += w * q[0]; y += w * q[1]; } return [x, y]; });
          P.e.setAttribute("d", escribirV(P.cmds, corregir(L, L.paths.indexOf(P), out))); } } }
    // ---------------------------------------------------------------- CORRECCIONES POR ÁNGULO (como los Smart Bones de Moho)
    // vector.correcciones: [{ id, capa, control, desde, angulo, d }]. Al llegar el control (doblar un codo o una rodilla, girar el
    // cuerpo o la cabeza) a «angulo», la capa toma la forma corregida a mano; entre «desde» (reposo) y «angulo» se mezcla poco a poco.
    // Los giros (cíclicos) mezclan las correcciones vecinas: cada una pesa de lleno en su ángulo y nada a ±«ancho» grados (45).
    // d: por trazo y por punto, cuánto se movió [a lo largo, a lo ancho] del hueso que más pesa en ese punto (en el torso, de la
    // columna); así la corrección acompaña al brazo aunque el hombro apunte a otro sitio. En la cabeza, d: { forma: [[dx, dy], …] }.
    const CORR = (op.vector?.correcciones || []).filter((c) => c && c.d && c.control);
    let CTRL = {};
    const difG = (a, b) => { let x = (a - b) % 360; if (x > 180) x -= 360; if (x < -180) x += 360; return x; };
    function controles() { const deg = (r) => (r * 180) / Math.PI, ang = (a, b, c) => { if (!a || !b || !c) return null;
        const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - b[0], c[1] - b[1], c[2] - b[2]], lu = Math.hypot(...u) || 1, lv = Math.hypot(...v) || 1;
        return deg(Math.acos(Math.max(-1, Math.min(1, (u[0] * v[0] + u[1] * v[1] + u[2] * v[2]) / (lu * lv))))); };
      const c = { giro: difG(deg(ANG_T), 0), cabeza: CTRL.cabeza };
      for (const L of ["Izq", "Der"]) { c["codo" + L] = ang(J3["hombro" + L], J3["codo" + L], J3["muneca" + L]); c["rodilla" + L] = ang(J3["cadera" + L], J3["rodilla" + L], J3["tobillo" + L]); }
      CTRL = c; }
    function pesoCorr(c) { const v = CTRL[c.control]; if (v == null) return 0; const ss = (t) => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
      if (c.control === "giro" || c.control === "cabeza") return ss(1 - Math.abs(difG(v, c.angulo)) / (c.ancho || 45));
      const r = (c.angulo ?? 0) - (c.desde ?? 0); return Math.abs(r) < 1 ? 0 : ss((v - (c.desde ?? 0)) / r); }
    // el marco de cada punto: [ux, uy] del hueso que más pesa (el pie no gira) o de la columna en el torso
    function marcoV(L, pi, i) { const Cj = JUNTAS, col = () => { const o = Cj.cintura, e = Cj.cuello; if (!o || !e) return [0, -1]; const dx = e[0] - o[0], dy = e[1] - o[1], l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; };
      if (L.grupo === "torso") return col(); const w = L.paths[pi]?.w?.[i]; if (!w || !w.length) return [1, 0];
      const b = w.reduce((m, x) => (x[1] > m[1] ? x : m))[0], [a, z] = HV[b]; if (!z) return [1, 0];
      const o = Cj[a], e = Cj[z]; if (!o || !e) return [1, 0]; const dx = e[0] - o[0], dy = e[1] - o[1], l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; }
    function corregir(L, pi, pts) { for (const c of CORR) { if (c.capa !== L.id || !Array.isArray(c.d)) continue; const dd = c.d[pi]; if (!dd || dd.length !== pts.length) continue;
        const w = pesoCorr(c); if (w <= 0.001) continue;
        pts = pts.map((p, i) => { const q = dd[i]; if (!q) return p; const [ux, uy] = marcoV(L, pi, i); return [p[0] + w * (q[0] * ux - q[1] * uy), p[1] + w * (q[0] * uy + q[1] * ux)]; }); }
      return pts; }
    // para el editor: cuánto hay que mover cada punto de la capa (en su pose de ahora) para llegar a los trazos nuevos `ds`
    function medirCorreccion(capaId, ds) { const L = VEC?.listas.find((x) => x.id === capaId); if (!L?.paths) return null;
      return L.paths.map((P, pi) => { const o = parsearV(P.e.getAttribute("d") || ""), cur = o.pts, nu = ds[pi] != null ? alinear(o, parsearV(ds[pi])) : null; if (!nu) return null;
        return cur.map((p, i) => { const dx = nu[i][0] - p[0], dy = nu[i][1] - p[1]; if (Math.abs(dx) + Math.abs(dy) < 0.05) return null; const [ux, uy] = marcoV(L, pi, i);
          return [+(dx * ux + dy * uy).toFixed(2), +(-dx * uy + dy * ux).toFixed(2)]; }); }); }
    // el taller guarda las rectas (L) como curvas (C) y cierra las formas con un tramo más: se vuelve a la forma de los comandos originales
    function alinear(o, nu) { if (nu.pts.length === o.pts.length) return nu.pts;
      const oc = o.cmds.filter((c) => c[0] !== "Z"), nc = nu.cmds.filter((c) => c[0] !== "Z"); if (nc.length < oc.length) return null;
      const out = []; let pn = 0, prev = null;
      for (let k = 0; k < oc.length; k++) { const n0 = oc[k][1], n1 = nc[k][1], seg = nu.pts.slice(pn, pn + n1); pn += n1;
        if (n0 === n1) out.push(...seg); else if (n0 === 1) out.push(seg[seg.length - 1]);
        else if (n0 === 2 && n1 === 3 && prev) out.push([prev[0] + 1.5 * (seg[0][0] - prev[0]), prev[1] + 1.5 * (seg[0][1] - prev[1])], seg[2]); else return null;
        prev = seg[seg.length - 1]; }
      return out.length === o.pts.length ? out : null; }
    function medirCorreccionCabeza(ds) { const out = {}; for (const [i, d] of Object.entries(ds)) { const fz = CABF[+i]; if (!fz) continue;
        const o = parsear(fz.e.getAttribute("d") || ""), cur = o.pts, nu = alinear(o, parsear(d)); if (!nu) continue;
        const dd = cur.map((p, k) => [+(nu[k][0] - p[0]).toFixed(2), +(nu[k][1] - p[1]).toFixed(2)]); if (dd.some((q) => Math.abs(q[0]) + Math.abs(q[1]) > 0.05)) out[i] = dd; }
      return out; }
    // torso de una vista girado Δ grados: cada punto está sobre un cilindro alrededor de la columna (de la cintura al cuello);
    // al girar se desliza con la profundidad (x·cos Δ + z·sin Δ), y la columna sigue a la de este fotograma (inclinarse, agacharse)
    function cilindro(L, delta, Cj) { const J = L.juntas || {}, o = J.cintura, e = J.cuello, o2 = Cj.cintura, e2 = Cj.cuello; if (!o || !e || !o2 || !e2) return (v) => v;
      if (L.R == null) { let m = 0; for (const P of L.paths) for (const v of P.pts) { const dx = v[0] - o[0]; m = Math.max(m, Math.abs(dx)); } L.R = Math.max(30, m); }
      const ax = e[0] - o[0], ay = e[1] - o[1], La = Math.hypot(ax, ay) || 1, ux = ax / La, uy = ay / La, bx = e2[0] - o2[0], by = e2[1] - o2[1], Lb = Math.hypot(bx, by) || 1, wx = bx / Lb, wy = by / Lb;
      const c = Math.cos((delta * Math.PI) / 180), s = Math.sin((delta * Math.PI) / 180), k = Lb / La, Rr = L.R;
      return (v) => { const dx = v[0] - o[0], dy = v[1] - o[1], a = dx * ux + dy * uy, x = -dx * uy + dy * ux;   // a: a lo largo de la columna; x: a lo ancho
        const z = Math.sqrt(Math.max(0, Rr * Rr - x * x)) * 0.6, x2 = x * c + z * s;
        return [o2[0] + a * k * wx - x2 * wy, o2[1] + a * k * wy + x2 * wx]; }; }
    // huesos de la marioneta vectorial: [junta de origen, junta de la punta]; el pie no gira (se queda plano en el suelo)
    const HV = { brazoIzq: ["hombroIzq", "codoIzq"], antebrazoIzq: ["codoIzq", "munecaIzq"], manoIzq: ["munecaIzq", "manoIzq"], brazoDer: ["hombroDer", "codoDer"], antebrazoDer: ["codoDer", "munecaDer"], manoDer: ["munecaDer", "manoDer"],
      musloIzq: ["caderaIzq", "rodillaIzq"], piernaIzq: ["rodillaIzq", "tobilloIzq"], pieIzq: ["tobilloIzq", null], musloDer: ["caderaDer", "rodillaDer"], piernaDer: ["rodillaDer", "tobilloDer"], pieDer: ["tobilloDer", null] };
    function huesoV(b, v) { const [a, z] = HV[b], o = VEC.juntas[a], o2 = JUNTAS[a]; if (!o || !o2) return v;
      if (!z) return [v[0] - o[0] + o2[0], v[1] - o[1] + o2[1]];
      const e = VEC.juntas[z], e2 = JUNTAS[z], dx = e[0] - o[0], dy = e[1] - o[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
      const dx2 = e2[0] - o2[0], dy2 = e2[1] - o2[1], L2 = Math.hypot(dx2, dy2) || 1, ux2 = dx2 / L2, uy2 = dy2 / L2;
      const u = (v[0] - o[0]) * ux + (v[1] - o[1]) * uy, n = -(v[0] - o[0]) * uy + (v[1] - o[1]) * ux, k = L2 / L;   // a lo largo se estira con el hueso (escorzo), a lo ancho no
      return [o2[0] + u * k * ux2 - n * uy2, o2[1] + u * k * uy2 + n * ux2]; }
    function pesosV(huesos, v) { const ws = huesos.map((b) => { const [a, z] = HV[b], o = VEC.juntas[a], e = z ? VEC.juntas[z] : [o[0], o[1] + 40];
        const dx = e[0] - o[0], dy = e[1] - o[1], L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((v[0] - o[0]) * dx + (v[1] - o[1]) * dy) / L2));
        const d = Math.hypot(v[0] - o[0] - t * dx, v[1] - o[1] - t * dy); return [b, 1 / Math.pow(d + 6, 4)]; });
      const s = ws.reduce((m, x) => m + x[1], 0); return ws.map(([b, w]) => [b, w / s]).filter((x) => x[1] > 0.01); }
    // transformación afín que lleva tres puntos a otros tres (el torso: cintura y hombros)
    function afin3(a, b) { const [p0, p1, p2] = a, [q0, q1, q2] = b; if (!p0 || !p1 || !p2 || !q0 || !q1 || !q2) return [1, 0, 0, 1, 0, 0];
      const d = (p1[0] - p0[0]) * (p2[1] - p0[1]) - (p2[0] - p0[0]) * (p1[1] - p0[1]) || 1e-6;
      const sol = (r0, r1, r2) => { const A = ((r1 - r0) * (p2[1] - p0[1]) - (r2 - r0) * (p1[1] - p0[1])) / d, B = ((p1[0] - p0[0]) * (r2 - r0) - (p2[0] - p0[0]) * (r1 - r0)) / d; return [A, B, r0 - A * p0[0] - B * p0[1]]; };
      const [a1, c1, e1] = sol(q0[0], q1[0], q2[0]), [b1, d1, f1_] = sol(q0[1], q1[1], q2[1]); return [a1, b1, c1, d1, e1, f1_]; }
    const TOKV = /[MLCQZ]|-?\d*\.?\d+(?:e-?\d+)?/g;
    function parsearV(d) { const t = d.match(TOKV) || [], cmds = [], pts = [], n = { M: 1, L: 1, C: 3, Q: 2, Z: 0 }; let k = 0, cmd = null;
      while (k < t.length) { if (/[A-Z]/.test(t[k])) { cmd = t[k++]; if (cmd === "Z") { cmds.push(["Z", 0]); continue; } } else if (cmd === "M") cmd = "L";
        const c = n[cmd] ?? 0; if (!c) { k++; continue; } for (let j = 0; j < c; j++) { pts.push([+t[k], +t[k + 1]]); k += 2; } cmds.push([cmd, c]); }
      return { cmds, pts }; }
    function escribirV(cmds, pts) { let s = "", p = 0; for (const [c, m] of cmds) { s += c; for (let j = 0; j < m; j++, p++) s += (j ? " " : "") + pts[p][0].toFixed(1) + " " + pts[p][1].toFixed(1); s += " "; } return s; }

    // CABEZA VECTORIAL (op.vector.cabeza): cada forma de la cabeza es un dibujo DE FRENTE con su profundidad (prof): al girar, sus puntos se
    // deslizan sobre la esfera de la cabeza (dibujarCabeza). Al editarla en el taller se conserva la profundidad de cada forma (data-ref = su
    // número); las formas nuevas toman la de su capa. Ojos, cejas y boca siguen automáticos (son los que hacen las expresiones).
    const VIVAS = new Set(["ojos", "cejas", "boca"]);
    const cabezaBase = () => CABF.map((fz, i) => ({ ref: i, cat: fz.cat || (fz.e === caraF ? "cara" : "cara"), viva: !!fz.pre || VIVAS.has(fz.cat) || fz.prof.ojo,
      d: escribir(fz.cmds, fz.pts), at: Object.fromEntries(["fill", "stroke", "stroke-width", "opacity", "stroke-linecap", "stroke-linejoin"].map((k) => [k, fz.e.getAttribute(k)]).filter((x) => x[1] != null)) }))
      .sort((x, y) => (CABF[x.ref].e.compareDocumentPosition(CABF[y.ref].e) & 4 ? -1 : 1));   // en el orden en que se ven
    // la cabeza vectorial señala cada forma por su número (data-ref): si después se cambia el pelo, la barba o las proporciones, las
    // formas se crean en otro orden y los números ya no son las mismas piezas (la piel acabaría en una oreja). Se comprueba por el color
    // original de cada forma: si casi ninguna coincide, se deja la cabeza automática (y m.cabezaDesfasada lo avisa en el editor).
    let cabezaDesfasada = false;
    if (op.vector?.cabeza?.activo) { const doc = new DOMParser(); let iguales = 0, total = 0;
      for (const capa of op.vector.cabeza.capas || []) { const sd = doc.parseFromString(`<svg xmlns="${NS}">${capa.svg || ""}</svg>`, "image/svg+xml");
        for (const pe of sd.querySelectorAll("path[data-ref]")) { const fz = CABF[+pe.getAttribute("data-ref")]; total++;
          if (fz && (pe.getAttribute("fill") || "none") === (fz.e.getAttribute("fill") || "none") && (pe.getAttribute("stroke") || "") === (fz.e.getAttribute("stroke") || "")) iguales++; } }
      cabezaDesfasada = total > 4 && iguales / total < 0.5; if (cabezaDesfasada) console.warn("Cabeza vectorial desfasada (se cambió el pelo, la barba o las proporciones): se usa la automática", op.id, iguales + "/" + total); }
    if (op.vector?.cabeza?.activo && !cabezaDesfasada) { const doc = new DOMParser();
      for (const capa of op.vector.cabeza.capas || []) { const refs = new Set(capa.refs || []), vistos = new Set(), prof0 = CABF[(capa.refs || [])[0]]?.prof || CARA;
        const svgDoc = doc.parseFromString(`<svg xmlns="${NS}">${capa.svg || ""}</svg>`, "image/svg+xml");
        // una forma con varios trozos (M … M …) puede volver del taller partida en varias con el mismo data-ref: se vuelven a juntar
        const juntas_ = new Map(), sueltas = [];
        for (const pe of svgDoc.querySelectorAll("path")) { const r = pe.getAttribute("data-ref"); if (r == null) { sueltas.push(pe); continue; }
          if (juntas_.has(r)) { const q = juntas_.get(r); q.setAttribute("d", q.getAttribute("d") + " " + (pe.getAttribute("d") || "")); } else juntas_.set(r, pe); }
        for (const pe of [...juntas_.values(), ...sueltas]) { const dd = pe.getAttribute("d") || "", r = pe.getAttribute("data-ref"), i = r != null ? +r : NaN, at = {};
          for (const k of ["fill", "stroke", "stroke-width", "opacity", "stroke-linecap", "stroke-linejoin"]) if (pe.getAttribute(k) != null) at[k] = pe.getAttribute(k);
          if (Number.isFinite(i) && CABF[i] && refs.has(i)) { const fz = CABF[i]; Object.assign(fz, parsear(dd)); for (const k in at) fz.e.setAttribute(k, at[k]); fz.capa = capa.id; vistos.add(i); }
          else { CF(dd, prof0, at, (CABF[(capa.refs || [])[0]]?.e.parentNode) || gC); CABF[CABF.length - 1].capa = capa.id; } }
        for (const i of refs) if (!vistos.has(i) && CABF[i]) { CABF[i].e.setAttribute("display", "none"); CABF[i].borrada = true; } } }
    // partes del cuerpo y juntas: para convertir el muñeco en marioneta vectorial desde el editor
    const partes = () => ({ torso: gT, brazoIzq: brazos.find((b) => b.sg > 0).g, brazoDer: brazos.find((b) => b.sg < 0).g, piernaIzq: piernas.find((b) => b.sg > 0).g, piernaDer: piernas.find((b) => b.sg < 0).g });
    // formas de la cabeza de una capa vectorial, tal como están dibujadas ahora (para corregirlas en el taller)
    const formasCabeza = (capaId) => CABF.map((fz, i) => ({ i, capa: fz.capa, borrada: fz.borrada, d: fz.e.getAttribute("d") || "", at: Object.fromEntries(["fill", "stroke", "stroke-width", "opacity", "stroke-linecap", "stroke-linejoin"].map((k) => [k, fz.e.getAttribute(k)]).filter((x) => x[1] != null)) })).filter((f) => (capaId === "*" || f.capa === capaId) && !f.borrada && fz_visible(f.i))
      .sort((x, y) => (CABF[x.i].e.compareDocumentPosition(CABF[y.i].e) & 4 ? -1 : 1));   // en el orden en que se ven (lo de detrás primero)
    // se ve (ni ella ni sus grupos están escondidos) y no va recortada (la nuca y el rubor van recortados: en el taller saldrían enteros)
    const fz_visible = (i) => { let e = CABF[i]?.e; if (!e) return false; if (e.getAttribute("visibility") === "hidden") return false;
      const idCara = clipCara.parentNode?.id, deCara = (v) => !!idCara && v.includes("#" + idCara);   // recortadas a la cara (ojos, rubor): sí
      for (; e && e !== raiz; e = e.parentNode) { const cp = e.getAttribute?.("clip-path"); if (e.getAttribute?.("display") === "none" || (cp && !deCara(cp))) return false; } return true; };
    return { g: raiz, dibujar, escala: [KBX, KBY], puntos, juntas: JUNTAS, partes, cabezaBase, formasCabeza, cabezaDesfasada, controles: () => Object.assign({}, CTRL), medirCorreccion, medirCorreccionCabeza };
  }

  // ---------------------------------------------------------------- encuadres
  // Alto visible (en unidades del personaje) de cada plano y punto que se centra. Devuelve la transformación del grupo «mundo»
  // para que el punto `p` (coordenadas del mundo) quede en (fx, fy) de la pantalla 1080 × 1920.
  const PLANOS = {
    general:     { alto: 1150, fy: 0.62 },     // cuerpo entero con aire alrededor
    entero:      { alto: 820, fy: 0.55 },      // cuerpo entero justo
    americano:   { alto: 560, fy: 0.5 },       // de la cabeza a las rodillas
    medio:       { alto: 400, fy: 0.5 },       // de la cabeza a la cintura
    primerPlano: { alto: 230, fy: 0.45 },      // cabeza y hombros
    detalle:     { alto: 120, fy: 0.5 },       // una mano, unos ojos
  };
  function encuadre(nombre, p, escalaPersonaje = 1, op = {}) {
    const P = Object.assign({}, PLANOS[nombre] || PLANOS.medio, op), z = (op.alto ? 1920 / op.alto : 1920 / P.alto) / escalaPersonaje;
    return { x: p[0], y: p[1], zoom: z, fx: P.fx ?? 0.5, fy: P.fy };
  }
  const mezclaEncuadre = (a, b, k) => ({ x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), zoom: a.zoom * Math.pow(b.zoom / a.zoom, k), fx: lerp(a.fx ?? 0.5, b.fx ?? 0.5, k), fy: lerp(a.fy, b.fy, k) });
  const transformCamara = (e, temblor = [0, 0], giroG = 0) =>
    `translate(${f1(1080 * (e.fx ?? 0.5) + temblor[0])} ${f1(1920 * e.fy + temblor[1])}) rotate(${f1(giroG)}) scale(${(e.zoom).toFixed(4)}) translate(${f1(-e.x)} ${f1(-e.y)})`;

  window.Titere25D = { opciones: (o) => Object.assign(OPC, o), crear, idsUnicos, morfo, giro, pisada, desplSuelo, velocidad, EMOCIONES, MANOS, W, PR, camara, PLANOS, encuadre, mezclaEncuadre, transformCamara, LS, ST, COLORES,
    escalaEn, horizonte, get TILT() { return TILT; }, get PERS() { return PERS; } };
})();
