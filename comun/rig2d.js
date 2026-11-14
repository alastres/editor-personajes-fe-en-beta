// rig2d.js — esqueleto 2D con cinemática inversa y mallas deformables para SVG (Fe en Beta, 12 nov 2026).
// Todo es determinista: la pose se calcula desde el tiempo; nada guarda estado entre fotogramas.
//
// Huesos: { nombre, padre, o:[x,y] origen en reposo, e:[x,y] punta en reposo } en el espacio del personaje.
// Pose:   { nombre: giro local en radianes } (+ desplazamiento de la raíz con pose.__raiz = [dx,dy]
//         y de cualquier hueso con pose.__desp = { nombre: [dx,dy] }, que arrastra a sus hijos).
// Cada hueso posado es una transformación rígida S(v) = R(θ)(v - o) + o', con o' = S_padre(o).
// Mallas: paths SVG (M L C Q Z absolutos) dibujados en reposo; cada punto (anclas y tiradores) se reparte
// entre huesos con pesos. La mezcla es por ÁNGULOS alrededor de la articulación (no de posiciones), así un
// codo doblado curva la manga en arco en lugar de aplastarla («efecto caramelo» del skinning lineal).
(function () {
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
  const len = (v) => Math.hypot(v[0], v[1]);
  const rot = (v, t) => { const c = Math.cos(t), s = Math.sin(t); return [c * v[0] - s * v[1], s * v[0] + c * v[1]]; };
  const norm = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };

  function distSeg(p, a, b) {
    const ab = sub(b, a), ap = sub(p, a);
    const L2 = ab[0] * ab[0] + ab[1] * ab[1];
    const u = L2 ? Math.max(0, Math.min(1, (ap[0] * ab[0] + ap[1] * ab[1]) / L2)) : 0;
    return { d: len(sub(p, [a[0] + ab[0] * u, a[1] + ab[1] * u])), u };
  }

  function esqueleto(defs) {
    const H = {}, orden = [];
    defs.forEach((d, i) => {
      const h = { ...d, i, dir: Math.atan2(d.e[1] - d.o[1], d.e[0] - d.o[0]), L: len(sub(d.e, d.o)), prof: d.padre ? H[d.padre].prof + 1 : 0 };
      H[d.nombre] = h; orden.push(h);
    });
    const esAncestro = (a, b) => { let x = H[b]; while (x && x.padre) { if (x.padre === a) return true; x = H[x.padre]; } return false; };

    // Calcula las transformaciones posadas: { nombre: { th, o2 } }
    function posar(pose) {
      const T = {};
      for (const h of orden) {
        const d = pose[h.nombre] || 0;
        if (!h.padre) {
          const r = pose.__raiz || [0, 0];
          T[h.nombre] = { th: d, o2: [h.o[0] + r[0], h.o[1] + r[1]] };
        } else {
          const P = T[h.padre], o2 = aplicar(P, H[h.padre], h.o);
          // desplazamiento extra del arranque del hueso (p. ej. el hombro que viaja con el giro del torso)
          const dd = (pose.__desp || {})[h.nombre];
          T[h.nombre] = { th: P.th + d, o2: dd ? [o2[0] + dd[0], o2[1] + dd[1]] : o2 };
        }
      }
      return T;
    }
    function aplicar(Tb, h, v) { const r = rot(sub(v, h.o), Tb.th); return [r[0] + Tb.o2[0], r[1] + Tb.o2[1]]; }
    const punto = (T, nombre, v) => aplicar(T[nombre], H[nombre], v);
    const punta = (T, nombre) => punto(T, nombre, H[nombre].e);
    const origen = (T, nombre) => T[nombre].o2;
    const angulo = (T, nombre) => T[nombre].th + H[nombre].dir;          // dirección del hueso en el mundo
    const matriz = (T, nombre) => { const t = T[nombre], h = H[nombre], c = Math.cos(t.th), s = Math.sin(t.th);
      const r = rot(h.o, t.th); return `matrix(${c.toFixed(5)},${s.toFixed(5)},${(-s).toFixed(5)},${c.toFixed(5)},${(t.o2[0] - r[0]).toFixed(2)},${(t.o2[1] - r[1]).toFixed(2)})`; };

    // Cinemática inversa de dos huesos: escribe en `pose` los giros de a (brazo) y b (antebrazo) para que la
    // punta de b llegue a `obj`. codo = +1 / -1 elige hacia dónde se dobla. Necesita la pose del padre ya fijada.
    function ik2(pose, a, b, obj, codo = 1) {
      const Tp = posar(pose);
      const A = H[a], B = H[b];
      const thPadre = A.padre ? Tp[A.padre].th : 0;
      let S = A.padre ? punto(Tp, A.padre, A.o) : A.o;
      const dd = (pose.__desp || {})[a]; if (dd) S = [S[0] + dd[0], S[1] + dd[1]];
      const L1 = A.L, L2 = B.L;
      let d = len(sub(obj, S));
      d = Math.max(Math.abs(L1 - L2) + 0.01, Math.min(L1 + L2 - 0.01, d));
      const phi = Math.atan2(obj[1] - S[1], obj[0] - S[0]);
      const al = Math.acos(Math.max(-1, Math.min(1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d))));
      const aA = phi + codo * al;
      const thA = norm(aA - A.dir - thPadre) + thPadre;
      pose[a] = thA - thPadre;
      const E = [S[0] + L1 * Math.cos(aA), S[1] + L1 * Math.sin(aA)];
      const aB = Math.atan2(obj[1] - E[1], obj[0] - E[0]);
      pose[b] = norm(aB - B.dir - thA);
      return pose;
    }
    // Orienta un hueso para que apunte a un ángulo del mundo (radianes).
    function apuntar(pose, nombre, ang) {
      const T = posar(pose), h = H[nombre];
      const thPadre = h.padre ? T[h.padre].th : 0;
      pose[nombre] = norm(ang - h.dir - thPadre);
      return pose;
    }

    return { H, orden, posar, punto, punta, origen, angulo, matriz, ik2, apuntar, esAncestro };
  }

  // ------------------------------------------------------------------ mallas
  const TOK = /[MLCQZ]|-?\d*\.?\d+(?:e-?\d+)?/g;
  function parsear(d) {
    const t = d.match(TOK), cmds = [], pts = [];
    let k = 0, cmd = null;
    const n = { M: 1, L: 1, C: 3, Q: 2, Z: 0 };
    while (k < t.length) {
      if (/[A-Z]/.test(t[k])) { cmd = t[k++]; if (cmd === "Z") { cmds.push(["Z", 0]); continue; } }
      else if (cmd === "M") cmd = "L";
      const c = n[cmd];
      for (let j = 0; j < c; j++) { pts.push([+t[k], +t[k + 1]]); k += 2; }
      cmds.push([cmd, c]);
    }
    return { cmds, pts };
  }
  function escribir(cmds, pts) {
    let s = "", p = 0;
    for (const [c, m] of cmds) {
      s += c;
      for (let j = 0; j < m; j++, p++) s += (j ? " " : "") + pts[p][0].toFixed(1) + " " + pts[p][1].toFixed(1);
      s += " ";
    }
    return s;
  }

  // pesos automáticos: inverso de la distancia al hueso, potencia `pot`; `nucleo` suaviza junto al hueso
  function pesosAuto(sk, huesos, v, pot = 4, nucleo = 6) {
    const w = huesos.map((nm) => { const h = sk.H[nm]; return 1 / Math.pow(distSeg(v, h.o, h.e).d + nucleo, pot); });
    const s = w.reduce((a, b) => a + b, 0);
    return huesos.map((nm, i) => [nm, w[i] / s]).filter((x) => x[1] > 0.01);
  }

  // malla(sk, d, opciones): opciones.huesos (lista para pesos automáticos) o opciones.pesos(v) -> [[hueso, w]...]
  // opciones.despues(vRest, vPosado, T) -> [dx, dy] para efectos secundarios (caída de tela por gravedad).
  function malla(sk, d, op = {}) {
    const { cmds, pts } = parsear(d);
    const info = pts.map((v) => {
      let ws = op.rigido ? [[op.rigido, 1]] : op.pesos ? op.pesos(v) : pesosAuto(sk, op.huesos, v, op.pot, op.nucleo);
      const s = ws.reduce((a, b) => a + b[1], 0); ws = ws.map(([n, x]) => [n, x / s]);
      // pivote: la articulación entre los dos huesos de más peso (el origen del más profundo)
      const top = [...ws].sort((a, b) => b[1] - a[1]).slice(0, 2).map((x) => sk.H[x[0]]);
      const piv = top.length > 1 ? (top[0].prof >= top[1].prof ? top[0].o : top[1].o) : top[0].o;
      return { v, ws, piv };
    });
    return {
      d(T) {
        const out = info.map(({ v, ws, piv }) => {
          let th = 0, cx = 0, cy = 0;
          for (const [nm, w] of ws) {
            th += w * T[nm].th;
            const q = sk.punto(T, nm, piv); cx += w * q[0]; cy += w * q[1];
          }
          const r = rot(sub(v, piv), th);
          let p = [r[0] + cx, r[1] + cy];
          if (op.despues) { const dd = op.despues(v, p, T); p = [p[0] + dd[0], p[1] + dd[1]]; }
          // correcciones por pose (como los Smart Bones de Moho): un campo de desplazamiento escrito en el
          // marco de un hueso (u a lo largo, n perpendicular) que entra según un conductor k(T) en 0..1
          for (const c of op.correcciones || []) {
            const k = c.k(T); if (k <= 0) continue;
            const h = sk.H[c.hueso], ux = Math.cos(h.dir), uy = Math.sin(h.dir), nx = -uy, ny = ux;
            const dx = v[0] - h.o[0], dy = v[1] - h.o[1];
            const [du, dn] = c.campo(dx * ux + dy * uy, dx * nx + dy * ny, T);
            const r = rot([(du * ux + dn * nx) * k, (du * uy + dn * ny) * k], T[c.hueso].th);
            p = [p[0] + r[0], p[1] + r[1]];
          }
          return p;
        });
        return escribir(cmds, out);
      },
    };
  }

  window.Rig2D = { esqueleto, malla, distSeg, rot, parsear, escribir };
})();
