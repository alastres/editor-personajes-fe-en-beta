// HERRAMIENTAS comunes a Personajes, Escenas y Montaje: historial de versiones y papelera, sincronizar con GitHub,
// y ayuda (lista de atajos y un recorrido guiado la primera vez que se abre cada página).
// Cada página dice qué tiene abierto con window.CTX_HISTORIAL() → { tipo, id, nombre }.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const h = (tag, at = {}, ...hijos) => { const e = document.createElement(tag); for (const k in at) k === "class" ? (e.className = at[k]) : k.startsWith("on") ? e.addEventListener(k.slice(2), at[k]) : e.setAttribute(k, at[k]); hijos.forEach((c) => e.append(c)); return e; };
  const PAGINA = /escenas/.test(location.pathname) ? "escenas" : /montaje/.test(location.pathname) ? "montaje" : "personajes";
  const fecha = (ms) => new Date(+ms).toLocaleString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const avisar = (t) => { const a = $("#aviso"); if (!a) return alert(t); a.textContent = t; a.classList.add("ver"); clearTimeout(avisar.t); avisar.t = setTimeout(() => a.classList.remove("ver"), 3200); };

  // ---- ventana modal sencilla
  function modal(titulo, cuerpo, botones = []) { cerrar(); const fondo = h("div", { class: "hm-fondo", onclick: (ev) => { if (ev.target === fondo) cerrar(); } });
    const caja = h("div", { class: "hm-caja" }, h("div", { class: "hm-titulo" }, h("b", {}, titulo), h("button", { class: "hm-x", title: "Cerrar (Esc)", onclick: cerrar }, "✕")), cuerpo);
    if (botones.length) caja.append(h("div", { class: "hm-botones" }, ...botones)); fondo.append(caja); document.body.append(fondo); return caja; }
  function cerrar() { const f = document.querySelector(".hm-fondo"); if (!f) return; f.remove(); if (f._alCerrar) f._alCerrar(); }
  document.addEventListener("keydown", (ev) => { if (ev.key === "Escape") cerrar(); if (ev.key === "F1") { ev.preventDefault(); ayuda(); } });

  // ---- historial y papelera
  const TIPOS = { personajes: "Personajes", escenas: "Escenas", shorts: "Shorts", acciones: "Acciones comunes", piezas: "Piezas comunes" };
  async function historial() { const c = window.CTX_HISTORIAL ? window.CTX_HISTORIAL() : null, cuerpo = h("div", { class: "hm-cuerpo" });
    const pestanas = h("div", { class: "seg pequeno" }), cont = h("div"); cuerpo.append(pestanas, cont);
    const ver = async (que) => { pestanas.querySelectorAll("button").forEach((b) => b.classList.toggle("activo", b.dataset.k === que)); cont.replaceChildren(h("p", { class: "tenue" }, "Cargando…"));
      if (que === "versiones") { if (!c?.id) return cont.replaceChildren(h("p", {}, "No hay nada abierto."));
        const l = await (await fetch(`/api/${c.tipo}/${c.id}/historial`)).json(); cont.replaceChildren(h("p", { class: "ayuda" }, `Versiones guardadas de «${c.nombre || c.id}» (una cada minuto y medio mientras editas; las 60 últimas). Volver a una guarda antes la actual, así que también se puede deshacer.`));
        if (!l.length) cont.append(h("p", { class: "tenue" }, "Aún no hay versiones anteriores: se guardan al editar."));
        const ul = h("ul", { class: "hm-lista" }); for (const v of l) ul.append(h("li", {}, h("span", {}, fecha(v.marca)), h("span", { class: "tenue" }, Math.round(v.tam / 1024) + " KB"),
          h("a", { href: `/api/${c.tipo}/${c.id}/version?marca=${v.marca}`, target: "_blank", title: "Ver el JSON de esa versión" }, "ver"),
          h("button", { onclick: async () => { const r = await fetch(`/api/${c.tipo}/${c.id}/restaurar`, { method: "POST", body: JSON.stringify({ marca: v.marca }) }); if (r.ok) { avisar("Vuelto a la versión de " + fecha(v.marca)); cerrar(); setTimeout(() => location.reload(), 400); } else avisar("No se pudo restaurar"); } }, "Volver a esta")));
        cont.append(ul); }
      else { const tipos = PAGINA === "personajes" ? ["personajes", "piezas", "acciones"] : PAGINA === "escenas" ? ["escenas"] : ["shorts", "escenas"]; cont.replaceChildren();
        for (const t of tipos) { const l = await (await fetch(`/api/${t}/papelera`)).json(); cont.append(h("h4", {}, TIPOS[t]));
          if (!l.length) { cont.append(h("p", { class: "tenue" }, "Vacía.")); continue; }
          const ul = h("ul", { class: "hm-lista" }); for (const x of l) ul.append(h("li", {}, h("span", {}, x.nombre), h("span", { class: "tenue" }, x.marca ? fecha(x.marca) : ""),
            h("button", { onclick: async () => { const r = await fetch(`/api/${t}/papelera/${encodeURIComponent(x.archivo)}/recuperar`, { method: "POST" }); if (r.ok) { const j = await r.json(); avisar(`Recuperado como «${j.id}»`); cerrar(); setTimeout(() => location.reload(), 400); } } }, "Recuperar")));
          cont.append(ul); } } };
    for (const [k, n] of [["versiones", "Versiones de lo abierto"], ["papelera", "Papelera"]]) pestanas.append(h("button", { "data-k": k, onclick: () => ver(k) }, n));
    modal("Historial", cuerpo); ver("versiones"); }

  // ---- GitHub
  function github() { const msg = h("input", { type: "text", placeholder: "Qué cambió (por ejemplo: nueva escena del sepulcro)", class: "hm-entrada" }), log = h("pre", { class: "hm-log", hidden: "" });
    const ir = h("button", { class: "primario", onclick: async () => { ir.disabled = true; ir.textContent = "Subiendo…"; log.hidden = false; log.textContent = "git pull · add · commit · push…";
      try { const r = await (await fetch("/api/sincronizar", { method: "POST", body: JSON.stringify({ mensaje: msg.value.trim() }) })).json(); log.textContent = (r.error ? "✗ " + r.error + "\n\n" : r.nada ? "No había cambios que subir.\n\n" : "✓ Subido a GitHub.\n\n") + r.log;
        avisar(r.ok ? (r.nada ? "Nada que subir" : "Subido a GitHub") : r.error); } catch (e) { log.textContent = String(e); } ir.disabled = false; ir.textContent = "Guardar y subir"; } }, "Guardar y subir");
    modal("Sincronizar con GitHub", h("div", { class: "hm-cuerpo" }, h("p", { class: "ayuda" }, "Trae lo último del repo privado, guarda todos los cambios del editor (personajes, escenas, shorts, acciones, piezas y el código) y los sube. Lo mismo que sincronizar.ps1."), msg, log), [ir]); msg.focus(); }

  // ---- ayuda: atajos y recorrido guiado
  const ATAJOS = {
    personajes: [["Ctrl+Z / Ctrl+Y", "Deshacer / rehacer"], ["Espacio", "Reproducir la acción (Animación)"], ["K", "Clave en el cabezal (Animación)"], ["Arrastrar las asas", "Manos, pies, cadera, cabeza y pecho (Animación)"], ["F1", "Esta ayuda"], ["/", "Buscar un ajuste en el panel de la derecha"],
      ["Taller: V B L P E R C I T", "Seleccionar, pincel, lazo, pluma, elipse, rectángulo, cápsula, cuentagotas, texto"], ["Taller: Mayús + clic", "Elegir varias formas"], ["Taller: espacio + arrastrar, rueda", "Mover y acercar la vista"], ["Taller: Alt + clic en un punto", "Quitarlo"], ["Taller: doble clic", "Esquina ⇄ curva, o añadir un punto en el trazo"]],
    escenas: [["Ctrl+Z / Ctrl+Y", "Deshacer / rehacer"], ["Espacio", "Reproducir"], ["Arrastrar un personaje u objeto", "Izquierda/derecha lo mueve, arriba/abajo lo aleja"], ["Arrastrar rombos y bloques", "Cambiar el ritmo en la línea de tiempo"], ["F1", "Esta ayuda"], ["/", "Buscar un ajuste en el panel de la derecha"]],
    montaje: [["Ctrl+Z / Ctrl+Y", "Deshacer / rehacer"], ["Espacio", "Reproducir"], ["Arrastrar el borde entre escenas", "Mover el corte"], ["Arrastrar una escena", "Cambiarla de hueco"], ["Clic en un subtítulo", "Corregirlo (| corta la línea)"], ["F1", "Esta ayuda"], ["/", "Buscar un ajuste en el panel de la derecha"]] };
  const RECORRIDO = {
    personajes: [["#lista", "El reparto: cada personaje es un JSON en shorts-flow/personajes que también puede editar Claude."], [".modo, [data-modo], button", "Diseño (cuerpo, colores, piezas) y Animación (posar, acciones con claves, asas del rig)."], ["#b-biblio", "Piezas: importa SVG, usa la biblioteca o dibuja con el taller de vectores."], ["#b-historial", "Versiones anteriores y papelera, por si algo sale mal."], ["#b-github", "Sube los cambios al repo privado de GitHub."]],
    escenas: [["#lista", "Las escenas: personajes sobre un fondo, con recorridos, acciones, cámara, rótulos y audio."], ["#panel", "Aquí se monta todo: fondo, reparto, atrezo, ambiente, cámara, rótulos, audio y el vídeo."], ["#pistas", "La línea de tiempo: clic para mover el cabezal; arrastra rombos y bloques."], ["#b-render", "Renderiza a MP4. Prueba antes la vista previa rápida o solo un fragmento."]],
    montaje: [["#b-transcribir", "Paso 1: transcribe la voz (palabras con tiempos para subtítulos y labios)."], ["#b-generar", "Paso 2: crea una escena por frase con el narrador; luego retócalas en Escenas."], ["#pistas", "Voz, subtítulos, escenas, música y efectos en la línea de tiempo."], ["#b-render", "Renderiza el short con música montada y subtítulos de la marca."]] };
  function ayuda() { const ul = h("table", { class: "hm-atajos" }); for (const [k, d] of ATAJOS[PAGINA]) ul.append(h("tr", {}, h("td", {}, h("kbd", {}, k)), h("td", {}, d)));
    modal("Ayuda y atajos", h("div", { class: "hm-cuerpo" }, ul, h("p", { class: "ayuda" }, "Cada página tiene su visita guiada: pulsa ? o F1. "), h("p", {}, h("a", { href: "pruebas.html", target: "_blank", class: "enlace" }, "Pruebas automáticas del títere →"))), [h("button", { onclick: () => { cerrar(); recorrido(); } }, "Ver el recorrido guiado")]); }
  function recorrido() { const pasos = RECORRIDO[PAGINA].map(([sel, t]) => [sel.split(",").map((x) => $(x.trim())).find(Boolean), t]).filter(([e]) => e && e.offsetParent !== null); let i = 0;
    const burbuja = h("div", { class: "hm-burbuja" }), marco = h("div", { class: "hm-marco" }); document.body.append(marco, burbuja);
    const fin = () => { burbuja.remove(); marco.remove(); try { localStorage.setItem("recorrido-" + PAGINA, "1"); } catch {} };
    const pinta = () => { if (i >= pasos.length) return fin(); const [e, t] = pasos[i], r = e.getBoundingClientRect();
      Object.assign(marco.style, { left: r.left - 4 + "px", top: r.top - 4 + "px", width: r.width + 8 + "px", height: r.height + 8 + "px" });
      burbuja.replaceChildren(h("p", {}, t), h("div", { class: "hm-botones" }, h("span", { class: "tenue" }, `${i + 1} / ${pasos.length}`), h("button", { onclick: fin }, "Saltar"), h("button", { class: "primario", onclick: () => { i++; pinta(); } }, i + 1 < pasos.length ? "Siguiente" : "Listo")));
      const bw = 300, x = Math.min(innerWidth - bw - 10, Math.max(10, r.left)), y = r.bottom + 12 + 140 < innerHeight ? r.bottom + 12 : Math.max(10, r.top - 150);
      Object.assign(burbuja.style, { left: x + "px", top: y + "px", width: bw + "px" }); };
    pinta(); }

  $("#b-historial")?.addEventListener("click", historial); $("#b-github")?.addEventListener("click", github); $("#b-ayuda")?.addEventListener("click", ayuda);
  // la primera vez en cada página, el recorrido guiado (cuando ya ha cargado)
  let visto = "1"; try { visto = localStorage.getItem("recorrido-" + PAGINA); } catch {}
  if (!visto) setTimeout(recorrido, 2500);
  // ---- DIÁLOGOS PROPIOS en vez de prompt() / confirm() del navegador (que algunos navegadores bloquean y que no siguen el estilo):
  // await Dialogo.pedir("Nombre de la capa", { valor, ayuda }) → texto o null; await Dialogo.confirmar("¿Borrar…?", { peligro: true }) → true/false.
  // Intro acepta y Esc cancela.
  function preguntar(titulo, cuerpo, { aceptar = "Aceptar", peligro = false, valorDe = () => true } = {}) {
    return new Promise((res) => { let hecho = false; const fin = (v) => { if (hecho) return; hecho = true; res(v); cerrar(); };
      const ok = h("button", { class: peligro ? "primario peligro-fuerte" : "primario", onclick: () => fin(valorDe()) }, aceptar);
      const no = h("button", { onclick: () => fin(null) }, "Cancelar"), caja = modal(titulo, cuerpo, [no, ok]); caja.classList.add("hm-dialogo");
      caja.parentNode._alCerrar = () => { if (!hecho) { hecho = true; res(null); } };
      // si lo que se confirma borra o pisa algo, Intro no lo acepta: el foco empieza en «Cancelar»
      caja.addEventListener("keydown", (ev) => { if (ev.key === "Enter" && !ev.shiftKey && ev.target.tagName === "INPUT") { ev.preventDefault(); ok.click(); } });
      setTimeout(() => (caja.querySelector("input") || (peligro ? no : ok)).focus(), 0); }); }
  const Dialogo = {
    pedir: (titulo, { valor = "", ayuda = "", aceptar = "Aceptar", marcador = "" } = {}) => { const inp = h("input", { type: "text", placeholder: marcador }); inp.value = valor;
      const cuerpo = h("div", { class: "hm-cuerpo" }, ...(ayuda ? [h("p", { class: "ayuda" }, ayuda)] : []), inp); setTimeout(() => inp.select(), 0);
      return preguntar(titulo, cuerpo, { aceptar, valorDe: () => inp.value }); },
    confirmar: async (texto, { titulo = "¿Seguro?", aceptar = "Sí, seguir", peligro = false } = {}) => (await preguntar(titulo, h("div", { class: "hm-cuerpo" }, h("p", {}, texto)), { aceptar, peligro })) === true,
  };
  window.Dialogo = Dialogo;

  // ---- PANEL DE AJUSTES: secciones plegables (se recuerda cuáles están plegadas) y un buscador de ajustes arriba.
  // Sirve a las tres páginas: cada <section> del #panel con un <h3> se pliega al pulsar su título.
  const panel = $("#panel");
  if (panel) {
    const clave = "plegado-" + PAGINA; let est = {}; try { est = JSON.parse(localStorage.getItem(clave) || "{}"); } catch {}
    const guarda = () => { try { localStorage.setItem(clave, JSON.stringify(est)); } catch {} };
    const sin = (t) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const titulo = (s) => sin((s.querySelector(":scope > h3")?.firstChild?.textContent || s.querySelector(":scope > h3")?.textContent || "").trim());
    const secciones = () => [...panel.querySelectorAll("section")].filter((s) => s.querySelector(":scope > h3"));
    const poner = (s, plegada) => { s.classList.toggle("plegada", plegada); s.querySelector(":scope > h3").setAttribute("aria-expanded", String(!plegada)); };
    const n = {};   // cuántas van de cada modo (diseño, animación…): en cada uno, abiertas las tres primeras
    const preparar = (s) => { if (s.dataset.plegable) return; s.dataset.plegable = "1"; const t = s.querySelector(":scope > h3"), k = titulo(s);
      t.classList.add("plegable"); t.setAttribute("role", "button"); t.tabIndex = 0; t.title = "Plegar o desplegar esta sección";
      // la primera vez, abiertas las tres primeras de cada modo; después, como las dejó el usuario
      const modo = s.className.replace(/(plegada|no-coincide)/g, "").trim(); n[modo] = (n[modo] || 0) + 1; poner(s, false);   // con las pestañas (interfaz.js) hay pocas a la vista: abiertas
      const alternar = (ev) => { if (ev.target.closest("button, input, select, a, label")) return; const p = !s.classList.contains("plegada"); poner(s, p); est[k] = p; guarda(); };
      t.addEventListener("click", alternar); t.addEventListener("keydown", (ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); alternar(ev); } }); };
    // barra de arriba: buscar un ajuste y plegar o desplegar todo
    const busca = h("input", { type: "search", placeholder: "Buscar un ajuste…  ( / )", "aria-label": "Buscar un ajuste en el panel" }), nada = h("p", { class: "tenue panel-nada", hidden: "" }, "Ningún ajuste coincide.");
    const todo = h("button", { class: "pequeno", title: "Plegar o desplegar todas las secciones" }, "Plegar todo");
    const pintaTodo = () => { todo.textContent = secciones().filter((s) => s.offsetParent || s.classList.contains("plegada")).every((s) => s.classList.contains("plegada")) ? "Desplegar todo" : "Plegar todo"; };
    todo.addEventListener("click", () => { const plegar = todo.textContent === "Plegar todo"; for (const s of secciones()) { poner(s, plegar); est[titulo(s)] = plegar; } guarda(); pintaTodo(); });
    const filtrar = () => { const q = sin(busca.value.trim()); let vistas = 0;
      for (const s of secciones()) { const sí = !q || sin(s.textContent).includes(q); s.classList.toggle("no-coincide", !sí);
        if (q && sí) s.classList.remove("plegada"); else if (!q) poner(s, est[titulo(s)] ?? s.classList.contains("plegada")); if (sí && getComputedStyle(s).display !== "none") vistas++; }
      nada.hidden = !q || vistas > 0; };
    busca.addEventListener("input", filtrar); busca.addEventListener("keydown", (ev) => { if (ev.key === "Escape") { busca.value = ""; filtrar(); busca.blur(); } });
    panel.prepend(h("div", { class: "panel-barra" }, busca, todo), nada);
    document.addEventListener("keydown", (ev) => { if (ev.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName) && !document.activeElement?.isContentEditable && !document.querySelector(".hm-fondo, .taller")) { ev.preventDefault(); busca.focus(); } });
    const todas = () => { secciones().forEach(preparar); pintaTodo(); };
    todas(); new MutationObserver(() => { if (secciones().some((s) => !s.dataset.plegable)) todas(); }).observe(panel, { childList: true, subtree: true });
    // al elegir algo (un personaje, un rótulo, un tramo) aparece su sub-panel: si cae en una sección plegada, se despliega sola (sin recordarlo)
    new MutationObserver((ms) => { for (const m of ms) { const e = m.target; if (e.hasAttribute?.("hidden") || e.tagName === "SECTION") continue;
        const sec = e.closest?.("section.plegada"); if (sec && sec.dataset.plegable && e !== sec.querySelector(":scope > h3")) { poner(sec, false); e.scrollIntoView?.({ block: "nearest", behavior: "smooth" }); } } })
      .observe(panel, { attributes: true, attributeFilter: ["hidden"], subtree: true });
  }

  window.Herramientas = { historial, github, ayuda, recorrido };
})();
