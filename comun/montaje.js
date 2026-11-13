// Motor de MONTAJE (editor, fase 11): un short = una sola voz + una secuencia de escenas, con transiciones, subtítulos, música y efectos.
// Lo usan el editor (montaje.html) y la composición exportada, así que la vista previa es lo que sale en el vídeo.
//   const mt = Montaje.crear(svg, SHORT, ESCENAS, PERSONAJES);  mt.dibujar(t);
// Formato (Videos/shorts-flow/shorts/<id>.json):
// { id, nombre, duracion, guion,
//   voz: { archivo, duracion, palabras: [{ word, start, end, corte?, junta? }], envolvente },
//   clips: [{ escena, t, dur, desde, transicion: "corte"|"fundido"|"barrido", habla: actor | "auto" | "" }],
//   subtitulos: { activos, resaltar: ["palabra", …] },
//   musica: { archivo, volumen }, sfx: [{ t, archivo, volumen }] }
(function () {
  const NS = "http://www.w3.org/2000/svg", ANCHO = 1080, ALTO = 1920, TR = 0.45;
  const el = (tag, at = {}, padre) => { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); if (padre) padre.appendChild(e); return e; };
  const cl = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x)), suave = (x) => { x = cl(x); return x * x * (3 - 2 * x); };
  const limpia = (w) => w.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9ñ]/g, "");

  // líneas de subtítulos: hasta ~20 letras o hasta un signo de puntuación; cada línea dura hasta que empieza la siguiente (si el hueco es corto)
  function lineas(palabras, max = 20) {
    const out = []; let cur = null;
    for (const w of palabras || []) { const txt = String(w.word).trim(); if (!txt) continue;
      // a mano: w.corte = la línea termina en esta palabra; w.junta = no cortar después de ella (unir con la siguiente)
      const ult = cur?.w[cur.w.length - 1];
      if (!cur || (cur.letras + txt.length > max && cur.w.length && !ult?.junta)) { cur = { w: [], letras: 0 }; out.push(cur); }
      cur.w.push(w); cur.letras += txt.length + 1; if (w.corte || (/[.?!;:,…]["»”]?$/.test(txt) && cur.letras > 6 && !w.junta)) cur = null; }
    out.forEach((l, i) => { l.start = l.w[0].start; l.end = l.w[l.w.length - 1].end; const sig = out[i + 1]; l.hasta = sig && sig.start - l.end < 0.6 ? sig.start : l.end + 0.35; });
    return out; }
  // frases (para crear escenas desde la voz): cortes en . ? ! o en pausas largas
  function frases(palabras) {
    const out = []; let cur = [];
    (palabras || []).forEach((w, i) => { cur.push(w); const sig = palabras[i + 1], pausa = sig ? sig.start - w.end : 9;
      if (/[.?!…]["»”]?$/.test(String(w.word).trim()) || pausa > 0.7) { out.push(cur); cur = []; } });
    if (cur.length) out.push(cur);
    return out.map((ws) => ({ texto: ws.map((w) => w.word).join(" "), start: ws[0].start, end: ws[ws.length - 1].end, palabras: ws })); }

  function crear(svg, sh, ESC, PJ) {
    const raiz = el("g", {}, svg), capaClips = el("g", {}, raiz), capaSub = el("g", {}, raiz);
    const clips = [...(sh.clips || [])].sort((a, b) => a.t - b.t).map((c, i) => ({ c, i, g: el("g", { display: "none" }, capaClips), motor: null }));
    const env = sh.voz && sh.voz.envolvente, lns = sh.subtitulos?.activos === false ? [] : lineas(sh.voz?.palabras), resaltar = new Set((sh.subtitulos?.resaltar || []).map(limpia));
    function motor(C) { if (C.motor !== null) return C.motor; const esc = ESC[C.c.escena];
      if (!esc) { const tx = el("text", { x: 540, y: 960, fill: "#f66", "font-size": 44, "text-anchor": "middle" }, C.g); tx.textContent = "falta la escena «" + C.c.escena + "»"; C.motor = false; return false; }
      C.motor = Escena.crear(C.g, esc, PJ, { voz: env || sh.voz?.palabras ? { envolvente: env, palabras: sh.voz?.palabras, desfase: C.c.t - (C.c.desde || 0), habla: C.c.habla ?? "auto" } : null }); return C.motor; }
    const dentro = (C, t) => t >= C.c.t && t < C.c.t + (C.c.dur || 2);
    function dibujar(t) {
      const act = clips.findIndex((C) => dentro(C, t)), C = clips[act], prev = act > 0 ? clips[act - 1] : null;
      for (const X of clips) if (X !== C && X !== prev) X.g.setAttribute("display", "none");
      if (!C) { if (prev) prev.g.setAttribute("display", "none"); pintarSub(t); return; }
      const tr = C.c.transicion || "corte", k = prev && tr !== "corte" ? (t - C.c.t) / TR : 1;
      const pinta = (X, transf, op) => { const m = motor(X); X.g.setAttribute("display", "inline"); X.g.setAttribute("transform", transf); X.g.setAttribute("opacity", op); if (m) m.dibujar(Math.max(0, t - X.c.t + (X.c.desde || 0))); };
      if (k < 1) { const s = suave(k);   // transición: la escena anterior sigue un instante mientras entra la nueva
        if (tr === "barrido") { pinta(prev, `translate(${(-ANCHO * s).toFixed(1)} 0)`, 1); pinta(C, `translate(${(ANCHO * (1 - s)).toFixed(1)} 0)`, 1); }
        else { pinta(prev, "", 1); pinta(C, "", s.toFixed(3)); }
        capaClips.appendChild(C.g); }
      else { if (prev) prev.g.setAttribute("display", "none"); pinta(C, "", 1); }
      pintarSub(t); }
    // subtítulos con el estilo de la marca: cápsula oscura, texto claro, la palabra que suena en naranja (las de «resaltar», siempre en naranja)
    let subKey = null;
    function pintarSub(t) {
      const l = lns.find((x) => t >= x.start - 0.05 && t < x.hasta); const ia = l ? l.w.findIndex((w) => t >= w.start - 0.03 && t < w.end + 0.08) : -1;
      const key = l ? lns.indexOf(l) + ":" + ia : ""; const pop = l ? suave((t - (l.start - 0.05)) / 0.14) : 1;
      if (key !== subKey) { subKey = key; capaSub.replaceChildren(); if (!l) return;
        const g = el("g", { "data-sub": "1" }, capaSub), tx = el("text", { x: 0, y: 0, "text-anchor": "middle", "font-size": 62, "font-weight": 800, "font-family": "Figtree, Inter, Segoe UI, sans-serif", fill: "#f7f1e5" }, g);
        l.w.forEach((w, i) => { const ts = el("tspan", { fill: i === ia || resaltar.has(limpia(w.word)) ? "#f0a33a" : "#f7f1e5" }, tx); ts.textContent = (i ? " " : "") + String(w.word).trim(); });
        let ancho = 30 * l.letras; try { ancho = tx.getComputedTextLength() || ancho; } catch {}
        const r = el("rect", { x: -ancho / 2 - 30, y: -62, width: ancho + 60, height: 90, rx: 18, fill: "#14171e", opacity: 0.92 }); g.insertBefore(r, tx); }
      const g = capaSub.firstChild; if (g) g.setAttribute("transform", `translate(${ANCHO / 2} 1430) scale(${(0.9 + 0.1 * pop).toFixed(3)})`); }
    const duracion = sh.duracion || ((sh.voz?.duracion || 0) + 0.8) || clips.reduce((m, C) => Math.max(m, C.c.t + (C.c.dur || 2)), 2);
    return { dibujar, duracion, raiz, clips };
  }
  window.Montaje = { crear, lineas, frases, ANCHO, ALTO, TR };
})();
