// vtuber.js — MODO VTUBER: el personaje del editor se mueve contigo en directo, para usarlo como webcam (OBS → cámara virtual).
//   vtuber.html            panel + escenario: cámara (MediaPipe Face Landmarker, en el navegador), micrófono, emociones y gestos
//   vtuber.html?salida     solo el personaje, con el fondo transparente, para la «Fuente de navegador» de OBS. No usa cámara:
//                          recibe cada fotograma de la página de control a través del servidor (POST /api/vtuber → SSE).
// La cámara da: giro de la cabeza (nariz respecto a los pómulos), mirar arriba/abajo (nariz entre ojos y barbilla), ladeo (línea
// de los ojos), parpadeo, mandíbula, dirección de los ojos y gestos (sonrisa, cejas, ceño). «Centrar» guarda tu postura recta.
(function () {
  const $ = (s) => document.querySelector(s), NS = "http://www.w3.org/2000/svg";
  const el = (t, at = {}, p) => { const e = document.createElementNS(NS, t); for (const k in at) e.setAttribute(k, at[k]); if (p) p.appendChild(e); return e; };
  const h = (t, at = {}, ...hijos) => { const e = document.createElement(t); for (const k in at) { if (k.startsWith("on")) e.addEventListener(k.slice(2), at[k]); else e.setAttribute(k, at[k]); } e.append(...hijos); return e; };
  const P = window.Personajes, T = window.Titere25D, cl = (x, a, b) => Math.max(a, Math.min(b, x)), rad = (g) => (g * Math.PI) / 180;
  const q = new URLSearchParams(location.search), SALIDA = q.has("salida");
  const CAM = { tilt: 0.22 };
  const FONDOS = { verde: "#00b140", azul: "#0047bb", oscuro: "#1c1828", claro: "#efe8dc", transparente: "transparent" };
  const EMO = ["neutra", "alegre", "risa", "triste", "enfado", "sorpresa", "miedo", "pensativo", "verguenza"];
  const EMO_N = { neutra: "Neutra", alegre: "Alegre", risa: "Risa", triste: "Triste", enfado: "Enfado", sorpresa: "Sorpresa", miedo: "Miedo", pensativo: "Pensativo", verguenza: "Vergüenza" };
  const GESTOS = [["q", "saludo", "Saludar"], ["w", "explicar", "Explicar"], ["e", "manos-arriba", "Manos arriba"], ["r", "mano-pecho", "Mano al pecho"], ["t", "ofrecer", "Ofrecer"], ["y", "tender-mano", "Tender la mano"]];
  const DE_BRAZOS = /^(b(Izq|Der)|m(Izq|Der)|p(Izq|Der))/;
  const normaliza = (x) => { x.opciones = Object.assign({ proporciones: "normal", pelo: "corto", barba: false, vestido: false, moderno: false }, x.opciones || {});
    x.colores = Object.assign({}, x.colores || {}); x.piezas = Array.isArray(x.piezas) ? x.piezas : []; x.variantes = Object.assign({}, x.variantes || {}); x.acciones = Array.isArray(x.acciones) ? x.acciones : []; return x; };

  // ---- ajustes (se recuerdan en este navegador)
  let cfg = { p: null, enc: "busto", fondo: "verde", espejo: true, gestosCara: true, cuerpoSigue: true, fuerza: 1.2, suave: 0.5, sens: 1, panel: true, centro: null };
  try { Object.assign(cfg, JSON.parse(localStorage.getItem("vtuber") || "{}")); } catch {}
  const guardar = () => { try { localStorage.setItem("vtuber", JSON.stringify(cfg)); } catch {} };
  if (q.get("p")) cfg.p = q.get("p");

  // ---- personaje y encuadre
  const svg = $("#vt-lienzo"), g = $("#vt-g");
  let j = null, m = null, id = null, cargando = null;
  async function cargar(pid) { if (!pid || pid === id || cargando === pid) return; cargando = pid;
    try { const r = await fetch(`/api/personajes/${pid}`); if (!r.ok) throw new Error(r.status); j = normaliza(await r.json()); id = pid; g.replaceChildren(); T.camara(CAM); m = P.crear(g, j, { id: "vt-" + pid }); encuadrar(); }
    catch (e) { console.error("No se pudo cargar", pid, e); } finally { cargando = null; } }
  function encuadrar() { if (!m) return; T.camara(CAM); m.dibujar(Object.assign(P.pose(P.completa({}), { giro: 0 }), { parpadeo: 1 }));
    const b = g.getBBox(), r = svg.clientWidth / Math.max(1, svg.clientHeight), busto = cfg.enc === "busto" && !j?.libre && j?.tipo !== "libre";
    // busto: de un poco por encima de la cabeza (para las manos en alto) hasta el pecho, y con anchura para los brazos abiertos
    const alto = busto ? Math.max(b.height * 0.74, (b.width * 1.9) / r) : b.height * 1.3, top = busto ? b.y - b.height * 0.16 : b.y - b.height * 0.2, ancho = alto * r, cx = b.x + b.width / 2;
    svg.setAttribute("viewBox", `${(cx - ancho / 2).toFixed(1)} ${top.toFixed(1)} ${ancho.toFixed(1)} ${alto.toFixed(1)}`); }
  window.addEventListener("resize", encuadrar);
  const ponerFondo = (f) => { document.body.style.background = FONDOS[f] || f || "transparent"; };

  // ======================= SALIDA PARA OBS: dibuja lo que manda la página de control =======================
  if (SALIDA) { document.body.className = "salida"; $("#vt-panel")?.remove(); ponerFondo(q.get("fondo") || "transparente");
    let ultimo = null;
    const es = new EventSource("/api/vtuber/eventos");
    es.onmessage = (ev) => { try { ultimo = JSON.parse(ev.data); } catch {} };
    const bucle = () => { try { if (ultimo) { const d = ultimo; if (d.p !== id) cargar(d.p); else if (m) { if (d.enc !== cfg.enc) { cfg.enc = d.enc; encuadrar(); } T.camara(CAM); m.dibujar(d.e); } } } catch (e) { console.error(e); }
      requestAnimationFrame(bucle); };
    requestAnimationFrame(bucle); return; }

  // ======================= PÁGINA DE CONTROL =======================
  document.body.classList.toggle("sin-panel", !cfg.panel);
  if (q.has("limpio")) document.body.classList.add("limpio", "sin-panel");

  // ---- lista de personajes
  (async () => { const lista = await (await fetch("/api/personajes")).json(), s = $("#vt-personaje");
    s.replaceChildren(...lista.map((x) => h("option", { value: x.id }, x.nombre || x.id)));
    if (!cfg.p || !lista.some((x) => x.id === cfg.p)) cfg.p = (lista.find((x) => /pedro/i.test(x.id)) || lista[0])?.id;
    s.value = cfg.p; cargar(cfg.p);
    s.addEventListener("change", () => { cfg.p = s.value; guardar(); cargar(cfg.p); }); })();

  // ---- controles del panel
  for (const r of document.querySelectorAll("[name=vt-enc]")) { r.checked = r.value === cfg.enc; r.addEventListener("change", () => { cfg.enc = r.value; guardar(); encuadrar(); }); }
  $("#vt-fondo").value = cfg.fondo; ponerFondo(cfg.fondo); $("#vt-fondo").addEventListener("change", (ev) => { cfg.fondo = ev.target.value; ponerFondo(cfg.fondo); guardar(); });
  for (const [sel, k] of [["#vt-espejo", "espejo"], ["#vt-gestos-cara", "gestosCara"], ["#vt-cuerpo-sigue", "cuerpoSigue"]]) { const c = $(sel); c.checked = !!cfg[k]; c.addEventListener("change", () => { cfg[k] = c.checked; if (k === "espejo") cfg.centro = null; guardar(); }); }
  for (const [sel, k] of [["#vt-fuerza", "fuerza"], ["#vt-suave", "suave"], ["#vt-sens", "sens"]]) { const i = $(sel), o = i.nextElementSibling; i.value = cfg[k]; o.textContent = cfg[k]; i.addEventListener("input", () => { cfg[k] = +i.value; o.textContent = i.value; guardar(); }); }
  const urlSalida = location.origin + "/vtuber.html?salida"; $("#vt-url-salida").textContent = urlSalida;
  $("#vt-copiar").addEventListener("click", async () => { try { await navigator.clipboard.writeText(urlSalida); $("#vt-copiar").textContent = "Copiada ✓"; } catch { $("#vt-copiar").textContent = "Cópiala a mano"; } setTimeout(() => ($("#vt-copiar").textContent = "Copiar"), 1800); });

  // ---- emociones y gestos (botones y teclas)
  let emo = "neutra", gesto = null;
  const pintarBotones = () => { for (const b of document.querySelectorAll("#vt-emos button")) b.classList.toggle("activo", b.dataset.e === emo);
    for (const b of document.querySelectorAll("#vt-gestos button")) b.classList.toggle("activo", !!gesto && gesto.id === b.dataset.g && !gesto.sale); };
  $("#vt-emos").append(...EMO.map((n, i) => { const b = h("button", { "data-e": n, onclick: () => ponerEmo(n) }, EMO_N[n], h("kbd", {}, String(i))); return b; }));
  $("#vt-gestos").append(...GESTOS.map(([k, gid, nom]) => h("button", { "data-g": gid, onclick: () => lanzarGesto(gid) }, nom, h("kbd", {}, k.toUpperCase()))));
  function ponerEmo(n) { emo = emo === n && n !== "neutra" ? "neutra" : n; pintarBotones(); }
  function lanzarGesto(gid) { if (gesto && gesto.id === gid && !gesto.sale) { gesto.sale = reloj; pintarBotones(); return; }
    const a = P.buscarAccion(j, gid); if (!a) return; const dur = a.bucle ? Math.max(4, a.duracion * 2) : Math.min(a.duracion, 3.5);
    gesto = { id: gid, a, t0: reloj, dur, sale: null, peso: gesto?.peso || 0 }; pintarBotones(); }
  window.addEventListener("keydown", (ev) => { if (ev.target.closest("input, select, textarea") || ev.ctrlKey || ev.metaKey || ev.altKey || ev.repeat) return;
    const k = ev.key.toLowerCase();
    if (/^[0-8]$/.test(k)) { ponerEmo(EMO[+k]); ev.preventDefault(); return; }
    const gs = GESTOS.find((x) => x[0] === k); if (gs) { lanzarGesto(gs[1]); ev.preventDefault(); return; }
    if (k === "h") { cfg.panel = !cfg.panel; document.body.classList.toggle("sin-panel", !cfg.panel); guardar(); setTimeout(encuadrar, 30); }
    if (k === "c") centrar(); });

  // ---- ratón (sin cámara): la cabeza sigue al puntero sobre el escenario
  let raton = null; const escena = $("#vt-escena");
  escena.addEventListener("pointermove", (ev) => { const r = escena.getBoundingClientRect(); raton = { x: cl(((ev.clientX - r.left) / r.width) * 2 - 1, -1, 1), y: cl(((ev.clientY - r.top) / r.height) * 2 - 1, -1, 1), t: performance.now() }; });
  escena.addEventListener("pointerleave", () => { raton = null; });

  // ======================= CÁMARA: MediaPipe Face Landmarker =======================
  const MP = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14", MODELO = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
  const video = $("#vt-video"), lienzoPuntos = $("#vt-puntos"), estado = (t, c = "") => { const e = $("#vt-estado"); e.textContent = t; e.className = c; };
  let detector = null, camOn = false, ultVideo = -1, cara = null;   // cara: medidas crudas de la última detección { yaw, pitch, roll, bs, t }
  $("#vt-cam").addEventListener("click", async () => { if (camOn) return apagarCam();
    try { estado("Pidiendo permiso para la cámara…");
      const flujo = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: "user" }, audio: false });
      video.srcObject = flujo; await video.play(); camOn = true; $("#vt-video-caja").classList.add("on"); $("#vt-cam").textContent = "📷 Apagar la cámara"; $("#vt-cam").classList.add("activo");
      if (!detector) { estado("Cargando el detector de caras (la primera vez tarda unos segundos)…"); detector = await crearDetector(); }
      estado("Cámara encendida. Mira de frente y pulsa «Centrar».", "ok"); }
    catch (e) { console.error(e); estado("No se pudo encender la cámara: " + (e.message || e), "mal"); apagarCam(); } });
  async function crearDetector() { const V = await import(MP + "/vision_bundle.mjs"), fs = await V.FilesetResolver.forVisionTasks(MP + "/wasm");
    const op = (delegate) => ({ baseOptions: { modelAssetPath: MODELO, delegate }, outputFaceBlendshapes: true, runningMode: "VIDEO", numFaces: 1 });
    try { return await V.FaceLandmarker.createFromOptions(fs, op("GPU")); } catch { return await V.FaceLandmarker.createFromOptions(fs, op("CPU")); } }
  function apagarCam() { camOn = false; cara = null; const f = video.srcObject; if (f) for (const t of f.getTracks()) t.stop(); video.srcObject = null;
    $("#vt-video-caja").classList.remove("on"); $("#vt-cam").textContent = "📷 Encender la cámara"; $("#vt-cam").classList.remove("activo"); estado("Sin cámara: el personaje sigue al ratón sobre el escenario."); }
  // medidas de la cara a partir de los puntos (coordenadas de la imagen, con el espejo aplicado si toca)
  function medir(lm, bs) { const X = (p) => (cfg.espejo ? 1 - p.x : p.x), nariz = lm[1], pa = lm[234], pb = lm[454], oa = lm[33], ob = lm[263], entre = lm[168], barb = lm[152];
    const ancho = Math.abs(X(pa) - X(pb)) || 1e-3, yaw = (X(nariz) - (X(pa) + X(pb)) / 2) / ancho;
    const pitch = (nariz.y - entre.y) / ((barb.y - entre.y) || 1e-3);
    const [i, d] = X(oa) < X(ob) ? [oa, ob] : [ob, oa], roll = Math.atan2(d.y - i.y, X(d) - X(i)) * (180 / Math.PI);
    const B = {}; for (const c of bs || []) B[c.categoryName] = c.score;
    // mirada: hacia tu izquierda o derecha (en la pantalla, según el espejo), arriba o abajo
    const izq = ((B.eyeLookOutLeft || 0) + (B.eyeLookInRight || 0)) / 2, der = ((B.eyeLookOutRight || 0) + (B.eyeLookInLeft || 0)) / 2;
    const mirX = (cfg.espejo ? der - izq : izq - der), mirY = ((B.eyeLookDownLeft || 0) + (B.eyeLookDownRight || 0) - (B.eyeLookUpLeft || 0) - (B.eyeLookUpRight || 0)) / 2;
    return { yaw, pitch, roll, B, mirX, mirY, t: performance.now() }; }
  function detectar() { if (!camOn || !detector || video.readyState < 2 || video.currentTime === ultVideo) return; ultVideo = video.currentTime;
    const r = detector.detectForVideo(video, performance.now()), lm = r.faceLandmarks?.[0];
    if (!lm) { if (cara && performance.now() - cara.t > 600) estado("No te veo: ponte delante de la cámara, con luz de frente.", "mal"); return; }
    if ($("#vt-estado").classList.contains("mal")) estado("Te veo ✓", "ok");
    cara = medir(lm, r.faceBlendshapes?.[0]?.categories); if (!cfg.centro) centrar();
    // vista previa: unos puntos de referencia sobre el vídeo
    const c = lienzoPuntos, w = (c.width = video.videoWidth), hh = (c.height = video.videoHeight), x = c.getContext("2d"); x.clearRect(0, 0, w, hh); x.fillStyle = "#f0a33c";
    for (const k of [1, 33, 263, 168, 152, 234, 454, 13, 14, 61, 291]) { x.beginPath(); x.arc(lm[k].x * w, lm[k].y * hh, 3.5, 0, 7); x.fill(); } }
  function centrar() { if (!cara) { estado("Enciende la cámara para centrar.", "mal"); return; } cfg.centro = { yaw: cara.yaw, pitch: cara.pitch, roll: cara.roll }; guardar(); estado("Centrado ✓: esa postura es «recto».", "ok"); }

  // ======================= MICRÓFONO =======================
  let mic = null;   // { an, buf, flujo, nivel }
  $("#vt-mic").addEventListener("click", async () => { if (mic) { for (const t of mic.flujo.getTracks()) t.stop(); mic.ctx.close(); mic = null; $("#vt-mic").textContent = "🎙 Encender el micrófono"; $("#vt-mic").classList.remove("activo"); return; }
    try { const flujo = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }), ctx = new AudioContext(), an = ctx.createAnalyser();
      an.fftSize = 1024; ctx.createMediaStreamSource(flujo).connect(an); mic = { ctx, an, flujo, buf: new Float32Array(an.fftSize), nivel: 0 };
      $("#vt-mic").textContent = "🎙 Apagar el micrófono"; $("#vt-mic").classList.add("activo"); }
    catch (e) { estado("No se pudo encender el micrófono: " + (e.message || e), "mal"); } });
  function nivelMic(dt) { if (!mic) return 0; mic.an.getFloatTimeDomainData(mic.buf); let s = 0; for (const v of mic.buf) s += v * v;
    const rms = Math.sqrt(s / mic.buf.length), obj = cl((rms - 0.012) * 9 * cfg.sens, 0, 1);
    mic.nivel += (obj - mic.nivel) * (1 - Math.exp(-dt * (obj > mic.nivel ? 30 : 12)));   // abre rápido, cierra algo más despacio
    $("#vt-nivel").style.width = (mic.nivel * 100).toFixed(0) + "%"; return mic.nivel; }

  // ======================= CADA FOTOGRAMA =======================
  const cur = { cabeza: 0, miraY: 0, ladeo: 0, torso: 0, inclina: 0, ojosX: 0, boca: 0, bocaAncho: 0, parp: 1 }, pesos = {};
  let reloj = 0, tAnt = null, proxParp = 2, envio = { ult: 0, enCurso: false };
  function fotograma(ahora) { try { paso(ahora); } catch (e) { console.error(e); } requestAnimationFrame(fotograma); }
  function paso(ahora) { const dt = tAnt == null ? 0 : Math.min(0.1, (ahora - tAnt) / 1000); tAnt = ahora; reloj += dt; const t = reloj;
    detectar();
    const obj = { cabeza: 0, miraY: 0, ladeo: 0, ojosX: 0, boca: 0, bocaAncho: 0, parp: 1 }, emoCara = {}, vivaCara = cara && performance.now() - cara.t < 700;
    if (vivaCara) { const c0 = cfg.centro || { yaw: 0, pitch: cara.pitch, roll: 0 }, F = cfg.fuerza, B = cara.B;
      obj.cabeza = cl((cara.yaw - c0.yaw) * 120 * F, -70, 70); obj.miraY = cl((cara.pitch - c0.pitch) * 4.2 * F, -1.1, 1.1); obj.ladeo = cl((cara.roll - c0.roll) * 0.9 * F, -22, 22);
      obj.ojosX = cl(cara.mirX * 0.9, -0.5, 0.5); obj.miraY = cl(obj.miraY + cara.mirY * 0.5, -1.2, 1.2);
      const parp = Math.max(B.eyeBlinkLeft || 0, B.eyeBlinkRight || 0); obj.parp = cl(1 - (parp - 0.25) / 0.45, 0.05, 1);
      obj.boca = cl(((B.jawOpen || 0) - 0.04) * 2.2, 0, 1); obj.bocaAncho = cl(((B.mouthStretchLeft || 0) + (B.mouthStretchRight || 0)) * 1.2 - (B.mouthPucker || 0) * 1.2, -0.8, 0.8);
      if (cfg.gestosCara) { const sonr = ((B.mouthSmileLeft || 0) + (B.mouthSmileRight || 0)) / 2, frown = ((B.mouthFrownLeft || 0) + (B.mouthFrownRight || 0)) / 2,
          cejasArr = B.browInnerUp || 0, ceño = ((B.browDownLeft || 0) + (B.browDownRight || 0)) / 2;
        emoCara.alegre = cl((sonr - 0.12) * 1.8, 0, 1); emoCara.sorpresa = cl((cejasArr - 0.25) * 1.6, 0, 1); emoCara.enfado = cl((ceño - 0.25) * 1.8, 0, 1); emoCara.triste = cl((frown - 0.1) * 2.2, 0, 1); } }
    else { // sin cámara: el ratón sobre el escenario o, quieto, una deriva tranquila
      if (raton) { obj.cabeza = raton.x * 55; obj.miraY = raton.y * 0.9; }
      else { obj.cabeza = 9 * Math.sin(t * 0.31) + 4 * Math.sin(t * 0.83); obj.miraY = 0.12 * Math.sin(t * 0.47); obj.ladeo = 2.5 * Math.sin(t * 0.23); }
      proxParp -= dt; if (proxParp < -0.16) proxParp = 2 + Math.random() * 3.5; obj.parp = proxParp < 0 ? cl(Math.abs(proxParp + 0.08) / 0.08, 0.05, 1) : 1; }
    obj.boca = Math.max(obj.boca, nivelMic(dt));
    // suavizado: muelle corto (más o menos rápido según «Suavidad»); los párpados y la boca casi sin retraso
    const k = 1 - Math.exp(-dt * (26 - 20 * cfg.suave)), kr = 1 - Math.exp(-dt * 40);
    for (const c of ["cabeza", "miraY", "ladeo", "ojosX", "bocaAncho"]) cur[c] += (obj[c] - cur[c]) * k;
    cur.parp += (obj.parp - cur.parp) * kr; cur.boca += (obj.boca - cur.boca) * kr;
    // el cuerpo acompaña un poco (más tarde y menos) y respira
    const tS = cfg.cuerpoSigue ? cur.cabeza * 0.28 : 0, iS = cfg.cuerpoSigue ? cur.miraY * 0.04 : 0, kb = 1 - Math.exp(-dt * 4);
    cur.torso += (tS - cur.torso) * kb; cur.inclina += (iS - cur.inclina) * kb;
    // emociones: la elegida (teclas) entra y sale suave; encima, lo que copia de tu cara
    for (const n of EMO) { const meta = Math.max(n === emo && n !== "neutra" ? 0.9 : 0, emoCara[n] || 0); pesos[n] = (pesos[n] || 0) + (meta - (pesos[n] || 0)) * (1 - Math.exp(-dt * 8)); }
    const caraP = {}; for (const n of EMO) if (n !== "neutra" && pesos[n] > 0.01) caraP[n] = +pesos[n].toFixed(3);
    // pose base + gesto (solo brazos y manos)
    const resp = Math.sin(t * 1.7), p = { cabeza: cur.cabeza - cur.torso, miraY: cur.miraY, ladeo: cur.ladeo + 0.8 * Math.sin(t * 0.6), torso: cur.torso, inclina: cur.inclina + 0.008 * resp, cara: caraP };
    let pose = P.completa(p);
    if (gesto) { const tg = t - gesto.t0, fin = gesto.sale != null || tg >= gesto.dur; if (fin && gesto.sale == null) gesto.sale = t;
      gesto.peso += ((fin ? 0 : 1) - gesto.peso) * (1 - Math.exp(-dt * (fin ? 6 : 9)));
      const gp = P.completa(P.accionPose(gesto.a, gesto.a.bucle ? tg % gesto.a.duracion : Math.min(tg, gesto.a.duracion))), mez = P.mezclar(pose, gp, gesto.peso);
      for (const key in mez) if (DE_BRAZOS.test(key)) pose[key] = mez[key];
      if (fin && gesto.peso < 0.01) { gesto = null; pintarBotones(); } }
    const e = P.pose(pose, { giro: 0 }); e.ojos = e.cabeza + cur.ojosX; e.parpadeo = cur.parp; e.boca = cur.boca; e.bocaAncho = cur.bocaAncho; e.estira = 0.006 * resp;
    // marioneta libre: no tiene cara; la voz la estira (habla «con el cuerpo») y la cabeza mueve el hueso «cabeza» si lo hay
    if (j?.tipo === "libre") { e.estira = 0.006 * resp + cur.boca * 0.12; const hs = (j.libre?.huesos || []).map((b) => b.nombre), cab = hs.find((n) => /cabeza|head/i.test(n));
      e.huesos = {}; if (cab) e.huesos[cab] = cur.ladeo * 1.4 - cur.miraY * 12; for (const n of hs) if (n !== cab) e.huesos[n] = (e.huesos[n] || 0) + 3 * Math.sin(t * 1.3 + hs.indexOf(n)); e.torso = rad(cur.cabeza * 0.4); }
    if (!m) return; T.camara(CAM); m.dibujar(e);
    // a la salida de OBS (vtuber.html?salida), unas 30 veces por segundo
    if (ahora - envio.ult > 33 && !envio.enCurso && id) { envio.ult = ahora; envio.enCurso = true;
      fetch("/api/vtuber", { method: "POST", body: JSON.stringify({ p: id, enc: cfg.enc, e }) }).catch(() => {}).finally(() => { envio.enCurso = false; }); } }
  requestAnimationFrame(fotograma);
  window.VT = { cur, pesos, get cara() { return cara; }, lanzarGesto, ponerEmo };
})();
