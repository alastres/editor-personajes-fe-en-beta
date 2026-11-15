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
    // BROCHAS DE DIBUJO A MANO (como las de Moho): el trazo sigue siendo una forma vectorial y la brocha es su textura (un filtro SVG
    // con semilla fija: no «hierve» de un fotograma a otro). La textura se cambia después en cualquier forma, sin rehacer el dibujo.
    grafito:    { n: "Grafito", ic: "✎", tam: 2.2, sens: 0.7, curva: -0.1, estab: 0.25, afinar: 0.4, opac: 0.9, simular: true, caligrafia: 0, angulo: 45, inclinacion: true, textura: "grafito", ayuda: "Lápiz de grafito: grano fino de papel y borde un poco irregular; apretar engorda la línea" },
    color:      { n: "Lápiz de color", ic: "🖍", tam: 4, sens: 0.5, curva: 0, estab: 0.25, afinar: 0.3, opac: 0.9, simular: true, caligrafia: 0, angulo: 45, inclinacion: true, textura: "color", ayuda: "Más ancho y con huecos del papel: para colorear y sombrear a rayas" },
    carbon:     { n: "Carboncillo", ic: "◼", tam: 9, sens: 0.6, curva: -0.2, estab: 0.2, afinar: 0.25, opac: 0.95, simular: true, caligrafia: 0, angulo: 45, inclinacion: true, textura: "carbon", ayuda: "Trazo grueso, granuloso y difuminado en los bordes: bocetos, sombras dramáticas" },
    tiza:       { n: "Tiza y pastel", ic: "▭", tam: 10, sens: 0.4, curva: 0, estab: 0.2, afinar: 0.2, opac: 1, simular: true, caligrafia: 0, angulo: 45, inclinacion: true, textura: "tiza", ayuda: "Polvo de tiza: muy roto, se ve el papel por dentro y el borde se deshace" },
    cera:       { n: "Cera", ic: "🖍", tam: 8, sens: 0.35, curva: 0, estab: 0.2, afinar: 0.15, opac: 1, simular: true, caligrafia: 0, angulo: 45, inclinacion: false, textura: "cera", ayuda: "Ceras de colores: vetas a lo largo del trazo y borde gordo, infantil" },
    plumilla:   { n: "Plumilla", ic: "✒", tam: 4, sens: 0.95, curva: 0.4, estab: 0.4, afinar: 0.7, opac: 1, simular: true, caligrafia: 0.25, angulo: 30, inclinacion: false, textura: "plumilla", ayuda: "Tinta con plumilla: muy sensible a la presión y a la velocidad, con el borde vivo de la tinta" },
    acuarela:   { n: "Acuarela", ic: "💧", tam: 22, sens: 0.4, curva: -0.3, estab: 0.35, afinar: 0.2, opac: 1, simular: false, caligrafia: 0, angulo: 45, inclinacion: false, textura: "acuarela", ayuda: "Transparente, con el borde más oscuro donde se seca el agua y el contorno corrido" },
    aero:       { n: "Aerógrafo", ic: "☁", tam: 26, sens: 0.3, curva: -0.4, estab: 0.4, afinar: 0.3, opac: 0.6, simular: false, caligrafia: 0, angulo: 45, inclinacion: false, textura: "aero", ayuda: "Mancha suave sin borde: sombras, brillos y luces" },
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

  // TEXTURAS (filtros SVG, también en el vídeo). Cada una admite ajustes { e: escala del grano, b: borde irregular, s: semilla }; con los
  // de serie el id es «tx-<tipo>» (como antes), con otros, «tx-<tipo>-<ajustes>».
  const TEXTURAS = [["", "Sin textura (liso)"], ["grano", "Grano de papel"], ["grafito", "Grafito"], ["color", "Lápiz de color"], ["carbon", "Carboncillo"], ["tiza", "Tiza y pastel"],
    ["cera", "Cera"], ["seco", "Pincel seco"], ["plumilla", "Plumilla (borde de tinta)"], ["acuarela", "Acuarela"], ["aero", "Aerógrafo (difuminado)"], ["trama", "Trama a lápiz (diagonal)"], ["trama2", "Trama cruzada"]];
  const NOMBRES_TX = Object.fromEntries(TEXTURAS);
  const f3 = (v) => +(+v).toFixed(3);
  // alfa del grano: «corte» negativo = más huecos de papel
  const grano = (id, fr, oct, corte, base, seed, extra = "") => `<feTurbulence type="fractalNoise" baseFrequency="${fr}" numOctaves="${oct}" seed="${seed}" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 ${corte} ${base}" result="m"/>${extra}`;
  const borde = (fr, sc, seed, inp = "SourceGraphic", out = "d") => (sc > 0.01 ? `<feTurbulence type="fractalNoise" baseFrequency="${fr}" numOctaves="2" seed="${seed + 101}" result="bt"/><feDisplacementMap in="${inp}" in2="bt" scale="${f3(sc)}" xChannelSelector="R" yChannelSelector="G" result="${out}"/>` : `<feOffset in="${inp}" dx="0" dy="0" result="${out}"/>`);
  const GEN = {
    grano: (e, b, s) => grano(0, f3(1.1 / e), 2, -1.7, 1.65, s) + borde(0.3 / e, 1.2 * b, s) + `<feComposite in="d" in2="m" operator="in"/>`,
    grafito: (e, b, s) => grano(0, f3(1.5 / e), 3, -1.5, 1.55, s) + borde(f3(0.35 / e), 1.6 * b, s) + `<feComposite in="d" in2="m" operator="in"/>`,
    color: (e, b, s) => grano(0, f3(0.8 / e), 3, -2.4, 2.05, s) + borde(f3(0.3 / e), 2 * b, s) + `<feComposite in="d" in2="m" operator="in"/>`,
    carbon: (e, b, s) => grano(0, f3(0.38 / e), 3, -2.2, 2.1, s) + borde(f3(0.12 / e), 4 * b, s) + `<feGaussianBlur in="d" stdDeviation="${f3(0.7 * b + 0.3)}" result="db"/><feComposite in="db" in2="m" operator="in"/>`,
    tiza: (e, b, s) => grano(0, f3(0.55 / e), 4, -3.2, 2.4, s) + borde(f3(0.2 / e), 5 * b, s) + `<feComposite in="d" in2="m" operator="in"/>`,
    cera: (e, b, s) => grano(0, `${f3(0.06 / e)} ${f3(0.9 / e)}`, 2, -2.6, 2.3, s) + borde(f3(0.15 / e), 3 * b, s) + `<feComposite in="d" in2="m" operator="in"/>`,
    seco: (e, b, s) => `<feTurbulence type="fractalNoise" baseFrequency="${f3(0.09 / e)}" numOctaves="2" seed="${s}" result="t"/><feDisplacementMap in="SourceGraphic" in2="t" scale="${f3(5 * b)}" xChannelSelector="R" yChannelSelector="G" result="d"/><feTurbulence type="fractalNoise" baseFrequency="${f3(0.03 / e)} ${f3(0.35 / e)}" numOctaves="2" seed="${s + 4}" result="v"/><feColorMatrix in="v" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2 1.85" result="vm"/><feComposite in="d" in2="vm" operator="in"/>`,
    plumilla: (e, b, s) => borde(f3(0.45 / e), 1.4 * b, s, "SourceGraphic", "d") + `<feComposite in="d" in2="d" operator="over"/>`,
    acuarela: (e, b, s) => borde(f3(0.035 / e), 7 * b, s) + `<feMorphology in="d" operator="erode" radius="${f3(1.6 * e)}" result="er"/><feComposite in="d" in2="er" operator="out" result="anillo"/>`
      + `<feComponentTransfer in="d" result="cuerpo"><feFuncA type="linear" slope="0.42"/></feComponentTransfer>` + grano(0, f3(0.7 / e), 3, -0.9, 1.25, s)
      + `<feComposite in="cuerpo" in2="m" operator="in" result="c2"/><feComponentTransfer in="anillo" result="a2"><feFuncA type="linear" slope="0.55"/></feComponentTransfer><feMerge><feMergeNode in="c2"/><feMergeNode in="a2"/></feMerge>`,
    aero: (e, b, s) => `<feGaussianBlur in="SourceGraphic" stdDeviation="${f3(2.2 * e + 1.5 * b)}"/>`,
  };
  const REGION = { carbon: 20, tiza: 20, acuarela: 25, aero: 60, seco: 15 };
  // ajustes de serie de cada textura (el borde y la semilla con que se diseñó)
  const SERIE = { e: 1, b: 1, s: 7 };
  const firma = (op) => { const o = Object.assign({}, SERIE, op || {}); return o.e === SERIE.e && o.b === SERIE.b && o.s === SERIE.s ? "" : `-${Math.round(o.e * 100)}-${Math.round(o.b * 100)}-${o.s}`; };
  const idFiltro = (tipo, op) => (tipo ? "tx-" + tipo + firma(op) : "");
  // TEXTURAS PROPIAS: un PNG en escala de grises (oscuro = pintura, claro = papel; al importarlo se invierte para la máscara) que se repite por la forma; se guarda en este navegador
  // y va dentro del SVG de la pieza (sale igual en el vídeo)
  const CLAVE_TX = "texturas-propias";
  const texturasPropias = () => { try { return JSON.parse(localStorage.getItem(CLAVE_TX) || "{}"); } catch { return {}; } };
  const guardarTextura = (id, t) => { const x = texturasPropias(); if (t) x[id] = t; else delete x[id]; try { localStorage.setItem(CLAVE_TX, JSON.stringify(x)); } catch {} };
  // TRAMAS y TEXTURAS PROPIAS: van como máscara con un patrón que se repite por todo el plano (blanco = se ve), no como filtro
  const esMascara = (tipo) => tipo === "trama" || tipo === "trama2" || !!(tipo && tipo.startsWith("img-"));
  function mascaraDe(tipo, o, id) { const caja = `maskUnits="userSpaceOnUse" x="-4000" y="-4000" width="8000" height="8000"`, mov = `patternTransform="translate(${o.s % 7} ${(o.s * 3) % 7})"`;
    if (tipo.startsWith("img-")) { const t = texturasPropias()[tipo]; if (!t) return ""; const w = f3(t.tam * o.e);
      return `<pattern id="${id}-p" patternUnits="userSpaceOnUse" width="${w}" height="${w}" ${mov}><image href="${t.src}" width="${w}" height="${w}" preserveAspectRatio="none"/></pattern><mask id="${id}" ${caja}><rect x="-4000" y="-4000" width="8000" height="8000" fill="url(#${id}-p)"/></mask>`; }
    const t = f3(6 * o.e), lw = f3(Math.max(0.4, 6 * o.e * 0.16 * o.b)), l = (x1, y1, x2, y2) => `<line x1="${f3(x1)}" y1="${f3(y1)}" x2="${f3(x2)}" y2="${f3(y2)}" stroke="#fff" stroke-width="${lw}"/>`;
    const lineas = l(0, t, t, 0) + l(-t / 2, t / 2, t / 2, -t / 2) + l(t / 2, t * 1.5, t * 1.5, t / 2) + (tipo === "trama2" ? l(0, 0, t, t) + l(-t / 2, t / 2, t / 2, t * 1.5) + l(t / 2, -t / 2, t * 1.5, t / 2) : "");
    return `<pattern id="${id}-p" patternUnits="userSpaceOnUse" width="${t}" height="${t}" ${mov}>${lineas}</pattern><mask id="${id}" ${caja}><rect x="-4000" y="-4000" width="8000" height="8000" fill="url(#${id}-p)"/></mask>`; }
  function filtroDe(tipo, op) { const o = Object.assign({}, SERIE, op || {}), id = idFiltro(tipo, op);
    if (esMascara(tipo)) return mascaraDe(tipo, o, id);
    const g = GEN[tipo]; if (!g) return ""; const r = REGION[tipo] || 10;
    return `<filter id="${id}" x="-${r}%" y="-${r}%" width="${100 + 2 * r}%" height="${100 + 2 * r}%" color-interpolation-filters="sRGB">${g(o.e, o.b, o.s)}</filter>`; }
  const FILTROS = {
    grano: `<filter id="tx-grano" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="7" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.7 1.65" result="m"/><feComposite in="SourceGraphic" in2="m" operator="in"/></filter>`,
    seco: `<filter id="tx-seco" x="-15%" y="-15%" width="130%" height="130%"><feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves="2" seed="3" result="t"/><feDisplacementMap in="SourceGraphic" in2="t" scale="5" xChannelSelector="R" yChannelSelector="G" result="d"/><feTurbulence type="fractalNoise" baseFrequency="0.03 0.35" numOctaves="2" seed="11" result="v"/><feColorMatrix in="v" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2 1.85" result="vm"/><feComposite in="d" in2="vm" operator="in"/></filter>`,
  };
  // las formas guardadas antes de las brochas («grano», «seco» con su filtro de siempre) se siguen viendo igual
  const filtro = (tipo, op) => (!firma(op) && FILTROS[tipo] ? FILTROS[tipo] : filtroDe(tipo, op));
  // el atributo que pone la textura en la forma (filtro o máscara)
  const atributo = (tipo, op) => (tipo ? (esMascara(tipo) ? ` mask="url(#${idFiltro(tipo, op)})"` : ` filter="url(#${idFiltro(tipo, op)})"`) : "");
  const texturas = () => TEXTURAS.concat(Object.entries(texturasPropias()).map(([id, t]) => [id, "⭐ " + t.n]));

  window.Pinceles = { PRESETS, propios, guardarPropio, todos, contorno, filtro, idFiltro, atributo, texturas, NOMBRES_TX, texturasPropias, guardarTextura, SERIE };
})();
