// EDITOR GRÁFICO DE CURVAS: una curva Bézier propia por clave (como cubic-bezier de CSS), además de las predefinidas.
//   EditorCurva.abrir(cerca, valor, alGuardar)  · valor: [x1, y1, x2, y2] o el nombre de una curva; alGuardar([x1, y1, x2, y2])
// La curva se guarda en la clave (k.curva = [x1, y1, x2, y2]) y comun/personajes.js la interpreta igual en el editor y en el vídeo.
(() => {
  const NS = "http://www.w3.org/2000/svg", T = 220, M = 40;   // lado del cuadro y margen (y entre −0,4 y 1,4 para pasarse o quedarse corto)
  const PRESETS = { suave: [0.42, 0, 0.58, 1], lineal: [0, 0, 1, 1], acelera: [0.55, 0, 1, 0.45], frena: [0, 0.55, 0.45, 1], rebote: [0.3, 0, 0.35, 1.45], anticipa: [0.5, -0.4, 0.6, 1], muelle: [0.2, 1.5, 0.5, 1] };
  const NOMBRES = { suave: "Suave", lineal: "Lineal", acelera: "Acelerar", frena: "Frenar", rebote: "Se pasa", anticipa: "Anticipa", muelle: "Muelle" };
  let caja = null, val = null, cb = null, arr = null;
  const el = (t, at = {}, p) => { const e = document.createElementNS(NS, t); for (const k in at) e.setAttribute(k, at[k]); if (p) p.appendChild(e); return e; };
  // vertical: de −0,6 a 1,6 (la curva puede quedarse corta o pasarse); horizontal: de 0 a 1
  const X = (x) => M + x * T, Y = (y) => M + ((1.6 - y) / 2.2) * T;
  const deX = (px) => Math.max(0, Math.min(1, (px - M) / T)), deY = (py) => Math.max(-0.6, Math.min(1.6, 1.6 - ((py - M) / T) * 2.2));
  function construir() {
    caja = document.createElement("div"); caja.className = "editor-curva"; caja.hidden = true;
    caja.innerHTML = `<div class="ec-titulo">Curva propia <span class="tenue">(arrastra los dos puntos)</span></div><svg width="${T + 2 * M}" height="${T + 2 * M}"></svg>
      <div class="ec-presets"></div><div class="ec-botones"><button class="ec-cancelar">Cancelar</button><button class="ec-guardar primario">Usar esta curva</button></div>`;
    document.body.appendChild(caja);
    const svg = caja.querySelector("svg");
    svg.addEventListener("pointerdown", (ev) => { const h = ev.target.getAttribute("data-h"); if (!h) return; arr = +h; try { svg.setPointerCapture(ev.pointerId); } catch {} });
    svg.addEventListener("pointermove", (ev) => { if (arr === null) return; const r = svg.getBoundingClientRect(), x = deX(ev.clientX - r.left), y = deY(ev.clientY - r.top);
      val[arr * 2] = +x.toFixed(3); val[arr * 2 + 1] = +y.toFixed(3); pintar(); });
    svg.addEventListener("pointerup", () => (arr = null));
    caja.querySelector(".ec-cancelar").onclick = cerrar;
    caja.querySelector(".ec-guardar").onclick = () => { cb && cb(val.slice()); cerrar(); };
    document.addEventListener("keydown", (ev) => { if (!caja.hidden && ev.key === "Escape") cerrar(); });
    const pr = caja.querySelector(".ec-presets");
    for (const [k, v] of Object.entries(PRESETS)) { const b = document.createElement("button"); b.textContent = NOMBRES[k]; b.onclick = () => { val = v.slice(); pintar(); }; pr.appendChild(b); }
  }
  function pintar() { const svg = caja.querySelector("svg"); svg.replaceChildren();
    el("rect", { x: M, y: Y(1), width: T, height: Y(0) - Y(1), fill: "#ffffff08", stroke: "#ffffff22" }, svg);
    el("line", { x1: X(0), y1: Y(0), x2: X(1), y2: Y(1), stroke: "#ffffff22", "stroke-dasharray": "4 4" }, svg);
    const [x1, y1, x2, y2] = val;
    el("line", { x1: X(0), y1: Y(0), x2: X(x1), y2: Y(y1), stroke: "#7ab8ff", "stroke-width": 2 }, svg); el("line", { x1: X(1), y1: Y(1), x2: X(x2), y2: Y(y2), stroke: "#ff7a5a", "stroke-width": 2 }, svg);
    el("path", { d: `M${X(0)} ${Y(0)} C ${X(x1)} ${Y(y1)} ${X(x2)} ${Y(y2)} ${X(1)} ${Y(1)}`, fill: "none", stroke: "#f0a33a", "stroke-width": 3 }, svg);
    el("circle", { cx: X(x1), cy: Y(y1), r: 9, fill: "#7ab8ff", "data-h": 0, style: "cursor:grab" }, svg); el("circle", { cx: X(x2), cy: Y(y2), r: 9, fill: "#ff7a5a", "data-h": 1, style: "cursor:grab" }, svg);
    // bola que recorre la curva (vista previa del ritmo)
    const f = window.Personajes?.curva({ curva: val }) || ((x) => x), u = ((performance.now() / 1400) % 1.3) / 1.3, k = f(Math.min(1, u));
    el("circle", { cx: X(1) + 22, cy: Y(k), r: 7, fill: "#f7f1e5" }, svg); el("text", { x: M, y: M - 12, fill: "#ffffff88", "font-size": 11 }, svg).textContent = val.map((v) => v.toFixed(2)).join(", "); }
  let anim = null;
  function abrir(cerca, valor, alGuardar) { if (!caja) construir(); val = (Array.isArray(valor) ? valor : PRESETS[valor] || PRESETS.suave).slice(); cb = alGuardar;
    caja.hidden = false; const r = cerca?.getBoundingClientRect?.(); caja.style.left = Math.max(8, Math.min(innerWidth - 320, (r?.left ?? 100) - 40)) + "px"; caja.style.top = Math.max(8, (r?.top ?? 300) - (T + 2 * M) - 130) + "px";
    pintar(); cancelAnimationFrame(anim); const bucle = () => { if (caja.hidden) return; if (arr === null) pintar(); anim = requestAnimationFrame(bucle); }; anim = requestAnimationFrame(bucle); }
  function cerrar() { if (caja) caja.hidden = true; cancelAnimationFrame(anim); }
  window.EditorCurva = { abrir, PRESETS };
})();
