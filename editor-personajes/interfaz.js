// interfaz.js — la CARA COMÚN de Personajes, Escenas y Montaje (con tema.css): barra de arriba con las cuatro secciones,
// lista de la izquierda con buscador y menú «⋯», panel de ajustes repartido en PESTAÑAS y, en pantallas estrechas, una barra
// abajo (Lista · Lienzo · Ajustes) que abre la lista y los ajustes como hojas. No cambia ningún id: los scripts de cada página
// siguen encontrando sus botones; solo los recoloca. Va después de herramientas.js.
(() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const h = (tag, at = {}, ...hijos) => { const e = document.createElement(tag); for (const k in at) k === "class" ? (e.className = at[k]) : k.startsWith("on") ? e.addEventListener(k.slice(2), at[k]) : e.setAttribute(k, at[k]); hijos.forEach((c) => c != null && e.append(c)); return e; };
  const PAGINA = /escenas/.test(location.pathname) ? "escenas" : /montaje/.test(location.pathname) ? "montaje" : /vtuber/.test(location.pathname) ? "vtuber" : "personajes";
  const sin = (t) => (t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const guardado = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch {} return null; };

  // ---- iconos (trazo, como Lucide)
  const ICONOS = { pj: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>', esc: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 15l5-5 5 5 3-3 5 5"/>',
    mon: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M8 6v12M16 6v12"/>', cam: '<rect x="3" y="7" width="13" height="10" rx="2"/><path d="M16 11l5-3v8l-5-3"/>',
    undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 010 10h-3"/>', redo: '<path d="M15 14l5-5-5-5"/><path d="M20 9H9a5 5 0 000 10h3"/>',
    dots: '<circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>', plus: '<path d="M12 5v14M5 12h14"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 015 .5c0 1.5-2.5 2-2.5 3.5M12 17h.01"/>', lista: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
    ajus: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>', lienzo: '<rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="12" cy="11" r="3"/><path d="M7 20c1-3 3-4 5-4s4 1 5 4"/>',
    reloj: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', nube: '<path d="M7 18a5 5 0 01-.6-9.96A6 6 0 0118 9a4 4 0 01-1 9z"/><path d="M12 12v6M9.5 14.5L12 12l2.5 2.5"/>',
    buscar: '<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>' };
  const ico = (n) => { const s = document.createElementNS("http://www.w3.org/2000/svg", "svg"); s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("class", "ico"); s.setAttribute("aria-hidden", "true"); s.innerHTML = ICONOS[n] || ""; return s; };

  // ---- menús desplegables («⋯»): un botón y una lista de botones; se cierran al pulsar fuera o Esc
  function menu(titulo, items, { icono = "dots", clase = "" } = {}) {
    const caja = h("div", { class: "menu " + clase }), boton = h("button", { class: "icono-btn", title: titulo, "aria-label": titulo, "aria-haspopup": "true", "aria-expanded": "false" }, ico(icono)), lista = h("div", { class: "menu-lista", role: "menu", hidden: "" });
    for (const b of items) { if (!b) continue; b.setAttribute("role", "menuitem"); b.classList.add("menu-item"); lista.append(b); b.addEventListener("click", () => cerrar()); }
    const cerrar = () => { lista.hidden = true; boton.setAttribute("aria-expanded", "false"); };
    boton.addEventListener("click", (ev) => { ev.stopPropagation(); const abrir = lista.hidden; $$(".menu-lista").forEach((l) => (l.hidden = true)); lista.hidden = !abrir; boton.setAttribute("aria-expanded", String(abrir)); });
    document.addEventListener("click", (ev) => { if (!caja.contains(ev.target)) cerrar(); }); document.addEventListener("keydown", (ev) => { if (ev.key === "Escape") cerrar(); });
    caja.append(boton, lista); return caja; }

  // ======================= BARRA DE ARRIBA =======================
  const barra = $("header.barra");
  if (barra) {
    const SECC = [["personajes", "/", "pj", "Personajes"], ["escenas", "escenas.html", "esc", "Escenas"], ["montaje", "montaje.html", "mon", "Montaje"], ["vtuber", "vtuber.html", "cam", "VTuber"]];
    const nav = h("nav", { class: "secciones", "aria-label": "Secciones" }, ...SECC.map(([k, href, i, n]) => h("a", { href, class: k === PAGINA ? "activo" : "", ...(k === PAGINA ? { "aria-current": "page" } : {}), title: n }, ico(i), h("span", {}, n))));
    const estado = $("#estado"), deshacer = $("#b-deshacer"), rehacer = $("#b-rehacer"), hist = $("#b-historial"), git = $("#b-github"), ayuda = $("#b-ayuda");
    for (const [b, i, t] of [[deshacer, "undo", "Deshacer"], [rehacer, "redo", "Rehacer"], [ayuda, "help", "Ayuda"]]) if (b) { b.replaceChildren(ico(i)); b.classList.add("icono-btn"); b.setAttribute("aria-label", t); }
    if (hist) hist.replaceChildren(ico("reloj"), h("span", {}, "Historial y papelera")); if (git) git.replaceChildren(ico("nube"), h("span", {}, "Subir a GitHub"));
    // en la app de escritorio (Electron) no se sube a GitHub: es solo para el repo del autor
    const enApp = /Electron/.test(navigator.userAgent); if (git && enApp) git.remove();
    // lo propio de la página que estaba en la barra (el selector Diseño/Animación de Personajes) se guarda para recolocarlo
    const modo = $("#modo"), otros = $$(":scope > *", barra).filter((e) => !e.matches(".marca, .acciones, .enlace-pagina") && e !== modo);
    barra.replaceChildren(h("div", { class: "marca" }, h("i"), h("b", {}, "Fe en Beta")), nav, ...otros,
      h("div", { class: "derecha" }, estado || "", deshacer || "", rehacer || "", ayuda || "", menu(enApp ? "Más: historial y papelera" : "Más: historial, papelera y GitHub", [hist, enApp ? null : git])));
    if (modo) { modo.classList.add("seg-modo"); window.__modo = modo; }
  }

  // ======================= LISTA DE LA IZQUIERDA =======================
  const reparto = $("aside.reparto");
  if (reparto) { const cab = $(".cab", reparto), pie = $(".pie", reparto), nuevo = pie && $(".primario", pie), lista = $("#lista");
    const NOMBRE = { personajes: "personaje", escenas: "escena", montaje: "short" }[PAGINA] || "elemento";
    const buscar = h("input", { type: "search", class: "buscar-lista", placeholder: "Buscar " + NOMBRE, "aria-label": "Buscar " + NOMBRE });
    buscar.addEventListener("input", () => { const q = sin(buscar.value.trim()); for (const li of $$("li", lista)) li.hidden = !!q && !sin(li.textContent).includes(q); });
    new MutationObserver(() => { if (buscar.value) buscar.dispatchEvent(new Event("input")); }).observe(lista, { childList: true });
    const fila = h("div", { class: "lista-cab" }, buscar);
    if (nuevo) { nuevo.classList.add("btn-nuevo"); nuevo.title = nuevo.textContent.replace("+", "").trim(); nuevo.setAttribute("aria-label", nuevo.title); nuevo.replaceChildren(ico("plus")); fila.append(nuevo); }
    const resto = pie ? $$("button", pie).filter((b) => b !== nuevo) : [];
    if (resto.length) fila.append(menu("Más: duplicar, papelera, exportar…", resto, { clase: "menu-lista-izq" }));
    if (cab) cab.replaceWith(fila); else reparto.prepend(fila);
    if (pie) { const inputs = $$("input", pie); pie.replaceChildren(...inputs); pie.hidden = true; } }

  // ======================= ESCENARIO: barra de arriba del lienzo (Personajes) =======================
  if (PAGINA === "personajes" && window.__modo) { const esc = $("section.escenario"), nom = h("b", { class: "lienzo-nombre" }), tipo = h("span", { class: "lienzo-tipo" });
    esc.prepend(h("div", { class: "lienzo-barra" }, nom, tipo, window.__modo));
    const pinta = () => { const li = $("#lista li.activo"); nom.textContent = (li?.textContent || "").trim(); tipo.textContent = document.body.classList.contains("es-libre") ? "marioneta libre" : ""; };
    new MutationObserver(pinta).observe($("#lista"), { subtree: true, childList: true, attributes: true, attributeFilter: ["class"] }); new MutationObserver(pinta).observe(document.body, { attributes: true, attributeFilter: ["class"] }); pinta(); }

  // ======================= PANEL: PESTAÑAS =======================
  // cada sección (su <h3>) va a una pestaña; se ven solo las de la pestaña elegida (al buscar, todas las que coinciden)
  const PESTANAS = {
    personajes: [["ficha", "Ficha", /^ficha|^marioneta libre/], ["cuerpo", "Cuerpo", /^cuerpo|^cara y pelo|^ropa/], ["color", "Color", /^colores/], ["piezas", "Piezas", /^piezas|^marioneta vectorial|^imagenes/],
      ["accion", "Acción", /^accion/], ["pose", "Pose", /^posar/], ["controles", "Controles", /^controles/]],
    escenas: [["escena", "Escena", /^escena|^camara|^ambiente/], ["reparto", "Reparto", /^reparto/], ["atrezo", "Atrezo", /^atrezo/], ["textos", "Rótulos", /^rotulos/], ["audio", "Audio", /^audio/], ["video", "Vídeo", /^video/]],
    montaje: [["voz", "Voz", /^short|^1 |^2 /], ["escena", "Escena", /^escena/], ["subs", "Subtítulos", /^subtitulos/], ["sonido", "Sonido", /^musica|^efectos/], ["video", "Vídeo", /^video/]] };
  const panel = $("#panel");
  if (panel && PESTANAS[PAGINA]) {
    const P = PESTANAS[PAGINA], barraP = h("div", { class: "pestanas", role: "tablist" }), clave = "pestana-" + PAGINA;
    const titulo = (s) => sin((s.querySelector(":scope > h3")?.firstChild?.textContent || s.querySelector(":scope > h3")?.textContent || "").trim());
    // todas las secciones del panel; las que no tienen título (p. ej. «Para programadores») van con la anterior que sí lo tiene
    const secciones = () => $$("section", panel).filter((s) => s.parentElement === panel);
    const pestanaDe = (s) => { let t = s; while (t && !t.querySelector?.(":scope > h3")) t = t.previousElementSibling; if (!t) return P[0][0];
      return (P.find(([, , re]) => re.test(titulo(t))) || [P[0][0]])[0]; };
    const visible = (s) => { s.classList.remove("otra-pestana"); const d = getComputedStyle(s).display !== "none"; return d; };
    let activa = guardado(clave + (document.body.classList.contains("modo-anim") ? "-anim" : "")) || null;
    function pintar() { const ss = secciones(), conVista = new Set(); for (const s of ss) { s.dataset.pestana = pestanaDe(s); if (visible(s)) conVista.add(s.dataset.pestana); }
      if (!conVista.has(activa)) activa = P.find(([k]) => conVista.has(k))?.[0];
      barraP.replaceChildren(...P.filter(([k]) => conVista.has(k)).map(([k, n]) => h("button", { role: "tab", class: k === activa ? "activo" : "", "aria-selected": String(k === activa), onclick: () => elegir(k) }, n)));
      barraP.hidden = conVista.size < 2;
      for (const s of ss) s.classList.toggle("otra-pestana", s.dataset.pestana !== activa); }
    function elegir(k) { activa = k; guardado(clave + (document.body.classList.contains("modo-anim") ? "-anim" : ""), k); pintar(); panel.scrollTop = 0; }
    const pb = $(".panel-barra", panel); (pb || panel.firstChild)?.after ? (pb ? pb.after(barraP) : panel.prepend(barraP)) : panel.prepend(barraP);
    // al buscar, se ignoran las pestañas
    const busca = pb && $("input[type=search]", pb); busca?.addEventListener("input", () => panel.classList.toggle("buscando", !!busca.value.trim()));
    // al cambiar de modo (Diseño / Animación) o de tipo de personaje, otras pestañas
    new MutationObserver(() => { activa = guardado(clave + (document.body.classList.contains("modo-anim") ? "-anim" : "")) || activa; pintar(); }).observe(document.body, { attributes: true, attributeFilter: ["class"] });
    // si aparece un sub-panel (al elegir un actor, un rótulo…) en otra pestaña, se cambia a esa
    new MutationObserver((ms) => { for (const m of ms) { const e = m.target; if (e.hasAttribute?.("hidden") || e.tagName === "SECTION") continue; const s = e.closest?.("section[data-pestana]");
        if (s && s.dataset.pestana !== activa && !panel.classList.contains("buscando")) { elegir(s.dataset.pestana); break; } } }).observe(panel, { attributes: true, attributeFilter: ["hidden"], subtree: true });
    new MutationObserver(() => { if (secciones().some((s) => !s.dataset.pestana)) pintar(); }).observe(panel, { childList: true });
    pintar(); setTimeout(pintar, 600); }

  // ======================= PANTALLAS ESTRECHAS: barra de abajo y hojas =======================
  if (reparto && panel) {
    const NOM = { personajes: "Reparto", escenas: "Escenas", montaje: "Shorts" }[PAGINA] || "Lista";
    const b = (k, i, n) => h("button", { "data-ver": k, onclick: () => ver(k) }, ico(i), h("span", {}, n));
    const abajo = h("nav", { class: "barra-movil", "aria-label": "Vistas" }, b("lista", "lista", NOM), b("lienzo", "lienzo", "Lienzo"), b("ajustes", "ajus", "Ajustes"));
    const ver = (k) => { document.body.dataset.ver = k; for (const x of $$("button", abajo)) x.classList.toggle("activo", x.dataset.ver === k); };
    document.body.append(abajo); ver("lienzo");
    // en el teléfono, al elegir algo de la lista se vuelve al lienzo
    $("#lista")?.addEventListener("click", () => { if (matchMedia("(max-width: 860px)").matches) setTimeout(() => ver("lienzo"), 120); });
    // cerrar una hoja tocando el lienzo
    $("section.escenario")?.addEventListener("pointerdown", () => { if (matchMedia("(max-width: 860px)").matches && document.body.dataset.ver !== "lienzo") ver("lienzo"); }, true);
  }
  window.Interfaz = { menu, ico };
})();
