// Motor de ESCENAS (editor de personajes, fase 4): varios personajes en un fondo, con recorridos, acciones y cámara.
// Lo usan el editor (escenas.html) y la composición exportada a HyperFrames, así que lo que se ve en el editor es lo que sale en el vídeo.
//   const esc = Escena.crear(svg, ESCENA, PERSONAJES);  esc.dibujar(t);
// Formato (Videos/shorts-flow/escenas/<id>.json):
// { id, nombre, duracion, fondo: { tipo: "noche"|"alba"|"dia"|"interior"|"color", color },
//   camara: [{ t, x, y, zoom }],                                   // claves de cámara (centro del encuadre en el mundo y zoom)
//   actores: [{ id, personaje, escala,
//     recorrido: [{ t, x, p, giro }],                               // x en el mundo, p = profundidad (0 delante … 1 al fondo), giro en grados
//     bloques: [{ t, accion, dur, controles }] }],                  // acciones del personaje (por id o nombre) que empiezan en t
//   textos: [{ t, dur, texto }] }                                   // rótulos sencillos
// Mundo: el suelo está en y = 0; un adulto mide ~600. El encuadre es 1080 × 1920 (vertical).
(function () {
  const NS = "http://www.w3.org/2000/svg", ANCHO = 1080, ALTO = 1920;
  const el = (tag, at = {}, padre) => { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); if (padre) padre.appendChild(e); return e; };
  const mixc = (a, b, k) => { const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); const A = p(a), B = p(b); return "#" + A.map((x, i) => Math.round(x + (B[i] - x) * k).toString(16).padStart(2, "0")).join(""); };
  const cl = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x)), lerp = (a, b, k) => a + (b - a) * k, suave = (x) => x * x * (3 - 2 * x), f1 = (x) => x.toFixed(1);
  // interpolación de claves ordenadas por t (suavizada); devuelve el objeto mezclado campo a campo
  function claves(lista, t, campos) {
    const ks = [...(lista || [])].sort((a, b) => a.t - b.t); if (!ks.length) return null;
    if (t <= ks[0].t) return Object.assign({}, ks[0]); if (t >= ks[ks.length - 1].t) return Object.assign({}, ks[ks.length - 1]);
    const i = ks.findIndex((k) => k.t > t), a = ks[i - 1], b = ks[i], fx = (window.Personajes?.curva ? Personajes.curva(a) : suave), k = fx((t - a.t) / (b.t - a.t)), o = Object.assign({}, a);
    for (const c of campos) o[c] = lerp(a[c] ?? 0, b[c] ?? a[c] ?? 0, k); return o; }
  // distancia recorrida hasta t (para que los pies avancen al ritmo del desplazamiento)
  function recorrido(lista, t) { let d = 0, prev = null; const paso = 1 / 60;
    for (let u = 0; u <= t + 1e-6; u += paso) { const q = claves(lista, u, ["x", "p"]); if (prev) d += Math.hypot(q.x - prev.x, (q.p - prev.p) * 500); prev = q; }
    return d; }

  // ---- fondos (siluetas planas por capas, como los del short ¿Y si…?)
  const FONDOS = {
    noche: { cielo: ["#141a34", "#2c3658", "#4a5476"], montes: ["#4a4b66", "#3a3b55", "#2e2e46"], suelo: ["#2a2a3c", "#3a3a50"], astro: { c: "#d8dcee", r: 60, x: 300, y: -1300, halo: "#8a90c0" }, estrellas: true },
    alba: { cielo: ["#3a3a6a", "#c08a92", "#ffd6a0"], montes: ["#c08a92", "#9a6a7e", "#7a5068"], suelo: ["#9a7a6a", "#b0906a"], astro: { c: "#fff1c8", r: 110, x: 330, y: -560, halo: "#ffc890" } },   // el sol a un lado: centrado detrás de la cabeza parecía una aureola
    dia: { cielo: ["#4a8ac8", "#8ac0e0", "#d8eef0"], montes: ["#8ab0b8", "#6a9aa0", "#5a8088"], suelo: ["#c8b080", "#d8c090"], astro: { c: "#fff8d8", r: 80, x: -320, y: -1300, halo: "#ffe8a0" } },
    interior: { pared: ["#3a2a30", "#44323a"], suelo: ["#241a20", "#4a3438"], lampara: true },
    atardecer: { cielo: ["#2a2050", "#a04a6a", "#f0905a"], montes: ["#8a4a6a", "#6a3a5a", "#4a2a48"], suelo: ["#5a3a40", "#7a5048"], astro: { c: "#ffd08a", r: 120, x: 380, y: -230, halo: "#ff9a6a" } },   // sol poniéndose junto al horizonte, lejos de las cabezas
    luna: { cielo: ["#0e1230", "#222c50", "#3a4470"], montes: ["#3e405a", "#30324a", "#26283c"], suelo: ["#22222e", "#30303e"], astro: { c: "#eef0ff", r: 120, x: 300, y: -1250, halo: "#9aa0d8" }, estrellas: true, nubes: 0.45 },
    tormenta: { cielo: ["#14141e", "#262836", "#3e4050"], montes: ["#34364a", "#2a2c3c", "#202230"], suelo: ["#24242a", "#34343c"], nubes: 1, lluvia: 1, rayos: true },
    mar: { cielo: ["#4a7ab8", "#9ac0dc", "#e8f0ec"], montes: ["#9ab4c4", "#88a4b6", "#7894a8"], lejosAlto: 0.45, suelo: ["#c8b080", "#d8c090"], astro: { c: "#fff8d8", r: 80, x: -320, y: -1300, halo: "#ffe8a0" }, mar: true, nubes: 0.3 },
    desierto: { cielo: ["#d8905a", "#f0c890", "#fbe8c0"], montes: ["#d8a070", "#c08860", "#a87050"], suelo: ["#d8b078", "#e8c890"], astro: { c: "#fff4d0", r: 95, x: 280, y: -1100, halo: "#ffd890" } },
  };
  // fondo de una escena = preset + lo que la escena cambie (colores, astro, nubes, lluvia, mar, lo de lejos, capas dibujadas, imagen)
  const fondoDe = (f) => { const tipo = f?.tipo || "noche", F = Object.assign({}, FONDOS[tipo] || FONDOS.noche, f || {}); F.tipo = tipo;
    if (f?.astro === false) F.astro = null; else if (f?.astro && typeof f.astro === "object") F.astro = Object.assign({}, (FONDOS[tipo] || {}).astro || { c: "#fff8d8", r: 80, x: 0, y: -1200, halo: "#ffe8a0" }, f.astro);
    return F; };
  // siluetas de lejos (como en «¿Y si…?»): ciudad antigua, Roma con templos, olivar
  function lejos(g, tipo, c, camX, par) { const dx = camX * par; let o = "";
    if (tipo === "ciudad") { for (let k = -16; k < 16; k++) { const r = Math.abs(Math.sin(k * 12.9898) * 43758.5453) % 1, w = 140 + 90 * r, hh = 110 + 170 * ((r * 7) % 1), x = k * 200 + dx;
        o += `<rect x="${f1(x)}" y="${f1(-hh)}" width="${f1(w)}" height="${f1(hh + 10)}" fill="${k % 2 ? c[0] : c[1]}"/>`; if (r > 0.6) o += `<path d="M${f1(x + w / 2 - 50)} ${f1(-hh)} A 50 50 0 0 1 ${f1(x + w / 2 + 50)} ${f1(-hh)} Z" fill="${c[1]}"/>`;
        for (let j = 0; j < 2; j++) o += `<rect x="${f1(x + 24 + j * 60)}" y="${f1(-hh + 30)}" width="22" height="30" rx="4" fill="${c[2]}" opacity="0.8"/>`; } }
    else if (tipo === "roma") { const col = (x, n, hh) => { let s2 = `<path d="M${x - 30} ${-hh} L ${x + n * 70 - 40} ${-hh} L ${x + n * 35 - 35} ${-hh - 90} Z" fill="${c[0]}"/><rect x="${x - 34}" y="${-hh}" width="${n * 70}" height="24" fill="${c[0]}"/>`;
        for (let i = 0; i < n; i++) s2 += `<rect x="${x + i * 70 - 14}" y="${-hh + 20}" width="28" height="${hh - 20}" fill="${c[0]}"/>`; return s2; };
      o += col(-1300 + dx, 6, 300) + col(260 + dx, 5, 260);
      for (let k = 0; k < 4; k++) o += `<path d="M${-500 + k * 130 + dx} 0 L ${-500 + k * 130 + dx} -180 A 50 50 0 0 1 ${-400 + k * 130 + dx} -180 L ${-400 + k * 130 + dx} 0 Z" fill="${c[1]}"/>`;
      [-760, 900, 1100, -1700].forEach((x) => (o += `<path d="M${x + dx} 0 C ${x - 40 + dx} -120 ${x - 20 + dx} -280 ${x + dx} -330 C ${x + 20 + dx} -280 ${x + 40 + dx} -120 ${x + dx} 0 Z" fill="${c[2]}"/>`)); }
    else if (tipo === "olivar") { for (let k = -14; k < 14; k++) { const x = k * 260 + dx + (k % 2) * 60, s2 = 0.35 + 0.1 * (k % 3);
        o += `<g transform="translate(${f1(x)} 0) scale(${s2})"><path d="M-14 0 L -8 -240 L 12 -240 L 16 0 Z" fill="${c[2]}"/><ellipse cx="-60" cy="-280" rx="120" ry="70" fill="${c[1]}"/><ellipse cx="60" cy="-300" rx="110" ry="64" fill="${c[0]}"/><ellipse cx="0" cy="-350" rx="120" ry="70" fill="${c[1]}"/></g>`; } }
    g.insertAdjacentHTML("beforeend", o); }
  function pintarFondo(g, f, camX) {
    g.replaceChildren(); const tipo = f?.tipo || "noche";
    if (tipo === "color") { el("rect", { x: -9000, y: -9000, width: 18000, height: 18000, fill: f.color || "#2a2540" }, g); return; }
    const F = fondoDe(f);
    if (tipo === "interior") { pintarInterior(g, F); return; }
    if (F.imagen?.archivo && F.imagen.cubre) { imagenFondo(g, F.imagen, camX); capasFondo(g, F.capas, camX); g.vivoCielo = el("g", {}, g); g.vivoSuelo = el("g", {}, g); return; }
    // cielo en degradado (muy grande para que la cámara nunca vea el borde)
    const id = "esc-cielo-" + F.cielo.join("").replace(/#/g, ""); let def = g.ownerSVGElement.querySelector("#" + id);
    if (!def) { const defs = g.ownerSVGElement.querySelector("defs") || el("defs", {}, g.ownerSVGElement); def = el("linearGradient", { id, x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
      F.cielo.forEach((c, i) => el("stop", { offset: i / (F.cielo.length - 1), "stop-color": c }, def)); }
    el("rect", { x: -9000, y: -3200, width: 18000, height: 3300, fill: `url(#${id})` }, g);
    if (F.astro) { const a = F.astro, ax = a.x + camX * 0.9; const idH = "esc-halo-" + a.halo.slice(1); if (!g.ownerSVGElement.querySelector("#" + idH)) { const gr = el("radialGradient", { id: idH }, g.ownerSVGElement.querySelector("defs"));
        el("stop", { offset: 0, "stop-color": a.halo, "stop-opacity": 0.55 }, gr); el("stop", { offset: 0.35, "stop-color": a.halo, "stop-opacity": 0.22 }, gr); el("stop", { offset: 1, "stop-color": a.halo, "stop-opacity": 0 }, gr); }
      el("circle", { cx: f1(ax), cy: a.y, r: a.r * 5, fill: `url(#${idH})` }, g); el("circle", { cx: f1(ax), cy: a.y, r: a.r, fill: a.c }, g); }
    if (F.estrellas) for (let i = 0; i < 60; i++) el("circle", { cx: f1(-1800 + ((i * 397) % 3600) + camX * 0.95), cy: -2400 + (i * 211) % 1700, r: 2 + (i % 3), fill: "#e8e8ff", opacity: 0.6 }, g);
    g.vivoCielo = el("g", {}, g);                      // nubes (se dibujan cada fotograma)
    if (F.imagen?.archivo) imagenFondo(g, F.imagen, camX);
    // lo de lejos: tres cordilleras con parallax (las lejanas se mueven menos con la cámara), o una ciudad, Roma, un olivar… o nada
    const lj = F.lejos || "montes";
    if (lj !== "montes" && lj !== "nada") { const c = F.montes; lejos(g, lj, [mixc(c[0], c[1], 0.3), c[1], mixc(c[2], "#000000", 0.15)], camX, 0.5); }
    if (lj === "montes") F.montes.forEach((c, i) => { const par = [0.75, 0.5, 0.25][i], alto = [300, 200, 110][i] * (F.lejosAlto ?? 1), hz = -6 + i * 4; let d = `M-6000 ${hz}`;
      for (let x = -6000; x <= 6000; x += 300) { const r = Math.abs(Math.sin(x * 0.013 + i * 7.1)), r2 = Math.abs(Math.sin(x * 0.007 + i * 3.3)); d += ` Q ${x + 150 + camX * par} ${f1(hz - alto * (0.55 + 0.45 * r) * 1.15)} ${x + 300 + camX * par} ${f1(hz - alto * (0.3 + 0.3 * r2))}`; }
      el("path", { d: d + ` L 6000 ${hz} Z`, fill: c }, g); });
    if (F.mar) { pintarMar(g, F); capasFondo(g, F.capas, camX); g.vivoSuelo = el("g", {}, g); return; }
    // suelo: degradado (más oscuro y saturado delante), textura de cápsulas, piedras y matas que crecen con la cercanía
    const idS = "esc-suelo-" + F.suelo.join("").replace(/#/g, ""); if (!g.ownerSVGElement.querySelector("#" + idS)) { const defs = g.ownerSVGElement.querySelector("defs"); const gr = el("linearGradient", { id: idS, x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
      el("stop", { offset: 0, "stop-color": F.suelo[1] }, gr); el("stop", { offset: 0.35, "stop-color": F.suelo[0] }, gr); el("stop", { offset: 1, "stop-color": mixc(F.suelo[0], "#140c1c", 0.45) }, gr); }
    el("rect", { x: -9000, y: -4, width: 18000, height: 1600, fill: `url(#${idS})` }, g); el("rect", { x: -9000, y: 1590, width: 18000, height: 6000, fill: mixc(F.suelo[0], "#140c1c", 0.45) }, g);
    el("rect", { x: -9000, y: -6, width: 18000, height: 14, fill: F.suelo[1], opacity: 0.8 }, g);
    const tex = mixc(F.suelo[0], F.suelo[1], 0.6), piedra = mixc(F.suelo[0], "#140c1c", 0.35), luzP = mixc(F.suelo[1], "#ffffff", 0.25), mata = mixc(F.montes?.[2] || "#3a3952", "#2a4a2a", 0.35);
    let sem = 7; const rnd = () => ((sem = (sem * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 170; i++) { const z = rnd(), y = 14 + z * z * 700, k = 0.5 + 2.4 * z * z, x = -2200 + rnd() * 4400;
      if (i % 5 === 0) { el("ellipse", { cx: f1(x), cy: f1(y), rx: f1(16 * k), ry: f1(6 * k), fill: piedra }, g); el("ellipse", { cx: f1(x - 3 * k), cy: f1(y - 3 * k), rx: f1(10 * k), ry: f1(3 * k), fill: luzP, opacity: 0.7 }, g); }
      else if (i % 7 === 0) el("path", { d: `M${f1(x - 10 * k)} ${f1(y)} Q ${f1(x - 16 * k)} ${f1(y - 26 * k)} ${f1(x - 6 * k)} ${f1(y - 34 * k)} M${f1(x)} ${f1(y)} Q ${f1(x)} ${f1(y - 30 * k)} ${f1(x + 6 * k)} ${f1(y - 40 * k)} M${f1(x + 8 * k)} ${f1(y)} Q ${f1(x + 14 * k)} ${f1(y - 24 * k)} ${f1(x + 20 * k)} ${f1(y - 28 * k)}`, stroke: mata, "stroke-width": f1(5 * k), fill: "none", "stroke-linecap": "round" }, g);
      else el("rect", { x: f1(x - 40 * k), y: f1(y), width: f1(80 * k), height: f1(7 * k), rx: f1(3.5 * k), fill: tex, opacity: 0.55 }, g); }
    capasFondo(g, F.capas, camX); g.vivoSuelo = el("g", {}, g);
  }
  function pintarInterior(g, F) {   // muro de adobe, viga, ventana alta con luz y lámpara de aceite (la llama se mueve en lo vivo)
    el("rect", { x: -9000, y: -6000, width: 18000, height: 6000, fill: F.pared[0] }, g);
    for (let i = 0; i < 40; i++) el("rect", { x: -2600 + (i * 397) % 5200, y: -1300 + (i * 211) % 1200, width: 90, height: 22, rx: 11, fill: F.pared[1], opacity: 0.8 }, g);
    el("rect", { x: -9000, y: -640, width: 18000, height: 30, fill: "#4a3438" }, g); el("rect", { x: -9000, y: -612, width: 18000, height: 10, fill: "#2a1e24" }, g);
    if (F.ventana !== false) { el("rect", { x: -620, y: -830, width: 170, height: 120, rx: 10, fill: "#141020" }, g); el("rect", { x: -610, y: -820, width: 150, height: 100, rx: 8, fill: F.estrellas || F.noche ? "#3a4a78" : "#9ab8d8", opacity: 0.7 }, g);
      el("path", { d: "M-610 -720 L -460 -720 L 60 -6 L -360 -6 Z", fill: "#c8d8f0", opacity: 0.07 }, g); }
    el("rect", { x: -9000, y: -6, width: 18000, height: 6000, fill: F.suelo[0] }, g); el("rect", { x: -9000, y: -10, width: 18000, height: 12, fill: F.suelo[1] }, g);
    capasFondo(g, F.capas, 0); g.vivoCielo = el("g", {}, g); g.vivoSuelo = el("g", {}, g); }
  // mar en perspectiva (base fija; las olas van en lo vivo)
  function pintarMar(g, F) { const c = F.colorMar || ["#2c4a6a", "#4a6e90", "#7a9ab8"];
    el("rect", { x: -9000, y: -4, width: 18000, height: 9000, fill: c[0] }, g); el("rect", { x: -9000, y: -4, width: 18000, height: 40, fill: c[2], opacity: 0.45 }, g); }
  // imagen importada (PNG/JPG en shorts-flow): de fondo, detrás de lo de lejos, o cubriéndolo todo (cubre)
  function imagenFondo(g, im, camX) { const ruta = (window.RUTA_ARCHIVOS ?? "/audio/") + im.archivo, par = im.par ?? 0.85, w = im.ancho || 3000, hh = im.alto || w * 0.75;
    el("image", { href: ruta, x: f1(-w / 2 + camX * par + (im.x || 0)), y: f1((im.y ?? 0) - hh), width: f1(w), height: f1(hh), preserveAspectRatio: "xMidYMax slice", opacity: im.opacidad ?? 1 }, g); }
  // capas dibujadas en el taller: { svg, par (0 se mueve con el mundo … 1 se queda con la cámara), x, y, escala }
  function capasFondo(g, capas, camX) { for (const c of capas || []) { if (!c.svg || c.oculta) continue;
    const gc = el("g", { transform: `translate(${f1((c.x || 0) + camX * (c.par || 0))} ${f1(c.y || 0)}) scale(${c.escala || 1})` }, g); gc.insertAdjacentHTML("beforeend", c.svg); } }
  // lo vivo del fondo, cada fotograma: nubes que derivan, olas del mar, llama de la lámpara; lluvia y relámpagos van delante (gDelante)
  function vivo(g, gDelante, f, t, camX, zoom) { const F = fondoDe(f); gDelante.replaceChildren();
    if (g.vivoCielo) { g.vivoCielo.replaceChildren(); const n = F.nubes || 0;
      if (n > 0) { const cN = F.colorNubes || mixc(F.cielo?.[1] || "#8090b0", "#ffffff", F.tipo === "tormenta" ? 0.05 : 0.35), cS = mixc(cN, "#1a1428", 0.3);
        for (let i = 0; i < Math.round(4 + 8 * n); i++) { const y = -1500 + (i * 173) % 900, w = 300 + (i * 97) % 300, x = ((i * 611 + t * (14 + (i % 3) * 8)) % 5200 + 5200) % 5200 - 2600 + camX * 0.9;
          const gN = el("g", { transform: `translate(${f1(x)} ${y})`, opacity: (0.55 + 0.4 * n).toFixed(2) }, g.vivoCielo);
          el("ellipse", { cx: 0, cy: 0, rx: f1(w / 2), ry: f1(w / 6), fill: cS }, gN); el("ellipse", { cx: f1(-w / 6), cy: f1(-w / 10), rx: f1(w / 4), ry: f1(w / 7), fill: cN }, gN); el("ellipse", { cx: f1(w / 8), cy: f1(-w / 8), rx: f1(w / 5), ry: f1(w / 6.5), fill: cN }, gN);
          el("rect", { x: f1(-w / 4), y: f1(-w / 7), width: f1(w / 4), height: 10, rx: 5, fill: "#ffffff", opacity: 0.18 }, gN); } } }
    if (g.vivoSuelo) { g.vivoSuelo.replaceChildren();
      if (F.mar) { const c = F.colorMar || ["#2c4a6a", "#4a6e90", "#7a9ab8"], ola = F.oleaje ?? (F.tipo === "tormenta" ? 2 : 1), N = 14;
        for (let n = N - 1; n >= 0; n--) { const z = ((n + t * 0.11 * N) % N) / N, zz = z * z, y = 10 + zz * 1500, A = (4 + 40 * zz) * ola, L = 120 + 520 * zz, fase = n * 1.7, op = cl(z * 6) * cl((1 - z) * 8);
          if (op <= 0.01) continue; let d = `M${f1(camX - 3000)} ${f1(y + 40 * zz)}`;
          for (let x = camX - 2600; x <= camX + 2600; x += L / 4) d += ` L ${f1(x)} ${f1(y - A * Math.max(0, Math.sin((x / L) * 2 * Math.PI + fase + t * 1.3)) ** 1.6)}`;
          const cresta = d; d += ` L ${f1(camX + 3000)} ${f1(y + 40 * zz)} L ${f1(camX + 3000)} ${f1(y + 160 * zz + 30)} L ${f1(camX - 3000)} ${f1(y + 160 * zz + 30)} Z`;
          el("path", { d, fill: mixc(c[0], c[1], z), opacity: op.toFixed(2) }, g.vivoSuelo);
          el("path", { d: cresta, fill: "none", stroke: c[2], "stroke-width": f1(2 + 7 * zz), "stroke-linecap": "round", "stroke-dasharray": `${f1(L * 0.35)} ${f1(L * 0.65)}`, "stroke-dashoffset": f1(-t * 40 * (1 + z)), opacity: (0.6 * op).toFixed(2) }, g.vivoSuelo); } }
      if (F.tipo === "interior" && F.lampara !== false) { const fl = 0.85 + 0.15 * Math.sin(t * 9) * Math.sin(t * 5.3), lx = F.lamparaX ?? -260;
        const idL = "esc-halo-ffc070"; if (!g.ownerSVGElement.querySelector("#" + idL)) { const gr = el("radialGradient", { id: idL }, g.ownerSVGElement.querySelector("defs"));
          el("stop", { offset: 0, "stop-color": "#ffc070", "stop-opacity": 0.5 }, gr); el("stop", { offset: 1, "stop-color": "#ffc070", "stop-opacity": 0 }, gr); }
        el("circle", { cx: lx, cy: -40, r: f1(520 * fl), fill: `url(#${idL})` }, g.vivoSuelo);
        el("ellipse", { cx: lx, cy: -14, rx: 44, ry: 14, fill: "#8a5a3a" }, g.vivoSuelo); el("path", { d: `M${lx - 32} -20 Q ${lx} -50 ${lx + 32} -20 Z`, fill: "#a8703a" }, g.vivoSuelo);
        el("path", { d: `M${lx + 28} -40 Q ${lx + 38} ${f1(-66 - 8 * fl)} ${lx + 46} -40 Z`, fill: "#ffd27a" }, g.vivoSuelo); } }
    // lluvia (delante de todo, en pantalla) y relámpagos
    const ll = F.lluvia || 0;
    if (ll > 0) { let d = ""; for (let i = 0; i < Math.round(160 * ll); i++) { const x = ((i * 137.7) % 1180) - 50, y0 = ((i * 89.3 + t * 2600 * (0.8 + (i % 5) * 0.08)) % 2100) - 100; d += `M${f1(x)} ${f1(y0)} l -18 60 `; }
      el("path", { d, stroke: "#c8d4ee", "stroke-width": 3, "stroke-linecap": "round", opacity: (0.35 * Math.min(1, ll)).toFixed(2) }, gDelante); }
    if (F.rayos) { const u = t % 5.3; if (u < 0.12 || (u > 0.2 && u < 0.27)) el("rect", { x: 0, y: 0, width: ANCHO, height: ALTO, fill: "#e8ecff", opacity: 0.35 }, gDelante); }
  }

  // op.voz = { envolvente, desfase, habla }: voz que viene de fuera (el montaje de un short). desfase = segundo del short en el que empieza
  // la escena menos el punto de la escena desde el que se ve; habla = id del actor cuya boca la sigue (o "auto": el primer actor)
  function crear(svg, esc, PJ, op = {}) {
    const raiz = el("g", {}, svg), fondo = el("g", {}, raiz), mundo = el("g", {}, raiz), gDelante = el("g", {}, raiz), gTextos = el("g", {}, raiz);
    let fondoKey = null;
    const actores = (esc.actores || []).map((a) => { const j = PJ[a.personaje]; const g = el("g", { "data-actor": a.id }, mundo);
      if (!j) { const tx = el("text", { fill: "#f66", "font-size": 40 }, g); tx.textContent = "falta el personaje «" + a.personaje + "»"; return { a, g, m: null, j: null }; }
      return { a, g, j, m: Personajes.crear(g, j, { id: "esc-" + a.id }) }; });
    // atrezo: objetos de la escena (ATREZO en comun/atrezo.js), colocados como los personajes; sus parámetros pueden llevar claves
    const objetos = (esc.objetos || []).map((ob) => ({ ob, g: el("g", { "data-objeto": ob.id || ob.tipo }, mundo), k: null }));
    function objeto(O, t) { const ob = O.ob, esc0 = (ob.escala || 1) * (1 - 0.38 * (ob.p || 0)), q = claves(ob.claves, t, [...new Set((ob.claves || []).flatMap((k) => Object.keys(k)))].filter((c) => c !== "t" && c !== "curva")) || {};
      const x = q.x ?? ob.x ?? 0, frio = ob.frio ?? ["noche", "luna", "tormenta"].includes(esc.fondo?.tipo || "noche");
      O.g.setAttribute("transform", `translate(${f1(x)} ${f1(-170 * (ob.p || 0))}) scale(${((ob.espejo ? -1 : 1) * esc0).toFixed(3)} ${esc0.toFixed(3)})`);
      const params = Object.assign({}, ob.params || {}, q); delete params.x; delete params.t; delete params.curva;
      const A = window.ATREZO && ATREZO[ob.tipo], clave = JSON.stringify([ob.tipo, params, frio]) + (A && A.anima ? "|" + t.toFixed(3) : "");
      if (clave !== O.k) { O.k = clave; O.g.innerHTML = window.Atrezo ? Atrezo.dibujar({ tipo: ob.tipo, params, frio }, t) : ""; }
      return ob.p || 0; }
    function camara(t) { return claves(esc.camara, t, ["x", "y", "zoom"]) || { x: 0, y: -360, zoom: 1 }; }
    function dibujar(t) {
      const c = camara(t), z = c.zoom || 1;
      const k = JSON.stringify(esc.fondo || {}) + Math.round(c.x / 4); if (k !== fondoKey) { fondoKey = k; pintarFondo(fondo, esc.fondo, c.x); }
      const tr = `translate(${ANCHO / 2} ${ALTO / 2}) scale(${z}) translate(${f1(-c.x)} ${f1(-c.y)})`;
      fondo.setAttribute("transform", tr); mundo.setAttribute("transform", tr);
      if ((esc.fondo?.tipo || "noche") !== "color") vivo(fondo, gDelante, esc.fondo, t, c.x, z);
      Titere25D.camara({ tilt: 0.18 });
      const orden = [];
      const conFisica = actores.some((A) => A.j && (A.j.piezas || []).some((pz) => pz.fisica && pz.fisica.activa !== false));
      // física de las piezas: si el tiempo salta (vídeo renderizado por trozos, cabezal movido), se simula el segundo anterior para llegar
      // a t con la pieza en el mismo estado que si se hubiera reproducido seguido
      if (conFisica && !(t > tAnterior && t - tAnterior <= 0.25)) { for (let u = Math.max(0, t - 1); u < t - 1e-6; u += 1 / 30) for (const A of actores) if (A.m) actor(A, u); }
      tAnterior = t;
      for (const A of actores) { if (!A.m) continue; const q = actor(A, t); orden.push({ g: A.g, p: q.p || 0 }); }
      for (const O of objetos) orden.push({ g: O.g, p: objeto(O, t) + (O.ob.detras ? 0.0005 : -0.0005) });
      orden.sort((x, y) => y.p - x.p).forEach((o) => mundo.appendChild(o.g));
      pintarTextos(t);
    }
    let tAnterior = -1;
    function actor(A, t) { const a = A.a;
        const q = claves(a.recorrido, t, ["x", "p", "giro"]) || { x: 0, p: 0, giro: 20 }, esc0 = (a.escala || 1) * (1 - 0.38 * (q.p || 0));
        A.g.setAttribute("transform", `translate(${f1(q.x)} ${f1(-170 * (q.p || 0))}) scale(${esc0.toFixed(3)})`);
        // velocidad: anda o corre sola si el recorrido la desplaza
        const q2 = claves(a.recorrido, t + 0.05, ["x", "p"]) || q, v = Math.hypot(q2.x - q.x, ((q2.p || 0) - (q.p || 0)) * 500) / 0.05;
        const anda = cl(v / 60), corre = cl((v - 330) / 200);
        // bloques activos en t, por capas: «todo» o «cuerpo» abajo, «brazos» encima (se puede saludar mientras se anda)
        const activos = (a.bloques || []).filter((b) => t >= b.t && t < b.t + (b.dur || 2)).sort((x, y) => (x.capa === "brazos") - (y.capa === "brazos") || x.t - y.t);
        const base = { giro: q.giro ?? 20 }; let pz = Personajes.completa({}), ctrl = {}, loco = null;
        for (const b of activos) { const ac = Personajes.buscarAccion(A.j, b.accion); if (!ac) continue;
          pz = Personajes.enCapas(pz, Personajes.accionPose(ac, t - b.t + (b.desde || 0)), b.capa || "todo"); Object.assign(ctrl, b.controles || {});
          if ((b.capa || "todo") !== "brazos" && ac.locomocion?.amp) loco = { ac, t0: b.t }; }
        const e = Personajes.pose(Personajes.conControles(pz, A.j.controles, ctrl), base);
        if (loco) { const lo = loco.ac.locomocion; Object.assign(e, { amp: lo.amp, correr: lo.correr || 0, fase: (t - loco.t0) * (lo.cad || (lo.correr ? 1.45 : 0.95)) }); }
        if (anda > 0.02 && !e.amp) Object.assign(e, { amp: anda, correr: corre, fase: recorrido(a.recorrido, t) / (corre > 0.5 ? 260 : 170) });
        // los brazos de una capa «brazos» mandan sobre el braceo de andar; sin ella, al andar los brazos bracean
        e.parpadeo = Math.max(0.1, Math.min(1, Math.abs(((t + a.id.length * 0.7) % 3.4) - 3.3) / 0.08));
        // hablar: si un audio de la escena es de este actor, su boca sigue la envolvente (30 valores por segundo, 0…1)
        const vozFuera = op.voz && (op.voz.envolvente || op.voz.palabras) && (op.voz.habla === a.id || (op.voz.habla === "auto" && A === actores.find((x) => x.m))) ? [{ habla: a.id, envolvente: op.voz.envolvente, palabras: op.voz.palabras, t: -(op.voz.desfase || 0) }] : [];
        // con palabras (transcripción) la boca forma cada fonema (visemas) y la envolvente da la fuerza; sin ellas, solo abre y cierra
        for (const au of [...(esc.audios || []), ...vozFuera]) { if (au.habla !== a.id || (!au.envolvente && !au.palabras)) continue; const u = t - (au.t || 0), i = Math.floor(u * 30);
          const env = au.envolvente, v = env && i >= 0 && i < env.length ? (env[i] + (env[i + 1] ?? 0) * 0.5 + (env[i - 1] ?? 0) * 0.5) / 2 : null;
          const vis = Personajes.visemaEn(au.palabras, u);
          if (vis) { const f = v == null ? 1.1 : 0.7 + 0.55 * cl(v * 1.5); e.visema = { abre: Math.min(1.2, vis.abre * f * 1.2), ancho: vis.ancho, dientes: vis.dientes }; break; }
          if (v != null && !au.palabras) { e.boca = cl(v * 1.15); e.bocaAncho = Math.sin(u * 11.3) * Math.sin(u * 4.1); } }
        e.t = t; e.mundo = [q.x / esc0, -170 * (q.p || 0) / esc0];
        A.m.dibujar(e); return q; }
    function pintarTextos(t) {
      // rótulos (en pantalla, no se mueven con la cámara)
      gTextos.replaceChildren();
      for (const tx of esc.textos || []) { if (t < tx.t || t > tx.t + (tx.dur || 2)) continue; const k2 = cl((t - tx.t) / 0.25) * cl((tx.t + (tx.dur || 2) - t) / 0.25);
        const w = 40 + String(tx.texto).length * 30; el("rect", { x: ANCHO / 2 - w / 2, y: 1400, width: w, height: 92, rx: 16, fill: "#14171e", opacity: (0.88 * k2).toFixed(2) }, gTextos);
        const tt = el("text", { x: ANCHO / 2, y: 1462, "text-anchor": "middle", fill: "#f7f1e5", "font-size": 52, "font-weight": 700, "font-family": "Inter, Segoe UI, sans-serif", opacity: k2.toFixed(2) }, gTextos); tt.textContent = tx.texto; }
    }
    return { dibujar, actores, objetos, camara, raiz };
  }
  window.Escena = { crear, claves, FONDOS, fondoDe, ANCHO, ALTO };
})();
