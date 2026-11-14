// libre.js — MARIONETA LIBRE (como los huesos de Moho): cualquier dibujo o imagen PNG con su propio esqueleto, para animales,
// objetos, criaturas o personajes que no son el muñeco humano. Necesita comun/rig2d.js (window.Rig2D).
// El personaje guarda { tipo: "libre", libre: { huesos, capas } }:
//   huesos: [{ nombre, padre, o: [x, y], e: [x, y] }]   origen y punta en reposo (los pies en y = 0, hacia arriba y negativa)
//   capas:  [{ id, nombre, svg, dibujo?, imagen?: { href, x, y, w, h }, hueso? }]   en orden de atrás adelante.
//           Una capa con «hueso» va rígida pegada a ese hueso; sin él, cada punto se reparte entre todos los huesos por cercanía
//           (se dobla en las articulaciones). Las imágenes van siempre rígidas (a su hueso o al más cercano a su centro).
// Devuelve lo mismo que Titere25D.crear (g, dibujar, puntos…), así que sirve en el editor, en Escenas y en Montaje.
// La pose: { huesos: { nombre: grados } } girando cada hueso respecto a su padre; además usa del muñeco el giro (de espaldas o
// de frente se refleja, como una tarjeta), estira (elástico), altura (despegar del suelo) y tumbado.
(function () {
  const NS = "http://www.w3.org/2000/svg", f1 = (x) => (Math.round(x * 10) / 10).toFixed(1);
  const el = (t, at = {}, p) => { const e = document.createElementNS(NS, t); for (const k in at) e.setAttribute(k, at[k]); if (p) p.appendChild(e); return e; };
  const BASE = { huesos: [{ nombre: "cuerpo", padre: null, o: [0, -120], e: [0, -300] }], capas: [] };

  function crear(padre, j, extra = {}) {
    const L = j.libre || BASE, huesos = (L.huesos || []).filter((h) => h && h.nombre && h.o && h.e);
    const raiz = el("g", { "data-libre": j.id || "" }, padre), sombra = el("ellipse", { cx: 0, cy: 2, rx: 90, ry: 13, fill: "#000", opacity: 0.25 }, raiz), cuerpo = el("g", {}, raiz);
    const sk = huesos.length ? Rig2D.esqueleto(huesos) : null, nombres = huesos.map((h) => h.nombre);
    // capas: trazos que se doblan (mallas) o rígidos, e imágenes rígidas
    const capas = (L.capas || []).map((c) => { const g = el("g", { "data-capa": c.id }, cuerpo);
      if (c.imagen) { const im = el("image", { href: c.imagen.href, x: c.imagen.x, y: c.imagen.y, width: c.imagen.w, height: c.imagen.h, preserveAspectRatio: "none" }, g);
        const cx = c.imagen.x + c.imagen.w / 2, cy = c.imagen.y + c.imagen.h / 2;
        const hb = c.hueso && sk?.H[c.hueso] ? c.hueso : sk ? nombres.reduce((m, n) => (Rig2D.distSeg([cx, cy], sk.H[n].o, sk.H[n].e).d < Rig2D.distSeg([cx, cy], sk.H[m].o, sk.H[m].e).d ? n : m)) : null;
        return { g, im, hueso: hb, rigida: true }; }
      g.innerHTML = c.svg || ""; window.Titere25D?.idsUnicos?.(g); if (!sk) return { g, mallas: [] };
      const opM = c.hueso && sk.H[c.hueso] ? { rigido: c.hueso } : { huesos: nombres };
      // cada trazado puede ir atado a su propio hueso (data-hueso, puesto en el taller por forma): lo sigue sin doblarse
      const opDe = (e) => { const hz = e.closest("[data-hueso]")?.getAttribute("data-hueso"); return hz && sk.H[hz] ? { rigido: hz } : opM; };
      const mallas = [...g.querySelectorAll("path")].map((e) => { const d = e.getAttribute("d") || "", op = opDe(e); try { return { e, d0: d, op, m: Rig2D.malla(sk, d, op) }; } catch { return null; } }).filter(Boolean);
      // FORMAS CLAVE (comun/titere25d.js, morfo): con otros pesos, la malla de cada trazado se rehace sobre su forma mezclada
      const morf = c.formasClave?.length && window.Titere25D?.morfo ? Titere25D.morfo(g, c.formasClave) : null;
      return { g, mallas, morf, opM, id: c.id, firma: "" }; });
    let alto = 0; for (const h of huesos) alto = Math.max(alto, -h.o[1], -h.e[1]);
    const puntos = { pies: [0, 0], alto: Math.max(120, alto + 40), cabeza: [0, -alto] };
    let T = null;

    // pose en radianes desde la de la escena (grados): «__x» y «__y» mueven el cuerpo entero (la raíz)
    const poseDe = (hs = {}) => { const pose = {}; for (const [n, g] of Object.entries(hs)) if (!n.startsWith("__")) pose[n] = (g * Math.PI) / 180; pose.__raiz = [hs.__x || 0, hs.__y || 0]; return pose; };
    // cinemática inversa de dos huesos (padre e hijo): el codo se dobla hacia el lado que se aparta menos de la pose de ahora
    function ik2(pose, b, obj) { const h = sk?.H[b]; if (!h?.padre) return false; const a = h.padre;
      const p1 = sk.ik2(Object.assign({}, pose), a, b, obj, 1), p2 = sk.ik2(Object.assign({}, pose), a, b, obj, -1);
      const dif = (p) => Math.abs(Math.atan2(Math.sin(p[a] - (pose[a] || 0)), Math.cos(p[a] - (pose[a] || 0)))) + Math.abs(Math.atan2(Math.sin(p[b] - (pose[b] || 0)), Math.cos(p[b] - (pose[b] || 0))));
      const q = dif(p1) <= dif(p2) ? p1 : p2; pose[a] = q[a]; pose[b] = q[b]; return true; }
    const clavados = (L.clavados || []).filter((n) => sk?.H[n]?.padre);
    function dibujar(e = {}) {
      const pose = poseDe(e.huesos);
      // PIES CLAVADOS (como los «pies pegajosos» de Cartoon Animator): la punta de un hueso clavado se queda donde estaba en reposo
      // aunque el cuerpo se mueva o se agache; su padre y él se doblan solos para llegar
      for (const n of clavados) ik2(pose, n, sk.H[n].e);
      T = sk ? sk.posar(pose) : null;
      for (const c of capas) {
        if (c.rigida) { c.g.setAttribute("transform", c.hueso && T ? sk.matriz(T, c.hueso) : ""); continue; }
        if (c.morf) { const peso = (k) => e.formas?.[c.id + "/" + k], firma = c.morf.claves.map((k) => (+peso(k.id) || 0).toFixed(3)).join(",");
          if (firma !== c.firma) { c.firma = firma; const D = c.morf.ds(peso), porE = new Map(c.morf.base.map((b, i) => [b.e, D[i] ?? b.d]));
            for (const M of c.mallas) { const d = porE.get(M.e) ?? M.d0; try { M.m = Rig2D.malla(sk, d, M.op); } catch {} } } }
        for (const { e: pe, m } of c.mallas) pe.setAttribute("d", m.d(T)); }
      // giro: de frente (−90…90) normal; de espaldas, reflejada. Cerca de 90° se estrecha un poco, como una tarjeta que da la vuelta
      const g = e.torso || 0, cg = Math.cos(g), sx = Math.sign(cg || 1) * Math.min(1, Math.abs(cg) * 3 + 0.12);
      const EST = Math.max(-0.6, Math.min(0.8, e.estira || 0)), sy = 1 + EST, kx = 1 / Math.sqrt(sy);
      const subir = Math.max(0, e.altura || 0), TB = Math.max(0, Math.min(1, e.tumbado || 0));
      cuerpo.setAttribute("transform", `translate(0 ${f1(-subir)})${TB > 0.001 ? ` rotate(${f1(90 * TB * (e.tumbadoLado || 1))} 0 0)` : ""} scale(${(sx * kx).toFixed(4)} ${sy.toFixed(4)})`);
      sombra.setAttribute("rx", f1(90 * Math.max(0.4, 1 - subir / 600)));
    }
    // juntas: el origen y la punta de cada hueso en la pose de ahora (para dibujar el esqueleto encima en el editor)
    const juntas = () => { if (!sk) return []; const t = T || sk.posar({}); return huesos.map((h) => ({ nombre: h.nombre, padre: h.padre, o: sk.origen(t, h.nombre), e: sk.punta(t, h.nombre) })); };
    dibujar({});
    // para el editor: giros (en grados) de un hueso y su padre para que la punta llegue a `obj`, desde la pose de ahora
    const ikGrados = (hs, b, obj) => { const pose = poseDe(hs); if (!ik2(pose, b, obj)) return null; const a = sk.H[b].padre, g = (r) => +((r * 180) / Math.PI).toFixed(1); return { [a]: g(pose[a]), [b]: g(pose[b]) }; };
    return { g: raiz, dibujar, escala: [1, 1], puntos, libre: true, esqueleto: juntas, ikGrados, clavados, juntas: {}, partes: () => ({}), controles: () => ({}) };
  }
  window.Libre = { crear, BASE };
})();
