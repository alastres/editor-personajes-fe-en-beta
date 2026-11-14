// pinceles.js — PINCELES del taller de dibujo (dibujo.js): trazos con presión, como en Procreate o Clip Studio, pero VECTORIALES.
// Cada trazo se guarda como una forma rellena (su contorno), así que se dobla con los huesos, se deforma y se anima como cualquier
// otra forma. La forma guarda «pincel» (el tipo) y, si lo tiene, «textura» (grano de lápiz o pincel seco, un filtro SVG).
//   Pinceles.PRESETS                         los de serie; Pinceles.propios() / guardarPropio(p) los del usuario (en este navegador)
//   Pinceles.contorno(muestras, pincel)      muestras [{ x, y, p, alt, azi, t }] → polígono [{ x, y }] del trazo
//   Pinceles.filtro(tipo) → <filter>…        textura (va en los <defs> del SVG de la pieza)
(() => {
  // tam: grosor máximo · sens: cuánto cambia con la presión (0 = nada) · curva: −1 suave (poco esfuerzo) … +1 dura · estab: estabilizador
  // afinar: puntas afiladas al empezar y al acabar · simular: sin lápiz, la velocidad hace de presión (rápido = fino)
  // caligrafia: el grosor depende de la dirección (pluma de punta plana) · inclinacion: el lápiz inclinado ensancha o gira la punta
  const PRESETS = {
    tinta:      { n: "Tinta", ic: "🖋", tam: 6, sens: 0.85, curva: 0.2, estab: 0.45, afinar: 0.6, opac: 1, simular: true, caligrafia: 0, angulo: 45, inclinacion: false, textura: null, ayuda: "Muy sensible a la presión y con puntas afiladas: para contornos y líneas de expresión" },
    rotulador:  { n: "Rotulador", ic: "🖊", tam: 6, sens: 0.12, curva: 0, estab: 0.35, afinar: 0, opac: 1, simular: false, caligrafia: 0, angulo: 45, inclinacion: false, textura: null, ayuda: "Grosor casi constante y puntas redondas: líneas limpias, letras" },
    lapiz:      { n: "Lápiz", ic: "✏️", tam: 2.6, sens: 0.6, curva: -0.2, estab: 0.25, afinar: 0.35, opac: 0.85, simular: true, caligrafia: 0, angulo: 45, inclinacion: true, textura: "grano", ayuda: "Fino, con grano y un poco transparente. Inclinado, el trazo engorda como un lápiz de verdad" },
    seco:       { n: "Pincel seco", ic: "🖌", tam: 14, sens: 0.7, curva: 0, estab: 0.3, afinar: 0.3, opac: 1, simular: true, caligrafia: 0, angulo: 45, inclinacion: true, textura: "seco", ayuda: "Bordes irregulares y textura de cerdas: pelo, barba, tela, hierba" },
    caligrafia: { n: "Pluma caligráfica", ic: "✒️", tam: 12, sens: 0.45, curva: 0, estab: 0.4, afinar: 0.15, opac: 1, simular: false, caligrafia: 0.85, angulo: 45, inclinacion: true, textura: null, ayuda: "Punta plana: grueso en una dirección y fino en la otra. Con inclinación, la punta gira como el lápiz" },
    relleno:    { n: "Relleno a mano", ic: "🎨", tam: 30, sens: 0.3, curva: -0.3, estab: 0.3, afinar: 0.1, opac: 1, simular: false, caligrafia: 0, angulo: 45, inclinacion: false, textura: null, ayuda: "Pincel ancho para pintar manchas de color, sombras o brillos" },
  };
  const CLAVE = "pinceles-propios";
  const propios = () => { try { return JSON.parse(localStorage.getItem(CLAVE) || "{}"); } catch { return {}; } };
  const guardarPropio = (id, p) => { const t = propios(); if (p) t[id] = p; else delete t[id]; try { localStorage.setItem(CLAVE, JSON.stringify(t)); } catch {} };
  const todos = () => Object.assign({}, PRESETS, propios());
  const cl = (v, a, b) => Math.max(a, Math.min(b, v));

  // muestras → contorno. 1) se reparten a distancia regular (los puntos rápidos del lápiz llegan muy juntos y los del ratón separados)
  // 2) grosor de cada punto: presión con su curva, puntas afinadas, caligrafía e inclinación 3) normales y polígono con extremos redondos
  function contorno(M, pz) {
    if (!M.length) return [];
    const tam = pz.tam, paso = Math.max(0.35, tam * 0.12), R = [M[0]];
    for (let i = 1; i < M.length; i++) { const a = R[R.length - 1], b = M[i], dd = Math.hypot(b.x - a.x, b.y - a.y); if (dd < paso) continue;
      const n = Math.floor(dd / paso); for (let k = 1; k <= n; k++) { const t = k / n; R.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, p: a.p + (b.p - a.p) * t, alt: b.alt, azi: b.azi }); } }
    if (R.length === 1) R.push(Object.assign({}, R[0], { x: R[0].x + 0.01 }));
    // largo acumulado (para afinar las puntas)
    const L = [0]; for (let i = 1; i < R.length; i++) L.push(L[i - 1] + Math.hypot(R[i].x - R[i - 1].x, R[i].y - R[i - 1].y)); const total = L[L.length - 1];
    const lt = Math.min(total * 0.4, tam * 7 * pz.afinar), gamma = Math.pow(2, pz.curva || 0);
    const W = R.map((q, i) => { const pr = Math.pow(cl(q.p ?? 0.5, 0, 1), gamma); let w = tam * (1 - pz.sens + pz.sens * pr);
      if (lt > 0.01) { const a = cl(L[i] / lt, 0, 1), b = cl((total - L[i]) / lt, 0, 1); w *= Math.sin((Math.min(a, b) * Math.PI) / 2) * 0.85 + 0.15; }
      // inclinación (sin caligrafía): el lápiz tumbado pinta más ancho, como la mina de lado
      if (pz.inclinacion && !pz.caligrafia && q.alt != null) w *= 1 + (1 - cl(q.alt / (Math.PI / 2), 0, 1)) * 1.6;
      return Math.max(0.15, w); });
    // grosores suavizados (sin dientes) y caligrafía: según el ángulo del trazo respecto a la punta plana
    const Ws = W.map((w, i) => (W[Math.max(0, i - 1)] + 2 * w + W[Math.min(W.length - 1, i + 1)]) / 4);
    const dir = R.map((q, i) => { const a = R[Math.max(0, i - 1)], b = R[Math.min(R.length - 1, i + 1)]; return Math.atan2(b.y - a.y, b.x - a.x); });
    if (pz.caligrafia) for (let i = 0; i < R.length; i++) { const punta = pz.inclinacion && R[i].azi != null ? R[i].azi : ((pz.angulo ?? 45) * Math.PI) / 180;
      Ws[i] *= 1 - pz.caligrafia + pz.caligrafia * Math.max(0.12, Math.abs(Math.sin(dir[i] - punta))); }
    const izq = [], der = [];
    for (let i = 0; i < R.length; i++) { const nx = -Math.sin(dir[i]), ny = Math.cos(dir[i]), w = Ws[i] / 2; izq.push({ x: R[i].x + nx * w, y: R[i].y + ny * w }); der.push({ x: R[i].x - nx * w, y: R[i].y - ny * w }); }
    // extremos redondos (con puntas afinadas quedan casi en punta): el del final va de izq a der por delante; el del principio, de der a izq por detrás
    const n = R.length - 1, finOk = []; for (let k = 1; k < 6; k++) { const a = dir[n] + Math.PI / 2 - (Math.PI * k) / 6; finOk.push({ x: R[n].x + Math.cos(a) * (Ws[n] / 2), y: R[n].y + Math.sin(a) * (Ws[n] / 2) }); }
    const iniOk = []; for (let k = 1; k < 6; k++) { const a = dir[0] - Math.PI / 2 - (Math.PI * k) / 6; iniOk.push({ x: R[0].x + Math.cos(a) * (Ws[0] / 2), y: R[0].y + Math.sin(a) * (Ws[0] / 2) }); }
    return [...izq, ...finOk, ...der.reverse(), ...iniOk];
  }

  // TEXTURAS (filtros SVG, también en el vídeo): «grano» = papel con grano, el trazo queda moteado; «seco» = bordes rotos y vetas de cerdas
  const FILTROS = {
    grano: `<filter id="tx-grano" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="7" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.7 1.65" result="m"/><feComposite in="SourceGraphic" in2="m" operator="in"/></filter>`,
    seco: `<filter id="tx-seco" x="-15%" y="-15%" width="130%" height="130%"><feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves="2" seed="3" result="t"/><feDisplacementMap in="SourceGraphic" in2="t" scale="5" xChannelSelector="R" yChannelSelector="G" result="d"/><feTurbulence type="fractalNoise" baseFrequency="0.03 0.35" numOctaves="2" seed="11" result="v"/><feColorMatrix in="v" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2 1.85" result="vm"/><feComposite in="d" in2="vm" operator="in"/></filter>`,
  };
  const filtro = (tipo) => FILTROS[tipo] || "";

  window.Pinceles = { PRESETS, propios, guardarPropio, todos, contorno, filtro };
})();
