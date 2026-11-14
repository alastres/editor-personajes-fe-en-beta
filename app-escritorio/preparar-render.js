// Copia a recursos/render lo que el instalador necesita para renderizar sin nada instalado:
//   recursos/render/chrome/   el Chrome «headless shell» que usa HyperFrames (el de su caché: ~/.cache/hyperframes/chrome)
//   recursos/render/ffmpeg/   ffmpeg.exe y ffprobe.exe (de Videos/historia-en-cuatro-actos-tools)
// Se ejecuta antes de empaquetar (npm run dist lo hace solo). Si falta algo, dice de dónde sacarlo.
const fs = require("fs"), path = require("path"), os = require("os");
const DESTINO = path.join(__dirname, "recursos", "render");
const CACHE_CHROME = path.join(os.homedir(), ".cache", "hyperframes", "chrome", "chrome-headless-shell");
const HERRAMIENTAS = path.join(__dirname, "..", "..", "historia-en-cuatro-actos-tools");

function chrome() { if (!fs.existsSync(CACHE_CHROME)) throw new Error(`No encuentro el Chrome de HyperFrames en ${CACHE_CHROME}. Haz un render con «npx hyperframes render» una vez para que lo descargue.`);
  const versiones = fs.readdirSync(CACHE_CHROME).filter((v) => /^win64-/.test(v)).sort().reverse(); if (!versiones.length) throw new Error("No hay ningún Chrome win64 en " + CACHE_CHROME);
  const origen = path.join(CACHE_CHROME, versiones[0]), destino = path.join(DESTINO, "chrome");
  if (fs.existsSync(path.join(destino, "VERSION")) && fs.readFileSync(path.join(destino, "VERSION"), "utf8") === versiones[0]) return console.log("Chrome ya copiado:", versiones[0]);
  fs.rmSync(destino, { recursive: true, force: true }); fs.cpSync(origen, destino, { recursive: true }); fs.writeFileSync(path.join(destino, "VERSION"), versiones[0]); console.log("Chrome copiado:", versiones[0]); }

function ffmpeg() { const destino = path.join(DESTINO, "ffmpeg"); fs.mkdirSync(destino, { recursive: true });
  // ffprobe de esa carpeta usa las DLL de FFmpeg que tiene al lado: van también
  for (const f of ["ffmpeg.exe", "ffprobe.exe", ...fs.readdirSync(HERRAMIENTAS).filter((x) => /\.dll$/i.test(x))]) { const o = path.join(HERRAMIENTAS, f); if (!fs.existsSync(o)) throw new Error("No encuentro " + o);
    const d = path.join(destino, f); if (!fs.existsSync(d) || fs.statSync(d).size !== fs.statSync(o).size) fs.copyFileSync(o, d); } console.log("ffmpeg y ffprobe copiados"); }

chrome(); ffmpeg();
