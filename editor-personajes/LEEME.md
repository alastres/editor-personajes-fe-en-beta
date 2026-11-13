# Editor de personajes y escenas

Interfaz para diseñar personajes del títere 2,5D (`../comun/titere25d.js`) sin tocar código.

**Abrir:** `node servidor.js` (o «editor-personajes» en `.claude/launch.json`) → http://localhost:3170

## Qué guarda
Un JSON por personaje en `../personajes/<id>.json`:
```json
{ "id": "pedro", "nombre": "Pedro",
  "opciones": { "proporciones": "normal|mujer|nino|chibi", "pelo": "corto|rizado|largo", "barba": true,
                "vestido": false, "moderno": false, "pestanas": null, "arrugas": null,
                "cuerpoX": null, "cuerpoY": null, "cabezaK": null },
  "colores": { "piel": "#…", "pielS": "#…", …, "auto": { "piel": true, "ropa": false } },
  "notas": "" }
```
- `null` significa lo que marque el tipo de cuerpo.
- `auto.<grupo>: true` calcula las sombras y luces del grupo a partir del color base (`comun/personajes.js`, `DERIVA`).

## Editar a la vez (usuario y Claude)
- La interfaz guarda sola a los 0,45 s de cada cambio.
- El servidor vigila la carpeta: si alguien edita un JSON a mano, la interfaz lo recarga, avisa y el cambio se puede deshacer.
- La papelera mueve el archivo a `../personajes/papelera/`; no borra nada.

## Usarlo en un vídeo
Cada vez que se guarda, se regenera `../personajes/todos.js` (`window.PERSONAJES`). En la composición:
```html
<script src="…/comun/titere25d.js"></script>
<script src="…/comun/personajes.js"></script>
<script src="…/personajes/todos.js"></script>
```
```js
const pedro = Personajes.crear(grupoSVG, PERSONAJES.pedro);
pedro.dibujar({ … });
```

## Piezas propias (fase 2)
Son dibujos SVG atados a un hueso: `cabeza`, `pecho`, `cintura`, `manoIzq` o `manoDer`. Se añaden con «Importar SVG…» o desde la biblioteca de ejemplos (`biblioteca.js`) y se colocan arrastrándolos en el escenario o con los deslizadores.

Cada pieza se guarda en `piezas[]` del JSON:
```json
{ "id": "velo", "nombre": "Velo", "hueso": "cabeza", "svg": "<path …/>",
  "svgPerfil": "…", "svgEspaldas": "…",
  "x": 0, "y": 0, "escala": 1, "rot": 0, "prof": 58,
  "capa": "delante|detras", "vista": "siempre|frente|espaldas",
  "modo": "silueta|superficie", "grupo": "sombrero", "oculta": ["melena", "cinto"], "activo": true }
```
- **Coordenadas del hueso:**
  - cabeza: centro de la cara (0, 0), con la cara entre −78 y +78;
  - pecho y cintura: en la superficie de delante;
  - mano: la muñeca en (0, 0), con +x hacia los dedos.
- **Colores del personaje:** `{piel}`, `{ropa}`, `{ropaS}`, `{ropaL}`, `{pelo}`… dentro del SVG se cambian por los colores de cada personaje.
- **Dibujo según el giro:** si existen `svgPerfil` (dibujado mirando a la derecha; al girar al otro lado se refleja) y `svgEspaldas`, se usan desde ~55° y desde ~115°.
- **Modo en la cabeza:** `silueta` no gira (sombreros, velos); `superficie` se mueve y se estrecha con la cara (gafas, maquillaje, cicatrices).
- **Pecho y cintura:** van pegados a la superficie del cuerpo con perspectiva. Cuando esa cara no mira a la cámara, pasan detrás del cuerpo.
- **Variantes:** las piezas con el mismo `grupo` se turnan (como las capas de cambio de Moho). La guardada está en `variantes: { grupo: id }`, y en un vídeo se cambia con `dibujar({ variantes: { sombrero: "gorra" } })`.
- **`oculta`:** mientras la pieza está puesta, esconde partes del muñeco. Para quitar todo el pelo está «Sin pelo» (`pelo: "calvo"`).
- **Ejemplo:** el personaje `demo-piezas` lleva velo (con perfil y espaldas), gorra (variante), colgante, zurrón y lámpara.

