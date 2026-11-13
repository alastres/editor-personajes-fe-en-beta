// Atrezo y decorados de escena: objetos que no van atados a un personaje (árboles, tumba, barca, mesa, casas…).
// Cada objeto se dibuja con la base en y = 0 (el suelo), a la escala de un personaje (≈ 600 de alto), y devuelve SVG.
// Estilo de la marca: siluetas planas en 3-4 tonos, cápsulas de textura, lo frío más apagado (o.frio = noche).
// La escena los coloca como a los personajes: x, profundidad p (0 delante … 1 al fondo), escala y espejo.
// Para añadir uno: ATREZO.nombre = { nombre, params: { clave: [min, max, paso, valor, "etiqueta"] }, dibujar(o, t) }.
(() => {
  const f1 = (v) => Math.round(v * 10) / 10, cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const circ = (x, y, r, c, o = 1) => `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}" fill="${c}" opacity="${o}"/>`;
  const caps = (x, y, l, g, c, o = 1, rot = 0) => `<rect x="${f1(x - l / 2)}" y="${f1(y - g / 2)}" width="${f1(l)}" height="${f1(g)}" rx="${f1(g / 2)}" fill="${c}" opacity="${o}"${rot ? ` transform="rotate(${rot} ${f1(x)} ${f1(y)})"` : ""}/>`;
  const sombra = (rx, o = 0.22) => `<ellipse cx="0" cy="4" rx="${f1(rx)}" ry="${f1(rx * 0.16)}" fill="#1c1230" opacity="${o}"/>`;
  const P = (d, c, o = 1) => `<path d="${d}" fill="${c}"${o < 1 ? ` opacity="${o}"` : ""}/>`;
  const T = (d, c, w, o = 1) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${o < 1 ? ` opacity="${o}"` : ""}/>`;
  // halo de luz (los degradados solo en cielos y halos: excepción de la marca); un degradado por color, compartido
  const halo = (x, y, r, c, o) => `<defs><radialGradient id="atz-h-${c.slice(1)}"><stop offset="0" stop-color="${c}" stop-opacity="1"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient></defs><circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}" fill="url(#atz-h-${c.slice(1)})" opacity="${o.toFixed(2)}"/>`;
  // paleta: cálida de día, fría de noche
  const pal = (o, dia, noche) => (o.frio ? noche : dia);

  const ATREZO = {
    olivo: { nombre: "Olivo", params: {}, dibujar(o) { const h = pal(o, ["#6a4a3a", "#5a7a4a", "#7a9a5a", "#4a6a3a", "#9aba72"], ["#3e3e52", "#45465f", "#555670", "#30314a", "#64668a"]);
      return sombra(150) + P("M-16 0 C -10 -120 -34 -180 -8 -270 L 14 -270 C 0 -170 22 -110 18 0 Z", h[0]) + T("M-6 -200 C -40 -230 -70 -240 -90 -260", h[0], 12)
        + `<ellipse cx="-70" cy="-290" rx="125" ry="72" fill="${h[3]}"/><ellipse cx="74" cy="-306" rx="112" ry="66" fill="${h[1]}"/><ellipse cx="0" cy="-360" rx="125" ry="72" fill="${h[2]}"/>`
        + caps(-40, -370, 90, 14, h[4], 0.7) + caps(60, -320, 70, 12, h[3], 0.6) + caps(-100, -290, 60, 12, h[1], 0.6); } },

    palmera: { nombre: "Palmera", anima: true, params: {}, dibujar(o, t) { const h = pal(o, ["#7a5a42", "#5a4030", "#4a7a4a", "#6a9a5a", "#3a5a3a"], ["#3e3a4e", "#2e2a3e", "#3a4a5a", "#4a5a6e", "#2a3446"]);
      const sw = 6 * Math.sin(t * 0.9);
      let s = sombra(110) + P("M-14 0 C -4 -200 20 -420 44 -620 L 62 -616 C 40 -420 18 -200 16 0 Z", h[0]);
      for (let k = 0; k < 9; k++) s += caps(6 + k * 4.6 + 14, -40 - k * 64, 34, 8, h[1], 0.6, -8);
      const hoja = (a, l, c) => { const r = (a * Math.PI) / 180, x2 = 52 + Math.cos(r) * l + sw, y2 = -620 + Math.sin(r) * l * 0.6 + l * 0.35;
        return T(`M52 -620 Q ${f1(52 + Math.cos(r) * l * 0.5 + sw / 2)} ${f1(-660 + Math.sin(r) * l * 0.3)} ${f1(x2)} ${f1(y2)}`, c, 26); };
      [[200, 230, h[4]], [-20, 230, h[4]], [160, 250, h[2]], [20, 250, h[2]], [120, 210, h[3]], [60, 210, h[3]], [250, 170, h[2]], [-70, 170, h[2]]].forEach(([a, l, c]) => (s += hoja(a, l, c)));
      return s + circ(44, -606, 14, h[1]) + circ(66, -600, 12, h[1]); } },

    arbusto: { nombre: "Matorral", params: {}, dibujar(o) { const h = pal(o, ["#4a6a3a", "#5a7a4a", "#7a9a5a"], ["#30314a", "#3a3b56", "#4a4c68"]);
      return sombra(110, 0.18) + `<ellipse cx="-50" cy="-50" rx="70" ry="52" fill="${h[0]}"/><ellipse cx="50" cy="-46" rx="66" ry="48" fill="${h[1]}"/><ellipse cx="0" cy="-86" rx="72" ry="56" fill="${h[2]}"/>` + caps(-10, -110, 50, 10, "#ffffff", 0.18) + caps(40, -60, 36, 9, h[0], 0.6); } },

    roca: { nombre: "Roca", params: { ancho: [0.5, 2.5, 0.05, 1, "Ancho"] }, dibujar(o) { const w = o.ancho ?? 1, h = pal(o, ["#a87068", "#86545c", "#c89a8a"], ["#5e5a72", "#4a465e", "#7a7690"]);
      return sombra(170 * w) + P(`M${-170 * w} 0 C ${-170 * w} -90 ${-90 * w} -170 ${10 * w} -170 C ${110 * w} -170 ${170 * w} -90 ${180 * w} 0 Z`, h[0]) + P(`M${10 * w} -170 C ${110 * w} -170 ${170 * w} -90 ${180 * w} 0 L ${100 * w} 0 C ${100 * w} -70 ${70 * w} -140 ${10 * w} -158 Z`, h[1])
        + caps(-60 * w, -110, 110 * w, 14, h[2], 0.8, -16) + caps(60 * w, -60, 70 * w, 12, h[2], 0.6, 8); } },

    // tumba excavada en la roca: abierta 0 (piedra en su sitio) … 1 (corrida), luz que sale, sello
    tumba: { nombre: "Tumba", anima: true, params: { abierta: [0, 1, 0.01, 0, "Piedra corrida"], luz: [0, 1, 0.01, 0, "Luz de dentro"], sello: [0, 1, 0.01, 0, "Sello"] }, dibujar(o, t) {
      const Rc = pal(o, ["#a87068", "#86545c", "#c89a8a", "#b8887a", "#8a5a60", "#d8a890", "#6a4250"], ["#5e5a72", "#4a465e", "#7a7690", "#6e6a84", "#58546c", "#857f98", "#3e3a50"]);
      const abierta = o.abierta || 0, luz = o.luz || 0, sello = o.sello || 0;
      let s = P("M-480 0 C -460 -310 -230 -455 40 -455 C 310 -455 480 -300 500 0 Z", Rc[0]) + P("M40 -455 C 310 -455 480 -300 500 0 L 340 0 C 340 -200 250 -380 40 -425 Z", Rc[1]);
      s += caps(-150, -330, 230, 20, Rc[2], 0.8, -14) + caps(170, -250, 180, 18, Rc[2], 0.6, 10) + caps(-300, -150, 140, 16, Rc[2], 0.6, -20) + caps(260, -80, 120, 14, Rc[1], 0.7, 6);
      s += P("M-105 0 L -105 -175 C -105 -258 105 -258 105 -175 L 105 0 Z", "#1c1428");
      if (luz > 0) { s += P("M-105 0 L -105 -175 C -105 -258 105 -258 105 -175 L 105 0 Z", "#ffe3a0", 0.9 * luz);
        for (let k = 0; k < 9; k++) { const a = -Math.PI / 2 + (k - 4) * 0.24 + 0.02 * Math.sin(t * 1.3 + k);
          s += P(`M0 -110 L ${f1(Math.cos(a - 0.045) * 1500)} ${f1(-110 + Math.sin(a - 0.045) * 1500)} L ${f1(Math.cos(a + 0.045) * 1500)} ${f1(-110 + Math.sin(a + 0.045) * 1500)} Z`, "#fff0c8", (0.08 + 0.05 * (k % 2)) * luz); }
        s += `<rect x="-74" y="-42" width="148" height="30" rx="12" fill="#f4ead8" opacity="${(0.9 * luz).toFixed(2)}"/>`; }
      const px = 250 * abierta, rot = 170 * abierta;
      s += `<ellipse cx="${f1(px)}" cy="-6" rx="150" ry="22" fill="#000" opacity="0.18"/>`;
      s += `<g transform="translate(${f1(px)} -130) rotate(${f1(rot)})"><circle r="134" fill="${Rc[3]}"/>${P("M-134 0 A 134 134 0 0 0 134 0 Z", Rc[4], 0.55)}<circle r="134" fill="none" stroke="${Rc[4]}" stroke-width="16"/><circle r="58" fill="${Rc[4]}"/><rect x="-11" y="-124" width="22" height="42" rx="11" fill="${Rc[5]}"/>${caps(-50, 60, 60, 10, Rc[5], 0.5, 20)}</g>`;
      if (sello > 0) s += T(`M${f1(px - 125)} -180 L ${f1(px + 125)} -72`, "#be3f1c", 10, cl(sello)) + circ(px, -130, 30, "#be3f1c", cl(sello)) + circ(px, -130, 14, "#e86a4a", cl(sello));
      return s + P("M-580 -4 C -200 -22 300 -22 620 -4 L 620 30 L -580 30 Z", Rc[6]); } },

    // MAR ROJO que se divide (Éxodo 14): decorado de escena entera. Mar hasta el horizonte (y = −260), orilla de arena delante (donde está
    // el pueblo, y > −60) y, al abrirse (abre 0…1), un camino de fondo seco que se pierde en el horizonte entre dos muros de agua con
    // cresta de espuma, salpicaduras y peces. Se pone con «alFondo» (detrás de todos los personajes), en x 0, p 0, escala 1.
    marRojo: { nombre: "Mar Rojo (se divide)", anima: true, params: { abre: [0, 1, 0.01, 0, "Se abre"] }, dibujar(o, t) {
      const A = cl(o.abre || 0), Ae = A * A * (3 - 2 * A), H = Math.min(-120, o.horizonte ?? -260), Y0 = -60, frio = o.frio;
      const C = frio ? { mar: "#24365a", mar2: "#30487a", luz: "#6a8ac0", muro: "#3a5a90", muro2: "#2a4272", espuma: "#c8d8f4", fondo: "#4a4a5e", fondo2: "#3a3a4e", arena: "#5a5468", arena2: "#4a4558" }
        : { mar: "#2e6a8e", mar2: "#3e86a8", luz: "#8ac8dc", muro: "#4a9ab8", muro2: "#2e7298", espuma: "#f0faff", fondo: "#a88a68", fondo2: "#8a6e52", arena: "#d8b884", arena2: "#c4a070" };
      const X = (y) => (y - H) / (Y0 - H);                      // 0 en el horizonte … 1 en la orilla (y más allá)
      const ancho = (y) => Ae * (14 + 300 * X(y) ** 1.15), alto = (y) => Ae * (24 + 860 * X(y) ** 1.25);
      let s = P(`M-6000 ${H} L 6000 ${H} L 6000 3000 L -6000 3000 Z`, C.mar);
      // reflejos del mar (rayas de luz que se mueven)
      for (let k = 0; k < 18; k++) { const y = H + 8 + (k * k) * 1.4, w = 40 + k * 14, x = ((k * 377 + t * (20 + k)) % 2400) - 1200; s += caps(x, y, w, 3 + k * 0.4, C.luz, 0.35); }
      // camino de fondo marino seco y los dos muros (de lejos a cerca, en tiras, para que el de delante tape al de atrás)
      if (Ae > 0.002) { const N = 24, ys = Array.from({ length: N + 1 }, (_, i) => H + (Y0 - 4 - H) * (i / N) ** 1.4);
        const borde = (sg) => ys.map((y) => [sg * ancho(y), y]);
        s += P(`M${borde(-1).map(([x, y]) => `${f1(x)} ${f1(y)}`).join(" L ")} L ${borde(1).reverse().map(([x, y]) => `${f1(x)} ${f1(y)}`).join(" L ")} Z`, C.fondo);
        for (let i = 2; i < N; i += 3) { const y = ys[i], w = ancho(y) * 0.8; s += caps(((i * 53) % 7 - 3) * w * 0.15, y, w * 0.5, 2 + 6 * X(y), C.fondo2, 0.7); }
        for (const sg of [-1, 1]) { const cara = [], cresta = [], hombro = [];
          for (const y of ys) { const x = sg * ancho(y), h = alto(y), ola = 10 * X(y) * Math.sin(t * 3 + y * 0.05 + sg); cara.push([x, y]); cresta.push([x + sg * 6, y - h + ola]); hombro.push([x + sg * (h * 0.9 + 60), y + 4]); }
          // lomo del muro (del borde de arriba baja hacia fuera hasta el nivel del mar)
          s += P(`M${cresta.map(([x, y]) => `${f1(x)} ${f1(y)}`).join(" L ")} L ${hombro.slice().reverse().map(([x, y]) => `${f1(x)} ${f1(y)}`).join(" L ")} Z`, C.muro2);
          // cara del muro que da al camino (más clara arriba)
          s += P(`M${cara.map(([x, y]) => `${f1(x)} ${f1(y)}`).join(" L ")} L ${cresta.slice().reverse().map(([x, y]) => `${f1(x)} ${f1(y)}`).join(" L ")} Z`, C.muro);
          s += P(`M${cara.map(([x, y]) => `${f1(x)} ${f1(y)}`).join(" L ")} L ${cresta.slice().reverse().map(([x, y], i, a) => { const [cx, cy] = cara[a.length - 1 - i]; return `${f1(x + (cx - x) * 0.45)} ${f1(y + (cy - y) * 0.45)}`; }).join(" L ")} Z`, C.muro2, 0.45);
          // peces nadando dentro del muro
          for (let k = 0; k < 6; k++) { const yy = ys[10 + k * 2] || Y0, h = alto(yy), x = sg * (ancho(yy) + 4), fy = yy - h * (0.3 + 0.1 * (k % 3)) + 6 * Math.sin(t * 2 + k), L = 10 + 26 * X(yy), dx = sg * (k % 2 ? 1 : -1);
            s += `<path d="M${f1(x - L)} ${f1(fy)} Q ${f1(x)} ${f1(fy - L * 0.45)} ${f1(x + L)} ${f1(fy)} Q ${f1(x)} ${f1(fy + L * 0.45)} ${f1(x - L)} ${f1(fy)} Z M${f1(x - L)} ${f1(fy)} l ${f1(-L * 0.5 * dx)} ${f1(-L * 0.35)} l 0 ${f1(L * 0.7)} Z" fill="${C.muro2}" opacity="${(0.7 * Ae).toFixed(2)}"/>`; }
          // frente del muro junto a la orilla: cara de agua curva (más clara) que baja de la cresta al suelo, con espuma que cae
          { const [xc, yc] = cara[N], [xt, yt] = cresta[N], [xh, yh] = hombro[N], h = yc - yt;
            s += P(`M${f1(xc)} ${f1(yc)} L ${f1(xt)} ${f1(yt)} Q ${f1(xt + sg * h * 0.55)} ${f1(yt - 30)} ${f1(xh)} ${f1(yh)} Z`, C.muro);
            s += P(`M${f1(xc)} ${f1(yc)} L ${f1(xt)} ${f1(yt)} Q ${f1(xt + sg * h * 0.25)} ${f1(yt + h * 0.3)} ${f1(xc + sg * h * 0.45)} ${f1(yc)} Z`, C.luz, 0.35);
            for (let k = 0; k < 5; k++) { const u = (t * 0.9 + k * 0.2) % 1; s += circ(xt + sg * (12 + k * 14), yt + u * h * 0.9, 6 + 4 * (1 - u), C.espuma, (0.7 * (1 - u) * Ae).toFixed(2)); }
            s += circ(xt + sg * 18, yt + 6, 22 * Ae, C.espuma, 0.85); }
          // cresta de espuma que ondula y salpicaduras que saltan de ella
          s += T(`M${cresta.map(([x, y]) => `${f1(x)} ${f1(y)}`).join(" L ")}`, C.espuma, 10, 0.9);
          s += T(`M${cresta.map(([x, y], i) => `${f1(x + sg * 14)} ${f1(y + 12 + 4 * Math.sin(t * 4 + i))}`).join(" L ")}`, C.espuma, 5, 0.4);
          for (let k = 0; k < 14; k++) { const i = 6 + ((k * 7) % (N - 6)), [x, y] = cresta[i], u = (t * 1.3 + k * 0.37) % 1, r = (2 + 7 * X(ys[i])) * (1 - u);
            s += circ(x + sg * (10 + 60 * u * X(ys[i])), y - 70 * u * (1 - u) * 4 * X(ys[i]), r, C.espuma, (0.8 * (1 - u) * Ae).toFixed(2)); } } }
      // orilla de arena con el borde de espuma
      const orilla = (k) => `M-6000 ${Y0} ${Array.from({ length: 61 }, (_, i) => { const x = -6000 + i * 200; return `L ${x} ${f1(Y0 + k + 6 * Math.sin(x * 0.01 + t * 1.5))}`; }).join(" ")} L 6000 3000 L -6000 3000 Z`;
      s += P(orilla(-6), C.espuma, 0.7) + P(orilla(4), C.arena) + P(orilla(60), C.arena2, 0.35);
      if (Ae > 0.002) s += P(`M${f1(-ancho(Y0))} ${Y0 + 4} L ${f1(ancho(Y0))} ${Y0 + 4} L ${f1(ancho(Y0) * 1.3)} 3000 L ${f1(-ancho(Y0) * 1.3)} 3000 Z`, C.fondo2, 0.25);
      return s; } },

    // barca de pesca con vela; se mece sola (meceo 0 = quieta)
    barca: { nombre: "Barca", anima: true, params: { vela: [0, 1, 1, 1, "Con vela"], meceo: [0, 1, 0.05, 0.5, "Se mece"] }, dibujar(o, t) {
      const h = pal(o, ["#7a4a32", "#5a3424", "#a86a42", "#f0e2c4", "#c8b898"], ["#3a2a30", "#2a1e26", "#4e3a40", "#9a98b0", "#7a7890"]), m = o.meceo ?? 0.5;
      let s = `<g transform="translate(0 ${f1(-6 * m * Math.sin(t * 1.4))}) rotate(${f1(3 * m * Math.sin(t * 1.1))})">`;
      if ((o.vela ?? 1) > 0.5) s += `<rect x="-8" y="-560" width="16" height="520" rx="6" fill="${h[1]}"/>` + P("M10 -540 L 10 -150 L 260 -170 Z", h[3]) + P("M10 -540 L 10 -150 L 90 -156 Z", h[4], 0.8) + T("M-8 -544 L 270 -168", h[1], 4, 0.6);
      s += P("M-330 -120 L 330 -120 C 300 -40 230 0 0 0 C -230 0 -300 -40 -330 -120 Z", h[0]) + P("M-330 -120 L 330 -120 L 316 -96 L -316 -96 Z", h[2]);
      s += P("M0 0 C 230 0 300 -40 330 -120 L 250 -96 C 220 -40 160 -16 0 -14 Z", h[1], 0.6);
      for (let k = -2; k <= 2; k++) s += caps(k * 110, -60, 70, 8, h[2], 0.5);
      return s + "</g>"; } },

    mesa: { nombre: "Mesa", params: { pan: [0, 1, 1, 1, "Pan y copa"] }, dibujar(o) { const h = pal(o, ["#8a5a3a", "#6a4028", "#b07a4a"], ["#4a3a40", "#382a30", "#5e4a50"]);
      let s = sombra(260) + `<rect x="-260" y="-230" width="520" height="34" rx="10" fill="${h[2]}"/><rect x="-260" y="-200" width="520" height="22" fill="${h[1]}"/>`;
      s += `<rect x="-230" y="-180" width="30" height="180" rx="8" fill="${h[1]}"/><rect x="200" y="-180" width="30" height="180" rx="8" fill="${h[1]}"/>` + caps(-60, -214, 220, 8, "#ffffff", 0.18);
      if ((o.pan ?? 1) > 0.5) s += `<ellipse cx="-90" cy="-246" rx="64" ry="24" fill="#d8a060"/><ellipse cx="-96" cy="-254" rx="40" ry="12" fill="#f0c890" opacity="0.8"/>` + P("M70 -230 L 110 -230 L 104 -270 C 130 -280 132 -320 120 -330 L 60 -330 C 48 -320 50 -280 76 -270 Z", "#c8a040") + `<ellipse cx="90" cy="-330" rx="30" ry="8" fill="#7a2a3a"/>`;
      return s; } },

    casa: { nombre: "Casa de adobe", params: { ventana: [0, 1, 0.01, 0, "Luz en la ventana"] }, dibujar(o) { const h = pal(o, ["#d8a878", "#b88458", "#e8c098", "#7a4a32", "#5a3424"], ["#6a5a6e", "#54465a", "#7a6a80", "#3a2a30", "#2a1e26"]);
      let s = sombra(330) + `<rect x="-300" y="-420" width="600" height="420" fill="${h[0]}"/><rect x="100" y="-420" width="200" height="420" fill="${h[1]}"/>`;
      s += `<rect x="-320" y="-450" width="640" height="40" rx="8" fill="${h[2]}"/>`; for (let k = -5; k <= 5; k++) s += circ(k * 56, -414, 10, h[3]);
      s += P("M-80 0 L -80 -190 C -80 -250 40 -250 40 -190 L 40 0 Z", h[4]) + `<rect x="160" y="-300" width="80" height="90" rx="8" fill="${(o.ventana || 0) > 0 ? "#ffd27a" : h[4]}"/>`;
      if ((o.ventana || 0) > 0) s += halo(200, -255, 220, "#ffd27a", 0.4 * o.ventana);
      return s + caps(-200, -300, 120, 14, h[2], 0.6) + caps(-160, -120, 90, 12, h[1], 0.5) + caps(220, -140, 80, 12, h[0], 0.5); } },

    columna: { nombre: "Columnas", params: { n: [1, 6, 1, 3, "Cuántas"] }, dibujar(o) { const n = Math.round(o.n ?? 3), h = pal(o, ["#e8d8c0", "#c8b498", "#fff0dc"], ["#7a7690", "#5e5a72", "#9a96b0"]), w = (n - 1) * 180;
      let s = sombra(w / 2 + 120); for (let k = 0; k < n; k++) { const x = -w / 2 + k * 180; s += `<rect x="${x - 40}" y="-620" width="80" height="600" fill="${h[0]}"/><rect x="${x + 10}" y="-620" width="30" height="600" fill="${h[1]}"/><rect x="${x - 56}" y="-650" width="112" height="34" rx="6" fill="${h[2]}"/><rect x="${x - 56}" y="-30" width="112" height="30" rx="6" fill="${h[1]}"/>`; }
      return s + `<rect x="${-w / 2 - 80}" y="-700" width="${w + 160}" height="56" fill="${h[2]}"/><rect x="${-w / 2 - 80}" y="-660" width="${w + 160}" height="14" fill="${h[1]}"/>`; } },

    cantaro: { nombre: "Cántaro", params: {}, dibujar(o) { const h = pal(o, ["#b8784a", "#8a5232", "#d8985a"], ["#6a5060", "#4e3a48", "#86687a"]);
      return sombra(60) + P("M-24 -150 C -70 -120 -78 -30 -44 0 L 44 0 C 78 -30 70 -120 24 -150 Z", h[0]) + P("M44 0 C 78 -30 70 -120 24 -150 C 40 -100 40 -40 0 0 Z", h[1], 0.7) + `<rect x="-26" y="-176" width="52" height="30" rx="10" fill="${h[2]}"/>` + caps(-20, -90, 50, 10, "#ffffff", 0.2, -70); } },

    // hoguera: llamas que se mueven y halo de luz
    hoguera: { nombre: "Hoguera", anima: true, params: { fuego: [0, 1.5, 0.05, 1, "Fuego"] }, dibujar(o, t) { const k = o.fuego ?? 1, fl = 0.85 + 0.15 * Math.sin(t * 9) * Math.sin(t * 5.3);
      let s = halo(0, -80, 360 * k * fl, "#ffb050", 0.32 * Math.min(1, k));
      s += caps(-40, -14, 150, 26, "#5a3424", 1, 18) + caps(40, -14, 150, 26, "#6a4028", 1, -18) + caps(0, -24, 120, 24, "#4a2a1e");
      const llama = (x, a, c, f) => { const hh = (130 + 30 * Math.sin(t * 7 + f)) * k * a, w = 40 * a; return P(`M${x - w} -20 C ${x - w} ${f1(-20 - hh * 0.5)} ${f1(x + 10 * Math.sin(t * 5 + f))} ${f1(-20 - hh * 0.8)} ${f1(x + 6 * Math.sin(t * 6 + f))} ${f1(-20 - hh)} C ${f1(x + w * 0.4)} ${f1(-20 - hh * 0.6)} ${x + w} ${f1(-20 - hh * 0.4)} ${x + w} -20 Z`, c); };
      if (k > 0.01) s += llama(-20, 1, "#e8602a", 0) + llama(24, 0.85, "#e8602a", 2) + llama(0, 0.8, "#f8a83a", 1) + llama(4, 0.5, "#ffe08a", 3);
      return s; } },

    pozo: { nombre: "Pozo", params: {}, dibujar(o) { const h = pal(o, ["#a89078", "#867058", "#c8b098", "#5a3424"], ["#5e5a72", "#4a465e", "#7a7690", "#2a1e26"]);
      return sombra(190) + `<rect x="-170" y="-170" width="340" height="170" rx="16" fill="${h[0]}"/><rect x="60" y="-170" width="110" height="170" fill="${h[1]}"/><rect x="-186" y="-196" width="372" height="40" rx="14" fill="${h[2]}"/><ellipse cx="0" cy="-196" rx="150" ry="18" fill="${h[3]}"/>`
        + caps(-100, -110, 90, 14, h[2], 0.6) + caps(90, -60, 70, 12, h[0], 0.6) + `<rect x="-150" y="-420" width="18" height="230" fill="${h[3]}"/><rect x="132" y="-420" width="18" height="230" fill="${h[3]}"/><rect x="-170" y="-430" width="340" height="22" rx="8" fill="${h[3]}"/>` + T("M0 -420 L 0 -300", "#c8b898", 4) + `<rect x="-22" y="-300" width="44" height="40" rx="8" fill="${h[1]}"/>`; } },
  };
  window.ATREZO = ATREZO;
  // un objeto de escena { tipo, frio, params… } en t → SVG
  window.Atrezo = { dibujar: (ob, t) => { const A = ATREZO[ob.tipo]; if (!A) return `<text fill="#f66" font-size="40" y="-20">falta «${ob.tipo}»</text>`; return A.dibujar(Object.assign({}, ob.params || {}, { frio: ob.frio }), t || 0); },
    lista: () => Object.entries(ATREZO).map(([k, v]) => [k, v.nombre]) };
})();
