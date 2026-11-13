// Personajes guardados por el editor (Videos/shorts-flow/personajes/*.json) → opciones de Titere25D.crear().
// En una composición: carga comun/titere25d.js, este archivo y personajes/todos.js (window.PERSONAJES), y luego
//   const pedro = Personajes.crear(grupoSVG, PERSONAJES.pedro);          // o Personajes.crear(g, PERSONAJES.pedro, { id: "pedro-2" })
//   pedro.dibujar({ ... });
// Formato del JSON: { id, nombre, opciones: { proporciones, pelo, barba, vestido, moderno, pestanas?, arrugas?, cuerpoX?, cuerpoY?, cabezaK? },
//                     colores: { piel, pielS, pielL, ropa, …, auto: { piel: true, … } }, notas }
(function () {
  const mix = (a, b, k) => { const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); const A = p(a), B = p(b);
    return "#" + A.map((x, i) => Math.round(x + (B[i] - x) * k).toString(16).padStart(2, "0")).join(""); };
  // tonos derivados del color base de cada grupo (los mismos que usa el editor cuando el grupo está en «automático»)
  const DERIVA = {
    piel: (c) => ({ pielS: mix(c, "#4a1838", 0.42), pielL: mix(c, "#ffe2b8", 0.42), nariz: mix(c, "#6a1a2a", 0.28), mejilla: mix(c, "#ff6a5a", 0.3) }),
    pelo: (c) => ({ peloS: mix(c, "#100810", 0.4), peloL: mix(c, "#c0a0b0", 0.35) }),
    ropa: (c) => ({ ropaS: mix(c, "#1c1230", 0.36), ropaL: mix(c, "#fff4e8", 0.62) }),
    cinto: (c) => ({ cintoL: mix(c, "#fff8e0", 0.6) }),
    pantalon: (c) => ({ pantalonL: mix(c, "#ffffff", 0.3) }),
    zapato: (c) => ({ zapatoS: mix(c, "#2a2430", 0.42) }),
  };
  function colores(j) { const c = Object.assign({}, j.colores || {}); const auto = c.auto || {}; delete c.auto;
    for (const g in DERIVA) if (auto[g] && c[g]) Object.assign(c, DERIVA[g](c[g]));
    return c; }
  function op(j, extra = {}) { const o = Object.assign({ id: j.id }, j.opciones || {}, { colores: colores(j), piezas: j.piezas || [], variantes: j.variantes || {} }, extra);
    for (const k of Object.keys(o)) if (o[k] === null) delete o[k];   // null = «lo que diga el tipo de cuerpo»
    return o; }
  // =================================================================================================
  // ANIMACIÓN (fase 3). Una POSE es un objeto plano (fácil de mezclar y de guardar) que se traduce a lo que pide dibujar().
  //   torso / cabeza (grados, se suman al giro base), inclina, ladeo, hombros, agacha, altura, miraY,
  //   brazo izquierdo / derecho: bIzqK (0 = braceo normal … 1 = pose libre), bIzqLado, bIzqFrente, bIzqCodo, bIzqHacia (hacia dónde dobla)
  //   manos: mIzq / mDer = pesos de MANOS ({ puno: 1 }); pIzq / pDer = cara de la palma ("auto", "adelante", "arriba", "cuerpo")
  //   cara = pesos de EMOCIONES ({ alegre: 0.8 })
  // CONTROLES (smart bones): { id, nombre, pose } → un deslizador 0…1 que suma (pose − POSE0) × valor.
  // ACCIONES: { id, nombre, duracion, bucle, locomocion: { amp, correr, cad }, claves: [{ t, pose }] } → interpoladas con suavizado.
  const POSE0 = { torso: 0, cabeza: 0, inclina: 0, ladeo: 0, hombros: 0, agacha: 0, altura: 0, miraY: 0,
    bIzqK: 0, bIzqLado: 0.29, bIzqFrente: 0, bIzqCodo: 0.25, bIzqHacia: -0.3, bDerK: 0, bDerLado: 0.29, bDerFrente: 0, bDerCodo: 0.25, bDerHacia: -0.3,
    mIzq: { relajada: 1 }, mDer: { relajada: 1 }, pIzq: "auto", pDer: "auto", cara: {},
    pieIzqLado: 0, pieIzqAlto: 0, pieIzqFrente: 0, pieDerLado: 0, pieDerAlto: 0, pieDerFrente: 0, tumbado: 0 };
  const PALMAS = { auto: null, adelante: [0, 0, 1], arriba: [0, -0.75, 0.65], cuerpo: [0, 0, -1] };
  const rad = (g) => (g * Math.PI) / 180, lerp = (a, b, k) => a + (b - a) * k;
  const esObj = (x) => x && typeof x === "object" && !Array.isArray(x);
  // mezcla de dos poses (k = 0 → a, 1 → b): números lineales, pesos por claves, textos a saltos
  function mezclar(a, b, k) { const o = {};
    for (const key of new Set([...Object.keys(a || {}), ...Object.keys(b || {})])) { const x = a?.[key], y = b?.[key];
      if (typeof x === "number" || typeof y === "number") o[key] = lerp(x ?? POSE0[key] ?? 0, y ?? POSE0[key] ?? 0, k);
      else if (esObj(x) || esObj(y)) { const r = {}; for (const kk of new Set([...Object.keys(x || {}), ...Object.keys(y || {})])) r[kk] = lerp(x?.[kk] || 0, y?.[kk] || 0, k); o[key] = r; }
      else o[key] = k < 0.5 ? x ?? y : y ?? x; }
    return o; }
  const completa = (p) => mezclar(POSE0, Object.assign({}, POSE0, p || {}), 1);
  // controles: cada uno suma su diferencia con la pose de reposo, multiplicada por su valor (se pueden combinar varios)
  function conControles(p, controles = [], valores = {}) { const o = completa(p);
    for (const c of controles) { const v = valores[c.id] || 0; if (!v) continue; const cp = completa(c.pose);
      for (const key in cp) { const d = cp[key], z = POSE0[key];
        if (typeof d === "number") o[key] += (d - z) * v;
        else if (esObj(d)) { const r = Object.assign({}, o[key]); for (const kk of new Set([...Object.keys(d), ...Object.keys(z || {})])) r[kk] = (r[kk] || 0) + ((d[kk] || 0) - (z?.[kk] || 0)) * v; o[key] = r; }
        else if (v >= 0.5 && d !== z) o[key] = d; } }
    return o; }
  const suave = (x) => x * x * (3 - 2 * x);
  // CURVAS por clave (el tramo que EMPIEZA en esa clave): como en Moho, para dar peso y ritmo al movimiento
  const CURVAS = {
    suave: (x) => x * x * (3 - 2 * x),
    lineal: (x) => x,
    mantener: (x) => (x < 1 ? 0 : 1),                                         // se queda quieto y salta a la siguiente
    acelera: (x) => x * x * x,                                                // arranca despacio (entrada)
    frena: (x) => 1 - Math.pow(1 - x, 3),                                     // llega despacio (salida)
    rebote: (x) => { const c = 1.70158 * 1.4; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); },   // se pasa y vuelve
  };
  const curva = (k) => CURVAS[k?.curva] || CURVAS.suave;
  function accionPose(a, t) {
    const ks = [...(a.claves || [])].sort((x, y) => x.t - y.t); if (!ks.length) return completa({});
    const D = Math.max(0.1, a.duracion || ks[ks.length - 1].t || 1); let u = a.bucle ? ((t % D) + D) % D : Math.max(0, Math.min(D, t));
    if (u <= ks[0].t && !a.bucle) return completa(ks[0].pose);
    let i = ks.findIndex((k) => k.t > u); let k0, k1, t0, t1;
    if (i === -1) { k0 = ks[ks.length - 1]; if (!a.bucle) return completa(k0.pose); k1 = ks[0]; t0 = k0.t; t1 = ks[0].t + D; }   // en bucle, de la última vuelve a la primera
    else if (i === 0) { k0 = ks[ks.length - 1]; k1 = ks[0]; t0 = k0.t - D; t1 = k1.t; }
    else { k0 = ks[i - 1]; k1 = ks[i]; t0 = k0.t; t1 = k1.t; }
    const f = t1 > t0 ? (u - t0) / (t1 - t0) : 0;
    return mezclar(completa(k0.pose), completa(k1.pose), curva(k0)(Math.max(0, Math.min(1, f)))); }
  // pose → parámetros de dibujar(); base: { giro (grados), variantes … }
  function pose(p, base = {}) { p = completa(p); const g = base.giro || 0, aT = rad(g + p.torso);
    const e = { torso: aT, brazos: aT, cabeza: rad(g + p.torso + p.cabeza), ojos: rad(g + p.torso + p.cabeza), inclina: p.inclina, ladeo: p.ladeo, hombros: p.hombros,
      agacha: p.agacha, altura: p.altura, miraY: p.miraY, cara: p.cara, tumbado: p.tumbado };
    for (const L of ["Izq", "Der"]) if (p["pie" + L + "Lado"] || p["pie" + L + "Alto"] || p["pie" + L + "Frente"]) e["paso" + L] = { lado: p["pie" + L + "Lado"], alto: p["pie" + L + "Alto"], frente: p["pie" + L + "Frente"] };
    for (const L of ["Izq", "Der"]) { const k = p["b" + L + "K"];
      if (k > 0.001) e["brazo" + L] = { lado: p["b" + L + "Lado"], frente: p["b" + L + "Frente"], codo: p["b" + L + "Codo"], hacia: [p["b" + L + "Hacia"], -1, 0.3], k: Math.min(1, k) };
      e["mano" + L] = p["m" + L]; const pl = PALMAS[p["p" + L]]; if (pl) e["palma" + L] = pl; }
    return Object.assign(e, base.extra || {}); }
  // en un vídeo: Personajes.accion(PERSONAJES.pedro, "saludo", t, { giro: 20 }) → objeto para pedro.dibujar(); controles: { encoger: 0.6 }
  // acciones: primero las del personaje y después la biblioteca común (window.ACCIONES, de shorts-flow/acciones/)
  const buscarAccion = (j, nombre) => (j?.acciones || []).find((x) => x.id === nombre || x.nombre === nombre) || Object.values(window.ACCIONES || {}).find((x) => x.id === nombre || x.nombre === nombre) || null;
  // CAPAS: un bloque de «brazos» solo cambia brazos, manos y palmas, encima de la capa de cuerpo (o de andar)
  const DE_BRAZOS = /^(b(Izq|Der)|m(Izq|Der)|p(Izq|Der))/;
  function enCapas(p, encima, capa) { if (!capa || capa === "todo") return completa(encima); const o = completa(p), q = completa(encima);
    for (const k in q) if ((capa === "brazos") === DE_BRAZOS.test(k)) o[k] = q[k]; return o; }
  function accion(j, nombre, t, base = {}, controles = {}) {
    const a = buscarAccion(j, nombre); if (!a) { console.warn("acción no encontrada", nombre); return pose({}, base); }
    const e = pose(conControles(accionPose(a, t), j.controles, controles), base), lo = a.locomocion || {};
    if (lo.amp) Object.assign(e, { amp: lo.amp, correr: lo.correr || 0, fase: t * (lo.cad || (lo.correr ? 1.45 : 0.95)) });
    return e; }
  const control = (j, valores, base = {}) => pose(conControles({}, j.controles, valores), base);


  // ---- labios por fonemas (visemas): de las palabras con tiempos ({ word, start, end }) a la forma de la boca en cada instante
  // abre 0…1, ancho (×), dientes 0…1 (se ven los de arriba). Español: la «v» suena como «b» (labios cerrados), la «h» no suena.
  const VISEMAS = {
    A: { abre: 0.95, ancho: 1.1, dientes: 0.3 }, E: { abre: 0.5, ancho: 1.25, dientes: 0.8 }, I: { abre: 0.3, ancho: 1.35, dientes: 1 },
    O: { abre: 0.75, ancho: 0.7, dientes: 0 }, U: { abre: 0.38, ancho: 0.48, dientes: 0 }, MBP: { abre: 0, ancho: 0.95, dientes: 0 },
    FV: { abre: 0.12, ancho: 1.05, dientes: 1 }, S: { abre: 0.22, ancho: 1.2, dientes: 1 }, L: { abre: 0.3, ancho: 1.05, dientes: 0.6 },
    K: { abre: 0.35, ancho: 1, dientes: 0.3 }, REPOSO: { abre: 0, ancho: 1, dientes: 0 } };
  function fonemas(palabra) {
    const w = String(palabra).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zñ0-9]/g, "")
      .replace(/ch|ll|y(?=[aeiou])/g, "S").replace(/qu|gu(?=[ei])/g, "K").replace(/rr/g, "r").replace(/h/g, "").replace(/c(?=[ei])/g, "S");
    const out = [];
    for (const ch of w) { const v = "aeiou".includes(ch) ? ch.toUpperCase() : ch === "y" ? "I" : "mbpv".includes(ch) ? "MBP" : ch === "f" ? "FV"
      : "szxS".includes(ch) ? "S" : "lntdrñ".includes(ch) ? "L" : "kcgjqK".includes(ch) ? "K" : /[0-9]/.test(ch) ? "E" : null;
      if (v) out.push(v); }
    return out.length ? out : ["A"];
  }
  function visemas(palabras) {
    const K = [], ws = (palabras || []).filter((w) => w && w.end > w.start);
    ws.forEach((w, i) => { const f = fonemas(w.word), pesos = f.map((v) => ("AEIOU".includes(v) ? 1.5 : 1)), tot = pesos.reduce((a, b) => a + b, 0);
      const ant = ws[i - 1], sig = ws[i + 1];
      if (!ant || w.start - ant.end > 0.18) K.push({ t: w.start - 0.07, v: VISEMAS.REPOSO });
      let acc = 0; f.forEach((v, j) => { const c = w.start + (w.end - w.start) * (acc + pesos[j] / 2) / tot; acc += pesos[j]; K.push({ t: c, v: VISEMAS[v] }); });
      if (!sig || sig.start - w.end > 0.18) K.push({ t: w.end + 0.06, v: VISEMAS.REPOSO }); });
    if (!K.length) return () => null;
    const t0 = K[0].t, t1 = K[K.length - 1].t;
    return (u) => { if (u <= t0 || u >= t1) return null;
      let lo = 0, hi = K.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (K[m].t <= u) lo = m; else hi = m; }
      const a = K[lo], b = K[hi], k = suave(Math.max(0, Math.min(1, (u - a.t) / Math.max(1e-6, b.t - a.t))));
      return { abre: lerp(a.v.abre, b.v.abre, k), ancho: lerp(a.v.ancho, b.v.ancho, k), dientes: lerp(a.v.dientes, b.v.dientes, k) }; };
  }
  const _vis = new WeakMap();
  const visemaEn = (palabras, u) => { if (!palabras || !palabras.length) return null; let f = _vis.get(palabras); if (!f) { f = visemas(palabras); _vis.set(palabras, f); } return f(u); };


  // ---- IK de manos (compartida por el rig del editor y por «agarrar» en las escenas). La cinemática directa replica la del títere
  // (comun/titere25d.js, brazos) para resolver lado / frente / codo que llevan la mano a un punto en coordenadas del grupo del personaje.
  const v3 = { add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], mul: (a, k) => [a[0] * k, a[1] * k, a[2] * k], dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2] };
  v3.nrm = (a) => v3.mul(a, 1 / (Math.hypot(...a) || 1));
  const medidas = (j) => { const TIP = { normal: [1, 1], mujer: [0.88, 0.95], nino: [0.7, 0.58], chibi: [0.7, 0.54] }, o = j?.opciones || {}, t0 = TIP[o.proporciones] || TIP.normal; return [o.cuerpoX ?? t0[0], o.cuerpoY ?? t0[1]]; };
  function manoFK(j, p, L, giro) { const T = Titere25D, sg = L === "Izq" ? 1 : -1, ang = rad(giro + p.torso), AG = p.agacha || 0, incl = (p.inclina || 0) + 0.22 * AG, lean = (y) => incl * (-192 - y);
    const hom = T.W(sg * 76, -392 + 62 * AG - (p.hombros || 0), lean(-392), ang), k = Math.min(1, p["b" + L + "K"]);
    const Lb = 0.29 + (p["b" + L + "Lado"] - 0.29) * k, Fb = p["b" + L + "Frente"] * k, Cb = (0.2443 + 0.5236 * AG) + (p["b" + L + "Codo"] - (0.2443 + 0.5236 * AG)) * k;
    const uL = [sg * Math.sin(Lb), Math.cos(Lb) * Math.cos(Fb), Math.cos(Lb) * Math.sin(Fb)], h0 = [p["b" + L + "Hacia"] * sg, -1, 0.3];
    const hL = v3.nrm([h0[0] * k, h0[1] * k, 1 + (h0[2] - 1) * k]); let nL = v3.add(hL, v3.mul(uL, -v3.dot(hL, uL))); if (Math.hypot(...nL) < 0.15) nL = [-sg * 0.3, -1, 0.2]; nL = v3.nrm(nL);
    const fL = v3.add(v3.mul(uL, Math.cos(Cb)), v3.mul(nL, Math.sin(Cb))), dU = v3.nrm(T.W(...uL, ang)), dF = v3.nrm(T.W(...fL, ang));
    const mano = v3.add(v3.add(v3.add(hom, v3.mul(dU, 88)), v3.mul(dF, 70)), v3.mul(dF, 16)), q = T.PR(mano), [kx, ky] = medidas(j);
    return [q[0] * kx, q[1] * ky - (p.altura || 0) * ky]; }
  // descenso por coordenadas desde varios puntos de partida (la postura actual y tres con el brazo por delante): se queda con la mejor
  function ikMano(j, p, L, giro, objetivo) { p = completa(p); let mejor = null;
    for (const ini of [{}, { Lado: 0.6, Frente: 0.6, Codo: 1.2 }, { Lado: 1.2, Frente: 0.3, Codo: 0.6 }, { Lado: 0.3, Frente: 1.1, Codo: 1.6 }]) {
      const q0 = Object.assign({}, p); for (const c in ini) q0["b" + L + c] = ini[c]; const r = ik1(j, q0, L, giro, objetivo); if (!mejor || r.e < mejor.e) mejor = r; }
    return mejor.q; }
  function ik1(j, p, L, giro, objetivo) { const q = Object.assign({}, p, { ["b" + L + "K"]: 1 }), lim = { Lado: [-0.5, 2.4], Frente: [-1, 1.6], Codo: [0, 2.6] };
    const err = () => { const m = manoFK(j, q, L, giro); return Math.hypot(m[0] - objetivo[0], m[1] - objetivo[1]) + 25 * Math.max(0, 0.1 - q["b" + L + "Frente"]); };   // prefiere el brazo por delante del cuerpo
    let paso = 0.25, e0 = err();
    for (let it = 0; it < 80 && paso > 0.002; it++) { let mejoro = false;
      for (const c of ["Lado", "Frente", "Codo"]) { const kk = "b" + L + c; for (const d of [paso, -paso]) { const ant = q[kk]; q[kk] = Math.max(lim[c][0], Math.min(lim[c][1], ant + d)); const e1 = err(); if (e1 < e0 - 1e-6) { e0 = e1; mejoro = true; } else q[kk] = ant; } }
      if (!mejoro) paso *= 0.5; }
    return { q, e: e0 }; }

  window.Personajes = { op, colores, DERIVA, mix, crear: (padre, j, extra) => Titere25D.crear(padre, op(j, extra)),
    POSE0, PALMAS, mezclar, completa, conControles, accionPose, pose, accion, control, buscarAccion, enCapas, CURVAS, curva, VISEMAS, fonemas, visemas, visemaEn, manoFK, ikMano, medidas };
})();