## Animación (fase 3)
Se activa con el selector **Diseño | Animación** de la barra de arriba.

- **Posar:** deslizadores para el cuerpo (girar torso y cabeza, mirar, inclinarse, ladear, encoger hombros, agacharse, despegar del suelo), cada brazo (abrir, adelantar, doblar el codo y hacia dónde) con su mano (suelta, abierta, puño, señala, agarra, pulgar, plana) y su palma (auto, adelante, arriba, al cuerpo), y la cara (emoción e intensidad).
- **Acciones con línea de tiempo:**
  - **Autoclave:** con el cabezal en un punto sin clave, cambiar algo en Posar crea una clave ahí.
  - **Teclas:** «+ Clave» o K añade una clave; espacio reproduce.
  - **Ritmo:** las claves se arrastran para cambiarlo, y la duración estira o encoge toda la acción.
  - **Opciones:** bucle; quieto, andando o corriendo mientras tanto.
  - **Papel cebolla:** la clave anterior en rojo y la siguiente en verde.
- **Controles (smart bones):** «Guardar postura como control» convierte la postura actual en un deslizador con nombre. Suma su diferencia con el reposo, así que se combina con cualquier acción y con otros controles. Para crearlos desde cero, elige «Pose libre» en la lista de acciones.
- **En un vídeo:**
```js
const e = Personajes.accion(PERSONAJES["demo-piezas"], "Saludo", t, { giro: 20 }, { "control-1-aka": 0.6 });
muneco.dibujar(e);          // la acción se busca por id o por nombre; los controles, por id
```
  - `Personajes.control(j, { id: valor }, { giro })` aplica controles sin acción.
  - `Personajes.pose(p, { giro })` convierte una pose suelta.
  - Prueba completa en `../lab-piezas` (saludo con el control «Encogerse» entrando poco a poco).

## Escenas (fase 4): montar y renderizar sin código
La página está en **http://localhost:3170/escenas.html**; se llega con el enlace «Escenas →» de la barra.

- **Escena:** nombre, duración y fondo (noche, amanecer, día, interior o color liso; con montes en parallax y suelo con profundidad).
- **Reparto de la escena:** añade personajes del reparto.
  - Arrástralos en el escenario: izquierda/derecha los mueve y arriba/abajo los aleja o acerca. Cada arrastre crea una clave de recorrido en el cabezal.
  - Si el recorrido los desplaza, andan o corren solos.
  - Ajusta hacia dónde mira y el tamaño.
  - «Poner una acción en el cabezal» usa las acciones del personaje (las de Personajes → Animación) y crea un bloque en su pista.
- **Cámara:** mirar a X/Y y zoom crean claves; los botones General, Medio y Primer plano encuadran al personaje elegido.
- **Rótulos y audio:** el audio se elige de las voces y músicas que hay en shorts-flow y se oye en el editor al reproducir.
- **Línea de tiempo:**
  - un clic mueve el cabezal;
  - los rombos (claves) y los bloques se arrastran;
  - el espacio reproduce;
  - Ctrl+Z / Ctrl+Y deshacen y rehacen.
- **Vídeo:** «Renderizar vídeo» exporta el proyecto `../escena-<id>/` (HyperFrames) y lo renderiza en `out/<id>.mp4`; al terminar, lo reproduce en el panel. Una escena de 6 s tarda unos 20 s.
- **Archivos:** las escenas se guardan en `../escenas/<id>.json`; el formato está en `comun/escena.js`. Ejemplo: `encuentro.json`.

### Voz y boca (fase 5)
- **Al añadir un audio:** el servidor calcula su envolvente (intensidad 30 veces por segundo, `/api/envolvente`) y su duración, y alarga la escena si la voz no cabe.
- **Quién habla:** se elige en cada audio («habla: Pedro»). La boca de ese personaje se abre y cambia de ancho al ritmo de la voz, en el editor y en el vídeo. Si el archivo se llama «voz…» o «narra…», se asigna solo al personaje elegido.
- **En el vídeo:** el audio va en el MP4 renderizado.
- **Mejora pendiente:** dentro de una barba oscura la boca abierta se lee poco.

