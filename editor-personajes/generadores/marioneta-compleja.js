// marioneta-compleja.js — genera dos marionetas libres complejas (15 nov 2026):
//   personajes/eliab-pastor.json  pastor de frente con 63 huesos: columna en 3 tramos, cuello, hombros (clavículas), dedos con
//                                 falanges, tobillo y dedos del pie, cara con 17 formas clave (párpados, cejas en 3 puntos,
//                                 mejillas, boca y barbilla) que se mueven solas con la voz y las emociones, ropa por capas
//                                 con física (faja, zurrón, cinta del pelo), cayado como variante y diales Smart Bones (puño, señalar).
//   personajes/oveja-libre.json   oveja de perfil con 22 huesos: patas de tres tramos, mandíbula que bala, orejas y cola con física
//                                 y un dial «pacer» que baja el cuello.
// Uso:  node editor-personajes/generadores/marioneta-compleja.js      (desde Videos/shorts-flow). Sobrescribe los dos JSON.
const fs = require("fs"), path = require("path");
const DIR = path.join(__dirname, "..", "..", "personajes");
const r1 = (v) => Math.round(v * 10) / 10, P = (p) => `${r1(p[0])} ${r1(p[1])}`;

// ---------------------------------------------------------------- geometría (solo M L C Z absolutos: lo que entiende rig2d.js)
// Catmull-Rom cerrada o abierta muestreada a polígono denso: formas orgánicas que se doblan bien con los huesos
function catmull(pts, cerrado = true, n = 4) {
  const out = [], N = pts.length, g = (i) => (cerrado ? pts[(i + N) % N] : pts[Math.max(0, Math.min(N - 1, i))]);
  const segs = cerrado ? N : N - 1;
  for (let i = 0; i < segs; i++) { const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2);
    for (let k = 0; k < n; k++) { const t = k / n, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map((c) => 0.5 * (2 * p1[c] + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3))); } }
  if (!cerrado) out.push(pts[N - 1]);
  return out;
}
const poli = (pts, cerrado = true) => "M " + pts.map(P).join(" L ") + (cerrado ? " Z" : "");
const forma = (pts, n = 4) => poli(catmull(pts, true, n));
const linea = (pts, n = 4) => poli(catmull(pts, false, n), false);
function elipse(cx, cy, rx, ry) { const k = 0.5523, a = rx * k, b = ry * k;
  return `M ${P([cx + rx, cy])} C ${P([cx + rx, cy + b])} ${P([cx + a, cy + ry])} ${P([cx, cy + ry])} C ${P([cx - a, cy + ry])} ${P([cx - rx, cy + b])} ${P([cx - rx, cy])} C ${P([cx - rx, cy - b])} ${P([cx - a, cy - ry])} ${P([cx, cy - ry])} C ${P([cx + a, cy - ry])} ${P([cx + rx, cy - b])} ${P([cx + rx, cy])} Z`; }
