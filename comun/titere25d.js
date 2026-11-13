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
    const EXP0 = { sonrisa: 0, abre: 0, ancho: 1, cejaY: 0, cejaIn: 0, cejaOut: 0, ojoK: 1, parpado: 0, entorna: 0, rubor: 0, miraY: 0 };
    const EXP = Object.assign({}, EXP0);
    function ponerCara(pesos) {
      Object.assign(EXP, EXP0);
      for (const n in pesos) { const em = EMOCIONES[n], w = pesos[n]; if (!em || !w) continue;
        for (const k in em) EXP[k] += (em[k] - (k === "ancho" || k === "ojoK" ? 1 : 0)) * w; }
    }
    const KAP = 0.5523, RC = 58;
    const elD = (cx, cy, rx, ry) => `M${cx + rx} ${cy} C ${cx + rx} ${cy + ry * KAP} ${cx + rx * KAP} ${cy + ry} ${cx} ${cy + ry} C ${cx - rx * KAP} ${cy + ry} ${cx - rx} ${cy + ry * KAP} ${cx - rx} ${cy} C ${cx - rx} ${cy - ry * KAP} ${cx - rx * KAP} ${cy - ry} ${cx} ${cy - ry} C ${cx + rx * KAP} ${cy - ry} ${cx + rx} ${cy - ry * KAP} ${cx + rx} ${cy} Z`;
    const CABF = [];
    // prof: k (cuánto sigue la superficie), z (profundidad extra), w (cuánto se queda quieto: la silueta no gira),
    //       desp (corrimiento de una masa con el giro), lim (no salir del cráneo, con frenado suave), ojo (usa el ángulo de los ojos)
    const CF = (d, prof, at, g = gC, pre = null) => { const e = el("path", at, g); const fz = { e, prof, pre }; Object.assign(fz, parsear(d)); CABF.push(fz); return e; };
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
    CF("M-12 48 Q 0 50 12 48 Q 0 52 -12 48 Z", { k: 1, z: 6 }, { fill: C.boca, stroke: C.boca, "stroke-width": 6, "stroke-linejoin": "round" }, gC, (x, y) => {
      const so = EXP.sonrisa, ab = EXP.abre, an = 12 * EXP.ancho;
      if (Math.abs(x) > 6) return [Math.sign(x) * an, 48 - 6 * so + 2 * ab];               // comisuras: suben al sonreír, bajan tristes
      const arriba = 50.5 + 4 * so - ab * (4 + 2 * Math.max(0, so));                          // labio de arriba (más recto si ríe)
      return y < 51 ? [0, arriba] : [0, arriba + 0.5 + 24 * ab + 3 * Math.max(0, so) * ab]; });
    if (barba) CF("M-26 38 C -13 29 13 29 26 38", { k: 1, z: 9 }, T_(C.pelo, 12));
    CF(elD(0, 25, 10, 7.5), { k: 1, z: 12 }, R_(C.nariz));
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
    const gNuca = el("g", { display: "none" }, gC), NUCA = { k: 0, z: 0, w: 1 };
    if (!largo) [-1, 1].forEach((sg) => { CF(elD(sg * 58, 4, 12, 17), NUCA, R_(C.piel), gNuca); CF(elD(sg * 59, 5, 5.5, 9), NUCA, R_(C.pielS), gNuca); });
    CF("M-58 -30 C -58 -58 -34 -78 0 -78 C 34 -78 58 -58 58 -30 L 58 26 C 58 56 32 78 0 78 C -32 78 -58 56 -58 26 Z", NUCA, R_(mix(C.piel, C.pielS, 0.25)), gNuca);
    const bajoPelo = largo ? 80 : rizado ? 52 : 44;
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
      const padre = h_ === "cabeza" ? gC : /^(mano|brazo|antebrazo)/.test(h_) && lado >= 0 ? brazos[lado].g : /^pie/.test(h_) && lado >= 0 ? piernas[lado].g : gT;
      const g = el("g", { "data-pieza": pz.id || "" }, padre), dentro = el("g", {}, g), tinta = (t) => String(t || "").replace(/\{(\w+)\}/g, (m0, k) => C[k] || m0);
      // un dibujo por vista (como las capas de cambio de Moho): frente (svg), perfil (svgPerfil, mirando a la derecha; se refleja) y espaldas
      const vis = { frente: el("g", {}, dentro) }; vis.frente.innerHTML = tinta(pz.svg);
      for (const [k, src] of [["perfil", pz.svgPerfil], ["espaldas", pz.svgEspaldas]]) if (src) { vis[k] = el("g", { display: "none" }, dentro); vis[k].innerHTML = tinta(src); }
      return { pz, g, dentro, padre, vis };
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
    function ponerPieza(P, mat, ve, detrasForzado, ang) {
      const pz = P.pz, act = activa(pz, ve);
      if (!act || !mat) { P.g.setAttribute("display", "none"); return; }
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
    function dibujarCabeza(c, a, aOjo) {
      for (const fz of CABF) {
        const aa = fz.prof.ojo ? aOjo : a, pr = fz.prof;
        const pts = fz.pts.map(([x, y]) => { if (fz.pre) [x, y] = fz.pre(x, y);
          const sup = Math.sqrt(Math.max(0, RC * RC - x * x)), z = pr.f ? pr.f(x, sup) : pr.k * sup + pr.z;
          const zr = -x * Math.sin(aa) + z * Math.cos(aa), w = typeof pr.w === "function" ? pr.w(x, y) : pr.w || 0;
          let xg = x * Math.cos(aa) + z * Math.sin(aa);          // lo que gira; el límite solo frena esto, no el contorno fijo
          if (pr.lim) { const l0 = pr.lim * 0.75, ax = Math.abs(xg); if (ax > l0) xg = Math.sign(xg) * (l0 + (pr.lim - l0) * Math.tanh((ax - l0) / (pr.lim - l0))); }
          const xr = lerp(xg, x, w) + (pr.desp || 0) * Math.sin(aa);
          return [c[0] + xr, c[1] + y + TILT_H * zr * (1 - w) + EXP.miraY * 9 * Math.min(1, pr.k || 0) * (1 - w)]; });
        const d = escribir(fz.cmds, pts); fz.e.setAttribute("d", d);
        if (fz.e === caraF) clipCara.setAttribute("d", d);
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
      ponerCara(e.cara || {}); EXP.miraY += e.miraY || 0;
      if (e.boca) { EXP.abre += 0.75 * e.boca; EXP.ancho *= 1 - 0.3 * e.boca + 0.25 * (e.bocaAncho || 0); }   // hablar: la boca se abre con la voz (escenas: envolvente del audio)
      // partes del muñeco que tapa una pieza puesta (oculta: ["melena", "cinto"])
      const oculto = new Set(); for (const P of PIEZAS) if (activa(P.pz, e.variantes)) (P.pz.oculta || []).forEach((k) => oculto.add(k));
      const R = e.correr || 0, AG = e.agacha || 0, REC = e.recoge || 0, ALT = e.altura || 0;
      // vaivén: andando baja al apoyar; corriendo baja a mitad del apoyo y sube en el vuelo; agacharse baja la cadera (las rodillas se doblan solas por IK)
      const bobW = 6 * A * Math.cos(4 * Math.PI * p), bobR = 15 * A * Math.cos(4 * Math.PI * (p - 0.18));
      const bob = lerp(bobW, bobR, R) + 5 * (alzaGiro[1] + alzaGiro[-1]) / 18 + 62 * AG, sway = lerp(5, 3, R) * A * Math.sin(2 * Math.PI * p);
      const vuelo = R * A * 12 * Math.max(0, -Math.cos(4 * Math.PI * (p - 0.18)));
      const tau = A * rad(lerp(8, 13, R)) * Math.cos(2 * Math.PI * p), tauS = -A * rad(lerp(7, 11, R)) * Math.cos(2 * Math.PI * p - 0.25);
      const incl = A * lerp(0.07, 0.2, R) + 0.22 * AG + (e.inclina || 0);
      const aCad = (aPie[1] + aPie[-1]) / 2, lean = (y) => incl * (-192 - y);
      const subir = ALT + vuelo;          // todo el cuerpo despega; la sombra se queda en el suelo y encoge
      cuerpo.setAttribute("transform", `translate(0 ${f1(-subir * KBY)})`);
      sombra.setAttribute("opacity", (0.45 * (1 - cl(subir / 500) * 0.6) * (1 - 0.55 * cl((TILT - 0.35) / 0.3))).toFixed(2));   // desde muy arriba la sombra parecía un agujero
      const kP = escalaEn([0, 0, 0]), qS = PR([0, 0, 0]);
      sombra.setAttribute("cx", f1(qS[0] * KBX)); sombra.setAttribute("cy", f1(qS[1] * KBY));
      sombra.setAttribute("rx", 135 * KBX * kP * (1 - cl(subir / 500) * 0.45)); sombra.setAttribute("ry", 135 * kP * Math.max(0.04, TILT) * 0.6);

      const orden = [], bajoDf = {};
      for (const L of piernas) {
        const sg = L.sg, ap = aPie[sg], pz = pisada(p + (sg > 0 ? 0 : 0.5), A, R), alza = pz.alza + alzaGiro[sg] + 55 * REC;
        bajoDf[sg] = 0.4 * pz.f;
        const local = (df, dy) => { const c = Math.cos(pz.cab), s = Math.sin(pz.cab), piv = pz.cab > 0 ? [34, 0] : [-12, 0], rx = df - piv[0], ry = dy - piv[1];
          return [piv[0] + rx * c - ry * s, piv[1] + rx * s + ry * c]; };          // el pie gira sobre la punta o sobre el talón
        const P3 = (ds, df, dy) => { const [lf, ly] = local(df, dy); return W(sg * 20 + ds, ly - alza, pz.f + lf, ap); };
        const tobillo = P3(0, 0, -18), cad = W(sg * 22 + sway, -192 + bob, 0, aCad - tau);
        const rod = ik3(cad, tobillo, 92, 90, W(0, 0, 1, ap));
        L.muslo.setAttribute("d", `M${P2(cad)} L ${P2(rod)}`); L.muslo.setAttribute("stroke-width", f1(38 * KG * escalaEn(mul(add(cad, rod), 0.5))));
        L.canilla.setAttribute("d", tubo(PR(rod), PR(tobillo), (moderno ? 21 : 17) * KG * escalaEn(rod), (moderno ? 18 : 12) * KG * escalaEn(tobillo)));
        L.luz.setAttribute("d", `M${P2(add(rod, W(9, 6, 0, ap)))} L ${P2(add(tobillo, W(9, -8, 0, ap)))}`);
        const ov = (rs, rf, cf, dy) => "M" + Array.from({ length: 14 }, (_, i) => { const th = (2 * Math.PI * i) / 14; return P2(P3(rs * Math.cos(th), cf + rf * Math.sin(th), dy)); }).join(" L ") + " Z";
        if (moderno) { L.pie.setAttribute("d", ov(17, 30, 12, 0)); L.empeine.setAttribute("d", ov(15, 25, 8, -9)); } else { L.pie.setAttribute("d", ov(14, 26, 10, 0)); L.empeine.setAttribute("d", ov(9, 15, 4, -7)); }
        L.tira.setAttribute("d", `M${P2(P3(-12, 12, -6))} L ${P2(P3(12, 12, -6))}`);
        // piezas en el pie (calzado, tobillera…): plano del empeine, que gira con el pie y se apoya con él
        for (const P of PIEZAS) { if (P.pz.hueso !== (sg > 0 ? "pieIzq" : "pieDer")) continue;
          const O = P3(0, 8, -10); ponerPieza(P, planoA(O, W(1, 0, 0, ap), [0, 1, 0]), e.variantes, false, ap); }
        const z = (rod[2] + tobillo[2]) / 2, os = cl(-z / 50) * 0.35;
        L.muslo.setAttribute("stroke", mix(cPierna, C.noche, os)); L.canilla.setAttribute("fill", mix(cPierna, C.noche, os)); L.empeine.setAttribute("fill", mix(moderno ? C.zapato : C.piel, C.noche, os));
        L.luz.setAttribute("opacity", (0.6 * (1 - os * 2.5)).toFixed(2));
        L.g.setAttribute("clip-path", `url(#${id}-piernas)`);
        orden.push({ g: L.g, z: TILT < -0.02 ? 10 + z * 0.01 : z - 1000 });   // desde abajo, delante del hueco de la falda                // las piernas siempre detrás de la túnica
      }

      // túnica con torsión (cadera → pecho) y el bajo empujado por las rodillas
      const df = (s, lv) => lv.bajo ? lerp(bajoDf[-1], bajoDf[1], cl((s / lv.A + 1) / 2)) : lv.y > -230 ? 0.15 * lerp(bajoDf[-1], bajoDf[1], cl((s / lv.A + 1) / 2)) : 0;
      const angNiv = (k) => lerp(aCad - tau, aT - tauS, k);
      const anillos = NIV.map((lv) => anillo(lv, angNiv(lv.k), { s: sway, y: bob, f: lean(lv.y) }, df)), ext = anillos.map(extremos);
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
      orden.push({ g: gT, z: 0 });
      if (oculto.has("cinto")) [cinto, cintoL, nudo].forEach((x) => x.setAttribute("opacity", 0));
      else { cinto.setAttribute("opacity", moderno ? 0 : 1); cintoL.setAttribute("opacity", moderno ? 0 : 0.8); }
      for (const P of PIEZAS) { const pz = P.pz; if (pz.hueso !== "pecho" && pz.hueso !== "cintura") continue;
        const y0 = pz.hueso === "pecho" ? -340 : -266, ang = angNiv(pz.hueso === "pecho" ? 0.85 : 0.45), pf = pz.prof ?? PROF0[pz.hueso];
        const O = W(sway, y0 + bob, lean(y0) + pf, ang), cara = Math.cos(ang) * Math.sign(pf || 1);
        ponerPieza(P, visto(pz, cara) ? planoA(O, W(1, 0, 0, ang), [0, 1, 0]) : null, e.variantes, cara < 0, ang); }

      // brazos: braceo opuesto a las piernas; el hombro en el borde; cuelgan por fuera; delante o detrás según la profundidad
      for (const B of brazos) {
        const sg = B.sg, ang = aA - tauS, ampB = rad(lerp(24, 38, R)), sig = -sg * A * ampB * Math.cos(2 * Math.PI * (p - 0.04));
        const codoB = rad(14) + A * rad(16) * cl(sig / ampB) + R * A * rad(56) +   /* corriendo, codo a ~85°: con 100° las manos subían a la cara */ AG * rad(30);
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
        const codo = add(hom, mul(nrm(dU), 88)), mun = add(codo, mul(nrm(dF), 70)), mano = add(mun, mul(nrm(dF), 16)), puno = add(codo, mul(nrm(dF), moderno ? 62 : 36));   // sudadera: manga hasta la muñeca
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
          ponerPieza(P, [d[0] * k, d[1] * k, -d[1] * k * sg, d[0] * k * sg, o[0], o[1]], e.variantes); }
        for (const P of PIEZAS) { if (P.pz.hueso !== (sg > 0 ? "manoIzq" : "manoDer")) continue;
          const k = kM * KG, u = dh, v = [-dh[1], dh[0]]; ponerPieza(P, [u[0] * k, u[1] * k, v[0] * k * sg, v[1] * k * sg, qm[0], qm[1]], e.variantes); }
        const manoS = sg * 76 + 88 * uL[0] + 86 * fL[0], manoF = 88 * uL[2] + 86 * fL[2], delPecho = Math.abs(manoS) < 72 && manoF > 22;
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
      orden.push({ g: gC, z: 400 }, { g: gMelena, z: espaldas ? 350 : -700 });
      // puntos del cuerpo en las coordenadas del grupo del personaje (para encuadrar: cabeza, pecho, cintura, manos, pies)
      const dy = -subir * KBY, Q = (p) => { const q = PR(p); return [q[0] * KBX, q[1] * KBY + dy]; };
      puntos.cabeza = [xc, yc + dy]; puntos.pecho = Q(W(sway, -340 + bob, lean(-340), aT)); puntos.cintura = Q(W(sway, -266 + bob, lean(-266), aT));
      puntos.pies = [0, dy]; puntos.alto = 600 * KBY;
      mejillas.forEach((m) => m.setAttribute("opacity", (0.45 + 0.45 * EXP.rubor).toFixed(2)));
      orden.sort((a, b) => a.z - b.z).forEach((o) => cuerpo.appendChild(o.g));
    }

    return { g: raiz, dibujar, escala: [KBX, KBY], puntos };
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

  window.Titere25D = { opciones: (o) => Object.assign(OPC, o), crear, giro, pisada, desplSuelo, velocidad, EMOCIONES, MANOS, W, PR, camara, PLANOS, encuadre, mezclaEncuadre, transformCamara, LS, ST, COLORES,
    escalaEn, horizonte, get TILT() { return TILT; }, get PERS() { return PERS; } };
})();
