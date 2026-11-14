// EDITOR DE FORMAS DE ANDAR (sin código): lista de formas (las de serie y las propias), deslizadores con vista previa en vivo de un
// personaje que va y viene, y guardar en la biblioteca común (shorts-flow/andares/<id>.json → window.ANDARES, la usan escenas y vídeos).
//   EditorAndares.abrir({ personaje, alElegir(id) })  · personaje: id de un personaje para la vista previa
(() => {
  const PARAMS = [
    ["zancada", "Largo del paso", 0.5, 1.6, 0.05, 1, (v) => Math.round(v * 100) + "%"],
    ["cadencia", "Velocidad de los pasos", 0.6, 1.6, 0.05, 1, (v) => Math.round(v * 100) + "%"],
    ["braceo", "Braceo y piernas", 0.3, 1.5, 0.05, 1, (v) => Math.round(v * 100) + "%"],
    ["bote", "Bote en cada paso", 0, 30, 1, 0, (v) => Math.round(v) + " px"],
    ["inclina", "Inclinación hacia delante", -0.1, 0.3, 0.01, 0, (v) => Math.round(v * 100)],
    ["miraY", "Mirada (abajo + / arriba −)", -0.6, 0.6, 0.05, 0, (v) => v.toFixed(2)],
    ["hombros", "Hombros (encogidos − / sueltos +)", -12, 12, 1, 0, (v) => Math.round(v)],
    ["arranque", "Tarda en arrancar", 0, 1.2, 0.05, 0.25, (v) => v.toFixed(2) + " s"],
    ["frenada", "Tarda en frenar", 0, 1.2, 0.05, 0.25, (v) => v.toFixed(2) + " s"],
    ["correrDesde", "Corre a partir de (velocidad)", 150, 700, 10, 330, (v) => Math.round(v)],
  ];
  const CARAS = ["alegre", "triste", "enfado", "miedo", "sorpresa", "pensativo"];
  let caja = null, sel = null, borr = null, motor = null, raf = null, op = {};
  const h = (t, at = {}, ...hijos) => { const e = document.createElement(t); for (const k in at) { if (k.startsWith("on")) e[k] = at[k]; else if (at[k] != null) e.setAttribute(k, at[k]); } for (const c of hijos) if (c != null) e.append(c); return e; };
  const id2 = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "andar";
  function construir() {
    caja = h("div", { class: "editor-andares", hidden: "" });
    caja.innerHTML = `<div class="ea-cab"><b>Formas de andar</b><span class="tenue">elige una, retócala y mira cómo queda; se guardan para todas las escenas</span><button class="x ea-cerrar" title="Cerrar">✕</button></div>
      <div class="ea-cuerpo"><div class="ea-lista"></div><div class="ea-prev"><svg></svg><div class="tenue ea-nota">El personaje va y viene para ver el paso, el arranque, la frenada y el giro.</div></div>
      <div class="ea-params"><div class="campo"><label>Nombre</label><input class="ea-nombre" /></div><div class="ea-desl"></div><div class="campo"><label>Cara al andar</label><div class="ea-caras"></div></div>
      <div class="fila-botones dos"><button class="ea-nueva">Nueva (copia de esta)</button><button class="ea-guardar primario">Guardar</button></div><div class="fila-botones dos"><button class="ea-usar">Usar en el personaje</button><button class="ea-borrar peligro">Borrar</button></div><p class="ayuda ea-estado"></p></div></div>`;
    document.body.append(caja);
    caja.querySelector(".ea-cerrar").onclick = cerrar;
    document.addEventListener("keydown", (ev) => { if (!caja.hidden && ev.key === "Escape") cerrar(); });
    caja.querySelector(".ea-nueva").onclick = () => { const base = borr; const nom = (base.nombre || "Andar") + " (mío)"; let id = id2(nom), n = 2; while (Andares.todos()[id]) id = id2(nom) + "-" + n++;
      window.ANDARES = Object.assign({}, window.ANDARES, { [id]: Object.assign({}, base, { nombre: nom, propio: true }) }); elegir(id); estado("Copia creada. Retócala y pulsa Guardar."); };
    caja.querySelector(".ea-guardar").onclick = guardar;
    caja.querySelector(".ea-usar").onclick = () => { op.alElegir && op.alElegir(sel); estado("Puesta en el personaje elegido."); };
    caja.querySelector(".ea-borrar").onclick = async () => { if (Andares.BASE[sel]) return estado("Las formas de serie no se borran: haz una copia y cambia esa.");
      if (!confirm("¿Mandar «" + (borr.nombre || sel) + "» a la papelera?")) return; await fetch(`/api/andares/${sel}/papelera`, { method: "POST" }).catch(() => {});
      const o = Object.assign({}, window.ANDARES); delete o[sel]; window.ANDARES = o; elegir("normal"); estado("Enviada a la papelera (se puede recuperar)."); };
    caja.querySelector(".ea-nombre").oninput = (ev) => { borr.nombre = ev.target.value; aplicar(); pintarLista(); };
  }
  const estado = (t) => { caja.querySelector(".ea-estado").textContent = t; };
  function aplicar() { if (Andares.BASE[sel] && !borr.propio) { window.ANDARES = Object.assign({}, window.ANDARES, { [sel]: borr }); } else window.ANDARES = Object.assign({}, window.ANDARES, { [sel]: borr }); }
  async function guardar() {
    let id = sel; if (Andares.BASE[sel] && !(window.ANDARES || {})[sel]?.propio) { estado("Guardando tus cambios a la forma de serie como una forma propia…"); }
    const datos = Object.assign({}, borr, { id }); delete datos.propio;
    const r = await fetch(`/api/andares/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(datos, null, 2) }).catch(() => null);
    estado(r && r.ok ? "Guardada: ya la puedes elegir en todas las escenas." : "No se pudo guardar (¿está el servidor del editor en marcha?).");
  }
  function pintarLista() { const l = caja.querySelector(".ea-lista"); l.replaceChildren();
    for (const [id, a] of Object.entries(Andares.todos())) l.append(h("button", { class: id === sel ? "activo" : "", onclick: () => elegir(id) }, (Andares.BASE[id] && !(window.ANDARES || {})[id] ? "" : "★ ") + (a.nombre || id))); }
  function pintarParams() { const d = caja.querySelector(".ea-desl"); d.replaceChildren(); caja.querySelector(".ea-nombre").value = borr.nombre || sel;
    for (const [k, et, min, max, paso, def, fmt] of PARAMS) { const v = borr[k] ?? def, o = h("output", {}, fmt(v));
      const i = h("input", { type: "range", min, max, step: paso, value: v, oninput: (ev) => { borr[k] = +ev.target.value; o.textContent = fmt(+ev.target.value); aplicar(); } });
      d.append(h("div", { class: "deslizador" }, h("label", {}, et), i, o)); }
    const c = caja.querySelector(".ea-caras"); c.replaceChildren();
    for (const k of CARAS) { const v = borr.cara?.[k] || 0, o = h("output", {}, Math.round(v * 100) + "%");
      c.append(h("div", { class: "deslizador" }, h("label", {}, k), h("input", { type: "range", min: 0, max: 1, step: 0.05, value: v, oninput: (ev) => { borr.cara = Object.assign({}, borr.cara, { [k]: +ev.target.value }); o.textContent = Math.round(ev.target.value * 100) + "%"; aplicar(); } }), o)); } }
  function elegir(id) { sel = id; borr = JSON.parse(JSON.stringify(Andares.todos()[id] || {})); pintarLista(); pintarParams(); vista(); }
  function vista() { const svg = caja.querySelector(".ea-prev svg"); svg.replaceChildren(); cancelAnimationFrame(raf);
    const PJS = op.personajes || window.PERSONAJES || {}, pj = op.personaje && PJS[op.personaje] ? op.personaje : Object.keys(PJS)[0]; if (!pj || !window.Escena) return;
    // mismo formato que la escena abierta: el motor tiene un solo formato a la vez (cambiarlo aquí estropearía la escena de detrás)
    const f169 = Escena.ANCHO === 1920; svg.setAttribute("viewBox", `0 0 ${Escena.ANCHO} ${Escena.ALTO}`);
    const esc = { duracion: 8, formato: f169 ? "16:9" : undefined, camaraFija: true, fondo: { tipo: "color", color: "#232838" }, camara: [{ t: 0, x: 0, y: -300, zoom: f169 ? 0.75 : 1.05 }],
      actores: [{ id: "p", personaje: pj, escala: 1, andar: { estilo: sel }, bloques: [], recorrido: [{ t: 0, x: -420, p: 0.2, giro: 75 }, { t: 0.4, x: -420, p: 0.2, giro: 75 }, { t: 3.4, x: 420, p: 0.2, giro: 75, giroModo: "final", giroDur: 0.6 },
        { t: 4.2, x: 420, p: 0.2, giro: -75 }, { t: 7.2, x: -420, p: 0.2, giro: -75, giroModo: "final", giroDur: 0.6 }, { t: 8, x: -420, p: 0.2, giro: 75 }] }] };
    motor = Escena.crear(svg, esc, PJS, { formato: f169 ? "16:9" : undefined }); const t0 = performance.now();
    const bucle = () => { if (caja.hidden) return; motor.dibujar(((performance.now() - t0) / 1000) % 8); raf = requestAnimationFrame(bucle); }; raf = requestAnimationFrame(bucle); }
  function abrir(o = {}) { if (!caja) construir(); op = o; caja.hidden = false; elegir(o.estilo && Andares.todos()[o.estilo] ? o.estilo : "normal"); }
  function cerrar() { if (caja) caja.hidden = true; cancelAnimationFrame(raf); op.alCerrar && op.alCerrar(); }
  window.EditorAndares = { abrir, cerrar };
})();
