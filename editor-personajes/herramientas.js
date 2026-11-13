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
  function cerrar() { document.querySelector(".hm-fondo")?.remove(); }
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
    personajes: [["Ctrl+Z / Ctrl+Y", "Deshacer / rehacer"], ["Espacio", "Reproducir la acción (Animación)"], ["K", "Clave en el cabezal (Animación)"], ["Arrastrar las asas", "Manos, pies, cadera, cabeza y pecho (Animación)"], ["F1", "Esta ayuda"],
      ["Taller: V B L P E R C I T", "Seleccionar, pincel, lazo, pluma, elipse, rectángulo, cápsula, cuentagotas, texto"], ["Taller: Mayús + clic", "Elegir varias formas"], ["Taller: espacio + arrastrar, rueda", "Mover y acercar la vista"], ["Taller: Alt + clic en un punto", "Quitarlo"], ["Taller: doble clic", "Esquina ⇄ curva, o añadir un punto en el trazo"]],
    escenas: [["Ctrl+Z / Ctrl+Y", "Deshacer / rehacer"], ["Espacio", "Reproducir"], ["Arrastrar un personaje u objeto", "Izquierda/derecha lo mueve, arriba/abajo lo aleja"], ["Arrastrar rombos y bloques", "Cambiar el ritmo en la línea de tiempo"], ["F1", "Esta ayuda"]],
    montaje: [["Ctrl+Z / Ctrl+Y", "Deshacer / rehacer"], ["Espacio", "Reproducir"], ["Arrastrar el borde entre escenas", "Mover el corte"], ["Arrastrar una escena", "Cambiarla de hueco"], ["Clic en un subtítulo", "Corregirlo (| corta la línea)"], ["F1", "Esta ayuda"]] };
  const RECORRIDO = {
    personajes: [["#lista", "El reparto: cada personaje es un JSON en shorts-flow/personajes que también puede editar Claude."], [".modo, [data-modo], button", "Diseño (cuerpo, colores, piezas) y Animación (posar, acciones con claves, asas del rig)."], ["#b-biblio", "Piezas: importa SVG, usa la biblioteca o dibuja con el taller de vectores."], ["#b-historial", "Versiones anteriores y papelera, por si algo sale mal."], ["#b-github", "Sube los cambios al repo privado de GitHub."]],
    escenas: [["#lista", "Las escenas: personajes sobre un fondo, con recorridos, acciones, cámara, rótulos y audio."], ["#panel", "Aquí se monta todo: fondo, reparto, atrezo, ambiente, cámara, rótulos, audio y el vídeo."], ["#pistas", "La línea de tiempo: clic para mover el cabezal; arrastra rombos y bloques."], ["#b-render", "Renderiza a MP4. Prueba antes la vista previa rápida o solo un fragmento."]],
    montaje: [["#b-transcribir", "Paso 1: transcribe la voz (palabras con tiempos para subtítulos y labios)."], ["#b-generar", "Paso 2: crea una escena por frase con el narrador; luego retócalas en Escenas."], ["#pistas", "Voz, subtítulos, escenas, música y efectos en la línea de tiempo."], ["#b-render", "Renderiza el short con música montada y subtítulos de la marca."]] };
  function ayuda() { const ul = h("table", { class: "hm-atajos" }); for (const [k, d] of ATAJOS[PAGINA]) ul.append(h("tr", {}, h("td", {}, h("kbd", {}, k)), h("td", {}, d)));
    modal("Ayuda y atajos", h("div", { class: "hm-cuerpo" }, ul, h("p", { class: "ayuda" }, "Todo está explicado en editor-personajes/LEEME.md; lo pendiente, en ROADMAP.md. "), h("p", {}, h("a", { href: "pruebas.html", target: "_blank", class: "enlace" }, "Pruebas automáticas del títere →"))), [h("button", { onclick: () => { cerrar(); recorrido(); } }, "Ver el recorrido guiado")]); }
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
  window.Herramientas = { historial, github, ayuda, recorrido };
})();
