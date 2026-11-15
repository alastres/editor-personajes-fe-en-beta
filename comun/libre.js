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
    const sk = huesos.length ? Rig2D.esqueleto(huesos) : null, nombres = huesos.filter((h) => !h.dial).map((h) => h.nombre);   // los diales no mueven dibujo
    // capas: trazos que se doblan (mallas) o rígidos, e imágenes rígidas
    const capas = (L.capas || []).map((c) => { const g = el("g", { "data-capa": c.id }, cuerpo);
      if (c.imagen) { const im = el("image", { href: c.imagen.href, x: c.imagen.x, y: c.imagen.y, width: c.imagen.w, height: c.imagen.h, preserveAspectRatio: "none" }, g);
        const cx = c.imagen.x + c.imagen.w / 2, cy = c.imagen.y + c.imagen.h / 2;
        const hb = c.hueso && sk?.H[c.hueso] ? c.hueso : sk ? nombres.reduce((m, n) => (Rig2D.distSeg([cx, cy], sk.H[n].o, sk.H[n].e).d < Rig2D.distSeg([cx, cy], sk.H[m].o, sk.H[m].e).d ? n : m)) : null;
        return { g, im, hueso: hb, rigida: true }; }
      g.innerHTML = c.svg || ""; window.Titere25D?.idsUnicos?.(g); if (!sk) return { g, mallas: [] };
      // capa.huesos (lista) o data-huesos="a,b" en una forma o grupo: los pesos automáticos solo se reparten entre esos huesos (una pierna
      // que no se deja arrastrar por la mano que cuelga al lado, una manga que solo sigue al brazo y al hombro)
      const lista = (v) => { const xs = (Array.isArray(v) ? v : String(v || "").split(",")).map((s) => String(s).trim()).filter((s) => sk.H[s]); return xs.length ? xs : null; };
      const opM = c.hueso && sk.H[c.hueso] ? { rigido: c.hueso } : { huesos: lista(c.huesos) || nombres };
      // cada trazado puede ir atado a su propio hueso (data-hueso, puesto en el taller por forma): lo sigue sin doblarse
      const opDe = (e) => { const hz = e.closest("[data-hueso]")?.getAttribute("data-hueso"); if (hz && sk.H[hz]) return { rigido: hz };
        const hs = lista(e.closest("[data-huesos]")?.getAttribute("data-huesos")); return hs ? { huesos: hs } : opM; };
      const mallas = [...g.querySelectorAll("path")].map((e, idx) => { const d = e.getAttribute("d") || "", op = opDe(e); try { const m = Rig2D.malla(sk, d, op), anc = []; for (const [, n] of Rig2D.parsear(d).cmds) for (let k = 0; k < n; k++) anc.push(k === n - 1); return { e, idx, d0: d, op, m, P0: m.base(), anc }; } catch { return null; } }).filter(Boolean);
      // FORMAS CLAVE (comun/titere25d.js, morfo): con otros pesos, la malla de cada trazado se rehace sobre su forma mezclada
      const morf = c.formasClave?.length && window.Titere25D?.morfo ? Titere25D.morfo(g, c.formasClave) : null;
      return { g, mallas, morf, opM, id: c.id, firma: "", fcs: c.formasClave || [] }; });
    let alto = 0; for (const h of huesos) alto = Math.max(alto, -h.o[1], -h.e[1]);
    const puntos = { pies: [0, 0], alto: Math.max(120, alto + 40), cabeza: [0, -alto] };
    let T = null, ultimoSmart = null;

    // pose en radianes desde la de la escena (grados): «__x» y «__y» mueven el cuerpo entero (la raíz)
    const poseDe = (hs = {}) => { const pose = {}; for (const [n, g] of Object.entries(hs)) if (!n.startsWith("__")) pose[n] = (g * Math.PI) / 180; pose.__raiz = [hs.__x || 0, hs.__y || 0]; return pose; };
    // cinemática inversa de dos huesos (padre e hijo): el codo se dobla hacia el lado que se aparta menos de la pose de ahora
    function ik2(pose, b, obj) { const h = sk?.H[b]; if (!h?.padre) return false; const a = h.padre;
      const p1 = sk.ik2(Object.assign({}, pose), a, b, obj, 1), p2 = sk.ik2(Object.assign({}, pose), a, b, obj, -1);
      const dif = (p) => Math.abs(Math.atan2(Math.sin(p[a] - (pose[a] || 0)), Math.cos(p[a] - (pose[a] || 0)))) + Math.abs(Math.atan2(Math.sin(p[b] - (pose[b] || 0)), Math.cos(p[b] - (pose[b] || 0))));
      const q = dif(p1) <= dif(p2) ? p1 : p2; pose[a] = q[a]; pose[b] = q[b]; return true; }
    const clavados = (L.clavados || []).filter((n) => sk?.H[n]?.padre);
    // ---- SMART BONES (como los de Moho): cada hueso puede llevar una acción en GRADOS: hueso.smart = { claves: [{ ang, curva,
    //   puntos: { capa: { trazado: [dx, dy, …] } }, huesos: { otro: grados } }] }. El giro del hueso hace de cabezal: entre las dos claves
    //   vecinas (el reposo, 0°, es una clave vacía implícita) se interpola con la curva de la clave de destino; fuera del rango se queda
    //   en la última. Los desplazamientos van en el REPOSO de cada punto (así siguen a los huesos); los giros de otros huesos se suman
    //   antes del IK. Varios huesos con acción se suman. hueso.dial = true: un mando que no se dibuja ni mueve dibujo por sí mismo.
    const CURVAS = { lineal: (t) => t, suave: (t) => t * t * (3 - 2 * t), acelera: (t) => t * t, frena: (t) => 1 - (1 - t) * (1 - t), mantener: () => 0 };
    const SMART = huesos.filter((h) => h.smart?.claves?.length && sk?.H[h.nombre]).map((h) => { const ks = [...h.smart.claves].sort((a, b) => a.ang - b.ang);
      return { n: h.nombre, ks: ks.some((k) => Math.abs(k.ang) < 0.01) ? ks : [...ks, { ang: 0, reposo: true }].sort((a, b) => a.ang - b.ang) }; });
    const grados = (r) => (r * 180) / Math.PI;
    function evalSmart(pose) { const out = { pts: {}, hs: {}, firma: "" };
      const suma = (k, w) => { if (!k || k.reposo || w < 1e-4) return;
        for (const [ca, tr] of Object.entries(k.puntos || {})) for (const [i, arr] of Object.entries(tr)) { const key = ca + "/" + i, acc = out.pts[key] || (out.pts[key] = new Float64Array(arr.length)); for (let j = 0; j < arr.length && j < acc.length; j++) acc[j] += (arr[j] || 0) * w; }
        for (const [n, g] of Object.entries(k.huesos || {})) out.hs[n] = (out.hs[n] || 0) + g * w; };
      for (const S of SMART) { const a = grados(pose[S.n] || 0), ks = S.ks, ult = ks[ks.length - 1]; out.firma += S.n + ":" + a.toFixed(2) + ";";
        if (a <= ks[0].ang) suma(ks[0], 1); else if (a >= ult.ang) suma(ult, 1);
        else for (let i = 0; i < ks.length - 1; i++) { const A = ks[i], B = ks[i + 1]; if (a < A.ang || a > B.ang) continue;
          const t = (a - A.ang) / (B.ang - A.ang || 1), f = (CURVAS[(a >= 0 ? B : A).curva || "suave"] || CURVAS.suave)(t); suma(A, 1 - f); suma(B, f); break; } }
      return out; }
    // ---- FÍSICA POR HUESO (15 nov 2026): hueso.fisica = { rigidez 0…1, amortiguacion 0…1, peso, colgar }. El hueso se balancea sobre su
    //   origen según la aceleración horizontal de ese punto en el mundo (péndulo amortiguado, el mismo que las piezas del muñeco). Con
    //   «colgar» el hueso no hereda el giro de su padre: sigue apuntando hacia donde apuntaba en reposo (una bolsa, una borla, un cordón).
    //   El tiempo llega en e.t; si salta hacia atrás o más de 0,25 s vuelve al reposo (las escenas precalculan el segundo anterior).
    const FIS = huesos.filter((h) => h.fisica && h.fisica.activa !== false && h.padre && sk?.H[h.padre]).map((h) => ({ n: h.nombre, F: h.fisica, st: null }));
    let TT = 0, MUNDO = [0, 0];
    function pendulo(P, x) { const F = P.F, st = P.st, K = 20 + 380 * (F.rigidez ?? 0.4), C = 1 + 14 * (F.amortiguacion ?? 0.35), S = 0.006 * (F.peso ?? 1);
      if (st && TT === st.t) return st.th;
      if (!st || !(TT > st.t) || TT - st.t > 0.25) { P.st = { t: TT, x, vx: 0, th: 0, w: 0 }; return 0; }
      const dt = TT - st.t, vx = (x - st.x) / dt, ax = Math.max(-25000, Math.min(25000, (vx - st.vx) / dt)), n = Math.ceil(dt * 240), hh = dt / n;
      for (let i = 0; i < n; i++) { st.w += (-K * st.th - C * st.w + S * ax) * hh;   // + : al acelerar hacia +x la punta se queda atrás (giro horario)
        st.th = Math.max(-1.2, Math.min(1.2, st.th + st.w * hh)); }
      Object.assign(st, { t: TT, x, vx }); return st.th; }
    // ---- CARA AUTOMÁTICA (15 nov 2026): formas clave con nombres reservados que se mueven solas, como la cara del muñeco:
    //   «parpadeo» (el parpadeo de siempre), «abre» (la boca con la voz o los fonemas), «ancha» / «estrecha» (la anchura de los fonemas),
    //   «dientes», y una por emoción con su nombre («alegre», «triste», «enfado», «sorpresa», «miedo», «pensativo», «verguenza», «risa»…)
    //   que toma el peso de la cara de la escena. Un hueso con «habla: grados» (la mandíbula) se abre con la boca.
    const HABLA = huesos.filter((h) => h.habla && sk?.H[h.nombre]);
    function caraAuto(e) { const a = { parpadeo: 1 - Math.max(0, Math.min(1, e.parpadeo ?? 1)) }, v = e.visema;
      for (const [k, w] of Object.entries(e.cara || {})) if (typeof w === "number") a[k] = w;
      a.abre = (a.abre || 0) + (v ? v.abre * 0.95 : (e.boca || 0) * 0.75);
      const an = v ? v.ancho : 1 - 0.3 * (e.boca || 0) + 0.25 * (e.bocaAncho || 0);
      if (an > 1) a.ancha = (an - 1) / 0.3; else a.estrecha = (1 - an) / 0.45;
      if (v?.dientes) a.dientes = v.dientes;
      return a; }
    function dibujar(e = {}) {
      TT = e.t ?? (typeof performance !== "undefined" ? performance.now() / 1000 : 0); MUNDO = e.mundo || [0, 0];
      const pose = poseDe(e.huesos), AUTO = caraAuto(e);
      for (const h of HABLA) pose[h.nombre] = (pose[h.nombre] || 0) + (Math.min(1.2, AUTO.abre || 0) * h.habla * Math.PI) / 180;
      // Smart Bones: con el giro de cada hueso con acción, giros de otros huesos (antes del IK) y desplazamientos de puntos
      const SM = SMART.length ? evalSmart(pose) : null; ultimoSmart = SM;
      if (SM) for (const [n, g] of Object.entries(SM.hs)) if (sk.H[n]) pose[n] = (pose[n] || 0) + (g * Math.PI) / 180;
      // PIES CLAVADOS (como los «pies pegajosos» de Cartoon Animator): la punta de un hueso clavado se queda donde estaba en reposo
      // aunque el cuerpo se mueva o se agache; su padre y él se doblan solos para llegar
      for (const n of clavados) ik2(pose, n, sk.H[n].e);
      T = sk ? sk.posar(pose) : null;
      if (FIS.length) { for (const P of FIS) { const h = sk.H[P.n], o = sk.origen(T, P.n);
          pose[P.n] = (pose[P.n] || 0) + pendulo(P, o[0] + MUNDO[0]) - (P.F.colgar ? T[h.padre].th : 0); }
        T = sk.posar(pose); }
      // VARIANTES (como las capas de cambio de Moho): una capa con «grupo» solo se ve si es la elegida de su grupo (j.variantes o las de la
      // escena); así una mano abierta y la misma mano con el cayado se cambian con un clic
      const vari = Object.assign({}, j.variantes || {}, e.variantes || {});
      capas.forEach((c, i) => { const d = (L.capas || [])[i]; if (!d?.grupo) return; if (vari[d.grupo] === d.id) c.g.removeAttribute("display"); else c.g.setAttribute("display", "none"); });
      for (const c of capas) {
        if (c.rigida) { c.g.setAttribute("transform", c.hueso && T ? sk.matriz(T, c.hueso) : ""); continue; }
        // SMART BONES: una forma clave con conductor { hueso, desde, hasta } (grados) entra sola al girar ese hueso, de «desde» (0 %) a
        // «hasta» (100 %), con una curva suave; se suma a lo que diga su deslizador. Cuenta el giro final, después del IK y los pies clavados.
        const conducido = (kid) => { const cd = c.fcs.find((x) => x.id === kid)?.conductor; if (!cd?.hueso || !sk?.H[cd.hueso]) return 0;
          const ang = ((pose[cd.hueso] || 0) * 180) / Math.PI, r = (cd.hasta ?? 30) - (cd.desde ?? 0); if (Math.abs(r) < 0.5) return 0;
          const t = Math.max(0, Math.min(1, (ang - (cd.desde ?? 0)) / r)); return t * t * (3 - 2 * t); };
        const tieneSmart = SM && Object.keys(SM.pts).some((k) => k.startsWith(c.id + "/"));
        if (c.morf || tieneSmart || c.conSmart) { const peso = (k) => Math.min(1.5, (+e.formas?.[c.id + "/" + k] || 0) + conducido(k) + (AUTO[k] || 0));
          const firma = (c.morf ? c.morf.claves.map((k) => (+peso(k.id) || 0).toFixed(3)).join(",") : "") + "|" + (tieneSmart ? SM.firma : "");
          if (firma !== c.firma) { c.firma = firma; c.conSmart = tieneSmart; const D = c.morf ? c.morf.ds(peso) : null, porE = D ? new Map(c.morf.base.map((b, i) => [b.e, D[i]])) : null;
            for (const M of c.mallas) { const dm = porE?.get(M.e); let P = dm ? Rig2D.parsear(dm).pts.map((p) => [p[0], p[1]]) : M.P0.map((p) => p.slice());
              const dl = tieneSmart && SM.pts[c.id + "/" + M.idx]; if (dl) P = P.map((p, k) => [p[0] + (dl[2 * k] || 0), p[1] + (dl[2 * k + 1] || 0)]);
              M.m.fijar(P); } } }
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
    // para el editor de Smart Bones: cada punto de cada trazado, posado (coordenadas del cuerpo) y con el giro que le dan sus huesos
    const editables = () => !T ? [] : capas.filter((c) => c.mallas?.length).flatMap((c) => c.mallas.map((M) => ({ capa: c.id, idx: M.idx, puntos: M.m.poses(T), anclas: M.anc, n: M.P0.length })));
    return { g: raiz, dibujar, escala: [1, 1], puntos, libre: true, esqueleto: juntas, ikGrados, clavados, editables, smart: () => ultimoSmart, juntas: {}, partes: () => ({}), controles: () => ({}) };
  }
  window.Libre = { crear, BASE };
})();
