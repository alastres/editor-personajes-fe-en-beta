# Fe en Beta Editor: app de escritorio

La app es el mismo editor (Personajes, Escenas, Montaje y VTuber) empaquetado con Electron, en una ventana propia que se instala como cualquier programa. No necesita servidor en internet ni cuentas: cada persona trabaja con sus propios archivos.

## Cómo funciona
- `main.js` arranca por dentro `editor-personajes/servidor.js`, con el Node que trae Electron.
  - Le pasa `FEB_DATOS`: los datos van en **Documentos/Fe en Beta Editor** (personajes, escenas, acciones, andares, piezas, shorts, láminas, historial y renders).
  - Le pasa `FEB_APP=1`: en la app no hay «Subir a GitHub».
  - Le pasa `FEB_HOST=127.0.0.1`: el servidor solo se ve desde ese ordenador.
- Usa el puerto **31700** si está libre, para que la app recuerde pestañas y ajustes entre sesiones; si no, uno libre cualquiera.
- La primera vez copia a Documentos los datos de ejemplo que lleva el instalador. Después no los vuelve a tocar.
- Los enlaces del propio editor se abren en otra ventana de la app; los de fuera, en el navegador.
- Solo puede haber una ventana de la app: si se abre otra vez, trae al frente la que ya estaba.

## Probar y empaquetar
```
cd app-escritorio
npm install        # Electron y electron-builder (solo la primera vez)
npm start          # abre la app con el código de shorts-flow tal cual
npm run dist       # instalador de Windows: dist/Fe-en-Beta-Editor-<versión>.exe
```
El instalador lleva:
- `editor-personajes/`;
- el motor de `comun/` (los mismos archivos que la lista blanca del repo);
- como ejemplo: personajes, escenas, acciones, andares, piezas, shorts y láminas.

## Render dentro de la app (versión 0.2)
El render a MP4 funciona sin tener nada instalado (probado con un PATH sin Node). La app lleva todo lo necesario:
- **HyperFrames 0.9.8**, como dependencia de la app. Se ejecuta con el Node de Electron 36, que es Node 22, el que pide HyperFrames.
- **Su Chrome «headless shell»** y **ffmpeg con ffprobe** (este con sus DLL), en `resources/render`.
  - Los copia `preparar-render.js` (lo lanza `npm run dist`): el Chrome desde `~/.cache/hyperframes/chrome` y ffmpeg desde `Videos/historia-en-cuatro-actos-tools`.
- `main.js` le pasa las rutas al servidor (`FEB_HYPERFRAMES`, `FEB_CHROME`, `FEB_FFMPEG`, `FEB_FFPROBE`). El servidor las convierte en las variables de HyperFrames (`HYPERFRAMES_BROWSER_PATH`, `HYPERFRAMES_FFMPEG_PATH`, `HYPERFRAMES_FFPROBE_PATH`).
- Fuera de la app no cambia nada: el render sigue con `npx`.
- `asar` está desactivado para que HyperFrames y sus binarios (esbuild, sharp) se puedan ejecutar.
- El instalador pasa de 93 MB a **237 MB**.

## Lo que aún no va en la app
- **Música de los shorts:** el montaje de la música (`montar-musica.py`) usa el Python de VoiceStudio; sin él, el short sale sin montar la música.
- **Transcribir la voz:** necesita VoiceStudio. Sin él, los tiempos se estiman desde el guion.
- **Detector de caras del modo VTuber:** se descarga de internet la primera vez. Siguiente paso: incluirlo en la app.
- **Firma del instalador:** sin certificado, Windows avisa «Windows protegió su PC». Se instala con «Más información → Ejecutar de todas formas».

## Actualizaciones (versión 0.3)
La app se actualiza sola con **electron-updater**, desde las publicaciones (Releases) de GitHub del repositorio `alastres/editor-personajes-fe-en-beta`. Es público desde el 15 nov 2026 para que la app pueda leer las versiones sin contraseña.
- **Al abrirse**, y luego cada 6 horas, mira en silencio si hay una versión nueva.
- **Si la hay**, pregunta si descargarla. La descarga se ve en la barra de tareas y en el título de la ventana, y gracias al `.blockmap` solo baja lo que ha cambiado.
- **Al terminar**, ofrece «Reiniciar ahora» o «Al cerrar la app». Los datos de Documentos no se tocan.
- **A mano:** menú **⋯ → Buscar actualizaciones (versión X)**. Avisa también si ya está al día o si no hay conexión.
- **Código:** `actualizar.js` (proceso principal) y `preload.js` (expone `window.feApp` a la página: `version()` y `buscarActualizaciones()`).
- La versión 0.2.0 no tenía actualizaciones: quien la tenga instala la 0.3.0 a mano una vez y, desde ahí, ya se actualiza sola.

### Publicar una versión nueva
1. Sube `version` en `package.json`, por ejemplo de 0.3.0 a 0.3.1.
2. Ejecuta `npm run dist`.
3. Crea la publicación con **los tres archivos** de `dist/`: el `.exe`, su `.exe.blockmap` y `latest.yml`.
   ```bash
   gh release create v0.3.1 dist/Fe-en-Beta-Editor-0.3.1.exe dist/Fe-en-Beta-Editor-0.3.1.exe.blockmap dist/latest.yml --title "Fe en Beta Editor 0.3.1" --notes "…"
   ```
4. Sin `latest.yml`, las apps instaladas no se enteran de la versión nueva.

