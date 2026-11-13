// Interfaz común del render (Escenas y Montaje): opciones (vista previa rápida, fragmento), estado con la cola y el progreso,
// y aviso al terminar (sonido, notificación del sistema si se permite y el título de la pestaña), también con la pestaña en segundo plano.
(() => {
  const $ = (s) => document.querySelector(s);
  const titulo0 = document.title;
  let anterior = null;
  function opciones() { const o = {}; if ($("#r-rapida")?.checked) o.rapida = true;
    const d = $("#r-desde")?.value, h = $("#r-hasta")?.value; if (d !== "" && d != null) o.desde = +d; if (h !== "" && h != null) o.hasta = +h;
    try { if (window.Notification && Notification.permission === "default") Notification.requestPermission(); } catch {}
    return o; }
  function fragmentoDesde(t, D) { $("#r-desde").value = Math.max(0, t).toFixed(1); $("#r-hasta").value = Math.min(D, t + 3).toFixed(1); }
  // pinta el estado; devuelve true si hay que seguir preguntando
  function estado(r, carpeta) { const e = $("#render-estado"), b = $("#b-render"), extra = [r.rapida ? "borrador" : "", r.fragmento ? "fragmento" : ""].filter(Boolean).join(", ");
    const enCurso = ["en cola", "preparando", "renderizando"].includes(r.estado);
    if (enCurso) { const pct = parseInt(r.progreso) || 0;
      e.innerHTML = ""; const txt = document.createElement("div");
      txt.textContent = r.estado === "en cola" ? `En cola: puesto ${r.puesto || "?"} (espera a que terminen los otros renders)` : `${r.estado === "preparando" ? "Preparando" : "Renderizando"}${extra ? " (" + extra + ")" : ""}… ${r.progreso || ""} · ${r.segundos} s`;
      const barra = document.createElement("div"); barra.className = "barra-render"; barra.innerHTML = `<i style="width:${r.estado === "renderizando" ? pct : r.estado === "preparando" ? 3 : 0}%"></i>`;
      e.append(txt, barra); b.disabled = true; document.title = `${r.estado === "en cola" ? "⏳" : pct + "%"} · ${titulo0}`; anterior = r.estado; return true; }
    b.disabled = false; document.title = titulo0;
    if (r.estado === "listo") { e.textContent = `Listo en ${r.segundos} s${extra ? " (" + extra + ")" : ""} · Videos/shorts-flow/${r.ruta || carpeta}${r.nota ? "\n" + r.nota : ""}`; const v = $("#render-video"); v.hidden = false; v.src = r.archivo; }
    else if (r.estado === "error") e.textContent = "Error al renderizar:\n" + r.log; else e.textContent = "";
    if (anterior && (r.estado === "listo" || r.estado === "error")) avisar(r.estado === "listo" ? "Render terminado" : "El render ha fallado", r.estado === "listo");
    anterior = null; return false; }
  function avisar(texto, bien) {
    try { const ctx = new (window.AudioContext || window.webkitAudioContext)(), o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = bien ? 880 : 220; g.gain.setValueAtTime(0.15, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6); o.connect(g).connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 0.6); } catch {}
    try { if (window.Notification && Notification.permission === "granted" && document.hidden) new Notification(texto, { body: titulo0 }); } catch {}
    if (document.hidden) { document.title = (bien ? "✓ " : "✗ ") + texto; const v = () => { if (!document.hidden) { document.title = titulo0; document.removeEventListener("visibilitychange", v); } }; document.addEventListener("visibilitychange", v); } }
  // vertical u horizontal: el lienzo del editor toma las medidas del formato
  function formatoLienzo(svg, formato) { const [w, h] = formato === "16:9" ? [1920, 1080] : [1080, 1920]; svg.setAttribute("viewBox", `0 0 ${w} ${h}`); svg.style.setProperty("--aspecto", `${w} / ${h}`); svg.style.aspectRatio = `${w} / ${h}`; }
  window.RenderUI = { opciones, estado, fragmentoDesde, formatoLienzo };
})();
