// ANDARES Y GIROS: cómo anda un personaje y cómo gira entre dos claves de su recorrido. Todo editable sin código:
//   · formas de andar: biblioteca común (shorts-flow/andares/*.json → window.ANDARES) además de las de serie de abajo;
//     cada actor elige una (a.andar.estilo) y puede retocarla (a.andar.zancada, …);
//   · giros: cada clave del recorrido decide cómo se gira en el tramo que EMPIEZA en ella (ver giroEn).
// Lo usan comun/escena.js (vídeo y editor) y el panel «Tramo» y el editor de formas de andar de editor-personajes/escenas.
(() => {
  // parámetros de una forma de andar (todos opcionales; 1 = como el andar normal):
  //   zancada (largo del paso), braceo (amplitud de brazos y piernas), cadencia (pasos más rápidos o lentos), bote (salto en cada paso, px),
  //   inclina (cuerpo hacia delante), miraY (mirada abajo +, arriba −), hombros (encogidos −, sueltos +), cara ({ alegre, triste, miedo… }),
  //   arranque y frenada (segundos que tarda en empezar y en dejar de andar), correrDesde (velocidad a la que pasa a correr, 330 por defecto)
  const BASE = {
    normal: { nombre: "Normal" },
    cansado: { nombre: "Cansado", zancada: 0.8, braceo: 0.75, inclina: 0.12, miraY: 0.35, hombros: -4, cara: { triste: 0.35 }, arranque: 0.5, frenada: 0.5 },
    alegre: { nombre: "Alegre", zancada: 1.05, bote: 14, cara: { alegre: 0.5 } },
    prisa: { nombre: "Con prisa", zancada: 1.2, inclina: 0.1, braceo: 1.1, cadencia: 1.15, arranque: 0.15, frenada: 0.2 },
    sigiloso: { nombre: "Sigiloso", zancada: 0.7, braceo: 0.7, inclina: 0.08, hombros: 6, cara: { miedo: 0.25 }, cadencia: 0.85 },
    solemne: { nombre: "Solemne", zancada: 0.85, braceo: 0.5, cadencia: 0.8, miraY: 0.1, arranque: 0.6, frenada: 0.6 },
    decidido: { nombre: "Decidido", zancada: 1.15, braceo: 1.15, inclina: 0.05, hombros: 4, cara: { enfado: 0.2 } },
  };
  const todos = () => Object.assign({}, BASE, window.ANDARES || {});
  // forma de andar efectiva de un actor: la de la biblioteca + los retoques del actor
  function estilo(a) { const an = a?.andar || {}, est = todos()[an.estilo] || BASE.normal; const o = Object.assign({}, est);
    for (const k of ["zancada", "braceo", "cadencia", "bote", "inclina", "arranque", "frenada"]) if (an[k] != null) o[k] = k === "zancada" ? (est.zancada ?? 1) * an[k] : an[k];
    return o; }

  // GIRO en un tramo. La clave A (donde empieza el tramo) puede llevar:
  //   giroModo: "todo" (gira durante todo el tramo, por defecto) | "inicio" (gira al empezar y luego sigue) | "final" (gira al llegar)
  //   giroDur: segundos que dura el giro con «inicio» o «final» (0,5 por defecto)
  //   giroCurva: curva del giro (nombre o [x1, y1, x2, y2]; por defecto, la del tramo)
  //   giroSentido: "corto" (por el lado más corto, por defecto) | "izquierda" | "derecha"
  //   giroCabeza: segundos que la cabeza se adelanta al cuerpo (0,15 por defecto; 0 = todo a la vez)
  //   giroPies: segundos que los pies van por detrás del cuerpo (0,12 por defecto)
  //   giroPasitos: true para que levante los pies al girar parado (por defecto, sí)
  const ord = (l) => [...(l || [])].sort((a, b) => a.t - b.t);
  const suave = (x) => x * x * (3 - 2 * x), cl = (x) => Math.max(0, Math.min(1, x));
  function curvaDe(k, c) { return window.Personajes?.curva ? Personajes.curva(c != null ? { curva: c } : k) : suave; }
  function delta(a, b, sentido) { let d = (b - a) % 360;
    if (sentido === "izquierda") { if (d > 0) d -= 360; } else if (sentido === "derecha") { if (d < 0) d += 360; }
    else { if (d > 180) d -= 360; if (d < -180) d += 360; } return d; }
  // giro (grados) del cuerpo en t; con «adelanto» se mira un poco más adelante en el tiempo (cabeza) o más atrás (pies)
  function giroCuerpo(lista, t) { const ks = ord(lista); if (!ks.length) return 20;
    if (t <= ks[0].t) return ks[0].giro ?? 20; if (t >= ks[ks.length - 1].t) return ks[ks.length - 1].giro ?? 20;
    const i = ks.findIndex((k) => k.t > t), A = ks[i - 1], B = ks[i], g0 = A.giro ?? 20, g1 = B.giro ?? g0;
    if (g0 === g1) return g0;
    const modo = A.giroModo || "todo", dur = Math.max(0.05, Math.min(A.giroDur ?? 0.5, B.t - A.t));
    const w0 = modo === "final" ? B.t - dur : A.t, w1 = modo === "inicio" ? A.t + dur : modo === "final" ? B.t : B.t;
    const u = cl((t - w0) / Math.max(1e-3, w1 - w0)), f = curvaDe(A, A.giroCurva)(u);
    return g0 + delta(g0, g1, A.giroSentido) * f; }
  // todo lo del giro en t: cuerpo, cabeza (se adelanta), pies (se retrasan) y pasitos al girar sin avanzar
  function giroEn(lista, t, quieto) { const ks = ord(lista), i = ks.findIndex((k) => k.t > t), A = i > 0 ? ks[i - 1] : ks[0] || {};
    const g = giroCuerpo(ks, t), lc = A.giroCabeza ?? 0.15, lp = A.giroPies ?? 0.12;
    const cab = giroCuerpo(ks, t + lc), pies = giroCuerpo(ks, t - lp);
    const vel = Math.abs(delta(giroCuerpo(ks, t - 0.05), giroCuerpo(ks, t + 0.05))) / 0.1;      // grados por segundo
    const pasos = quieto && (A.giroPasitos ?? true) ? Math.min(1, vel / 120) : 0;
    return { giro: g, cabeza: delta(g, cab), pies: delta(g, pies), pasos }; }

  // MIRA HACIA DONDE ANDA (a.orientar): en cada tramo en que se desplaza, gira al empezar hacia su rumbo (0 de frente, 90 hacia la
  // derecha, −90 hacia la izquierda, 180 de espaldas) y lo mantiene al pararse; una clave con giroFijo (el usuario le dijo hacia dónde
  // mirar) manda sobre el rumbo
  const rumbo = (dx, dp) => Math.round(Math.atan2(dx, -dp * 500) * 180 / Math.PI);
  function conRumbo(lista) { const ks = ord(lista).map((k) => Object.assign({}, k)); if (!ks.length) return ks; let prev = ks[0].giro ?? 20;
    for (let i = 0; i < ks.length; i++) { const A = ks[i], B = ks[i + 1];
      if (!A.giroFijo) A.giro = prev; else prev = A.giro ?? prev;
      if (!B) break; const dx = (B.x ?? A.x ?? 0) - (A.x ?? 0), dp = (B.p ?? A.p ?? 0) - (A.p ?? 0);
      if (Math.hypot(dx, dp * 500) > 20) { prev = rumbo(dx, dp); if (A.giroModo == null) { A.giroModo = "inicio"; A.giroDur = A.giroDur ?? 0.35; } } }
    return ks; }
  // forma de andar en t: la del actor, o la de la última clave del recorrido que la cambie (k.andar = "cansado"…)
  function estiloEn(a, t) { const k = ord(a?.recorrido).filter((x) => x.t <= t + 1e-6 && x.andar).pop(); return estilo(k ? Object.assign({}, a, { andar: Object.assign({}, a.andar, { estilo: k.andar }) }) : a); }

  window.Andares = { BASE, todos, estilo, estiloEn, giroEn, giroCuerpo, delta, conRumbo, rumbo };
})();
