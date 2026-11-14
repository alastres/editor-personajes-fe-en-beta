// Motor de ESCENAS (editor de personajes, fase 4): varios personajes en un fondo, con recorridos, acciones y cámara.
// Lo usan el editor (escenas.html) y la composición exportada a HyperFrames, así que lo que se ve en el editor es lo que sale en el vídeo.
//   const esc = Escena.crear(svg, ESCENA, PERSONAJES);  esc.dibujar(t);
// Formato (Videos/shorts-flow/escenas/<id>.json):
// { id, nombre, duracion, fondo: { tipo: "noche"|"alba"|"dia"|"interior"|"color", color },
//   camara: [{ t, x, y, zoom }],                                   // claves de cámara (centro del encuadre en el mundo y zoom)
//   actores: [{ id, personaje, escala,
//     recorrido: [{ t, x, p, giro }],                               // x en el mundo, p = profundidad (0 delante … 1 al fondo), giro en grados
//     bloques: [{ t, accion, dur, controles }] }],                  // acciones del personaje (por id o nombre) que empiezan en t
//   textos: [{ t, dur, texto, arriba }] }                           // rótulos sencillos (arriba: en la parte de arriba, lejos de los subtítulos)
// Mundo: el suelo está en y = 0; un adulto mide ~600. El encuadre es 1080 × 1920 (vertical).
(function () {
  const NS = "http://www.w3.org/2000/svg";
  // formato del vídeo: vertical 9:16 (shorts, por defecto) u horizontal 16:9 (vídeos largos)
  let ANCHO = 1080, ALTO = 1920; const formato = (f) => { [ANCHO, ALTO] = f === "16:9" ? [1920, 1080] : [1080, 1920]; return [ANCHO, ALTO]; };
  const el = (tag, at = {}, padre) => { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); if (padre) padre.appendChild(e); return e; };
  const mixc = (a, b, k) => { const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); const A = p(a), B = p(b); return "#" + A.map((x, i) => Math.round(x + (B[i] - x) * k).toString(16).padStart(2, "0")).join(""); };
  const rad = (g) => (g * Math.PI) / 180, cl = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x)), lerp = (a, b, k) => a + (b - a) * k, suave = (x) => x * x * (3 - 2 * x), f1 = (x) => x.toFixed(1);
  // interpolación de claves ordenadas por t (suavizada); devuelve el objeto mezclado campo a campo
  function claves(lista, t, campos) {
    const ks = [...(lista || [])].sort((a, b) => a.t - b.t); if (!ks.length) return null;
    if (t <= ks[0].t) return Object.assign({}, ks[0]); if (t >= ks[ks.length - 1].t) return Object.assign({}, ks[ks.length - 1]);
    const i = ks.findIndex((k) => k.t > t), a = ks[i - 1], b = ks[i], fx = (window.Personajes?.curva ? Personajes.curva(a) : suave), k = fx((t - a.t) / (b.t - a.t)), o = Object.assign({}, a);
    for (const c of campos) o[c] = lerp(a[c] ?? 0, b[c] ?? a[c] ?? 0, k); return o; }
  // distancia recorrida hasta t (para que los pies avancen al ritmo del desplazamiento)
  // (tabla acumulada por recorrido, en caché: antes se integraba desde 0 en cada fotograma y las escenas largas iban lentas)
  const _rec = new WeakMap();
  function recorrido(lista, t) { if (!lista || !lista.length) return 0; const paso = 1 / 60, firma = JSON.stringify(lista);
    let c = _rec.get(lista); if (!c || c.firma !== firma) { c = { firma, d: [0], prev: claves(lista, 0, ["x", "p"]) }; _rec.set(lista, c); }
    const n = Math.max(0, Math.floor((t + 1e-6) / paso));
    while (c.d.length <= n) { const u = c.d.length * paso, q = claves(lista, u, ["x", "p"]); c.d.push(c.d[c.d.length - 1] + Math.hypot(q.x - c.prev.x, ((q.p || 0) - (c.prev.p || 0)) * 500)); c.prev = q; }
    return c.d[n]; }

  // ---- fondos (siluetas planas por capas, como los del short ¿Y si…?)
  const FONDOS = {
    noche: { cielo: ["#141a34", "#2c3658", "#56608a"], montes: ["#4a4b6e", "#36385a", "#282a46"], suelo: ["#2a2a40", "#3a3a56"], luz: "#9aa8e0", astro: { c: "#d8dcee", r: 60, x: 300, y: -1300, halo: "#8a90c0" }, estrellas: true },
    alba: { cielo: ["#3a3a6a", "#c08a92", "#ffd6a0"], montes: ["#c08a92", "#9a6a7e", "#7a5068"], suelo: ["#9a7a6a", "#b0906a"], astro: { c: "#fff1c8", r: 110, x: 330, y: -560, halo: "#ffc890" } },   // el sol a un lado: centrado detrás de la cabeza parecía una aureola
    dia: { cielo: ["#3e7cc0", "#86b8dc", "#e6eedc"], montes: ["#7aa6a8", "#5e8c80", "#4e7458"], suelo: ["#b8a66a", "#d0bc80"], astro: { c: "#fff8d8", r: 80, x: -320, y: -1300, halo: "#ffe8a0" }, luz: "#fff0c0" },
    interior: { pared: ["#3a2a30", "#44323a"], suelo: ["#241a20", "#4a3438"], lampara: true },
    atardecer: { cielo: ["#2a2050", "#a04a6a", "#f0905a"], montes: ["#8a4a6a", "#6a3a5a", "#4a2a48"], suelo: ["#5a3a40", "#7a5048"], astro: { c: "#ffd08a", r: 120, x: 380, y: -230, halo: "#ff9a6a" } },   // sol poniéndose junto al horizonte, lejos de las cabezas
    luna: { cielo: ["#0e1230", "#222c50", "#3a4470"], montes: ["#3e405a", "#30324a", "#26283c"], suelo: ["#22222e", "#30303e"], astro: { c: "#eef0ff", r: 120, x: 300, y: -1250, halo: "#9aa0d8" }, estrellas: true, nubes: 0.45 },
    tormenta: { cielo: ["#14141e", "#262836", "#3e4050"], montes: ["#34364a", "#2a2c3c", "#202230"], suelo: ["#24242a", "#34343c"], nubes: 1, lluvia: 1, rayos: true },
    mar: { cielo: ["#4a7ab8", "#9ac0dc", "#e8f0ec"], montes: ["#9ab4c4", "#88a4b6", "#7894a8"], lejosAlto: 0.45, suelo: ["#c8b080", "#d8c090"], astro: { c: "#fff8d8", r: 80, x: -320, y: -1300, halo: "#ffe8a0" }, mar: true, nubes: 0.3 },
    desierto: { cielo: ["#c8806a", "#f0b888", "#fbe0b8"], montes: ["#b8806a", "#c8906a", "#a06a58"], suelo: ["#e0b880", "#f0d29a"], astro: { c: "#fff4d0", r: 120, x: 140, y: -560, halo: "#ffd890" }, dunas: true, luz: "#fff0c8" },
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
  // CORDILLERAS con capas ricas (estilo de la barca aprobada): cada capa más cerca es más oscura y saturada; las lejanas se funden con el
  // horizonte (perspectiva de aire). Arriba llevan un filo de luz del color del astro y por dentro rayas de cápsula, como la textura de marca.
  const hor = (F) => F.cielo?.[F.cielo.length - 1] || "#c8b0c0", luzDe = (F) => F.luz || F.astro?.halo || "#ffe0b0";
  function cresta(x, i) { return Math.abs(0.55 * Math.sin(x * 0.013 + i * 7.1) + 0.3 * Math.sin(x * 0.0047 + i * 2.3) + 0.15 * Math.sin(x * 0.031 + i * 1.7)); }
  // DUNAS (fondo desierto): montes de pico al fondo con un lado iluminado y capas de dunas cuya cresta lleva un filo de luz y la cara una sombra
  function dunas(g, F, camX) { const H = hor(F), L = luzDe(F), cs = F.montes, su = F.suelo || ["#d8b078", "#e8c890"];
    // sierra al fondo: picos irregulares de alturas distintas (no pirámides), con la ladera de la luz más clara
    for (const [par, esc, col, op] of [[0.9, 1, mixc(cs[0], H, 0.45), 0.9], [0.8, 0.7, mixc(cs[0], H, 0.2), 1]]) { const dx = camX * par; let d = `M${-6000 + dx} -6`, luz = "";
      for (let k = -60; k <= 60; k++) { const x = k * 100 + dx, r = Math.abs(Math.sin(k * 12.9898 + esc * 7) * 43758.5453) % 1, r2 = Math.abs(Math.sin(k * 3.3 + esc)) ;
        const h = esc * (90 + 140 * r2 + 70 * r), y = -h; d += ` L ${f1(x)} ${f1(y)}`;
        if (r > 0.55) luz += `M${f1(x)} ${f1(y)} L ${f1(x + 60)} ${f1(y + h * 0.55)} L ${f1(x + 10)} ${f1(y + h * 0.7)} Z `; }
      el("path", { d: d + ` L ${6000 + dx} -6 Z`, fill: col, opacity: op }, g); el("path", { d: luz, fill: mixc(col, L, 0.45), opacity: 0.6 }, g); }
      el("rect", { x: -9000, y: -90, width: 18000, height: 90, fill: H, opacity: 0.35 }, g);
    for (let i = 0; i < 5; i++) { const par = [0.62, 0.48, 0.34, 0.2, 0.08][i], dx = camX * par, base = [-6, 70, 180, 320, 500][i], A = [70, 100, 130, 170, 210][i], lam = [900, 1100, 1300, 1500, 1800][i];
      const c = mixc(mixc(su[1], cs[1], 0.25 - i * 0.04), H, [0.4, 0.28, 0.16, 0.06, 0][i]), cS = mixc(c, cs[2], 0.35), cL = mixc(c, "#ffffff", 0.45);
      const yC = (x) => base - A * (0.55 + 0.45 * Math.sin((x + i * 517) / lam * 2 * Math.PI)) - 20;
      let top = "", sombra = ""; for (let x = -6000; x <= 6000; x += 60) { const X = x + dx; top += (top ? " L " : "M") + `${f1(X)} ${f1(yC(x))}`; }
      el("path", { d: `${top} L ${6000 + dx} 3000 L ${-6000 + dx} 3000 Z`, fill: c }, g);
      // cara en sombra: debajo de cada cresta, en el lado contrario a la luz
      for (let x = -6000; x <= 6000; x += lam) { const x0 = x - ((i * 517) % lam) + lam * 0.25, X0 = x0 + dx;
        sombra += `M${f1(X0)} ${f1(yC(x0))} Q ${f1(X0 + lam * 0.35)} ${f1(yC(x0) + A * 0.9)} ${f1(X0 + lam * 0.6)} ${f1(yC(x0 + lam * 0.5) + 6)} L ${f1(X0 + lam * 0.5)} ${f1(yC(x0 + lam * 0.5))} Q ${f1(X0 + lam * 0.25)} ${f1(yC(x0 + lam * 0.25))} ${f1(X0)} ${f1(yC(x0))} Z `; }
      el("path", { d: sombra, fill: cS, opacity: 0.6 }, g);
      el("path", { d: top, fill: "none", stroke: cL, "stroke-width": 5 + i * 1.5, "stroke-linecap": "round", opacity: 0.75 }, g); } }
  function montes(g, F, camX) { if (F.dunas) return dunas(g, F, camX); const H = hor(F), L = luzDe(F), cs = F.montes, base = F.suelo?.[0] || cs[2];
    const capas = [[mixc(cs[0], H, 0.45), 0.86, 420], [mixc(cs[0], H, 0.12), 0.72, 330], [cs[1], 0.52, 230], [mixc(cs[2], base, 0.35), 0.3, 130]];
    capas.forEach(([c, par, alto0], i) => { const alto = alto0 * (F.lejosAlto ?? 1), hz = -8 + i * 4, dx = camX * par, paso = [420, 340, 280, 240][i];
      let top = "", d = `M${-6000 + dx} ${hz}`;
      for (let x = -6000; x <= 6000; x += paso) { const r = cresta(x, i), r2 = Math.abs(0.6 * Math.sin(x * 0.007 + i * 3.3) + 0.4 * Math.sin(x * 0.0029 + i * 5.9));
        const seg = ` Q ${f1(x + paso / 2 + dx)} ${f1(hz - alto * (0.55 + 0.45 * r) * 1.15)} ${f1(x + paso + dx)} ${f1(hz - alto * (0.3 + 0.3 * r2))}`; d += seg; top += (top ? "" : `M${f1(x + dx)} ${f1(hz - alto * 0.45)}`) + seg; }
      el("path", { d: d + ` L ${6000 + dx} ${hz} Z`, fill: c }, g);
      el("path", { d: top, fill: "none", stroke: mixc(c, L, 0.45), "stroke-width": [4, 5, 6, 7][i], "stroke-linecap": "round", opacity: [0.45, 0.55, 0.6, 0.5][i] }, g);
      // rayas de cápsula (luz) sobre la ladera
      for (let k = 0; k < 26; k++) { const x = -2600 + k * 211 + ((k * 97) % 60) + dx, y = hz - alto * (0.15 + 0.35 * ((k * 37) % 10) / 10), w = 40 + (k % 4) * 22;
        el("rect", { x: f1(x), y: f1(y), width: w, height: 8 + i * 2, rx: 5 + i, fill: mixc(c, L, 0.3), opacity: 0.35 }, g); }
      // bruma en la base de cada capa lejana: la funde con el horizonte
      if (i < 3) el("rect", { x: -9000, y: hz - 70 - i * 10, width: 18000, height: 80 + i * 10, fill: H, opacity: [0.35, 0.22, 0.12][i] }, g); }); }
  // bruma del horizonte y charco de luz del astro sobre el suelo
  function bruma(g, F) { const H = hor(F), L = luzDe(F), defs = g.ownerSVGElement.querySelector("defs");
    const id = "esc-bruma-" + H.slice(1); if (!g.ownerSVGElement.querySelector("#" + id)) { const gr = el("linearGradient", { id, x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
      el("stop", { offset: 0, "stop-color": H, "stop-opacity": 0 }, gr); el("stop", { offset: 1, "stop-color": H, "stop-opacity": 0.55 }, gr); }
    el("rect", { x: -9000, y: -520, width: 18000, height: 520, fill: `url(#${id})` }, g); }
  function pintarFondo(g, f, camX) {
    g.replaceChildren(); const tipo = f?.tipo || "noche";
    if (tipo === "color" || tipo === "lamina") { el("rect", { x: -9000, y: -9000, width: 18000, height: 18000, fill: f.color || "#1a1630" }, g); g.vivoCielo = null; g.vivoSuelo = null; return; }
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
      el("circle", { cx: f1(ax), cy: a.y, r: a.r * 5, fill: `url(#${idH})` }, g);
      for (const [k, o] of [[2.1, 0.08], [1.55, 0.14], [1.22, 0.22]]) el("circle", { cx: f1(ax), cy: a.y, r: f1(a.r * k), fill: a.halo, opacity: o }, g);
      el("circle", { cx: f1(ax), cy: a.y, r: a.r, fill: a.c }, g);
      if (F.estrellas) for (const [u, v, rr] of [[-0.3, -0.25, 0.22], [0.28, 0.1, 0.16], [-0.05, 0.38, 0.12]]) el("circle", { cx: f1(ax + u * a.r), cy: f1(a.y + v * a.r), r: f1(rr * a.r), fill: mixc(a.c, "#8a90c0", 0.35), opacity: 0.6 }, g);
      else el("circle", { cx: f1(ax - a.r * 0.25), cy: f1(a.y - a.r * 0.25), r: f1(a.r * 0.55), fill: "#ffffff", opacity: 0.25 }, g); }
    g.vivoCielo = el("g", {}, g);                      // nubes (se dibujan cada fotograma)
    if (F.imagen?.archivo) imagenFondo(g, F.imagen, camX);
    // lo de lejos: tres cordilleras con parallax (las lejanas se mueven menos con la cámara), o una ciudad, Roma, un olivar… o nada
    const lj = F.lejos || "montes";
    if (lj !== "montes" && lj !== "nada") { const c = F.montes; lejos(g, lj, [mixc(c[0], c[1], 0.3), c[1], mixc(c[2], "#000000", 0.15)], camX, 0.5); }
    if (lj === "montes") montes(g, F, camX);
    bruma(g, F);
    if (F.mar) { pintarMar(g, F); capasFondo(g, F.capas, camX); g.vivoSuelo = el("g", {}, g); return; }
    if (F.dunas) { capasFondo(g, F.capas, camX); g.vivoSuelo = el("g", {}, g); return; }   // las dunas llegan hasta delante: no hay suelo plano
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
  function pintarInterior(g, F) {   // casa de adobe: muro con luz de la lámpara, arco de puerta, repisa con cántaros, ventana con haz de luz, viga, alfombra
    const defs = g.ownerSVGElement.querySelector("defs"), P0 = F.pared[0], P1 = F.pared[1], lx = F.lamparaX ?? -260;
    el("rect", { x: -9000, y: -6000, width: 18000, height: 6000, fill: mixc(P0, "#0c0810", 0.25) }, g);
    const idP = "esc-pared-" + P0.slice(1); if (!g.ownerSVGElement.querySelector("#" + idP)) { const gr = el("radialGradient", { id: idP }, defs);
      el("stop", { offset: 0, "stop-color": mixc(P1, "#ffb070", 0.35) }, gr); el("stop", { offset: 0.55, "stop-color": P0 }, gr); el("stop", { offset: 1, "stop-color": mixc(P0, "#0c0810", 0.25) }, gr); }
    el("ellipse", { cx: lx, cy: -380, rx: 1500, ry: 1100, fill: `url(#${idP})` }, g);
    for (let i = 0; i < 46; i++) el("rect", { x: -2600 + (i * 397) % 5200, y: -1300 + (i * 211) % 1250, width: 70 + (i % 3) * 30, height: 20, rx: 10, fill: P1, opacity: 0.55 }, g);
    // arco de una puerta a la derecha (oscuro, con el marco iluminado)
    el("path", { d: "M480 0 L 480 -520 A 150 150 0 0 1 780 -520 L 780 0 Z", fill: mixc(P0, "#000000", 0.55) }, g);
    el("path", { d: "M470 0 L 470 -520 A 160 160 0 0 1 790 -520", fill: "none", stroke: mixc(P1, "#ffc890", 0.3), "stroke-width": 16, opacity: 0.6 }, g);
    // repisa con cántaros a la izquierda
    el("rect", { x: -1060, y: -470, width: 420, height: 22, rx: 6, fill: "#3a2626" }, g);
    for (const [x, w, h, c] of [[-1010, 70, 110, "#9a5a3a"], [-920, 54, 80, "#b8784a"], [-850, 80, 120, "#8a4e34"], [-750, 50, 70, "#a86a42"]]) {
      el("path", { d: `M${x} -470 C ${x - w / 2} -470 ${x - w / 2} ${-470 - h * 0.7} ${x - w * 0.18} ${-470 - h} L ${x + w * 0.18} ${-470 - h} C ${x + w / 2} ${-470 - h * 0.7} ${x + w / 2} -470 ${x} -470 Z`, fill: c }, g);
      el("rect", { x: x - w * 0.3, y: -470 - h * 0.62, width: w * 0.14, height: h * 0.4, rx: 5, fill: "#ffffff", opacity: 0.16 }, g); }
    el("rect", { x: -9000, y: -660, width: 18000, height: 34, fill: "#4a3438" }, g); el("rect", { x: -9000, y: -628, width: 18000, height: 10, fill: "#2a1e24" }, g);
    for (let k = -8; k < 9; k++) el("rect", { x: k * 340 - 20, y: -700, width: 40, height: 44, rx: 6, fill: "#3a282c" }, g);
    if (F.ventana !== false) { el("rect", { x: -620, y: -860, width: 170, height: 130, rx: 10, fill: "#141020" }, g);
      el("rect", { x: -610, y: -850, width: 150, height: 110, rx: 8, fill: F.estrellas || F.noche ? "#3a4a78" : "#bcd4ec", opacity: 0.85 }, g);
      el("rect", { x: -537, y: -850, width: 6, height: 110, fill: "#141020" }, g); }
    // suelo de tierra apisonada con una alfombra de rayas
    el("rect", { x: -9000, y: -6, width: 18000, height: 6000, fill: F.suelo[0] }, g); el("rect", { x: -9000, y: -10, width: 18000, height: 12, fill: F.suelo[1] }, g);
    el("path", { d: "M-520 40 L 520 40 L 640 210 L -640 210 Z", fill: "#7a3a34", opacity: 0.85 }, g);
    for (const [y, c] of [[70, "#c8904a"], [120, "#5a2a28"], [170, "#c8904a"]]) el("path", { d: `M${f1(-520 - (y - 40) * 0.7)} ${y} L ${f1(520 + (y - 40) * 0.7)} ${y}`, stroke: c, "stroke-width": 10, opacity: 0.7 }, g);
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
  function vivo(g, gDelante, f, t, camX, zoom) { const F = fondoDe(f); gDelante.replaceChildren(); if (f?.tipo === "lamina") return;
    if (g.vivoCielo) { g.vivoCielo.replaceChildren(); const n = F.nubes ?? (F.tipo === "dia" || F.tipo === "alba" || F.tipo === "atardecer" || F.tipo === "noche" ? 0.5 : 0), L = luzDe(F);
      if (F.estrellas) { let d = "", d2 = ""; for (let i = 0; i < 90; i++) { const x = -2400 + ((i * 397) % 4800) + camX * 0.95, y = -2600 + (i * 211) % 2000, r = 2 + (i % 3), tw = 0.5 + 0.5 * Math.sin(t * (1.3 + (i % 5) * 0.4) + i);
          (tw > 0.5 ? (d += `M${f1(x - r)} ${y}h${2 * r}`) : (d2 += `M${f1(x - r)} ${y}h${2 * r}`)); }
        el("path", { d, stroke: "#f4f0ff", "stroke-width": 5, "stroke-linecap": "round", opacity: 0.85 }, g.vivoCielo); el("path", { d: d2, stroke: "#c8c8ee", "stroke-width": 4, "stroke-linecap": "round", opacity: 0.4 }, g.vivoCielo);
        const u = t % 6.5; if (u < 0.7) { const k = u / 0.7, x0 = -400 + camX * 0.95, y0 = -2100; el("path", { d: `M${f1(x0 + 900 * k)} ${f1(y0 + 300 * k)} l -${f1(160 * (1 - k) + 40)} -${f1(53 * (1 - k) + 13)}`, stroke: "#ffffff", "stroke-width": 4, "stroke-linecap": "round", opacity: (1 - k).toFixed(2) }, g.vivoCielo); } }
      if (n > 0) { const cN = F.colorNubes || mixc(F.cielo?.[1] || "#8090b0", "#ffffff", F.tipo === "tormenta" ? 0.05 : F.estrellas ? 0.2 : 0.42), cS = mixc(cN, F.cielo?.[0] || "#1a1428", 0.22), cL = mixc(L, "#ffffff", 0.15);
        for (let i = 0; i < Math.round(3 + 7 * n); i++) { const y = -1550 + (i * 173) % 1000, w = 260 + (i * 97) % 280, par = 0.88 + (i % 3) * 0.03, x = ((i * 611 + t * (10 + (i % 3) * 7)) % 5600 + 5600) % 5600 - 2800 + camX * par;
          const gN = el("g", { transform: `translate(${f1(x)} ${y})`, opacity: (0.6 + 0.4 * Math.min(1, n)).toFixed(2) }, g.vivoCielo);
          // silueta: base plana + tres bultos; primero en color de luz un poco más abajo (el filo), luego el cuerpo
          const forma = (dy) => `M${f1(-w / 2)} ${f1(dy)} h${f1(w)} a${f1(w / 7)} ${f1(w / 7)} 0 0 0 ${f1(-w / 6)} ${f1(-w / 7)} a${f1(w / 5)} ${f1(w / 5)} 0 0 0 ${f1(-w * 0.34)} ${f1(-w / 12)} a${f1(w / 6)} ${f1(w / 6)} 0 0 0 ${f1(-w * 0.28)} ${f1(w / 9)} a${f1(w / 10)} ${f1(w / 10)} 0 0 0 ${f1(-w * 0.22)} ${f1(w * 0.1)} Z`;
          el("path", { d: forma(12), fill: cL, transform: "translate(7 0)" }, gN); el("path", { d: forma(0), fill: cN }, gN);
          // la sombra de dentro: bultos más oscuros abajo (volumen), como las nubes de la barca
          el("path", { d: `M${f1(-w * 0.46)} 0 h${f1(w * 0.9)} a${f1(w * 0.13)} ${f1(w * 0.09)} 0 0 0 ${f1(-w * 0.26)} ${f1(-w * 0.06)} a${f1(w * 0.16)} ${f1(w * 0.1)} 0 0 0 ${f1(-w * 0.34)} 0 a${f1(w * 0.12)} ${f1(w * 0.08)} 0 0 0 ${f1(-w * 0.3)} ${f1(w * 0.06)} Z`, fill: cS, opacity: 0.55 }, gN);
          el("rect", { x: f1(-w * 0.32), y: f1(-w * 0.05), width: f1(w * 0.26), height: 9, rx: 4.5, fill: "#ffffff", opacity: 0.22 }, gN); } }
      // pájaros: una bandada que cruza despacio y aletea (de día, al alba, al atardecer, en el mar y el desierto)
      if (F.pajaros ?? ["dia", "alba", "atardecer", "mar", "desierto"].includes(F.tipo)) { const cP = mixc(F.montes?.[2] || "#3a3040", "#1a1420", 0.4);
        for (let b = 0; b < 2; b++) { const bx = ((t * (55 + 15 * b) + b * 1900) % 4200) - 2100 + camX * 0.9, by = -1350 + b * 260 + 30 * Math.sin(t * 0.5 + b);
          let d = ""; for (let k = 0; k < 5; k++) { const x = bx - k * 46 - (k % 2) * 20, y = by + k * 22 * (k % 2 ? 1 : -0.4) + 4 * Math.sin(t + k), a = Math.sin(t * 9 + k * 1.3) * 10, s2 = 13 - k;
            d += `M${f1(x - s2)} ${f1(y - a * 0.6)} Q ${f1(x - s2 / 2)} ${f1(y - 8 - a)} ${f1(x)} ${f1(y)} Q ${f1(x + s2 / 2)} ${f1(y - 8 - a)} ${f1(x + s2)} ${f1(y - a * 0.6)}`; }
          el("path", { d, fill: "none", stroke: cP, "stroke-width": 4, "stroke-linecap": "round", "stroke-linejoin": "round", opacity: 0.75 }, g.vivoCielo); } } }
    if (g.vivoSuelo) { g.vivoSuelo.replaceChildren();
      if (F.mar) { const c = F.colorMar || ["#2c4a6a", "#4a6e90", "#7a9ab8"], ola = F.oleaje ?? (F.tipo === "tormenta" ? 2 : 1), N = 14;
        for (let n = N - 1; n >= 0; n--) { const z = ((n + t * 0.11 * N) % N) / N, zz = z * z, y = 10 + zz * 1500, A = (4 + 40 * zz) * ola, L = 120 + 520 * zz, fase = n * 1.7, op = cl(z * 6) * cl((1 - z) * 8);
          if (op <= 0.01) continue; let d = `M${f1(camX - 3000)} ${f1(y + 40 * zz)}`;
          for (let x = camX - 2600; x <= camX + 2600; x += L / 4) d += ` L ${f1(x)} ${f1(y - A * Math.max(0, Math.sin((x / L) * 2 * Math.PI + fase + t * 1.3)) ** 1.6)}`;
          const cresta = d; d += ` L ${f1(camX + 3000)} ${f1(y + 40 * zz)} L ${f1(camX + 3000)} ${f1(y + 160 * zz + 30)} L ${f1(camX - 3000)} ${f1(y + 160 * zz + 30)} Z`;
          el("path", { d, fill: mixc(c[0], c[1], z), opacity: op.toFixed(2) }, g.vivoSuelo);
          el("path", { d: cresta, fill: "none", stroke: c[2], "stroke-width": f1(2 + 7 * zz), "stroke-linecap": "round", "stroke-dasharray": `${f1(L * 0.35)} ${f1(L * 0.65)}`, "stroke-dashoffset": f1(-t * 40 * (1 + z)), opacity: (0.6 * op).toFixed(2) }, g.vivoSuelo); } }
      if (F.tipo === "interior" && F.ventana !== false) { el("path", { d: "M-610 -740 L -460 -740 L 160 -6 L -300 -6 Z", fill: F.estrellas || F.noche ? "#a8b8f0" : "#fff0c8", opacity: 0.1 }, g.vivoSuelo);
        let d = ""; for (let i = 0; i < 26; i++) { const u = ((i * 0.381 + t * 0.03) % 1), x = -560 + u * 540 + 40 * Math.sin(t * 0.6 + i), y = -720 + u * 700 + 30 * Math.sin(t * 0.4 + i * 2); d += `M${f1(x)} ${f1(y)}h0.1`; }
        el("path", { d, stroke: "#fff4d8", "stroke-width": 6, "stroke-linecap": "round", opacity: 0.55 }, g.vivoSuelo); }
      if (F.tipo === "interior" && F.lampara !== false) { const fl = 0.85 + 0.15 * Math.sin(t * 9) * Math.sin(t * 5.3), lx = F.lamparaX ?? -260;
        const idL = "esc-halo-ffc070"; if (!g.ownerSVGElement.querySelector("#" + idL)) { const gr = el("radialGradient", { id: idL }, g.ownerSVGElement.querySelector("defs"));
          el("stop", { offset: 0, "stop-color": "#ffc070", "stop-opacity": 0.5 }, gr); el("stop", { offset: 1, "stop-color": "#ffc070", "stop-opacity": 0 }, gr); }
        el("circle", { cx: lx, cy: -40, r: f1(520 * fl), fill: `url(#${idL})` }, g.vivoSuelo);
        el("ellipse", { cx: lx, cy: -14, rx: 44, ry: 14, fill: "#8a5a3a" }, g.vivoSuelo); el("path", { d: `M${lx - 32} -20 Q ${lx} -50 ${lx + 32} -20 Z`, fill: "#a8703a" }, g.vivoSuelo);
        el("path", { d: `M${lx + 28} -40 Q ${lx + 38} ${f1(-66 - 8 * fl)} ${lx + 46} -40 Z`, fill: "#ffd27a" }, g.vivoSuelo); } }
    if (g.vivoSuelo && !F.mar && F.tipo !== "interior" && F.hierba !== false) { const cH = mixc(F.montes?.[2] || "#3a3952", F.suelo?.[0] || "#806040", 0.45), cH2 = mixc(cH, luzDe(F), 0.25), vto = F.viento ?? 1;
      let d = "", d2 = ""; for (let i = 0; i < 46; i++) { const z = ((i * 0.618) % 1), y = 20 + z * z * 520, k = 0.6 + 2 * z * z, x = -2300 + ((i * 733) % 4600), sw = vto * (6 + 10 * k) * Math.sin(t * 1.6 + x * 0.004);
        const hoja = (ox, h, c) => `M${f1(x + ox * k)} ${f1(y)} Q ${f1(x + ox * k + sw * 0.4)} ${f1(y - h * k * 0.6)} ${f1(x + ox * k + sw)} ${f1(y - h * k)}`;
        d += hoja(-8, 30) + hoja(0, 42) + hoja(9, 26); d2 += hoja(4, 34); }
      el("path", { d, fill: "none", stroke: cH, "stroke-width": 5, "stroke-linecap": "round" }, g.vivoSuelo); el("path", { d: d2, fill: "none", stroke: cH2, "stroke-width": 4, "stroke-linecap": "round", opacity: 0.8 }, g.vivoSuelo); }
    if (F.delante !== false && F.tipo !== "interior" && zoom < 1.7) { const cD = mixc(F.montes?.[2] || "#2a2838", "#0c0814", 0.55), vto = F.viento ?? 1, desp = -camX * 0.35 * zoom;
      for (const [bx, lado] of [[-60, 1], [ANCHO + 60, -1]]) { const x0 = bx + desp * 0.1, gD = el("g", { transform: `translate(${f1(x0)} ${ALTO + 30})`, opacity: 0.92 }, gDelante); let d = "";
        for (let k = 0; k < 9; k++) { const ox = lado * (k * 26), h = 170 + ((k * 53) % 120), sw = vto * 18 * Math.sin(t * 1.4 + k * 0.7);
          d += `M${f1(ox - 16)} 0 Q ${f1(ox + sw * 0.3)} ${f1(-h * 0.55)} ${f1(ox + sw + lado * 20)} ${f1(-h)} Q ${f1(ox + 6 + sw * 0.3)} ${f1(-h * 0.5)} ${f1(ox + 16)} 0 Z`; }
        el("path", { d, fill: cD }, gD); el("ellipse", { cx: f1(lado * 90), cy: 10, rx: 210, ry: 70, fill: cD }, gD); } }
    // lluvia (delante de todo, en pantalla) y relámpagos
    const ll = F.lluvia || 0;
    if (ll > 0) { let d = ""; for (let i = 0; i < Math.round(160 * ll); i++) { const x = ((i * 137.7) % 1180) - 50, y0 = ((i * 89.3 + t * 2600 * (0.8 + (i % 5) * 0.08)) % 2100) - 100; d += `M${f1(x)} ${f1(y0)} l -18 60 `; }
      el("path", { d, stroke: "#c8d4ee", "stroke-width": 3, "stroke-linecap": "round", opacity: (0.35 * Math.min(1, ll)).toFixed(2) }, gDelante); }
    if (F.rayos) { const u = t % 5.3; if (u < 0.12 || (u > 0.2 && u < 0.27)) el("rect", { x: 0, y: 0, width: ANCHO, height: ALTO, fill: "#e8ecff", opacity: 0.35 }, gDelante); }
  }

  // ---- ambiente (en pantalla, encima de todo): tono frío/cálido, viñeta, partículas, destellos; la sacudida mueve la cámara
  // esc.ambiente = { tono: -1 frío … 1 cálido, vineta: 0…1, particulas: "polvo" | "luciernagas" | "nieve" | "chispas" | "ceniza", cantidad: 0…2 }
  // esc.efectos = [{ t, tipo: "destello" | "sacudida", dur, fuerza }]
  const PARTICULAS = {
    polvo: { c: "#fff0d0", r: [2, 5], vy: -8, vx: 14, o: 0.35, n: 50 }, luciernagas: { c: "#ffe68a", r: [3, 6], vy: -10, vx: 10, o: 0.9, n: 30, brilla: true },
    nieve: { c: "#ffffff", r: [3, 8], vy: 90, vx: 20, o: 0.8, n: 90 }, chispas: { c: "#ffb050", r: [2, 4], vy: -140, vx: 30, o: 0.9, n: 45, brilla: true },
    ceniza: { c: "#b8b0b8", r: [2, 6], vy: 40, vx: 30, o: 0.55, n: 60 } };
  function sacudida(esc, t) { let dx = 0, dy = 0;
    for (const e of esc.efectos || []) { if (e.tipo !== "sacudida") continue; const u = t - e.t, d = e.dur || 0.6; if (u < 0 || u > d) continue;
      const k = (e.fuerza ?? 1) * 26 * (1 - u / d) ** 2; dx += k * Math.sin(u * 61 + e.t) * Math.cos(u * 23); dy += k * Math.sin(u * 47 + 1.3 * e.t); }
    return [dx, dy]; }
  function pintarAmbiente(g, esc, t) { g.replaceChildren(); const am = esc.ambiente || {}, svg = g.ownerSVGElement, defs = svg.querySelector("defs") || el("defs", {}, svg);
    const tono = am.tono || 0;
    if (Math.abs(tono) > 0.01) el("rect", { x: 0, y: 0, width: ANCHO, height: ALTO, fill: tono > 0 ? "#ff8a3a" : "#3a6ad8", opacity: (Math.abs(tono) * 0.22).toFixed(3), style: "mix-blend-mode: soft-light" }, g);
    if (Math.abs(tono) > 0.01) el("rect", { x: 0, y: 0, width: ANCHO, height: ALTO, fill: tono > 0 ? "#ffb070" : "#7090d8", opacity: (Math.abs(tono) * 0.08).toFixed(3) }, g);
    const P = PARTICULAS[am.particulas]; if (P) { const n = Math.round(P.n * (am.cantidad ?? 1));
      for (let i = 0; i < n; i++) { const a = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1, b = Math.abs(Math.sin(i * 78.233) * 12543.21) % 1, r = P.r[0] + (P.r[1] - P.r[0]) * b;
        const x = ((a * ANCHO + t * P.vx * (0.5 + b) + 40 * Math.sin(t * 0.7 + i)) % (ANCHO + 40) + ANCHO + 40) % (ANCHO + 40) - 20, y = ((b * ALTO + t * P.vy * (0.6 + a)) % (ALTO + 40) + ALTO + 40) % (ALTO + 40) - 20;
        const o = P.o * (P.brilla ? 0.4 + 0.6 * Math.abs(Math.sin(t * (1.5 + a * 2) + i)) : 1);
        el("circle", { cx: f1(x), cy: f1(y), r: f1(r), fill: P.c, opacity: o.toFixed(2) }, g); } }
    const vn = am.vineta ?? 0; if (vn > 0.01) { if (!svg.querySelector("#esc-vineta")) { const gr = el("radialGradient", { id: "esc-vineta", cx: 0.5, cy: 0.5, r: 0.62 }, defs);
        el("stop", { offset: 0.38, "stop-color": "#0c0818", "stop-opacity": 0 }, gr); el("stop", { offset: 0.8, "stop-color": "#0c0818", "stop-opacity": 0.55 }, gr); el("stop", { offset: 1, "stop-color": "#0c0818", "stop-opacity": 0.9 }, gr); }
      el("rect", { x: 0, y: 0, width: ANCHO, height: ALTO, fill: "url(#esc-vineta)", opacity: Math.min(1, vn).toFixed(2) }, g); }
    for (const e of esc.efectos || []) { if (e.tipo !== "destello") continue; const u = t - e.t, d = e.dur || 0.5; if (u < 0 || u > d) continue;
      const k = u < 0.06 ? u / 0.06 : (1 - (u - 0.06) / (d - 0.06)) ** 1.5; el("rect", { x: 0, y: 0, width: ANCHO, height: ALTO, fill: e.color || "#fff6e0", opacity: (k * (e.fuerza ?? 1) * 0.85).toFixed(3) }, g); } }

  const ESTILOS_ANDAR = {
    cansado: { zancada: 0.8, amp: 0.75, inclina: 0.12, miraY: 0.35, hombros: -4, cara: { triste: 0.35 } },
    alegre: { zancada: 1.05, bote: 14, cara: { alegre: 0.5 } },
    prisa: { zancada: 1.2, inclina: 0.1, amp: 1.1 },
    sigiloso: { zancada: 0.7, amp: 0.7, inclina: 0.08, hombros: 6, cara: { miedo: 0.25 } } };

  // PLANTILLAS de escena con la receta de los shorts del canal (gancho → desarrollo → cierre → despedida): cámara, ambiente y efectos
  // de partida; la escena se retoca después. aplicar(esc, rol, d) devuelve una copia con lo de la plantilla.
  const PLANTILLAS = {
    gancho: { nombre: "Gancho (0-3 s: primer plano y algo que pasa)", camara: (d) => [{ t: 0, x: 0, y: -470, zoom: 2.1, curva: "frena" }, { t: Math.min(d, 2.5), x: 0, y: -440, zoom: 1.7 }],
      ambiente: { vineta: 0.45 }, efectos: [{ t: 0.15, tipo: "destello", dur: 0.4, fuerza: 0.6 }] },
    desarrollo: { nombre: "Desarrollo (plano medio que deriva)", camara: (d) => [{ t: 0, x: -30, y: -400, zoom: 1.25 }, { t: d, x: 30, y: -410, zoom: 1.35 }], ambiente: { vineta: 0.25 } },
    cierre: { nombre: "Cierre (la idea clave: más cálido y más cerca)", camara: (d) => [{ t: 0, x: 0, y: -420, zoom: 1.3 }, { t: d, x: 0, y: -450, zoom: 1.7, curva: "frena" }],
      ambiente: { tono: 0.35, vineta: 0.4, particulas: "polvo", cantidad: 0.8 } },
    despedida: { nombre: "Despedida (plano general, saludo, luz cálida)", camara: (d) => [{ t: 0, x: 0, y: -330, zoom: 0.95 }], ambiente: { tono: 0.25, vineta: 0.3 }, fondo: "alba", accion: "saludo" } };
  function aplicarPlantilla(esc, rol, d) { const P = PLANTILLAS[rol]; if (!P) return esc; const x = JSON.parse(JSON.stringify(esc)), dur = d ?? x.duracion ?? 4;
    x.rol = rol; x.camara = P.camara(dur); x.ambiente = Object.assign({}, x.ambiente, P.ambiente); if (P.efectos) x.efectos = P.efectos.map((e) => Object.assign({}, e)); if (P.fondo) x.fondo = Object.assign({}, x.fondo, { tipo: P.fondo });
    for (const a of x.actores || []) { if (P.accion) a.bloques = [{ t: Math.max(0, dur * 0.35), accion: P.accion, dur: Math.min(2.2, dur * 0.6), capa: "brazos" }, ...(a.bloques || []).filter((b) => b.capa !== "brazos")]; }
    return x; }

  // op.voz = { envolvente, desfase, habla }: voz que viene de fuera (el montaje de un short). desfase = segundo del short en el que empieza
  // la escena menos el punto de la escena desde el que se ve; habla = id del actor cuya boca la sigue (o "auto": el primer actor)
  let contadorDof = 0;
  function crear(svg, esc, PJ, op = {}) { formato(op.formato || esc.formato);
    const raiz = el("g", {}, svg), fondo = el("g", {}, raiz), lamAtras = el("g", {}, raiz), mundo = el("g", {}, raiz), lamDelante = el("g", {}, raiz), gDelante = el("g", {}, raiz), gRej = el("g", { "pointer-events": "none" }, raiz), gAmb = el("g", { "pointer-events": "none" }, raiz), gTextos = el("g", {}, raiz);
    let fondoKey = null;
    const actores = (esc.actores || []).map((a) => { const j = PJ[a.personaje]; const g = el("g", { "data-actor": a.id }, mundo);
      if (!j) { const tx = el("text", { fill: "#f66", "font-size": 40 }, g); tx.textContent = "falta el personaje «" + a.personaje + "»"; return { a, g, m: null, j: null }; }
      // ILUMINACIÓN DEL ACTOR (a.luz): tono de la escena (noche: más oscuro y frío) y un filo de luz del color de una fuente (la puerta,
      // el fuego) en el lado que da a ella. a.luz = { noche: 0…1, color: "#ffb860", lado: 1 (derecha) | -1, ancho: 7, fuerza: 0.9 }
      if (a.luz) { const L = a.luz, fid = "luz-" + (++contadorDof) + "-" + a.id, defsL = (svg.ownerSVGElement || svg).querySelector("defs") || el("defs", {}, svg.ownerSVGElement || svg), k = L.noche || 0;
        const f = el("filter", { id: fid, x: "-20%", y: "-10%", width: "140%", height: "120%" }, defsL);
        el("feColorMatrix", { in: "SourceGraphic", type: "matrix", result: "tono", values: `${1 - 0.38 * k} 0 0 0 ${0.01 * k}  0 ${1 - 0.34 * k} 0 0 ${0.015 * k}  0 0 ${1 - 0.14 * k} 0 ${0.05 * k}  0 0 0 1 0` }, f);
        if (L.color) { el("feOffset", { in: "SourceAlpha", dx: -(L.lado ?? 1) * (L.ancho ?? 7), dy: 0, result: "corrido" }, f);
          el("feComposite", { in: "SourceAlpha", in2: "corrido", operator: "out", result: "filo" }, f);
          el("feFlood", { "flood-color": L.color, "flood-opacity": L.fuerza ?? 0.9 }, f); el("feComposite", { in2: "filo", operator: "in", result: "luzF" }, f);
          el("feGaussianBlur", { in: "luzF", stdDeviation: 1.6, result: "luzB" }, f);
          const mg = el("feMerge", {}, f); el("feMergeNode", { in: "tono" }, mg); el("feMergeNode", { in: "luzB" }, mg); }
        g.setAttribute("filter", `url(#${fid})`); }
      return { a, g, j, m: Personajes.crear(g, j, { id: "esc-" + a.id }) }; });
    // ESPACIO 2,5D: cada cosa está en (x, profundidad p) sobre el suelo; la cámara está a una distancia D del plano p = 0 y a una altura
    // «alto» (claves de cámara: alto; 450 por defecto). Proyección en perspectiva: lo lejano encoge, sube hacia el horizonte (que queda a la
    // altura de la cámara) y se mueve menos al moverse la cámara (paralaje). p < 0 = más cerca que el plano de referencia (primeros términos).
    // Con alto 450, p = 1 da la escala (0,62) y la altura (−170) de antes, así que las escenas antiguas se ven parecidas.
    const D3 = 1600, Z_P = 980; let CAM = { x: 0, alto: 450 };
    const sDe = (p) => { const z = Z_P * (p || 0); return D3 / Math.max(60, D3 + z); };
    function proy(x, p) { const s = sDe(p); return { x: CAM.x + ((x || 0) - CAM.x) * s, y: -CAM.alto * (1 - s), s }; }
    const horizonte = (zFondo) => -CAM.alto * (1 - D3 / (D3 + zFondo));
    // atrezo: objetos de la escena (ATREZO en comun/atrezo.js), colocados como los personajes; sus parámetros pueden llevar claves
    const objetos = (esc.objetos || []).map((ob) => ({ ob, g: el("g", { "data-objeto": ob.id || ob.tipo }, mundo), k: null }));
    function objeto(O, t) { const ob = O.ob, q = claves(ob.claves, t, [...new Set((ob.claves || []).flatMap((k) => Object.keys(k)))].filter((c) => c !== "t" && c !== "curva")) || {};
      const x = q.x ?? ob.x ?? 0, frio = ob.frio ?? ["noche", "luna", "tormenta"].includes(esc.fondo?.tipo || "noche");
      const pr = proy(x, ob.p), esc0 = (ob.escala || 1) * pr.s;
      O.g.setAttribute("transform", `translate(${f1(pr.x)} ${f1(pr.y)}) scale(${((ob.espejo ? -1 : 1) * esc0).toFixed(3)} ${esc0.toFixed(3)})`);
      const params = Object.assign({}, ob.params || {}, q); delete params.x; delete params.t; delete params.curva;
      if (ob.alFondo) params.horizonte = Math.round(horizonte(18000) / esc0);   // decorados de escena entera (mar Rojo): su horizonte es el del fondo
      const A = window.ATREZO && ATREZO[ob.tipo], clave = JSON.stringify([ob.tipo, params, frio]) + (A && A.anima ? "|" + t.toFixed(3) : "");
      if (clave !== O.k) { O.k = clave; O.g.innerHTML = window.Atrezo ? Atrezo.dibujar({ tipo: ob.tipo, params, frio }, t) : ""; }
      return ob.p || 0; }
    function camara(t) { const c = claves(esc.camara, t, ["x", "y", "zoom", "tilt", "roll", "alto"]) || { x: 0, y: -360, zoom: 1 }; const [dx, dy] = sacudida(esc, t);   // tilt: ángulo (−0,3 contrapicado … 0,6 picado; 0,18 normal); roll: cámara ladeada (grados)
      if (!esc.camaraFija) { const z0 = c.zoom || 1; c.x += (9 * Math.sin(t * 0.53) + 4 * Math.sin(t * 1.31)) / z0; c.y += (6 * Math.sin(t * 0.41 + 1) + 3 * Math.sin(t * 1.07)) / z0; c.zoom = z0 * (1 + 0.006 * Math.sin(t * 0.29)); } if (dx || dy) { c.x += dx / (c.zoom || 1); c.y += dy / (c.zoom || 1); } return c; }
    function dibujar(t) {
      const c = camara(t), z = c.zoom || 1;
      const k = JSON.stringify(esc.fondo || {}) + Math.round(c.x / 4); if (k !== fondoKey) { fondoKey = k; pintarFondo(fondo, esc.fondo, c.x); }
      const tr = `translate(${ANCHO / 2} ${ALTO / 2})${c.roll ? ` rotate(${c.roll.toFixed(2)})` : ""} scale(${z}) translate(${f1(-c.x)} ${f1(-c.y)})`;
      const LH = lamHorizonte(); let alto = c.alto ?? esc.camaraAlto ?? 450; dAlto = 0;
      if (LH != null) { dAlto = Math.max(-220, Math.min(300, (alto - 450) * 0.6)); alto = -LH + dAlto; }
      CAM = { x: c.x, alto };
      // el fondo (cielo, montes, suelo) se coloca con el horizonte a la altura de la cámara; en un interior, la pared del fondo está cerca
      const hz = horizonte((esc.fondo?.tipo || "noche") === "interior" ? Z_P * 1.15 : 18000);
      fondo.setAttribute("transform", tr + ` translate(0 ${f1(hz)})`); mundo.setAttribute("transform", tr);
      // PROFUNDIDAD DE CAMPO: en los planos cerrados el fondo se desenfoca (más cuanto más zoom); esc.desenfoque = false lo quita
      const dof = esc.desenfoque === false ? 0 : cl((z - 1.55) / 1.5) * (esc.desenfoque || 1) * 8;
      if (dof > 0.3) { dofStd.setAttribute("stdDeviation", (dof / z).toFixed(2)); fondo.setAttribute("filter", `url(#${dofId})`); lamAtras.setAttribute("filter", `url(#${dofId})`); } else { fondo.removeAttribute("filter"); lamAtras.removeAttribute("filter"); }
      tPlacas = t; pintarPlacas(c, tr);
      if ((esc.fondo?.tipo || "noche") !== "color") vivo(fondo, gDelante, esc.fondo, t, c.x, z);
      Titere25D.camara({ tilt: LH != null ? Math.max(0.1, Math.min(0.48, 0.18 * CAM.alto / 450)) + ((c.tilt ?? 0.18) - 0.18) * 0.35 : (c.tilt ?? 0.18) });   // con lámina, el ángulo de los títeres sale de la altura de la cámara
      const orden = [];
      const conFisica = actores.some((A) => A.j && (A.j.piezas || []).some((pz) => pz.fisica && pz.fisica.activa !== false));
      // física de las piezas: si el tiempo salta (vídeo renderizado por trozos, cabezal movido), se simula el segundo anterior para llegar
      // a t con la pieza en el mismo estado que si se hubiera reproducido seguido
      if (conFisica && !(t > tAnterior && t - tAnterior <= 0.25)) { for (let u = Math.max(0, t - 1); u < t - 1e-6; u += 1 / 30) for (const A of actores) if (A.m) actor(A, u); }
      tAnterior = t;
      for (const A of actores) { if (!A.m) continue; const q = actor(A, t); orden.push({ g: A.g, p: q.p || 0 }); }
      for (const O of objetos) orden.push({ g: O.g, p: O.ob.alFondo ? 99 + objeto(O, t) : objeto(O, t) + (O.ob.detras ? 0.0005 : -0.0005) });   // alFondo: decorado de escena entera, detrás de todos
      orden.sort((x, y) => y.p - x.p).forEach((o) => mundo.appendChild(o.g));
      // REJILLA DE PROFUNDIDAD (editor: botón # de la planta, o esc.rejilla): líneas del suelo en p = −0,5 … 4 y el horizonte de la cámara
      gRej.replaceChildren(); if (esc.rejilla || window.REJILLA_PROF) { gRej.setAttribute("transform", tr);
        for (const p of [-0.5, -0.25, 0, 0.25, 0.5, 1, 2, 4]) { const y = proy(0, p).y; el("line", { x1: c.x - 4000, x2: c.x + 4000, y1: y, y2: y, stroke: p === 0 ? "#ff5a8a" : "#5af0ff", "stroke-width": 3 / z, opacity: 0.8 }, gRej);
          const tx = el("text", { x: c.x - ANCHO / 2 / z + 12 / z, y: y - 6 / z, fill: "#5af0ff", "font-size": 26 / z, "font-family": "monospace" }, gRej); tx.textContent = "p " + p; }
        el("line", { x1: c.x - 4000, x2: c.x + 4000, y1: -CAM.alto, y2: -CAM.alto, stroke: "#ffd54a", "stroke-width": 4 / z, "stroke-dasharray": `${20 / z} ${12 / z}` }, gRej);
        const th = el("text", { x: c.x - ANCHO / 2 / z + 12 / z, y: -CAM.alto - 8 / z, fill: "#ffd54a", "font-size": 26 / z, "font-family": "monospace" }, gRej); th.textContent = "horizonte"; }
      pintarAmbiente(gAmb, esc, t);
      pintarTextos(t);
    }
    // LÁMINA: fondo hecho de una ilustración vectorial por capas (comun/lamina-vectorizar.py → ilustraciones/<nombre>, window.LAMINAS).
    // esc.fondo = { tipo: "lamina", lamina: "tumba-noche-1", capas: [{ id: "lejos", par: 0.85 }, { id: "medio", par: 0.25 }, { id: "delante", par: -0.35, delante: true }],
    //               centro: { x, y } (punto del mundo que mira la cámara cuando la lámina llena la pantalla), escala: 1.15 (margen para moverse) }
    // par: 1 = pegada a la cámara (muy lejos) … 0 = se mueve con el mundo … negativo = más cerca que los personajes (se mueve más).
    const LAM = (esc.fondo?.tipo === "lamina" && window.LAMINAS) ? window.LAMINAS[esc.fondo.lamina] : null, placas = [];
    if (LAM) for (const c of esc.fondo.capas || LAM.capasDef || Object.keys(LAM.capas).map((id, i, a) => ({ id, par: [0.85, 0.3, -0.3][i] ?? 0, delante: i === a.length - 1 && a.length > 2 })))
      { const g = el("g", { "data-capa": c.id }, c.delante ? lamDelante : lamAtras); g.innerHTML = LAM.capas[c.id] || "";
        // grupos con movimiento propio (data-anim, ver comun/formas.py: nubes que derivan, árboles y plantas que se mecen, estrellas, humo…)
        const anims = [...g.querySelectorAll("[data-anim]")].map((e) => { try { return { e, ks: JSON.parse(e.getAttribute("data-anim")) }; } catch { return null; } }).filter(Boolean);
        placas.push({ c, g, anims }); }
    let tPlacas = 0;
    // HORIZONTE DE LA LÁMINA: fondo.horizonte = altura del horizonte pintado (px de la referencia de 1376 de alto). Si está, la cámara toma
    // la altura que lo hace coincidir con el del espacio 2,5D: los personajes encogen y suben con la profundidad igual que el dibujo.
    // La capa del suelo debe ir con par 0. Los picados y contrapicados (clave «alto») suben o bajan la cámara un poco y cada capa se desplaza
    // según su profundidad (capa.p; por defecto: par ≥ 0,3 = horizonte, delante = −0,3, el resto = 0,3), así que fondo y personajes se mueven juntos.
    const lamSc = () => Math.max(ANCHO / LAM.ancho, ALTO / LAM.alto) * (esc.fondo.escala ?? 1.15);
    const lamHorizonte = () => (LAM && esc.fondo.horizonte != null) ? (esc.fondo.centro?.y ?? -400) - LAM.alto * lamSc() / 2 + esc.fondo.horizonte * (LAM.alto / 1376) * lamSc() : null;
    let dAlto = 0;
    // movimiento de un grupo de lámina en el instante t (coordenadas de la referencia de la lámina)
    function animar(A, t) { let tf = "", op = null;
      for (const k of A.ks) { const w = 2 * Math.PI * t / (k.periodo || 3) + (k.fase || 0), o = Math.sin(w);
        if (k.tipo === "deriva") tf += ` translate(${((k.vx || 0) * t).toFixed(2)} ${((k.vy || 0) * t).toFixed(2)})`;
        else if (k.tipo === "vaiven") { tf += ` translate(${((k.dx || 0) * o).toFixed(2)} ${((k.dy || 0) * o).toFixed(2)})`;
          if (k.rot) tf += ` rotate(${(k.rot * o).toFixed(3)} ${k.px || 0} ${k.py || 0})`;
          if (k.skew) tf += ` translate(0 ${k.py || 0}) skewX(${(k.skew * o).toFixed(3)}) translate(0 ${-(k.py || 0)})`; }
        else if (k.tipo === "latido") op = (op ?? 1) * ((k.min ?? 0.4) + ((k.max ?? 1) - (k.min ?? 0.4)) * (0.5 + 0.5 * o));
        else if (k.tipo === "sube") { const v = k.vida || 6, u = ((t + (k.fase || 0)) % v), e = 1 + (k.crece || 0) * u;
          tf += ` translate(${((k.vx || 0) * u).toFixed(2)} ${((k.vy || 0) * u).toFixed(2)}) translate(${k.px || 0} ${k.py || 0}) scale(${e.toFixed(3)}) translate(${-(k.px || 0)} ${-(k.py || 0)})`;
          op = (op ?? 1) * Math.min(1, u / 0.6, (v - u) / (v * 0.45)); } }
      if (tf) A.e.setAttribute("transform", tf.trim()); if (op != null) A.e.setAttribute("opacity", op.toFixed(3)); }
    function pintarPlacas(c, tr) { if (!LAM) return; const z = c.zoom || 1, X0 = esc.fondo.centro?.x ?? 0, Y0 = esc.fondo.centro?.y ?? -400;
      const sc = Math.max(ANCHO / LAM.ancho, ALTO / LAM.alto) * (esc.fondo.escala ?? 1.15), W = LAM.ancho * sc, H = LAM.alto * sc;
      for (const { c: k, g, anims } of placas) { for (const A of anims) animar(A, tPlacas); const par = k.par ?? 0, kz = Math.pow(z, -par), sL = k.p != null ? sDe(k.p) : k.delante ? sDe(-0.3) : par >= 0.3 ? 0 : sDe(0.3), oy = -dAlto * (1 - sL);
        // opacidad de la capa en el tiempo (fundir dos versiones: el mar cerrado → abierto): k.claves = [{ t, op }]
        if (k.claves) { const q = claves(k.claves, tPlacas, ["op"]); g.setAttribute("opacity", (q?.op ?? 1).toFixed(3)); }
        g.setAttribute("transform", `${tr} translate(0 ${f1(oy)}) translate(${f1(c.x)} ${f1(c.y)}) scale(${kz.toFixed(4)}) translate(${f1(-c.x)} ${f1(-c.y)}) translate(${f1((c.x - X0) * par)} ${f1((c.y - Y0) * par)}) translate(${f1(X0 - W / 2)} ${f1(Y0 - H / 2)}) scale(${sc.toFixed(4)})`); } }
    let tAnterior = -1;
    const dofId = "esc-dof-" + (++contadorDof), defsD = (svg.ownerSVGElement || svg).querySelector("defs") || el("defs", {}, svg.ownerSVGElement || svg);
    const dofF = el("filter", { id: dofId, x: "-5%", y: "-5%", width: "110%", height: "110%", filterUnits: "objectBoundingBox" }, defsD), dofStd = el("feGaussianBlur", { stdDeviation: 0 }, dofF);
    function actor(A, t) { const a = A.a; A.g.setAttribute("display", (a.desde != null && t < a.desde) || (a.hasta != null && t > a.hasta) ? "none" : "inline");
        const q = claves(a.recorrido, t, ["x", "p", "giro"]) || { x: 0, p: 0, giro: 20 }, pr = proy(q.x, q.p), esc0 = (a.escala || 1) * pr.s, X0 = pr.x, Y0 = pr.y;
        A.g.setAttribute("transform", `translate(${f1(X0)} ${f1(Y0)}) scale(${esc0.toFixed(3)})`);
        // velocidad: anda o corre sola si el recorrido la desplaza
        const q2 = claves(a.recorrido, t + 0.05, ["x", "p"]) || q, v = Math.hypot(q2.x - q.x, ((q2.p || 0) - (q.p || 0)) * 500) / 0.05;
        const anda = cl(v / 60), corre = cl((v - 330) / 200);
        // bloques activos en t, por capas: «todo» o «cuerpo» abajo, «brazos» encima (se puede saludar mientras se anda)
        // transición entre acciones: cada bloque entra y sale mezclándose (b.mezcla segundos, 0,3 por defecto; 0 = cambio seco).
        // Un bloque que acaba de terminar sigue pesando hasta desvanecerse, con la pose de su último instante.
        const TRm = (b) => b.mezcla ?? 0.3;
        const activos = (a.bloques || []).filter((b) => t >= b.t && t < b.t + (b.dur || 2) + TRm(b)).sort((x, y) => (x.capa === "brazos") - (y.capa === "brazos") || x.t - y.t);
        const base = { giro: q.giro ?? 20 }; let pz = Personajes.completa({}), ctrl = {}, loco = null;
        for (const b of activos) { const ac = Personajes.buscarAccion(A.j, b.accion); if (!ac) continue; const d = b.dur || 2, m = TRm(b), fin = b.t + d;
          const w = Math.min(b.t <= 0.001 || m <= 0 ? 1 : suave(cl((t - b.t) / m)), t < fin ? 1 : m <= 0 ? 0 : suave(cl(1 - (t - fin) / m)));
          if (w <= 0.001) continue;
          const pb = Personajes.accionPose(ac, Math.min(t, fin - 1e-3) - b.t + (b.desde || 0)), capa = b.capa || "todo";
          pz = Personajes.enCapas(pz, w >= 0.999 ? pb : Personajes.mezclar(pz, pb, w), capa);
          if (t < fin) { Object.assign(ctrl, b.controles || {}); if (capa !== "brazos" && ac.locomocion?.amp) loco = { ac, t0: b.t }; } }
        const pp = Personajes.conControles(pz, A.j.controles, ctrl);
        // agarrar: la mano va (por IK) a la mano de otro personaje o a un objeto, con medio segundo de transición
        for (const L of ["Izq", "Der"]) { const g = enClave((a.agarra || []).filter((k) => (k.mano || "Der") === L), t); if (!g) continue;
          const objetivo = (k) => { const w = puntoMundo(k?.a); return w ? [(w[0] - X0) / esc0, (w[1] - Y0) / esc0] : null; };
          const o1 = objetivo(g.k), o0 = objetivo(g.ant); let obj = o1 && o0 && g.f < 1 ? [lerp(o0[0], o1[0], g.f), lerp(o0[1], o1[1], g.f)] : o1, w = o1 ? (o0 ? 1 : g.f) : (o0 ? 1 - g.f : 0); if (!o1) obj = o0;
          if (!obj || w <= 0.001) continue; const sol = Personajes.ikMano(A.j, pp, L, base.giro || 0, obj);
          for (const c of ["K", "Lado", "Frente", "Codo", "Hacia"]) pp["b" + L + c] = lerp(pp["b" + L + c] ?? 0, sol["b" + L + c], w);
          pp["m" + L] = Personajes.mezclar({ m: pp["m" + L] }, { m: { agarra: 1 } }, w).m; }
        const e = Personajes.pose(pp, base);
        // mirar a un punto: la cabeza (±65°) y los ojos (±85°) giran hacia el objetivo; también arriba o abajo
        const mi = enClave(a.mirar, t);
        if (mi) { const ojo = A.wp?.cabeza || [X0, Y0 - 520 * esc0];
          const dir = (k) => { if (!k || !k.a || k.a === "nada") return null; if (k.a === "camara") return { yaw: 0, y: 0 };
            const w = puntoMundo(k.a === "habla" ? quienHabla(t, a.id) : k.a, "cabeza"); return w ? { yaw: Math.atan2(w[0] - ojo[0], 260), y: Math.max(-0.8, Math.min(0.8, (w[1] - ojo[1]) / 420)) } : null; };
          const d1 = dir(mi.k), d0 = dir(mi.ant), d = d1 && d0 && mi.f < 1 ? { yaw: lerp(d0.yaw, d1.yaw, mi.f), y: lerp(d0.y, d1.y, mi.f) } : d1 || d0, w = d1 ? (d0 ? 1 : mi.f) : (d0 ? 1 - mi.f : 0);
          if (d && w > 0.001) { const lim = (v, m) => Math.max(-m, Math.min(m, v)), rel = lim(d.yaw - e.torso, rad(65)), relO = lim(d.yaw - e.torso, rad(85));
            e.cabeza = lerp(e.cabeza, e.torso + rel, w); e.ojos = lerp(e.ojos, e.torso + relO, w); e.miraY = lerp(e.miraY || 0, d.y, w); } }
        if (loco) { const lo = loco.ac.locomocion; Object.assign(e, { amp: lo.amp, correr: lo.correr || 0, fase: (t - loco.t0) * (lo.cad || (lo.correr ? 1.45 : 0.95)) }); }
        // forma de andar del actor: zancada (más larga = menos pasos y más amplios) y estilo (cansado, alegre, con prisa, sigiloso)
        if (anda > 0.02 && !e.amp) { const an = a.andar || {}, z = an.zancada || 1, est = ESTILOS_ANDAR[an.estilo] || {}, zz = z * (est.zancada || 1);
          Object.assign(e, { amp: anda * Math.min(1.4, zz) * (est.amp || 1), correr: corre, fase: recorrido(a.recorrido, t) / ((corre > 0.5 ? 260 : 170) * zz) });
          if (est.inclina) e.inclina = (e.inclina || 0) + est.inclina * anda; if (est.miraY) e.miraY = (e.miraY || 0) + est.miraY * anda;
          if (est.bote) e.altura = (e.altura || 0) + est.bote * anda * Math.abs(Math.sin(2 * Math.PI * e.fase));
          if (est.cara) { e.cara = Object.assign({}, e.cara); for (const k in est.cara) e.cara[k] = Math.max(e.cara[k] || 0, est.cara[k] * anda); }
          if (est.hombros) e.hombros = (e.hombros || 0) + est.hombros * anda; }
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
        if (a.variantes) e.variantes = Object.assign({}, A.j.variantes || {}, a.variantes);   // variantes propias en esta escena (con o sin velo…)
        // VIDA: nadie está quieto del todo. Respira (pecho y hombros), pasa el peso de un pie a otro y la cabeza se mueve un poco; los
        // brazos que cuelgan sin acción se separan y doblan algo (colgados rectos parecían de madera). a.quieto = true lo desactiva.
        if (!a.quieto && !e.tumbado) { const ph = a.id.length * 1.7 + (a.id.charCodeAt(0) || 0) * 0.13, quietud = 1 - cl(anda * 3);
          e.altura = (e.altura || 0) + 2.5 * Math.sin(t * 2.1 + ph);
          e.hombros = (e.hombros || 0) + 1.5 * Math.sin(t * 2.1 + ph + 0.6);
          e.inclina = (e.inclina || 0) + 0.018 * quietud * Math.sin(t * 0.55 + ph);
          e.ladeo = (e.ladeo || 0) + 1.6 * quietud * Math.sin(t * 0.43 + ph * 2);
          if (!mi) { e.cabeza += 0.05 * quietud * Math.sin(t * 0.37 + ph); e.miraY = (e.miraY || 0) + 0.04 * quietud * Math.sin(t * 0.29 + ph); }
          if (!e.amp) for (const L of ["Izq", "Der"]) if (!e["brazo" + L]) { const s2 = L === "Izq" ? 1 : -1;
            e["brazo" + L] = { lado: 0.16 + 0.03 * Math.sin(t * 0.8 + ph + s2), frente: 0.1 + 0.04 * Math.sin(t * 0.55 + ph * s2), codo: 0.42 + 0.06 * Math.sin(t * 0.7 + ph), hacia: [0, -1, 0.3], k: 1 };
            if (!e["mano" + L]) e["mano" + L] = { relajada: 1 }; } }
        e.t = t; e.mundo = [X0 / esc0, Y0 / esc0];
        A.m.dibujar(e);
        // puntos del personaje en el mundo (para que otros le miren o le cojan de la mano en el fotograma siguiente)
        const P2 = A.m.puntos || {}, aMundo = (pt) => pt && [X0 + pt[0] * esc0, Y0 + pt[1] * esc0];
        A.wp = { cabeza: aMundo(P2.cabeza), manoIzq: aMundo(P2.manoIzq), manoDer: aMundo(P2.manoDer), pecho: aMundo(P2.pecho) };
        return q; }
    // clave vigente de una lista ({ t, … }, se mantiene hasta la siguiente), la anterior y cuánto va de la transición (0…1 en 0,4 s)
    function enClave(lista, t) { if (!lista || !lista.length) return null; const ks = [...lista].sort((x, y) => x.t - y.t); let i = -1; for (let n = 0; n < ks.length; n++) if (ks[n].t <= t) i = n;
      if (i < 0) return null; return { k: ks[i], ant: ks[i - 1] || null, f: suave(cl((t - ks[i].t) / 0.4)) }; }
    // punto del mundo por nombre: "pedro" (su cabeza), "pedro.manoIzq", un objeto del atrezo (su asa) o { x, y }
    function puntoMundo(ref, parte) { if (!ref || ref === "nada") return null; if (typeof ref === "object") return [ref.x || 0, ref.y || 0];
      const [id, pt] = String(ref).split("."); const A = actores.find((x) => x.a.id === id); if (A) return A.wp?.[pt || parte || "cabeza"] || A.wp?.cabeza || null;
      const O = objetos.find((x) => (x.ob.id || x.ob.tipo) === id); if (O) { const ob = O.ob, pr = proy(ob.x, ob.p), k = (ob.escala || 1) * pr.s, ag = ob.agarre || { x: 0, y: -120 };
        return [pr.x + ag.x * k * (ob.espejo ? -1 : 1), pr.y + ag.y * k]; }
      return null; }
    // quién habla en t (otro actor con un audio sonando, o el de la voz del montaje)
    function quienHabla(t, yo) { for (const au of esc.audios || []) if (au.habla && au.habla !== yo && t >= (au.t || 0) && t < (au.t || 0) + (au.dur || 1e9)) return au.habla;
      if (op.voz && op.voz.habla && op.voz.habla !== yo && op.voz.habla !== "auto") return op.voz.habla; return null; }
    // GRAFISMO (en pantalla, no se mueve con la cámara). Tres estilos de rótulo:
    //   (sin estilo)  cápsula oscura con texto (una etiqueta o una referencia: «Lucas 16:31»); arriba: true lo sube lejos de los subtítulos
    //   "titulo"      título grande de la marca (Bricolage), entra palabra a palabra con rebote; *palabra* va en naranja (el gancho)
    //   "cita"        versículo en itálica (Newsreader) que se va revelando, con la referencia debajo (ref: "LUCAS 16:31 · RVR1960")
    // Detrás del título y de la cita hay un velo oscuro para que se lean; mientras están, el montaje oculta los subtítulos.
    const svgRaiz = svg.ownerSVGElement || svg;
    const FUENTE_T = '"Bricolage Grotesque", Figtree, Inter, sans-serif', FUENTE_C = 'Newsreader, Georgia, serif', FUENTE_M = '"JetBrains Mono", Consolas, monospace';
    function partir(txt, porLinea) { const ls = []; let l = []; let n = 0;
      for (const w of String(txt).split(/\s+/).filter(Boolean)) { const m = w.replace(/\*/g, "").length; if (l.length && n + 1 + m > porLinea) { ls.push(l); l = []; n = 0; } l.push(w); n += (l.length > 1 ? 1 : 0) + m; }
      if (l.length) ls.push(l); return ls; }
    function velo(k, arriba) { const id = "esc-velo"; if (!svgRaiz.querySelector("#" + id)) { const defs = svgRaiz.querySelector("defs") || el("defs", {}, svgRaiz);
        const gr = el("linearGradient", { id, x1: 0, y1: 0, x2: 0, y2: 1 }, defs); el("stop", { offset: 0, "stop-color": "#14171e", "stop-opacity": 0.85 }, gr); el("stop", { offset: 0.42, "stop-color": "#14171e", "stop-opacity": 0.55 }, gr); el("stop", { offset: 0.7, "stop-color": "#14171e", "stop-opacity": 0 }, gr); }
      el("rect", { x: 0, y: 0, width: ANCHO, height: ALTO, fill: "url(#esc-velo)", opacity: k.toFixed(3) }, gTextos); }
    function tapaSubtitulos(t) { return (esc.textos || []).some((tx) => (tx.estilo === "titulo" || tx.estilo === "cita") && tx.sinSubtitulos !== false && t >= tx.t && t <= tx.t + (tx.dur || 2)); }
    function pintarTextos(t) {
      gTextos.replaceChildren();
      for (const tx of esc.textos || []) { const d = tx.dur || 2; if (t < tx.t || t > tx.t + d) continue; const u = t - tx.t, k2 = cl(u / 0.25) * cl((tx.t + d - t) / 0.25);
        if (tx.estilo === "titulo") { const tam = tx.tam || (ALTO === 1920 ? 104 : 88), ls = partir(tx.texto, Math.floor((ANCHO - 140) / (tam * 0.5))), y0 = tx.y ?? (ALTO === 1920 ? 360 : 200), sale = cl((tx.t + d - t) / 0.3);
          velo(0.9 * (tx.t <= 0.01 && tx.entra !== true ? 1 : cl(u / 0.3)) * sale); let iw = 0;   // en el segundo 0 el título ya está entero: es la miniatura
          ls.forEach((linea, li) => { const tt = el("text", { x: ANCHO / 2, y: f1(y0 + li * tam * 0.98), "text-anchor": "middle", "font-size": tam, "font-weight": 800, "font-family": FUENTE_T, "letter-spacing": "-0.03em", fill: "#f7f1e5" }, gTextos);
            linea.forEach((w, wi) => { const a = tx.t <= 0.01 && tx.entra !== true ? 1 : cl((u - 0.08 * iw++) / 0.28), rb = a < 1 ? 1 + 0.18 * Math.sin(a * Math.PI) : 1, luz = /\*/.test(w);
              const ts = el("tspan", { fill: luz ? "#f2a33a" : "#f7f1e5", opacity: (a * sale).toFixed(3), dy: wi === 0 ? 0 : 0, "font-size": f1(tam * (0.7 + 0.3 * a) * rb) }, tt); ts.textContent = (wi ? " " : "") + w.replace(/\*/g, ""); }); });
          continue; }
        if (tx.estilo === "cita") { const tam = tx.tam || (ALTO === 1920 ? 66 : 56), ls = partir("«" + String(tx.texto).replace(/^«|»$/g, "") + "»", Math.floor((ANCHO - 160) / (tam * 0.44))), y0 = tx.y ?? (tx.arriba === false ? ALTO * 0.42 : (ALTO === 1920 ? 330 : 160)), sale = cl((tx.t + d - t) / 0.35);
          velo(0.95 * cl(u / 0.35) * sale); const total = ls.reduce((n, l) => n + l.length, 0), ritmo = Math.max(0.12, Math.min(0.32, (d * 0.6) / total)); let iw = 0;
          ls.forEach((linea, li) => { const tt = el("text", { x: ANCHO / 2, y: f1(y0 + li * tam * 1.2), "text-anchor": "middle", "font-size": tam, "font-style": "italic", "font-family": FUENTE_C, fill: "#f7f1e5" }, gTextos);
            linea.forEach((w, wi) => { const a = cl((u - 0.15 - ritmo * iw++) / 0.35); const ts = el("tspan", { opacity: ((0.15 + 0.85 * a) * cl(u / 0.3) * sale).toFixed(3) }, tt); ts.textContent = (wi ? " " : "") + w; }); });
          if (tx.ref) { const r = el("text", { x: ANCHO / 2, y: f1(y0 + ls.length * tam * 1.2 + 26), "text-anchor": "middle", "font-size": 30, "font-family": FUENTE_M, "letter-spacing": "0.08em", fill: "#f3c9b6", opacity: (cl((u - 0.5) / 0.4) * sale).toFixed(3) }, gTextos); r.textContent = tx.ref; }
          continue; }
        const w = 40 + String(tx.texto).length * 30, yR = tx.arriba ? (ALTO === 1920 ? 300 : 90) : (ALTO === 1920 ? 1400 : ALTO - 210);   // arriba: lejos de los subtítulos
        el("rect", { x: ANCHO / 2 - w / 2, y: yR, width: w, height: 92, rx: 16, fill: "#14171e", opacity: (0.88 * k2).toFixed(2) }, gTextos);
        const tt = el("text", { x: ANCHO / 2, y: yR + 62, "text-anchor": "middle", fill: "#f7f1e5", "font-size": 52, "font-weight": 700, "font-family": "Inter, Segoe UI, sans-serif", opacity: k2.toFixed(2) }, gTextos); tt.textContent = tx.texto; }
    }
    return { dibujar, actores, objetos, camara, raiz, tapaSubtitulos };
  }
  window.Escena = { crear, claves, PLANTILLAS, aplicarPlantilla, FONDOS, fondoDe, PARTICULAS, ESTILOS_ANDAR, formato, get ANCHO() { return ANCHO; }, get ALTO() { return ALTO; } };
})();
