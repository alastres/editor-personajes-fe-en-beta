// ACTUALIZACIONES de la app (electron-updater). Las versiones se publican en GitHub Releases (ver «publish» en package.json):
// el instalador, su .blockmap (para bajar solo lo que cambia) y latest.yml (la versión más reciente).
//   - Al abrir la app (y luego cada 6 horas) se mira en silencio si hay una versión nueva.
//   - Si la hay, se pregunta si descargarla; la descarga se ve en la barra de tareas y en el título de la ventana.
//   - Al terminar: «Reiniciar ahora» o «Al cerrar» (se instala sola la próxima vez que se cierre la app).
//   - Desde el editor: menú ⋯ → «Buscar actualizaciones» (avisa también si ya está al día o si no hay conexión).
const { app, dialog, ipcMain } = require("electron");
const { autoUpdater } = require("electron-updater");

function iniciar(ventana) {
  const titulo = () => ventana()?.webContents.getTitle() || "Fe en Beta Editor";   // el de la página (Personajes, Escenas…)
  let manual = false, descargando = false, avisadaVersion = null;
  autoUpdater.autoDownload = false; autoUpdater.autoInstallOnAppQuit = true; autoUpdater.allowPrerelease = false;
  autoUpdater.logger = { info: (m) => console.log("[actualizar]", m), warn: (m) => console.warn("[actualizar]", m), error: (m) => console.error("[actualizar]", m), debug: () => {} };

  autoUpdater.on("update-available", async (info) => {
    if (descargando || (!manual && avisadaVersion === info.version)) return; avisadaVersion = info.version;
    const notas = typeof info.releaseNotes === "string" ? info.releaseNotes.replace(/<[^>]+>/g, "").trim().slice(0, 600) : "";
    const r = await dialog.showMessageBox(ventana(), { type: "info", title: "Actualización disponible", message: `Hay una versión nueva: ${info.version} (tienes la ${app.getVersion()}).`,
      detail: (notas ? notas + "\n\n" : "") + "¿La descargo ahora? Puedes seguir trabajando mientras se descarga.", buttons: ["Descargar", "Ahora no"], defaultId: 0, cancelId: 1 });
    if (r.response === 0) { descargando = true; autoUpdater.downloadUpdate().catch((e) => fallo(e)); } manual = false; });
  autoUpdater.on("update-not-available", () => { if (manual) dialog.showMessageBox(ventana(), { type: "info", title: "Actualizaciones", message: `Ya tienes la última versión (${app.getVersion()}).` }); manual = false; });
  autoUpdater.on("download-progress", (p) => { const w = ventana(); if (!w) return; w.setProgressBar(p.percent / 100); w.setTitle(`Descargando la actualización… ${Math.round(p.percent)}%`); });
  autoUpdater.on("update-downloaded", async (info) => { descargando = false; const w = ventana(); if (w) { w.setProgressBar(-1); w.setTitle(titulo()); }
    const r = await dialog.showMessageBox(w, { type: "info", title: "Actualización lista", message: `La versión ${info.version} está descargada.`, detail: "Se instala al reiniciar la app. Tus personajes y escenas (en Documentos) no se tocan.", buttons: ["Reiniciar ahora", "Al cerrar la app"], defaultId: 0, cancelId: 1 });
    if (r.response === 0) setImmediate(() => autoUpdater.quitAndInstall(false, true)); });
  autoUpdater.on("error", (e) => fallo(e));
  function fallo(e) { descargando = false; const w = ventana(); if (w) w.setProgressBar(-1); console.error("[actualizar]", e);
    if (manual) dialog.showMessageBox(w, { type: "warning", title: "Actualizaciones", message: "No se pudo buscar o descargar la actualización.", detail: "Comprueba la conexión a internet y vuelve a intentarlo.\n\n" + String(e?.message || e).slice(0, 400) }); manual = false; }

  const buscar = (aMano) => { manual = !!aMano;
    if (!app.isPackaged) { if (aMano) dialog.showMessageBox(ventana(), { type: "info", title: "Actualizaciones", message: "Las actualizaciones solo funcionan en la app instalada.", detail: "Ahora se está ejecutando desde el código (npm start)." }); return; }
    autoUpdater.checkForUpdates().catch((e) => fallo(e)); };
  ipcMain.handle("feb:buscar-actualizaciones", () => { buscar(true); return true; });
  ipcMain.handle("feb:version", () => app.getVersion());
  // al abrir (con un poco de margen para no frenar el arranque) y cada 6 horas
  setTimeout(() => buscar(false), 8000); setInterval(() => buscar(false), 6 * 3600 * 1000);
}
module.exports = { iniciar };
