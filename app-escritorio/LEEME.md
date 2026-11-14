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

## Lo que aún no va en la app (versión 0.1)
- **Render a MP4:** usa HyperFrames con `npx`, así que hace falta tener Node instalado. ffmpeg, en cambio, se busca en `historia-en-cuatro-actos-tools`, que solo existe en el ordenador del autor. Siguiente paso: meter HyperFrames y ffmpeg dentro del instalador.
- **Transcribir la voz:** necesita VoiceStudio. Sin él, los tiempos se estiman desde el guion.
- **Detector de caras del modo VTuber:** se descarga de internet la primera vez. Siguiente paso: incluirlo en la app.
- **Firma del instalador:** sin certificado, Windows avisa «Windows protegió su PC». Se instala con «Más información → Ejecutar de todas formas».