// tubo: línea central [[x, y, ancho]…] → contorno cerrado con puntas redondas, con un punto cada `paso` (se dobla suave);
// paso negativo = ese número fijo de puntos por tramo (las formas clave necesitan el mismo número de puntos en todas)
function tubo(cs, paso = 7) {
  const d = []; for (let i = 0; i < cs.length - 1; i++) { const a = cs[i], b = cs[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = paso < 0 ? -paso : Math.max(1, Math.round(L / paso));
    for (let k = 0; k < n; k++) { const t = k / n; d.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]); } }
  d.push(cs[cs.length - 1]);
  const nor = d.map((p, i) => { const a = d[Math.max(0, i - 1)], b = d[Math.min(d.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [-dy / l, dx / l]; });
  const izq = d.map((p, i) => [p[0] + nor[i][0] * p[2] / 2, p[1] + nor[i][1] * p[2] / 2]), der = d.map((p, i) => [p[0] - nor[i][0] * p[2] / 2, p[1] - nor[i][1] * p[2] / 2]);
  const tapa = (p, nr, sg) => { const r = p[2] / 2, a0 = Math.atan2(nr[1], nr[0]), o = []; for (let k = 1; k < 6; k++) { const a = a0 + sg * Math.PI * k / 6; o.push([p[0] + Math.cos(a) * r, p[1] + Math.sin(a) * r]); } return o; };
  const fin = tapa(d[d.length - 1], nor[nor.length - 1], -1), ini = tapa(d[0], [-nor[0][0], -nor[0][1]], -1);
  return poli([...izq, ...fin, ...der.reverse(), ...ini]);
}
const mix = (a, b, t) => { const h = (s) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16)), A = h(a), B = h(b); return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join(""); };
const path_ = (d, fill, extra = "") => `<path d="${d}" fill="${fill}"${extra}/>`;
const trazo = (d, color, w, extra = "") => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`;
const grupo = (attrs, s) => `<g ${attrs}>${s}</g>`;

// ---------------------------------------------------------------- paleta (personajes cálidos sobre entornos fríos)
const C = { piel: "#c8784e", pielS: "#8c4448", pielL: "#f2a874", nariz: "#b0604c", boca: "#3a1424", labio: "#b4584e", mejilla: "#e07a6a",
  pelo: "#3a2420", peloS: "#24161a", peloL: "#6a4a40", barba: "#4a2e24", ojo: "#fbf4e8", pupila: "#1a1418",
  ropa: "#c98a3a", ropaS: "#8a4e2a", ropaL: "#ffd08a", cenefa: "#7a3a2c", faja: "#b8433a", fajaS: "#7a2a30", fajaL: "#f08070",
  cinta: "#efe2c4", cintaS: "#b8a284", cuero: "#7a4a2a", cueroS: "#4e2e1e", cueroL: "#a8744a", madera: "#8a5a34", maderaL: "#c08a54", sandalia: "#5a3424" };

// ================================================================= ELIAB, EL PASTOR (de frente, 600 de alto)
function pastor() {
  const H = [], hueso = (nombre, padre, o, e, extra = {}) => { H.push(Object.assign({ nombre, padre, o, e }, extra)); };
  // columna en tres tramos, cuello y cabeza
  hueso("cadera", null, [0, -262], [0, -318]);
  hueso("vientre", "cadera", [0, -318], [0, -372]);
  hueso("pecho", "vientre", [0, -372], [0, -432]);
  hueso("cuello", "pecho", [0, -432], [0, -458]);
  hueso("cabeza", "cuello", [0, -458], [0, -600]);
  // lados: «Der» es su derecha (a la izquierda de la pantalla, s = −1), «Izq» su izquierda (s = +1)
  const LADOS = [["Der", -1], ["Izq", 1]];
  const DEDOS = [["menique", [11, 8, 7], 7, 8, -214, 0.34], ["anular", [14, 10, 8], 4, 8, -212, 0.22], ["corazon", [15, 11, 9], 0, 8.5, -211, 0.1], ["indice", [14, 10, 8], -4, 8.5, -212, 0]];
  for (const [L, s] of LADOS) {
    hueso("clav" + L, "pecho", [s * 14, -428], [s * 80, -424]);
    hueso("brazo" + L, "clav" + L, [s * 80, -424], [s * 96, -334]);
    hueso("antebrazo" + L, "brazo" + L, [s * 96, -334], [s * 104, -248]);
    hueso("mano" + L, "antebrazo" + L, [s * 104, -248], [s * 106, -212]);
    // dedos de perfil (la palma mira al cuerpo): cerrar = girar hacia el cuerpo; tres falanges y el pulgar con dos
    for (const [nm, largos, dx, , y0] of DEDOS) { let o = [s * (106 + dx), y0], padre = "mano" + L; const dir = [-s * 0.08, 1], dl = Math.hypot(...dir);
      largos.forEach((lg, k) => { const e = [o[0] + dir[0] / dl * lg, o[1] + dir[1] / dl * lg]; hueso(nm + L + (k + 1), padre, o.map(r1), e.map(r1)); padre = nm + L + (k + 1); o = e; }); }
    hueso("pulgar" + L + "1", "mano" + L, [s * 97, -242], [s * 92, -226]);
    hueso("pulgar" + L + "2", "pulgar" + L + "1", [s * 92, -226], [s * 91, -213]);
    hueso("muslo" + L, "cadera", [s * 30, -262], [s * 32, -142]);
    hueso("pierna" + L, "muslo" + L, [s * 32, -142], [s * 33, -32]);
    hueso("pie" + L, "pierna" + L, [s * 33, -32], [s * 46, -12]);
    hueso("dedosPie" + L, "pie" + L, [s * 46, -12], [s * 58, -6]);
  }
  // ropa y accesorios con física (cuelgan: no heredan el giro del padre)
  const fis = (rig, peso = 1, colgar = true) => ({ fisica: { rigidez: rig, amortiguacion: 0.3, peso, colgar } });
  hueso("fajaA1", "cadera", [44, -312], [48, -272], fis(0.35, 1.2)); hueso("fajaA2", "fajaA1", [48, -272], [52, -238], fis(0.3, 1, false));
  hueso("fajaB1", "cadera", [52, -312], [62, -278], fis(0.4, 1.1)); hueso("fajaB2", "fajaB1", [62, -278], [70, -246], fis(0.3, 1, false));
  hueso("bolsa", "cadera", [-60, -298], [-60, -242], fis(0.3, 1.6));
  hueso("cintaA1", "cabeza", [60, -570], [84, -550], fis(0.3, 0.8)); hueso("cintaA2", "cintaA1", [84, -550], [102, -524], fis(0.25, 0.8, false));
  hueso("cintaB1", "cabeza", [56, -566], [74, -540], fis(0.35, 0.8)); hueso("cintaB2", "cintaB1", [74, -540], [84, -512], fis(0.25, 0.8, false));
  hueso("cayado", "manoIzq", [112, -228], [112, -570]);
  // DIALES (Smart Bones): mandos que no se dibujan; al girarlos de 0 a 90° cierran la mano o la dejan señalando
  for (const [L, s] of LADOS) {
    const curl = (pulgar, menos = []) => { const hs = {}; for (const [nm] of DEDOS) if (!menos.includes(nm)) Object.assign(hs, { [nm + L + "1"]: s * 70, [nm + L + "2"]: s * 85, [nm + L + "3"]: s * 55 });
      if (pulgar) Object.assign(hs, { ["pulgar" + L + "1"]: -s * 20, ["pulgar" + L + "2"]: -s * 35 }); return hs; };
    hueso("puno" + L, "mano" + L, [s * 130, -240], [s * 150, -240], { dial: true, smart: { claves: [{ ang: 90, curva: "suave", huesos: curl(true) }] } });
    hueso("senala" + L, "mano" + L, [s * 130, -220], [s * 150, -220], { dial: true, smart: { claves: [{ ang: 90, curva: "suave", huesos: curl(true, ["indice"]) }] } });
  }

  // ---------------------------------------------------------------- capas (de atrás adelante)
  const capas = [], capa = (id, nombre, svg, extra = {}) => capas.push(Object.assign({ id, nombre, svg }, extra));
  // colas de la cinta del pelo, por detrás de la cabeza
  capa("cinta-colas", "Cinta del pelo · colas",
    grupo('data-huesos="cintaB1,cintaB2"', path_(tubo([[56, -566, 9], [74, -540, 8], [84, -512, 6]]), C.cintaS)) +
    grupo('data-huesos="cintaA1,cintaA2"', path_(tubo([[60, -570, 10], [84, -550, 9], [102, -524, 7]]), C.cinta) + trazo(linea([[62, -568], [84, -550], [100, -526]]), C.faja, 2.5)));
  capa("pelo-detras", "Pelo de detrás", path_(forma([[-70, -560], [-72, -596], [-50, -616], [0, -622], [50, -616], [72, -596], [70, -560], [66, -526], [-66, -526]]), C.peloS), { hueso: "cabeza" });
  // piernas: cada una solo sigue a sus huesos
  let piernas = "";
  for (const [L, s] of LADOS) { const hs = `muslo${L},pierna${L},pie${L}`;
    piernas += grupo(`data-huesos="${hs}"`, path_(tubo([[s * 30, -250, 32], [s * 32, -142, 26], [s * 33, -40, 19], [s * 34, -26, 18]]), C.piel) +
      trazo(linea([[s * 40, -130], [s * 41, -80], [s * 40, -44]]), C.pielS, 3, ' opacity="0.5"'));
    piernas += grupo(`data-huesos="pie${L},dedosPie${L}"`,
      path_(forma([[s * 14, -7], [s * 40, -4], [s * 64, -3], [s * 66, 2], [s * 40, 3], [s * 12, 1]]), C.sandalia) +
      path_(forma([[s * 22, -30], [s * 44, -30], [s * 58, -18], [s * 62, -6], [s * 40, -2], [s * 20, -4], [s * 17, -18]]), C.piel) +
      trazo(linea([[s * 21, -19], [s * 40, -18], [s * 56, -14]]), C.sandalia, 4) + trazo(linea([[s * 23, -33], [s * 34, -35], [s * 45, -33]]), C.sandalia, 4) +
      path_(elipse(s * 57, -8, 4, 3), C.pielL, ' opacity="0.6"'));
  }
  capa("piernas", "Piernas y sandalias", piernas);
  capa("cuello", "Cuello", path_(forma([[-21, -474], [21, -474], [23, -430], [26, -404], [0, -398], [-26, -404], [-23, -430]]), C.piel) +
    path_(forma([[-21, -474], [21, -474], [22, -452], [0, -446], [-22, -452]]), C.pielS, ' opacity="0.55"'), { huesos: ["cabeza", "cuello", "pecho"] });
  // túnica: torso y falda; los bajos siguen a los muslos
  const tun = [[0, -412], [16, -416], [28, -430], [46, -434], [70, -432], [84, -424], [86, -408], [76, -392], [68, -360], [61, -322], [64, -280], [70, -220], [76, -170], [80, -132], [40, -126], [0, -124]];
  const tunica = [...tun, ...tun.slice(1, -1).reverse().map(([x, y]) => [-x, y])];
  const sombra = [[76, -392], [68, -360], [61, -322], [64, -280], [70, -220], [76, -170], [80, -132], [56, -128], [50, -170], [46, -230], [44, -300], [46, -360], [56, -392]];
  capa("tunica", "Túnica",
    path_(forma(tunica), C.ropa) + path_(forma(sombra), C.ropaS, ' opacity="0.55"') +
    path_(forma([[-80, -150], [0, -144], [80, -150], [80, -132], [40, -126], [0, -124], [-40, -126], [-80, -132]]), C.cenefa) +
    trazo(linea([[-79, -141], [0, -135], [79, -141]]), C.ropaL, 2.5, ' stroke-dasharray="6 7" opacity="0.8"') +
    trazo(linea([[0, -300], [1, -220], [0, -150]]), C.ropaS, 4, ' opacity="0.6"') +
    trazo(linea([[-28, -430], [-16, -416], [0, -412], [16, -416], [28, -430]]), C.ropaS, 5) +
    trazo(linea([[-80, -420], [-72, -428], [-50, -432]]), C.ropaL, 3, ' opacity="0.7"'),
    { huesos: ["pecho", "vientre", "cadera", "clavDer", "clavIzq", "musloDer", "musloIzq"] });
  capa("faja", "Faja y nudo",
    grupo('data-huesos="vientre,cadera"', path_(forma([[-63, -332], [0, -337], [63, -332], [65, -318], [64, -304], [0, -299], [-64, -304], [-65, -318]]), C.faja) +
      trazo(linea([[-62, -318], [0, -320], [62, -318]]), C.fajaL, 3, ' opacity="0.7"')) +
    grupo('data-huesos="fajaB1,fajaB2"', path_(tubo([[52, -312, 10], [62, -278, 9], [70, -246, 8]]), C.fajaS)) +
    grupo('data-huesos="fajaA1,fajaA2"', path_(tubo([[44, -312, 11], [48, -272, 10], [52, -238, 9]]), C.faja)) +
    grupo('data-hueso="cadera"', path_(elipse(47, -316, 9, 8), C.fajaS)));
  capa("correa", "Correa del zurrón", path_(tubo([[64, -432, 7], [10, -372, 7], [-56, -294, 7]]), C.cueroS), { huesos: ["clavIzq", "pecho", "vientre", "cadera"] });
  capa("zurron", "Zurrón", path_(forma([[-84, -298], [-36, -298], [-30, -270], [-40, -242], [-80, -242], [-90, -270]]), C.cuero) +
    path_(forma([[-82, -258], [-38, -258], [-40, -244], [-80, -244]]), C.cueroS, ' opacity="0.5"') +
    path_(forma([[-86, -298], [-34, -298], [-38, -278], [-60, -272], [-82, -278]]), C.cueroS) + path_(elipse(-60, -276, 4, 4), C.cueroL), { hueso: "bolsa" });
  // cabeza: piel y orejas (rígidas a la cabeza)
  const cab = (x0, y0, x1, y1, r) => `M ${P([x0 + r, y0])} L ${P([x1 - r, y0])} C ${P([x1 - r * 0.45, y0])} ${P([x1, y0 + r * 0.45])} ${P([x1, y0 + r])} L ${P([x1, y1 - r])} C ${P([x1, y1 - r * 0.45])} ${P([x1 - r * 0.45, y1])} ${P([x1 - r, y1])} L ${P([x0 + r, y1])} C ${P([x0 + r * 0.45, y1])} ${P([x0, y1 - r * 0.45])} ${P([x0, y1 - r])} L ${P([x0, y0 + r])} C ${P([x0, y0 + r * 0.45])} ${P([x0 + r * 0.45, y0])} ${P([x0 + r, y0])} Z`;
  capa("cabeza", "Cabeza y orejas",
    path_(elipse(-65, -518, 9, 14), C.piel) + path_(elipse(-65, -518, 5, 9), C.pielS, ' opacity="0.6"') + path_(elipse(65, -518, 9, 14), C.piel) + path_(elipse(65, -518, 5, 9), C.pielS, ' opacity="0.6"') +
    path_(cab(-64, -600, 64, -448, 56), C.piel) + path_(forma([[64, -560], [64, -500], [52, -462], [36, -452], [50, -500], [54, -556]]), C.pielS, ' opacity="0.35"'), { hueso: "cabeza" });
  // CARA: todo sale de unos parámetros; cada forma clave es la misma cara con otros parámetros (mismos trazados y puntos)
  const C0 = { lid: [0.12, 0.12], low: [0, 0], cejaIn: 0, cejaMed: 0, cejaExt: 0, cejaInD: 0, mw: 15, esq: 0, abre: 0, dientes: 0, px: 0, py: 0, ojoK: 1, rubor: 0, barbilla: 0, ladoBoca: 0 };
  function cara(q) {
    let s = "";
    const ojos = [[-24, 0], [24, 1]].map(([cx, i]) => ({ cx, cy: -528, rx: 10 * q.ojoK, ry: 12 * q.ojoK, lid: q.lid[i], low: q.low[i], sg: cx < 0 ? -1 : 1 }));
    for (const o of ojos) s += path_(elipse(o.cx, o.cy, o.rx, o.ry), C.ojo);
    for (const o of ojos) s += path_(elipse(o.cx + q.px, o.cy + 1 + q.py, 6 * q.ojoK, 6.5 * q.ojoK), C.pupila) + path_(elipse(o.cx + q.px + 2.2, o.cy - 2.5 + q.py, 2, 2), "#ffffff");
    // párpado superior: el borde baja de arriba del ojo (0) a abajo (1); el inferior sube con la sonrisa
    for (const o of ojos) { const top = o.cy - o.ry - 16, ys = o.cy - o.ry * 0.25 + o.lid * o.ry * 1.25, yc = o.cy - o.ry - 1 + o.lid * (2 * o.ry + 2);
      const borde = [[o.cx - o.rx - 3, ys], [o.cx - o.rx * 0.55, (ys + yc) / 2 - 1.5], [o.cx, yc], [o.cx + o.rx * 0.55, (ys + yc) / 2 - 1.5], [o.cx + o.rx + 3, ys]];
      s += path_(poli([[o.cx - o.rx - 4, top], [o.cx + o.rx + 4, top], ...catmull([...borde].reverse(), false, 3)]), C.piel);
      s += trazo(linea(borde, 3), C.peloS, 2.6); }
    for (const o of ojos) { const bot = o.cy + o.ry + 12, ys = o.cy + o.ry * 0.3, yc = o.cy + o.ry + 1 - o.low * o.ry * 0.9;
      s += path_(poli([[o.cx + o.rx + 4, bot], [o.cx - o.rx - 4, bot], ...catmull([[o.cx - o.rx - 3, ys], [o.cx, yc], [o.cx + o.rx + 3, ys]], false, 3)]), C.piel); }
    // cejas en tres puntos (interior, medio, exterior); positivo = baja
    for (const o of ojos) { const y = -548, sg = o.sg; s += path_(tubo([[sg * 11, y + q.cejaIn + q.cejaInD, 7.5], [sg * 24, y - 4 + q.cejaMed, 7], [sg * 37, y + q.cejaExt, 4.5]], -4), C.pelo); }
    s += path_(forma([[-4, -524], [-9, -509], [-6, -503], [0, -501], [6, -503], [9, -509], [4, -524]], 3), C.nariz) + path_(elipse(-2, -517, 2, 4), C.pielL, ' opacity="0.5"');
    for (const sg of [-1, 1]) s += path_(elipse(sg * 38, -498, 0.2 + 12 * q.rubor, 0.2 + 7 * q.rubor), C.mejilla, ' opacity="0.55"');
    // barba (la barbilla baja al abrir la boca)
    const bb = q.barbilla;
    s += path_(forma([[-62, -548], [-63, -510], [-54, -472], [-34, -446 + bb * 0.5], [0, -436 + bb], [34, -446 + bb * 0.5], [54, -472], [63, -510], [62, -548], [56, -540], [48, -506], [30, -494], [0, -496 + bb * 0.3], [-30, -494], [-48, -506], [-56, -540]], 4), C.barba);
    // boca: interior oscuro, dientes, labio de abajo y bigote
    const my = -484, mw = q.mw, ab = q.abre, esq = q.esq, lb = q.ladoBoca;
    const sup = (t) => my - 1 - ab * 0.22 * Math.sqrt(Math.max(0, 1 - t * t)) + esq * Math.pow(Math.abs(t), 3) * 0.9;
    const inf = (t) => my + 1.5 + ab * Math.pow(Math.max(0, 1 - t * t), 0.6) - esq * (1 - t * t) * 0.35 + esq * Math.pow(Math.abs(t), 3) * 0.9;
    const T = [-1, -0.6, -0.25, 0.25, 0.6, 1], X = (t) => t * mw + lb;
    const borde = [[X(-1), sup(-1)], ...[-0.6, -0.25, 0.25, 0.6].map((t) => [X(t), sup(t)]), [X(1), sup(1)], ...[0.6, 0.25, -0.25, -0.6].map((t) => [X(t), inf(t)])];
    s += path_(forma(borde, 3), C.boca);
    const dh = q.dientes * Math.min(ab * 0.5, 6);
    s += path_(poli([...T.slice(1, 5).map((t) => [X(t * 0.85), sup(t) + 0.5]), ...T.slice(1, 5).reverse().map((t) => [X(t * 0.85), sup(t) + 0.5 + dh])]), "#f4ece0");
    s += path_(forma([[X(-0.6), inf(-0.6) + 1.5], [X(0), inf(0) + 1.5], [X(0.6), inf(0.6) + 1.5], [X(0.4), inf(0.4) + 5], [X(0), inf(0) + 6], [X(-0.4), inf(-0.4) + 5]], 3), C.labio);
    s += path_(forma([[X(-1) - 7, sup(-1) + 2], [X(-0.5), my - 8], [0 + lb, my - 7], [X(0.5), my - 8], [X(1) + 7, sup(1) + 2], [X(0.55), my - 3], [0 + lb, my - 3.5], [X(-0.55), my - 3]], 3), C.peloS);
    return s;
  }
  const conCara = (cambios) => { const q = JSON.parse(JSON.stringify(C0)); for (const [k, v] of Object.entries(cambios)) q[k] = Array.isArray(v) ? v : typeof q[k] === "number" ? q[k] + v : v; return cara(q); };
  const CLAVES = [
    ["parpadeo", "Parpadeo (solo)", { lid: [1, 1] }], ["abre", "Boca abierta (voz)", { abre: 14, barbilla: 9 }],
    ["ancha", "Boca ancha (fonemas)", { mw: 5, abre: 1 }], ["estrecha", "Boca estrecha (fonemas)", { mw: -6, abre: 2 }], ["dientes", "Dientes (fonemas)", { dientes: 1, abre: 3 }],
    ["alegre", "Alegre", { esq: -9, low: [0.5, 0.5], cejaIn: -2, cejaMed: -2, cejaExt: -1, rubor: 0.5, mw: 3, abre: 1.5 }],
    ["risa", "Risa", { esq: -7, abre: 12, mw: 5, low: [0.75, 0.75], cejaIn: -4, cejaMed: -4, rubor: 0.8, dientes: 0.8, barbilla: 6 }],
    ["triste", "Triste", { esq: 6, cejaIn: -6, cejaExt: 3, lid: [0.3, 0.3], mw: -2, py: 2 }],
    ["enfado", "Enfado", { cejaIn: 7, cejaExt: -3, lid: [0.35, 0.35], esq: 4, mw: -2, cejaMed: 1 }],
    ["sorpresa", "Sorpresa", { cejaIn: -9, cejaMed: -9, cejaExt: -8, ojoK: 0.15, abre: 12, mw: -7, barbilla: 6 }],
    ["miedo", "Miedo", { cejaIn: -10, cejaMed: -6, cejaExt: -2, ojoK: 0.1, abre: 6, mw: -2, esq: 3 }],
    ["pensativo", "Pensativo", { cejaIn: 2, cejaExt: -3, lid: [0.25, 0.25], mw: -4, esq: 1, py: -3, px: 3, ladoBoca: 3 }],
    ["verguenza", "Vergüenza", { rubor: 1, lid: [0.35, 0.35], esq: -2, mw: -4, py: 3, cejaIn: -3 }],
    ["guino", "Guiño (ojo izquierdo)", { lid: [0.12, 1], low: [0, 0.3], esq: -3, ladoBoca: 2 }],
    ["mira-izq", "Mira a la izquierda", { px: -4 }], ["mira-der", "Mira a la derecha", { px: 4 }],
    ["mira-arriba", "Mira arriba", { py: -3.5 }], ["mira-abajo", "Mira abajo", { py: 3.5, lid: [0.25, 0.25] }],
  ];
  capa("cara", "Cara (formas clave)", cara(C0), { hueso: "cabeza", formasClave: CLAVES.map(([id, nombre, c]) => ({ id, nombre, svg: conCara(c) })) });
  // pelo rizado y cinta de la frente
  const bucles = []; for (let i = 0; i <= 10; i++) { const a = Math.PI * (1 - i / 10), rx = 70, ry = 52; bucles.push([Math.cos(a) * rx, -566 - Math.sin(a) * ry + (i % 2 ? -5 : 3)]); }
  capa("pelo", "Pelo y cinta",
    path_(forma([[-68, -536], ...bucles, [68, -536], [62, -548], [50, -572], [0, -580], [-50, -572], [-62, -548]], 3), C.pelo) +
    trazo(linea([[-40, -604], [-24, -612], [-8, -606]]), C.peloL, 3, ' opacity="0.8"') + trazo(linea([[10, -610], [28, -614], [42, -606]]), C.peloL, 3, ' opacity="0.6"') +
    path_(forma([[-67, -584], [0, -592], [67, -584], [66, -570], [0, -578], [-66, -570]], 3), C.cinta) +
    trazo(linea([[-66, -577], [0, -585], [66, -577]]), C.faja, 2.5), { hueso: "cabeza" });
  // cayado (variante): por detrás de la mano izquierda
  capa("con-cayado", "Cayado", trazo(`M 112 -8 L 112 -556 C 112 -598 162 -600 160 -560`, C.madera, 11) + trazo(`M 109 -40 L 109 -550 C 110 -588 152 -592 156 -566`, C.maderaL, 3, ' opacity="0.7"'), { hueso: "cayado", grupo: "cayado" });
  capa("sin-cayado", "Sin cayado", "", { grupo: "cayado" });
  // brazos: manga, antebrazo, palma y dedos (cada falange, rígida a su hueso; el contorno oscuro separa un dedo de otro)
  for (const [L, s] of LADOS) {
    let b = grupo(`data-huesos="brazo${L},antebrazo${L},mano${L}"`, path_(tubo([[s * 95, -362, 22], [s * 97, -334, 21], [s * 104, -250, 17]]), C.piel) +
      trazo(linea([[s * 104, -320], [s * 107, -280], [s * 108, -258]]), C.pielS, 3, ' opacity="0.45"'));
    b += grupo(`data-huesos="clav${L},brazo${L}"`, path_(forma([[s * 60, -436], [s * 80, -432], [s * 92, -420], [s * 100, -396], [s * 106, -366], [s * 111, -348], [s * 96, -341], [s * 81, -346], [s * 77, -370], [s * 71, -400], [s * 63, -420]]), C.ropa) +
      path_(forma([[s * 100, -396], [s * 106, -366], [s * 111, -348], [s * 102, -346], [s * 96, -372], [s * 90, -400]]), C.ropaS, ` opacity="${s > 0 ? 0.55 : 0.25}"`) +
      trazo(linea([[s * 110, -349], [s * 96, -343], [s * 82, -347]]), C.cenefa, 5));
    b += grupo(`data-hueso="mano${L}"`, path_(forma([[s * 96, -252], [s * 112, -252], [s * 118, -236], [s * 116, -211], [s * 96, -209], [s * 93, -232]]), C.piel));
    const falanges = H.filter((h) => new RegExp(`^(menique|anular|corazon|indice)${L}\\d$`).test(h.nombre));
    for (const [nm, , , w, , osc] of DEDOS) { const fs_ = falanges.filter((h) => h.nombre.startsWith(nm + L)), col = mix(C.piel, C.pielS, osc);
      b += fs_.map((h) => grupo(`data-hueso="${h.nombre}"`, trazo(`M ${P(h.o)} L ${P(h.e)}`, C.pielS, w + 2.6))).join("");
      b += fs_.map((h) => grupo(`data-hueso="${h.nombre}"`, trazo(`M ${P(h.o)} L ${P(h.e)}`, col, w))).join(""); }
    const pul = H.filter((h) => h.nombre.startsWith("pulgar" + L));
    b += pul.map((h) => grupo(`data-hueso="${h.nombre}"`, trazo(`M ${P(h.o)} L ${P(h.e)}`, C.pielS, 11.6))).join("") + pul.map((h) => grupo(`data-hueso="${h.nombre}"`, trazo(`M ${P(h.o)} L ${P(h.e)}`, C.piel, 9))).join("");
    capa("brazo" + L, `Brazo ${L === "Der" ? "derecho" : "izquierdo"} (manga, mano y dedos)`, b);
  }

  // ---------------------------------------------------------------- acciones de muestra
  const clave = (t, huesos = {}, extra = {}) => Object.assign({ t, pose: Object.assign({ huesos }, extra) }, extra.curva ? { curva: extra.curva } : {});
  const puno = (L, s, k = 1, menos = []) => { const o = {}; for (const [nm] of DEDOS) if (!menos.includes(nm)) Object.assign(o, { [nm + L + "1"]: s * 70 * k, [nm + L + "2"]: s * 85 * k, [nm + L + "3"]: s * 55 * k }); return o; };
  const acciones = [
    { id: "espera", nombre: "Esperar respirando", duracion: 3.2, bucle: true, locomocion: { amp: 0 }, claves: [
      clave(0, { pecho: 0, clavDer: 0, clavIzq: 0, cabeza: 0, brazoDer: 2, brazoIzq: -2 }),
      clave(1.6, { pecho: -1.5, clavDer: 3, clavIzq: -3, cabeza: 1.5, cuello: -1, brazoDer: 3, brazoIzq: -3, vientre: 1 }, { cara: { pensativo: 0.15 } })] },
    { id: "saludo", nombre: "Saludar con la mano", duracion: 2, bucle: true, retraso: 0.4, locomocion: { amp: 0 }, claves: [
      clave(0, { brazoIzq: -118, antebrazoIzq: -40, manoIzq: -10, clavIzq: -8, cabeza: 4, pecho: -2 }, { cara: { alegre: 0.85 } }),
      clave(0.5, { brazoIzq: -122, antebrazoIzq: -8, manoIzq: 14, clavIzq: -10, cabeza: 6, pecho: -3 }, { cara: { alegre: 0.95 } }),
      clave(1, { brazoIzq: -118, antebrazoIzq: -42, manoIzq: -12, clavIzq: -8, cabeza: 4, pecho: -2 }, { cara: { alegre: 0.85 } }),
      clave(1.5, { brazoIzq: -122, antebrazoIzq: -8, manoIzq: 14, clavIzq: -10, cabeza: 6, pecho: -3 }, { cara: { risa: 0.4, alegre: 0.6 } })] },
    { id: "contar", nombre: "Contar con los dedos", duracion: 4.4, bucle: false, locomocion: { amp: 0 }, claves: (() => { const base = { brazoDer: 25, antebrazoDer: 155, manoDer: -6, cabeza: -6, pecho: 2, clavDer: 4 };
      const orden = ["indice", "corazon", "anular", "menique"], ks = [clave(0, Object.assign({}, base, puno("Der", -1), { pulgarDer1: 20, pulgarDer2: 35 }), { cara: { pensativo: 0.6 } })];
      orden.forEach((nm, i) => ks.push(clave(0.8 + i * 0.7, Object.assign({}, base, puno("Der", -1, 1, orden.slice(0, i + 1)), { pulgarDer1: 20, pulgarDer2: 35 }), { cara: { pensativo: 0.4 - i * 0.1, alegre: i * 0.15 } })));
      ks.push(clave(3.6, Object.assign({}, base, { pulgarDer1: 0, pulgarDer2: 0 }), { cara: { alegre: 0.8 } }));
      return ks; })() },
    { id: "nose", nombre: "Encogerse de hombros (no sé)", duracion: 1.8, bucle: false, locomocion: { amp: 0 }, claves: [
      clave(0, {}, { cara: {} }),
      clave(0.45, { clavDer: 14, clavIzq: -14, brazoDer: 40, brazoIzq: -40, antebrazoDer: 70, antebrazoIzq: -70, manoDer: 20, manoIzq: -20, cabeza: 8, cuello: 4 }, { cara: { pensativo: 0.5, triste: 0.25 } }),
      clave(1.2, { clavDer: 14, clavIzq: -14, brazoDer: 40, brazoIzq: -40, antebrazoDer: 70, antebrazoIzq: -70, manoDer: 20, manoIzq: -20, cabeza: 8, cuello: 4 }, { cara: { pensativo: 0.5, triste: 0.25 } }),
      clave(1.8, {}, { cara: {} })] },
    { id: "senalar", nombre: "Señalar a lo lejos", duracion: 2.4, bucle: false, locomocion: { amp: 0 }, claves: [
      clave(0, {}, {}),
      clave(0.6, { brazoIzq: -85, antebrazoIzq: -12, manoIzq: -6, senalaIzq: 90, clavIzq: -6, pecho: -4, vientre: -2, cabeza: -3 }, { cara: { sorpresa: 0.3, alegre: 0.3, "mira-der": 1 } }),
      clave(1.9, { brazoIzq: -88, antebrazoIzq: -10, manoIzq: -4, senalaIzq: 90, clavIzq: -6, pecho: -4, vientre: -2, cabeza: -3 }, { cara: { alegre: 0.5, "mira-der": 1 } }),
      clave(2.4, {}, {})] },
  ];
  // las miradas son formas clave de la capa «cara»: en la pose van en formas, no en cara
  for (const a of acciones) for (const k of a.claves) { const c = k.pose.cara || {}; for (const id of Object.keys(c)) if (id.startsWith("mira-")) { k.pose.formas = Object.assign(k.pose.formas || {}, { ["cara/" + id]: c[id] }); delete c[id]; } }
  return { id: "eliab-pastor", nombre: "Eliab, pastor (marioneta compleja)", tipo: "libre", libre: { huesos: H, capas }, acciones, opciones: {}, colores: { auto: {} },
    notas: "Generado por editor-personajes/generadores/marioneta-compleja.js (15 nov 2026). 63 huesos: columna en 3 tramos, cuello, clavículas, dedos con falanges (de perfil: cerrar = girar hacia el cuerpo), tobillo y dedos del pie. Diales azules punoDer/Izq y senalaDer/Izq (0-90°). Física: faja, zurrón y colas de la cinta. Cara con formas clave que se mueven solas (parpadeo, voz, emociones). Variante «cayado».",
    piezas: [], variantes: { cayado: "sin-cayado" }, controles: [] };
}

// ================================================================= LA OVEJA (de perfil, mira a la derecha)
function oveja() {
  const O = { lana: "#f2e8d8", lanaS: "#c9b8ac", lanaL: "#fffaf0", cara: "#4a3434", caraL: "#6e5048", caraS: "#2e2024", pata: "#4a3434", pezuna: "#22181c", rosa: "#d07a78" };
  const H = [], hueso = (nombre, padre, o, e, extra = {}) => H.push(Object.assign({ nombre, padre, o, e }, extra));
  const fis = (rig, peso = 1, colgar = false) => ({ fisica: { rigidez: rig, amortiguacion: 0.3, peso, colgar } });
  hueso("lomoAtras", null, [-60, -168], [0, -176]);
  hueso("lomoDelante", "lomoAtras", [0, -176], [58, -174]);
  hueso("cuello", "lomoDelante", [58, -174], [100, -214]);
  hueso("cabeza", "cuello", [100, -214], [152, -204]);
  hueso("mandibula", "cabeza", [118, -197], [150, -189], { habla: 16 });
  hueso("orejaLejos", "cabeza", [112, -226], [94, -218], fis(0.45, 0.7));
  hueso("orejaCerca", "cabeza", [108, -222], [88, -210], fis(0.4, 0.7));
  hueso("cola1", "lomoAtras", [-64, -180], [-84, -168], fis(0.35, 0.9));
  hueso("cola2", "cola1", [-84, -168], [-94, -150], fis(0.3, 0.9));
  const PATAS = [["DelLejos", 58, true], ["TrasLejos", -40, true], ["DelCerca", 46, false], ["TrasCerca", -52, false]];
  for (const [n, x] of PATAS) { const padre = n.startsWith("Del") ? "lomoDelante" : "lomoAtras";
    hueso("muslo" + n, padre, [x, -128], [x, -76]); hueso("cana" + n, "muslo" + n, [x, -76], [x, -16]); hueso("pezuna" + n, "cana" + n, [x, -16], [x + 7, -2]); }
  hueso("pacer", "lomoDelante", [0, -250], [30, -250], { dial: true, smart: { claves: [{ ang: 90, curva: "suave", huesos: { cuello: 58, cabeza: 22 } }] } });
  const nube = (cx, cy, rx, ry, n, bulto) => { const pts = []; for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); }
    let d = `M ${P(pts[0])}`; for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n], m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], v = [m[0] - cx, m[1] - cy], l = Math.hypot(v[0] / rx, v[1] / ry) || 1, u = [v[0] / l / rx, v[1] / l / ry], ul = Math.hypot(...u) || 1, nn = [u[0] / ul, u[1] / ul];
      const c1 = [a[0] + nn[0] * bulto, a[1] + nn[1] * bulto], c2 = [b[0] + nn[0] * bulto, b[1] + nn[1] * bulto]; d += ` C ${P(c1)} ${P(c2)} ${P(b)}`; } return d + " Z"; };
  const capas = [], capa = (id, nombre, svg, extra = {}) => capas.push(Object.assign({ id, nombre, svg }, extra));
  const pata = (n, x, lejos) => { const col = lejos ? O.caraS : O.pata;
    return grupo(`data-huesos="muslo${n},cana${n}"`, path_(tubo([[x, -134, 19], [x, -76, 15], [x, -18, 12]], 6), col)) + grupo(`data-hueso="pezuna${n}"`, path_(forma([[x - 7, -16], [x + 7, -16], [x + 11, -1], [x - 8, -1]], 3), O.pezuna)); };
  capa("patas-lejos", "Patas del otro lado", PATAS.filter((p) => p[2]).map(([n, x]) => pata(n, x, true)).join(""));
  capa("oreja-lejos", "Oreja del otro lado", path_(tubo([[112, -226, 12], [94, -218, 9], [86, -212, 6]], 4), O.caraS), { hueso: "orejaLejos" });
  capa("cola", "Cola", path_(tubo([[-62, -182, 22], [-84, -168, 18], [-96, -148, 12]], 5), O.lanaS) + path_(tubo([[-64, -184, 14], [-84, -170, 11], [-93, -153, 7]], 5), O.lana), { huesos: ["cola1", "cola2"] });
  capa("cuello-lana", "Lana del cuello", path_(tubo([[40, -176, 64], [72, -192, 50], [100, -210, 36]], 6), O.lana), { huesos: ["lomoDelante", "cuello"] });
  capa("cuerpo", "Cuerpo de lana",
    path_(nube(0, -152, 90, 50, 16, 13), O.lanaS) + path_(nube(-3, -158, 84, 46, 15, 12), O.lana) +
    [[-40, -178], [-6, -184], [30, -176], [-24, -150], [14, -152], [46, -158]].map(([x, y]) => path_(nube(x, y, 12, 8, 6, 5), O.lanaL, ' opacity="0.8"')).join(""),
    { huesos: ["lomoAtras", "lomoDelante"] });
  capa("cabeza", "Cabeza", path_(forma([[96, -224], [114, -238], [138, -234], [152, -218], [158, -204], [151, -196], [124, -198], [104, -204], [94, -214]], 4), O.cara) +
    path_(forma([[138, -222], [154, -212], [157, -203], [146, -200], [136, -208]], 3), O.caraL, ' opacity="0.7"') + path_(elipse(152, -207, 2.2, 1.6), O.caraS) +
    path_(nube(110, -236, 16, 9, 7, 6), O.lana), { hueso: "cabeza" });
  capa("mandibula", "Mandíbula", path_(forma([[116, -199], [150, -197], [151, -190], [132, -184], [118, -190]], 3), O.caraS), { hueso: "mandibula" });
  const C0 = { lid: 0, low: 0, ceja: 0, cejaIn: 0, k: 1, rubor: 0, px: 0 };
  const ojo = (q) => { const cx = 133, cy = -217, rx = 6.5 * q.k, ry = 6.2 * q.k; let s = path_(elipse(cx, cy, rx, ry), "#fbf4e8") + path_(elipse(cx + 0.5 + q.px, cy, 3.6, 2.2), "#1a1418");
    const top = cy - ry - 8, ys = cy - ry * 0.2 + q.lid * ry * 1.2, yc = cy - ry - 1 + q.lid * (2 * ry + 2), b = [[cx - rx - 2, ys], [cx, yc], [cx + rx + 2, ys]];
    s += path_(poli([[cx - rx - 3, top], [cx + rx + 3, top], ...catmull([...b].reverse(), false, 3)]), O.cara) + trazo(linea(b, 3), O.caraS, 1.8);
    const bot = cy + ry + 7, yb = cy + ry + 1 - q.low * ry; s += path_(poli([[cx + rx + 3, bot], [cx - rx - 3, bot], ...catmull([[cx - rx - 2, cy + ry * 0.3], [cx, yb], [cx + rx + 2, cy + ry * 0.3]], false, 3)]), O.cara);
    s += path_(tubo([[cx - 8, cy - 11 + q.ceja - q.cejaIn, 4], [cx + 1, cy - 13 + q.ceja, 3.5], [cx + 8, cy - 11 + q.ceja + q.cejaIn, 2.5]], -4), O.lanaS);
    s += path_(elipse(cx + 4, cy + 10, 0.2 + 6 * q.rubor, 0.2 + 3.5 * q.rubor), O.rosa, ' opacity="0.6"'); return s; };
  const con = (c) => { const q = Object.assign({}, C0); for (const [k, v] of Object.entries(c)) q[k] += v; return ojo(q); };
  capa("ojo", "Ojo (formas clave)", ojo(C0), { hueso: "cabeza", formasClave: [["parpadeo", "Parpadeo (solo)", { lid: 1 }], ["alegre", "Alegre", { low: 0.5, ceja: -2, rubor: 1 }],
    ["triste", "Triste", { lid: 0.35, cejaIn: -3 }], ["sorpresa", "Sorpresa", { k: 0.2, ceja: -4 }], ["miedo", "Miedo", { k: 0.15, ceja: -3, cejaIn: -2 }],
    ["enfado", "Enfado", { lid: 0.3, cejaIn: 3, ceja: 1 }], ["pensativo", "Pensativo", { lid: 0.3, px: -1.5 }]].map(([id, nombre, c]) => ({ id, nombre, svg: con(c) })) });
  capa("oreja-cerca", "Oreja", path_(tubo([[108, -222, 13], [88, -210, 10], [80, -204, 6]], 4), O.cara) + path_(tubo([[104, -220, 6], [90, -211, 4]], 4), O.rosa, ' opacity="0.7"'), { hueso: "orejaCerca" });
  capa("patas-cerca", "Patas de este lado", PATAS.filter((p) => !p[2]).map(([n, x]) => pata(n, x, false)).join(""));
  // acciones
  const k = (t, huesos, extra = {}) => ({ t, pose: Object.assign({ huesos }, extra) });
  const paso = (aD, aT, lD, lT) => ({ musloDelCerca: aD, musloTrasLejos: aD * 0.9, canaDelCerca: lD, canaTrasLejos: lD, musloDelLejos: -aD, musloTrasCerca: -aD * 0.9, canaDelLejos: lT, canaTrasCerca: lT });
  const acciones = [
    { id: "andar", nombre: "Andar (al trote corto)", duracion: 1, bucle: true, locomocion: { amp: 0 }, claves: [
      k(0, Object.assign(paso(-18, 0, 0, 0), { cuello: -2, lomoAtras: 0 })), k(0.25, Object.assign(paso(0, 0, 0, 28), { cuello: 2, lomoAtras: -1, __y: -3 })),
      k(0.5, Object.assign(paso(18, 0, 0, 0), { cuello: -2, lomoAtras: 0 })), k(0.75, Object.assign(paso(0, 0, 28, 0), { cuello: 2, lomoAtras: 1, __y: -3 }))] },
    { id: "pacer", nombre: "Pacer", duracion: 3.4, bucle: true, locomocion: { amp: 0 }, claves: [
      k(0, { pacer: 0 }), k(0.8, { pacer: 90, mandibula: 0 }), k(1.1, { pacer: 90, mandibula: 9 }), k(1.4, { pacer: 90, mandibula: 0 }), k(1.7, { pacer: 90, mandibula: 9 }),
      k(2.0, { pacer: 90, mandibula: 0 }), k(2.3, { pacer: 90, mandibula: 9 }), k(2.6, { pacer: 90, mandibula: 0 }), k(3.4, { pacer: 0 })] },
    { id: "balar", nombre: "Balar", duracion: 1.8, bucle: false, locomocion: { amp: 0 }, claves: [
      k(0, {}, { cara: {} }), k(0.35, { cuello: -16, cabeza: -10, mandibula: 22, lomoDelante: -2 }, { cara: { sorpresa: 0.3 } }),
      k(0.6, { cuello: -18, cabeza: -12, mandibula: 18, lomoDelante: -2 }, { cara: { sorpresa: 0.3 } }), k(0.85, { cuello: -16, cabeza: -10, mandibula: 24, lomoDelante: -2 }, { cara: { alegre: 0.3 } }),
      k(1.3, { cuello: -4, cabeza: -2, mandibula: 0 }, { cara: { alegre: 0.6 } }), k(1.8, {}, { cara: {} })] },
  ];
  // PROPORCIONES: patas cortas y cabeza grande (se rehace todo con una transformación: huesos, dibujos y formas clave).
  //  cabeza ×1,3 alrededor de la nuca; la y se baja 30 por encima de las patas y las patas se acortan de 112 a 84
  const CAB = new Set(["cabeza", "mandibula", "orejaLejos", "orejaCerca", "oreja-lejos", "oreja-cerca", "ojo"]), NUCA = [100, -214];
  const mapY = (y) => (y >= -16 ? y : y >= -128 ? -14 + (y + 16) * (84 / 112) : y + 30);
  const tr = (cab) => ([x, y]) => { if (cab) { x = NUCA[0] + (x - NUCA[0]) * 1.3; y = NUCA[1] + (y - NUCA[1]) * 1.3; } return [r1(x), r1(mapY(y))]; };
  const trSVG = (svg, cab) => svg.replace(/ d="([^"]*)"/g, (m, d) => { const t = d.match(/[A-Za-z]|-?\d*\.?\d+/g), out = []; let par = [];
    for (const x of t) { if (/[A-Za-z]/.test(x)) { out.push(x); continue; } par.push(+x); if (par.length === 2) { out.push(...tr(cab)(par)); par = []; } } return ` d="${out.join(" ")}"`; });
  for (const h of H) { const cab = CAB.has(h.nombre); h.o = tr(cab)(h.o); h.e = tr(cab)(h.e); }
  for (const c of capas) { const cab = CAB.has(c.id); c.svg = trSVG(c.svg, cab); for (const k of c.formasClave || []) k.svg = trSVG(k.svg, cab); }
  return { id: "oveja-libre", nombre: "Oveja (marioneta libre compleja)", tipo: "libre", libre: { huesos: H, capas, clavados: [] }, acciones, opciones: {}, colores: { auto: {} },
    notas: "Generado por editor-personajes/generadores/marioneta-compleja.js (15 nov 2026). 22 huesos: patas de tres tramos (se pueden clavar las pezuñas), mandíbula que se abre con la voz (balar), orejas y cola con física y un dial «pacer» que baja el cuello.",
    piezas: [], variantes: {}, controles: [] };
}

for (const j of [pastor(), oveja()]) {
  const f = path.join(DIR, j.id + ".json");
  fs.writeFileSync(f, JSON.stringify(j, null, 1) + "\n");
  console.log(`${j.id}: ${j.libre.huesos.length} huesos, ${j.libre.capas.length} capas, ${j.libre.capas.reduce((s, c) => s + (c.formasClave || []).length, 0)} formas clave, ${j.libre.huesos.filter((h) => h.fisica).length} con física, ${j.acciones.length} acciones → ${path.relative(process.cwd(), f)}`);
}
