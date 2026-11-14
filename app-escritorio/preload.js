// Puente entre la app de escritorio y el editor (la página): solo lo justo para las actualizaciones.
const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("feApp", {
  version: () => ipcRenderer.invoke("feb:version"),
  buscarActualizaciones: () => ipcRenderer.invoke("feb:buscar-actualizaciones"),
});
