// APP DE ESCRITORIO del editor de Fe en Beta (Electron).
// Arranca el mismo servidor del editor (editor-personajes/servidor.js) por dentro, con los datos del usuario en
// Documentos/Fe en Beta Editor, y abre la interfaz en su propia ventana. La primera vez copia allí los personajes,
// escenas, acciones y láminas de ejemplo que van en el instalador.
//   npm start      prueba sin empaquetar (usa el código de shorts-flow tal cual)
//   npm run dist   instalador de Windows en dist/
const { app, BrowserWindow, shell, Menu, dialog } = require("electron");
const path = require("path"), fs = require("fs"), net = require("net"), http = require("http"), { fork } = require("child_process");

const EMPAQUETADA = app.isPackaged;
const CODIGO = EMPAQUETADA ? path.join(process.resourcesPath, "codigo") : path.join(__dirname, "..");
const EJEMPLO = EMPAQUETADA ? path.join(process.resourcesPath, "ejemplo") : path.join(__dirname, "..");
const DATOS = process.env.FEB_DATOS || path.join(app.getPath("documents"), "Fe en Beta Editor");
const CARPETAS = ["personajes", "escenas", "acciones", "andares", "piezas", "shorts", "ilustraciones"];
const PUERTO_PREFERIDO = 31700;   // fijo si está libre: así el navegador interno recuerda pestañas y ajustes entre sesiones

let servidor = null, ventana = null;

// la primera vez (o si falta una carpeta), los datos de ejemplo
function prepararDatos() { fs.mkdirSync(DATOS, { recursive: true });
  for (const c of CARPETAS) { const destino = path.join(DATOS, c), origen = path.join(EJEMPLO, c); if (fs.existsSync(destino) || !fs.existsSync(origen)) continue;
    fs.cpSync(origen, destino, { recursive: true, filter: (f) => !/[\\/]papelera([\\/]|$)/.test(f) && !/\.bak$/.test(f) }); } }

const libre = (p) => new Promise((ok) => { const s = net.createServer().once("error", () => ok(false)).once("listening", () => s.close(() => ok(true))).listen(p, "127.0.0.1"); });
const cualquiera = () => new Promise((ok) => { const s = net.createServer().listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => ok(p)); }); });

// RENDER sin nada instalado: HyperFrames (dependencia de la app, se ejecuta con su Node), su Chrome y ffmpeg (recursos/render,
// copiados por preparar-render.js). Si falta alguno, el servidor vuelve a npx y a las herramientas del ordenador.
function rutasRender() { const R = EMPAQUETADA ? path.join(process.resourcesPath, "render") : path.join(__dirname, "recursos", "render");
  const app_ = EMPAQUETADA ? path.join(process.resourcesPath, "app") : __dirname, out = {};
  const hf = path.join(app_, "node_modules", "hyperframes", "bin", "hyperframes.mjs"); if (fs.existsSync(hf)) out.FEB_HYPERFRAMES = hf;
  const chromeDir = path.join(R, "chrome"); if (fs.existsSync(chromeDir)) { const exe = (function buscar(d, n = 0) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const f = path.join(d, e.name);
      if (e.isFile() && /^chrome-headless-shell(\.exe)?$/.test(e.name)) return f; if (e.isDirectory() && n < 3) { const r = buscar(f, n + 1); if (r) return r; } } return null; })(chromeDir); if (exe) out.FEB_CHROME = exe; }
  const ff = path.join(R, "ffmpeg", "ffmpeg.exe"), fp = path.join(R, "ffmpeg", "ffprobe.exe"); if (fs.existsSync(ff)) out.FEB_FFMPEG = ff; if (fs.existsSync(fp)) out.FEB_FFPROBE = fp;
  return out; }

function arrancarServidor(puerto) { return new Promise((ok, mal) => {
  servidor = fork(path.join(CODIGO, "editor-personajes", "servidor.js"), [], { cwd: DATOS, stdio: ["ignore", "pipe", "pipe", "ipc"],
    env: Object.assign({}, process.env, { ELECTRON_RUN_AS_NODE: "1", PORT: String(puerto), FEB_DATOS: DATOS, FEB_APP: "1", FEB_HOST: "127.0.0.1" }, rutasRender()) });
  let log = ""; const anota = (b) => { log = (log + b).slice(-4000); }; servidor.stdout.on("data", anota); servidor.stderr.on("data", anota);
  const t = setTimeout(() => mal(new Error("El servidor no arrancó a tiempo.\n\n" + log)), 20000);
  servidor.on("message", (m) => { if (m && m.listo) { clearTimeout(t); ok(); } });
  servidor.on("exit", (cod) => { clearTimeout(t); if (!app.isQuitting) mal(new Error("El servidor se cerró (código " + cod + ").\n\n" + log)); }); }); }

function crearVentana(puerto) {
  ventana = new BrowserWindow({ width: 1440, height: 900, minWidth: 360, minHeight: 480, backgroundColor: "#121018", title: "Fe en Beta Editor", show: false,
    icon: path.join(__dirname, "icono.png"), autoHideMenuBar: true, webPreferences: { contextIsolation: true, sandbox: true, preload: path.join(__dirname, "preload.js") } });
  const base = `http://127.0.0.1:${puerto}`;
  // enlaces: los del propio editor (otra página, un JSON del historial) en otra ventana de la app; los de fuera, en el navegador
  ventana.webContents.setWindowOpenHandler(({ url }) => { if (url.startsWith(base)) return { action: "allow", overrideBrowserWindowOptions: { autoHideMenuBar: true, backgroundColor: "#121018" } }; shell.openExternal(url); return { action: "deny" }; });
  ventana.webContents.on("will-navigate", (ev, url) => { if (!url.startsWith(base)) { ev.preventDefault(); shell.openExternal(url); } });
  ventana.once("ready-to-show", () => ventana.show());
  ventana.loadURL(base + "/" + (process.env.FEB_PAGINA || "")); }   // FEB_PAGINA: abrir directamente otra página (capturas para la documentación)

// FEB_PERFIL: otro perfil (y otra «única instancia») para probar o hacer capturas sin tocar la app instalada que esté abierta
if (process.env.FEB_PERFIL) app.setPath("userData", process.env.FEB_PERFIL);
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on("second-instance", () => { if (ventana) { if (ventana.isMinimized()) ventana.restore(); ventana.focus(); } });
  app.whenReady().then(async () => {
    if (EMPAQUETADA) Menu.setApplicationMenu(null);
    try { prepararDatos(); const puerto = (await libre(PUERTO_PREFERIDO)) ? PUERTO_PREFERIDO : await cualquiera(); await arrancarServidor(puerto); crearVentana(puerto); require("./actualizar").iniciar(() => ventana); }
    catch (e) { dialog.showErrorBox("Fe en Beta Editor no pudo arrancar", String(e.message || e)); app.quit(); } });
  app.on("before-quit", () => { app.isQuitting = true; if (servidor && !servidor.killed) servidor.kill(); });
  app.on("window-all-closed", () => app.quit());
}