### Acciones compartidas, capas y curvas (fase 6)
- **Biblioteca común** (`../acciones/<id>.json`; el servidor genera `todas.js` → `window.ACCIONES`):
  - en Personajes → Animación, «Compartir esta acción con todos los personajes» la guarda ahí;
  - «Traer» copia una acción común a un personaje para retocarla;
  - en Escenas, las acciones comunes aparecen con ★ para cualquier personaje.
- **Capas de los bloques** (Escenas): «Todo el cuerpo», «Solo cuerpo» o «Solo brazos». Un bloque de brazos se suma encima del de cuerpo o de la caminata del recorrido, por ejemplo saludar mientras anda (escena de ejemplo `saluda-andando`).
- **Curvas por clave:** el selector «Curva» de la línea de tiempo cambia cómo va de una clave a la siguiente: suave, lineal, mantener, acelerar, frenar o rebote.
  - En Animación se aplica a la clave del cabezal.
  - En Escenas, a la clave de recorrido del personaje elegido o a la de cámara.
  - En el JSON es `curva` en la clave.

### Más huesos y PNG (fase 7)
- **Huesos para piezas:** además de cabeza, pecho, cintura y manos, ahora `brazoIzq/Der` (desde el hombro), `antebrazoIzq/Der` (desde el codo; +x hacia la mano) y `pieIzq/Der` (sobre el empeine; gira y se apoya con el pie). En la biblioteca hay ejemplos: «Brazalete» y «Zapatos rojos».
- **PNG:**
  - Personajes → Diseño → «Imágenes»: PNG del escenario (1600 px de ancho) y de la hoja de giro (2400 px).
  - Escenas → «Guardar este fotograma como PNG»: 1080 × 1920, el fotograma del cabezal.

## Flujo completo de un short, sin código
1. **Personajes:** diseña o ajusta los personajes (cuerpo, pelo, ropa, colores, piezas propias).
2. **Personajes → Animación:** crea sus acciones con claves y curvas, o trae acciones de la biblioteca común; guarda controles.
3. **Escenas:** monta la escena.
   - fondo;
   - personajes arrastrados al escenario (recorridos);
   - bloques de acción por capas;
   - cámara con planos;
   - rótulos;
   - voz con quién habla (boca sincronizada) y música.
4. **«Renderizar vídeo»:** el MP4 queda en `../escena-<id>/out/`.

### Taller de dibujo con vectores editables (fase 8)
En Personajes → Diseño → Piezas propias, el botón «✎ Dibujar…» crea una pieza; «✎ Editar el dibujo» abre una existente.
- **Conversión:** las piezas de la biblioteca y los SVG importados también se abren, convertidos en vectores editables (path, circle, ellipse, rect, line y polygon con sus transformaciones).
- **Herramientas** (atajo entre paréntesis):
  - **Seleccionar (V)** para editar;
  - **Pincel (B)** para trazos a mano que se simplifican y suavizan al soltar;
  - **Lazo (L)** para formas rellenas a mano;
  - **Pluma (P)**: clic pone esquina, arrastrar hace curva; clic en el primer punto o Intro termina;
  - **Elipse (E)**, **Rectángulo redondeado (R)** y **Cápsula (C)**.
- **Editar vectores** (con Seleccionar):
  - arrastrar la forma la mueve;
  - los cuadrados son puntos y los círculos tiradores (simétricos; Alt rompe la simetría);
  - doble clic en un punto cambia entre esquina y curva;
  - doble clic en el trazo añade un punto;
  - Alt + clic en un punto lo quita.
- **Por forma:** duplicar, reflejar, encoger, agrandar, girar, subir, bajar, ocultar y borrar. Ctrl+Z deshace dentro del taller; la rueda hace zoom; espacio + arrastrar mueve la vista.
- **Colores:** los colores del personaje (`{piel}`, `{ropa}`, `{pelo}`…) o libres, para relleno y contorno, con grosor y opacidad.
- **Dibujos por giro:** de frente, de perfil y de espaldas, con el personaje de referencia girado debajo y el origen del hueso marcado en rojo.
- **Archivo:** la pieza guarda el SVG (`svg`, `svgPerfil`, `svgEspaldas`) y los vectores editables (`dibujo`, `dibujoPerfil`, `dibujoEspaldas`). Ejemplo: «Corona (dibujada)» en Demo piezas.

### Física por pieza (fase 9)
- **Activarla:** en el detalle de una pieza, casilla «Física», con rigidez, amortiguación, peso y punto de giro (dónde cuelga, en coordenadas del dibujo).
- **Cómo se mueve:** se balancea con la aceleración de su hueso y del personaje por la escena (péndulo amortiguado).
- **En el vídeo:** cuando el tiempo salta, las escenas simulan el segundo anterior, así que el render sale igual aunque se haga por trozos.
- **Ejemplo:** el zurrón y el colgante de Demo piezas y la escena `fisica-frenazo` (corre, frena y el zurrón se balancea).

### Control del rig con asas (fase 10)
En Personajes → Animación, parado, aparecen asas sobre el personaje:
- **Manos:** arrastrarlas mueve el brazo entero con cinemática inversa (resuelve abrir, adelantar y doblar el codo; prefiere el brazo por delante).
- **Cabeza:** ← → gira; ↑ ↓ mira arriba o abajo.
- **Pecho:** ← → gira el torso; ↑ ↓ lo inclina.

Igual que los deslizadores de Posar, crean o tocan la clave del cabezal.

## Montaje: del guion al short (fase 11)
La página está en **http://localhost:3170/montaje.html**; se llega con el enlace «Montaje →».

Un short es una sola voz y una secuencia de escenas, con subtítulos, música y efectos. El motor es `comun/montaje.js`, el mismo en el editor y en el vídeo.

1. **Voz y guion:**
   - eliges la voz y, si quieres, pegas el guion; «Transcribir la voz» saca cada palabra con su tiempo mediante VoiceStudio (API local en el puerto 3900);
   - si el guion tiene las mismas palabras, los subtítulos usan su texto exacto;
   - si VoiceStudio está cerrado o la voz es un silencio de relleno, los tiempos se estiman desde el guion y la página lo avisa.
2. **Escenas desde la voz:**
   - se crea una escena por frase (las muy cortas se juntan) con su duración exacta;
   - en cada una, el narrador elegido mueve la boca con la voz y hace gestos al hablar (acción común «Explicar», en capa de brazos);
   - los encuadres varían y se usan el fondo y las transiciones elegidos;
   - las escenas se guardan en `escenas/<short>-NN.json` y se retocan en Escenas con «Editar escena».
3. **Línea de tiempo:**
   - las pistas son voz (forma de onda y cortes de frase), subtítulos, escenas, música y efectos;
   - arrastrar el borde entre dos escenas mueve el corte;
   - «Partir aquí» divide una escena en el cabezal;
   - cada escena puede entrar con corte, fundido o barrido y decir quién habla.
4. **Subtítulos de la marca:** cápsula oscura con la palabra que suena en naranja; hay una lista de palabras clave que van siempre en naranja.
5. **Música y efectos:**
   - la música se monta al renderizar con `montar-musica.py` (AUDIO-DE-FONDO.md): se ajusta a la duración, conserva su final y baja cuando se habla. Sus opciones van en `musica.opciones` (por ejemplo `{ "outro": 94 }`);
   - los efectos se colocan en el cabezal; la regla del canal es una sola campana, al final.
6. **«Renderizar el short»:** exporta `../short-<id>/` y renderiza en `out/<id>-<marca>.mp4`. Cada render es un archivo nuevo, para no chocar con el que está abierto en el reproductor, y se guardan los dos últimos.

**Ejemplo:** `shorts/oraciones-prueba-de-montaje.json`, hecho con la voz real de «estilo-oraciones»: 67 s, 15 escenas con Pablo, música y campana. El render salió en unos 80 s, a −16,8 LUFS.

## Labios por fonemas y boca legible (fase 12)
- **Visemas.** Si una voz tiene sus palabras con tiempos (la transcripción de Montaje, o la que se saca en Escenas al decir quién habla en un audio), la boca forma cada sonido en vez de solo abrir y cerrar:
  - A (abierta), E e I (anchas, con dientes), O y U (redondas y estrechas), M/B/P y la «v» (labios cerrados), F (dientes sobre el labio), S, L, K;
  - el reparto de fonemas está en `comun/personajes.js` (`VISEMAS`, `fonemas()`, `visemas()`): la «h» no suena, «ch», «ll» y «qu» se tratan como un sonido;
  - la envolvente del audio da la fuerza: lo que suena flojo abre menos, y los silencios cierran la boca.
- **Boca nueva del títere** (`titere25d.js`): dientes de arriba y lengua, recortados por la forma de la boca. Con barba, el interior es más claro y lleva un contorno de labio color piel, para que se lea sobre el pelo oscuro.
- Sin palabras (por ejemplo, un audio que VoiceStudio no transcribe), la boca sigue la envolvente como antes.

## Atrezo y decorados (fase 13)
- **Biblioteca** `comun/atrezo.js`: olivo, palmera, matorral, roca, tumba (piedra que se corre, luz de dentro, sello), barca (con vela, se mece), mesa (con pan y copa), casa de adobe (luz en la ventana), columnas, cántaro, hoguera (llamas animadas) y pozo. De noche se pintan en tonos fríos.
- **En Escenas**, sección «Atrezo y decorados»: añadir, arrastrar en el escenario (izquierda/derecha = posición, arriba/abajo = profundidad), tamaño, espejo y «detrás de los personajes». Cada tipo tiene sus controles (piedra corrida, luz, fuego…).
- **Animar:** «Animar con claves en el cabezal» convierte esos controles en claves: por ejemplo, la tumba cerrada en el segundo 1 y abierta y con luz en el 4.
- En el JSON de la escena van en `objetos: [{ id, tipo, x, p, escala, espejo, detras, params, claves }]`. Para añadir un tipo nuevo basta con una entrada en `ATREZO` con su `nombre`, sus `params` y su `dibujar(o, t)`.

## Fondos y editor de fondos (fase 14)
- **Fondos nuevos:** Luna (nubes y luna grande), Atardecer (sol poniéndose junto al horizonte), Tormenta (nubes, lluvia y relámpagos), Mar (olas en perspectiva que se mueven), Desierto. El Interior lleva lámpara de aceite con la llama viva y una ventana con luz.
- **«Personalizar el fondo»** (Escenas, debajo del fondo):
  - colores del cielo (tres), de lo lejano (tres) y del suelo (dos); solo se guarda lo que cambias;
  - lo de lejos: montes, ciudad, Roma, olivar o nada;
  - sol o luna, estrellas, mar en vez de suelo, relámpagos, nubes, lluvia y oleaje;
  - imagen de fondo: un PNG o JPG de una carpeta `fondos`, `imagenes`, `img` o `assets` (por ejemplo, un cielo de Flow), detrás de los montes o cubriéndolo todo, con su opacidad;
  - capas dibujadas en el taller («✎ Dibujar una capa»): la línea naranja es el suelo y la silueta, un personaje; cada capa tiene su lejanía (0 se mueve con el suelo, 1 casi no se mueve).
- Al cambiar de fondo se quitan los retoques de color y clima, pero se conservan las capas y la imagen. Al exportar, la imagen se copia al proyecto (`assets/archivos/`).

## Ambiente (fase 15)
- Sección **Ambiente** de Escenas:
  - **tono:** de frío (azulado) a cálido (anaranjado);
  - **viñeta:** oscurece los bordes;
  - **partículas:** polvo, luciérnagas, nieve, chispas o ceniza, con su cantidad.
- **Efectos en el cabezal:** ✦ destello (un fogonazo de luz: un milagro, un rayo) y ≋ sacudida de cámara (un golpe, un temblor), cada uno con su fuerza y duración.
- En el JSON: `ambiente: { tono, vineta, particulas, cantidad }` y `efectos: [{ t, tipo, dur, fuerza }]`. Se pinta encima de la escena y debajo de los rótulos.
