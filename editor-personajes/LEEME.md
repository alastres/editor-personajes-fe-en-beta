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

## Rig de piernas, mirar y agarrar (fase 16)
- **Piernas:**
  - en Personajes → Animación hay asas nuevas: los dos pies (arrastrar = adelante, atrás o a un lado; hacia arriba lo levanta) y la cadera (arriba o abajo = agacharse). Las rodillas se doblan solas por IK;
  - en Posar hay deslizadores por pie (adelante, abrir, levantar), «Tumbarse» y «Agacharse» hasta 160 %;
  - acciones comunes nuevas: Sentarse, Rodilla en tierra, Arrodillarse (orar), Agacharse (en cuclillas) y Tumbarse, con transición de 0,7 s.
- **Mirar a** (Escenas, personaje elegido): desde el cabezal mira a cámara, a quien habla, a otro personaje o a un objeto. La cabeza gira hasta 65° y los ojos hasta 85°; también mira arriba o abajo. «Nadie» le devuelve a su pose. Cada cambio tiene una transición de 0,4 s.
- **Agarrar:** desde el cabezal, la mano derecha o izquierda va por IK a la mano de otro personaje o a un objeto (su asa: `agarre: { x, y }` en el objeto; por defecto, 120 por encima de su base). «Soltar» la devuelve.
- La IK de manos está ahora en `comun/personajes.js` (`ikMano`, `manoFK`): la comparten el rig del editor y las escenas.
- En el JSON del actor: `mirar: [{ t, a }]` y `agarra: [{ t, mano, a }]`, donde `a` es "camara", "habla", "nada", el id de un personaje, "id.manoDer" o "id.manoIzq", o el id de un objeto.

## Detalles del Montaje (fase 17)
- **Corregir subtítulos:** clic en una línea de la pista «Subtítulos» y, en el panel, cambia su texto.
  - Con el mismo número de palabras solo cambia el texto; con otro número, las palabras se reparten por letras en el mismo tiempo.
  - Escribe `|` donde quieras cortar la línea; «Unir con la siguiente» evita el corte.
  - Se guarda en las palabras de la voz (`corte`, `junta`), así que también afecta a los labios por fonemas.
- **Mover escenas:** arrastra el bloque de una escena sobre otra posición. Los cortes se quedan en las mismas frases de la voz y lo que se mueve es el contenido (escena, desde, transición, quién habla).
- **Música:** «Ajustes del montaje de la música» permite fijar dónde empieza el final de la pista (`outro`), cuánto baja bajo la voz, cuánto sube en los silencios y el nivel en la tarjeta final (opciones de `montar-musica.py`).

## Animación: transiciones, curvas propias, formas de andar, emociones y poses (fase 18)
- **Transición entre acciones:** cada bloque de una escena entra y sale mezclándose (0,3 s por defecto) en vez de cambiar de golpe. Se ajusta por bloque en «Transición al entrar y salir» (0 = cambio seco; en el JSON, `mezcla`).
- **Curva propia:** en el selector de curva (Personajes → Animación y Escenas), «Propia…» abre un editor con dos puntos que se arrastran, como un cubic-bezier. Trae atajos (Suave, Acelerar, Frenar, Se pasa, Anticipa, Muelle) y una bola que muestra el ritmo. Se guarda en la clave como `curva: [x1, y1, x2, y2]` y ✎ la vuelve a editar.
- **Formas de andar** (Escenas, personaje): Normal, Cansado (inclinado, mirando abajo, triste), Alegre (con bote), Con prisa (zancada larga, inclinado hacia delante) y Sigiloso; más la zancada. En el JSON, `andar: { estilo, zancada }`.
- **Emociones propias** (Animación → Cara → «Crear o editar una emoción propia»): mueves los rasgos (sonrisa, boca, cejas, ojos, párpados, rubor, mirada) y se guardan en el personaje con su nombre (`emociones`). Aparecen con ★ junto a las ocho que trae y sirven en acciones y escenas.
- **Poses guardadas:** «Guardar pose» guarda la pose del cabezal en el personaje (`poses`). Con clic se pone en el cabezal y con clic derecho se borra.
- **Copiar y pegar** la pose del cabezal entre claves, acciones o personajes (botones junto a «Borrar clave»).
- **Rendimiento:** la distancia recorrida (para el paso de los pies) se calcula una vez y se guarda, en vez de integrarse desde 0 en cada fotograma.

## Diseño: sustituir partes, piezas en las piernas, cadenas, biblioteca y contraste (fase 19)
- **Sustituir partes del muñeco:** en una pieza, «Mientras está puesta, oculta» admite ahora pelo, barba, ojos, cejas, boca, nariz y orejas, además de melena y cinturón. Para cambiar el peinado o los ojos, dibuja los tuyos en una pieza atada a la cabeza y oculta los originales.
- **Piezas en muslos y piernas:** huesos nuevos Muslo y Pierna (izq. y der.) para rodilleras, vendas, polainas o bajos de pantalón. El eje vertical del dibujo sigue el hueso y el origen es su punto medio.
- **Física en cadena:** en una pieza, «Cadena» añade una tira que cuelga y ondea (pelo largo, cuerda, cola, cinta). Se ajustan segmentos, largo, grosor al empezar y al final, rigidez, amortiguación, ángulo de reposo, ancla y color. Al correr se queda atrás y al frenar ondea en ola. En el JSON: `cadena: { segmentos, largo, grosor, fin, rigidez, amortiguacion, angulo, ancla, color }`. Ejemplo: «Cinta (cadena)» en demo-piezas.
- **Biblioteca común de piezas** (`shorts-flow/piezas`): «Compartir esta pieza con todos los personajes» la guarda allí, y aparece con ★ en «Biblioteca» para cualquier personaje.
- **Contraste piel/fondo** (Escenas): si la piel de un personaje contrasta menos de 2:1 con el cielo, el horizonte, lo lejano o la pared (regla de la marca), sale un aviso con el valor y contra qué.
- **Variantes por escena:** un actor puede llevar `variantes` propias en la escena (por ejemplo, sin velo) sin cambiar el personaje.

## Taller de dibujo: simetría, agujeros, texto, varias formas y calco (fase 20)
- **Simetría en vivo:** «Simetría: se refleja sola en el eje» dibuja la forma también reflejada en la línea vertical del centro, para hacer media cara o medio sombrero. Con ninguna forma elegida, vale para las que se dibujen después.
- **Agujero:** una forma marcada como agujero no se pinta y recorta la forma que tiene justo debajo (restar; en el SVG es una máscara). En el taller se ve con contorno discontinuo.
- **Texto** (herramienta T): clic donde va, y en el panel se cambian el texto, el tamaño y el color. Sale como texto SVG con la letra de la marca, no convertido en curvas.
- **Cuentagotas** (I): clic en una forma copia su color de relleno y contorno a la forma elegida, o al estilo de las siguientes.
- **Varias formas:** Mayús + clic para elegir más. Se pueden alinear (izquierda, centro, derecha, arriba, medio, abajo), repartir a la misma distancia (3 o más), moverlas juntas y agrupar o desagrupar. Una forma sola se centra en el eje. Unir formas del mismo color equivale a agruparlas.
- **Ajustar a la cuadrícula y al eje:** con el imán, los puntos y las formas caen en una cuadrícula de 10 y se pegan al eje cuando están cerca.
- **Calco:** «Calco: abrir imagen…» pone un PNG o JPG (un boceto, una imagen de Flow) semitransparente debajo para dibujar encima, con opacidad y tamaño. No se guarda en la pieza.

## Render: vista previa rápida, fragmento, cola, aviso y 16:9 (fase 21)
- **Vista previa rápida:** borrador a 24 fps, mucho más rápido, para revisar antes del render final.
- **Fragmento:** «Solo de … a … s» renderiza solo esa parte; «⏵ 3 s» la rellena desde el cabezal.
- **Cola:** los renders van de uno en uno; los demás esperan en cola y muestran su puesto. Hay barra de progreso y el porcentaje sale en el título de la pestaña.
- **Aviso al terminar:** un sonido y, con la pestaña en segundo plano, una notificación del sistema (si se permite) y el título cambiado.
- **Formato horizontal 16:9** (1920 × 1080) para los vídeos largos: en Escenas («Formato») y en Montaje (el del short, que se aplica a todas sus escenas). El lienzo del editor, la exportación y el PNG siguen el formato. En el JSON: `formato: "16:9"`.

## Piezas que se doblan (fase 22)
- En una pieza de **brazo** o de **muslo**, «Se dobla con el codo o la rodilla» reparte cada punto del dibujo entre ese hueso y el de abajo (antebrazo o pierna), con pesos suaves alrededor de la articulación. Así una manga larga o una pernera se curva con el codo en vez de quedarse recta.
- Dibújala en el brazo y más larga, hasta la muñeca (el codo está a 88 unidades del hombro) o hasta el tobillo. «Suavidad del doblez» ensancha o estrecha la franja que se curva.
- Los trazos se trocean solos para que el doblez salga redondo. Solo se doblan trazados (path) con comandos absolutos, que son los que hace el taller. Ejemplo: «Manga larga (se dobla)» en demo-piezas.
- En el JSON: `doblar: true`, `doblarZona`.

## Errores arreglados (13 nov 2026)
- **Arcos de los SVG:** el taller convierte los arcos (`A`) en curvas Bézier exactas; antes los cambiaba por rectas.
- **Montes del fondo:** se dibujan con varias frecuencias que no se repiten; antes se veía el patrón.
- **Hoja de giro:** etiquetas más grandes y claras.
- **Contrapicado corriendo:** con la cámara baja, al correr el codo se dobla menos y el brazo bracea algo menos, para que el puño no suba a la cara. Afecta a cualquier vídeo que se vuelva a renderizar con el títere común.

## P3: historial, GitHub, plantillas, SEO, tableta, pruebas, ayuda y paquetes (fase 23)
- **🕘 Historial** (barra de arriba, en las tres páginas):
  - **Versiones de lo abierto:** se guarda una versión anterior cada minuto y medio mientras editas (las 60 últimas, en `shorts-flow/.historial/`, fuera de Git). «Volver a esta» guarda antes la actual, así que también se puede deshacer.
  - **Papelera:** lo enviado a la papelera desde la interfaz, para recuperarlo. Si el nombre ya está ocupado, se recupera con otro.
- **⇅ GitHub:** trae lo último, guarda todos los cambios y los sube al repo privado (lo mismo que `sincronizar.ps1`). Enseña lo que ha pasado.
- **Plantillas con la receta de los shorts:**
  - Al crear una escena (Escenas → «+ Nueva escena») se puede elegir gancho, desarrollo, cierre o despedida. Cada una trae cámara, ambiente y efectos de partida.
  - En Montaje, «Receta de los shorts» las aplica sola al crear las escenas desde las frases. La primera escena es el gancho (primer plano y destello), la penúltima el cierre (cálida, más cerca, polvo de luz) y la última la despedida (plano general y saludo); el resto son desarrollo.
- **Borrador de SEO y portada** (Montaje, debajo de Renderizar): escribe `Textos/seo-borrador-<short>.md` con título, descripción, hashtags, etiquetas, comentario fijado, configuración y prompt de portada con el estilo de la marca. Guarda además el fotograma del cabezal, sin subtítulos, como referencia de estilo (`short-<id>/portada-referencia.png`). Es un borrador: el SEO definitivo lo completa Claude al aprobar el vídeo, como pide el flujo del canal. No sube ni publica nada.
- **Tableta y pantallas pequeñas:** botones y deslizadores más grandes con el dedo, el taller se recoloca en vertical, los lienzos no se desplazan al dibujar y la barra de arriba se reparte en dos líneas. Con lápiz, el pincel del taller usa la presión media para el grosor.
- **Pruebas automáticas** (`pruebas.html`, enlazada desde la ayuda): dibuja cada personaje en 4 poses y 4 giros y lo compara con la referencia guardada. Lo que cambia sale en rojo junto a su referencia. Si el cambio es el que querías, «Guardar como referencia». La referencia va en `.pruebas/`, fuera de Git.
- **Ayuda (? o F1):** lista de atajos de cada página y un recorrido guiado, que sale solo la primera vez.
- **Paquetes de personaje:** «Exportar» descarga `personaje-<id>.json` (con piezas, acciones, controles, emociones y poses). «Importar» lo añade sin pisar ninguno: si el nombre existe, lo renombra.

## Prueba con un short real: «¿Y si tuvieras toda la evidencia?» (13 nov 2026)
- Short `shorts/ysi2-evidencia` (15 escenas, unos 63 s; voz todavía de relleno). El guion y la narración para ElevenLabs están en `ysi2-evidencia/`, y la dirección de las escenas en `ysi2-evidencia/dirigir.js`.
- **Rótulos arriba:** en Escenas, el botón ↓/↑ de cada rótulo lo sube a la parte de arriba, lejos de los subtítulos (en el JSON, `arriba: true`). Sirve para la cita de un versículo («Lucas 16:31»).
- **Acciones comunes nuevas** para actuar en escena (capa cuerpo o brazos): Asombro, Enfado, Triste, Pensativo, Mirar al cielo, Alegre, Tender la mano, Manos arriba y Mano en el pecho.
- Lo que falló o faltó en la prueba está en `ROADMAP.md`, en Fase 2, punto 1.
- **Capa «cara»** en los bloques (Escenas → Capa → «Solo cara», ☺ en la línea de tiempo): pone solo la expresión y la mirada, sin tocar piernas ni brazos. Así una emoción se suma a arrodillarse, sentarse o andar; con «Solo cuerpo» las piernas volvían a la postura de pie. Las acciones de emoción del short la usan.
- **Borrador 2** (voz en off, varios planos con corte en cada escena), después del veredicto del usuario sobre el 1: «aburrido, faltan cambios de cámara; el narrador distrae».

## Fondos con vida y personajes que no se quedan quietos (13 nov 2026)
Después del veredicto del usuario: «sin la herramienta hacías mejores vídeos; mejores fondos, con más dinamismo y vida; poses que no se ven bien».
- **Montes en cuatro capas** (`montes()` en `comun/escena.js`): las lejanas se funden con el horizonte, cada una lleva un filo de luz del color del astro, rayas de cápsula y bruma en la base. Bruma del horizonte (`bruma()`).
- **Sol y luna** con anillos de halo; la luna con cráteres y el sol con brillo.
- **Nubes** como las de la barca: base plana, borde iluminado abajo y sombra de volumen dentro. Ahora hay nubes por defecto en noche, alba, día y atardecer (`fondo.nubes` las cambia; 0 las quita).
- **Lo vivo:** estrellas que titilan y una estrella fugaz cada 6,5 s; bandadas de pájaros que aletean (día, alba, atardecer, mar, desierto; `fondo.pajaros: false` los quita); hierba que se mueve con el viento (`fondo.viento`, `fondo.hierba: false`); matas oscuras en las esquinas de abajo que hacen de primer plano en los planos abiertos (`fondo.delante: false`).
- **Interior nuevo:** pared iluminada por la lámpara, arco de puerta, repisa con cántaros, viga con vigas cortas, ventana con parteluz y haz de luz con motas que flotan, alfombra de rayas.
- **Cámara en mano:** una deriva lenta de pocos píxeles para que ningún plano esté muerto (`camaraFija: true` en la escena la quita).
- **Vida en los personajes** (en la escena): respiran, pasan el peso de un pie a otro, la cabeza se mueve un poco y los brazos sin acción se separan del cuerpo y doblan algo el codo (antes colgaban rectos, «de madera»). `quieto: true` en el actor lo quita.
- **Acciones de emoción y gesto** del short: ya no se congelan; oscilan un poco mientras duran. Se retocaron Tender la mano (palma arriba, codo doblado, la otra mano relajada) y Manos arriba.

## Espacio 2,5D real: profundidad, cámara con altura y vista de planta (13 nov 2026)
El usuario pidió «control de espacio 3D para profundidad y separar capas en el eje z»; también había fallos de proporción y perspectiva.
- **Perspectiva de verdad** (`comun/escena.js`, `proy()`): la cámara está a 1600 del plano principal y a una altura `alto` (450 por defecto). Cada personaje u objeto se proyecta según su profundidad p (p = 1 son 980 de profundidad):
  - lo lejano encoge y sube hacia el horizonte;
  - el horizonte queda a la altura de la cámara (el fondo se coloca con él);
  - al mover la cámara, lo lejano se mueve menos (paralaje).
  - Con alto 450, p = 1 da la escala y la altura de antes.
- **Profundidad negativa = primeros términos:** matas, rocas o ramas muy cerca de la cámara, delante de todo, que enmarcan y se mueven más que el resto. p puede ir de −0,9 a 4.
- **Cámara** (claves de la pista Cámara): Altura (baja = contrapicado: horizonte bajo y personajes vistos desde abajo; alta = picado: el suelo se abre y se ven desde arriba), botones Contrapicado / Normal / Picado / Muy alto, y Ladeo (cámara inclinada). La altura ajusta sola el ángulo con que se dibuja el muñeco (`tilt`).
- **Vista de planta** (arriba a la izquierda del lienzo, plegable): la escena vista desde arriba, con x a lo ancho y la profundidad hacia arriba. Los personajes son círculos con hacia dónde miran, el atrezo son cuadrados y el triángulo es lo que ve la cámara a cada profundidad. Arrastrar un punto lo mueve en x y en profundidad (en los personajes, con clave en el cabezal).
- **Decorados de escena entera** (`alFondo: true`): se dibujan detrás de todos los personajes y reciben el horizonte de la escena. El primero es el **Mar Rojo** (`marRojo`, control «Se abre»): orilla de arena, mar hasta el horizonte y, al abrirse, un camino seco entre dos muros de agua con cresta de espuma, salpicaduras, peces y un frente curvo junto a la orilla.
- **Recoger del suelo** (acción común): se dobla por la cintura, la mano baja al suelo, coge y se levanta con ello. Al agacharse, el bajo de la falda ya no se hunde en el suelo (se apoya y se abre), y por debajo de la cadera la tela no se inclina con el torso.

## Grafismo de la serie, profundidad de campo y transiciones (13 nov 2026)
- **Rótulos con estilo** (`textos[].estilo` en la escena):
  - `"titulo"`: título grande de la marca (Bricolage Grotesque). Entra palabra a palabra con rebote, y `*palabra*` sale en naranja. Si empieza en el segundo 0, ya está entero en el primer fotograma, que hace de miniatura.
  - `"cita"`: versículo en itálica (Newsreader) que se va revelando palabra a palabra, con la referencia debajo en letra de máquina (`ref: "LUCAS 16:31 · RVR1960"`).
  - Los dos llevan un velo oscuro detrás, y mientras están en pantalla el montaje oculta los subtítulos (`sinSubtitulos: false` lo evita).
- **Distintivo de la serie** en todo el short: `marca: { serie: "¿Y si…?" }` en el JSON del short (punto rojo y texto en letra de máquina, arriba a la izquierda).
- **Profundidad de campo:** con zoom a partir de unos 1,6×, el fondo se desenfoca, más cuanto más cerrado es el plano (`desenfoque: false` en la escena lo quita; un número lo gradúa).
- **Transiciones nuevas** en Montaje: Latigazo (barrido muy rápido con estela) y Golpe de zoom (la escena anterior se acerca y se funde mientras entra la nueva).
- **Montaje** ofrece ya todos los fondos (luna, atardecer, desierto, mar, tormenta…), no solo cuatro.
- Las fuentes de la marca están en `comun/vendor/` y se copian al exportar.

## Láminas: ilustraciones vectoriales por capas como fondo (13 nov 2026)
Veredicto del usuario: «no llegas a dar un buen resultado con los backgrounds porque no usas dibujos complejos». La solución es partir de una ilustración (una referencia de Flow en el estilo plano de la marca) y convertirla en **vectores por capas**.
- **`comun/lamina-vectorizar.py <capas.json>`:**
  - cada capa (lejos, medio, delante…) se marca con un polígono aproximado en píxeles y GrabCut ajusta el borde a la silueta real;
  - lo que queda tapado detrás de cada capa se rellena (inpaint), para que no se vean agujeros con el paralaje;
  - cada capa se vectoriza con vtracer (formas planas) y se recorta con su silueta.
  - Sale en `ilustraciones/<nombre>/<capa>.svg` y se regenera `ilustraciones/todas.js` (`window.LAMINAS`). Ejemplo: `ysi2-evidencia/laminas/tumba-noche-1.json`.
- **Fondo «lámina» en la escena:** `fondo: { tipo: "lamina", lamina: "tumba-noche-1", centro: { x, y }, escala: 1.35, capas: [{ id: "lejos", par: 0.8 }, { id: "medio", par: 0.2 }, { id: "delante", par: -0.35, delante: true }] }`.
  - `par` es el paralaje: 1 = pegada a la cámara, 0 = se mueve con el mundo, negativo = más cerca que los personajes.
  - Las capas `delante` se dibujan delante de los personajes.
  - `centro` es el punto del mundo que mira la cámara cuando la lámina llena la pantalla; se ajusta para que el suelo del dibujo quede bajo los pies de los personajes.
  - El desenfoque de los primeros planos también se aplica a las capas de atrás.
- El editor y el vídeo cargan `ilustraciones/todas.js` (al exportar, solo las láminas que se usan).
- **Capas que vienen separadas desde Flow** (lo correcto; recortar después siempre deja trozos de cielo pegados a las plantas y hojas):
  - en el editor de Flow se edita la propia imagen para cada capa: «medio» = lo mismo con el cielo y lo lejano en magenta #FF00FF; «lejos» = solo cielo y montes, con lo que había detrás dibujado por Flow;
  - en `capas.json`, cada capa puede llevar su `imagen` y `croma: true` (lo magenta es transparente, con un borde de 1 px limpio), y una capa `diferencia` saca lo que hay en el original y no en otra imagen dentro de una `zona` (el primer término que la edición del medio quitó);
  - ojo: la descarga «2K resolución mejorada» de una EDICIÓN puede salir distinta (Flow la vuelve a generar); la edición del medio se bajó a su tamaño original con `comun/flow-bajar.py`.
- **Iluminación del actor** (`luz` en el actor de la escena): `{ noche: 0…1, color: "#ffb860", lado: 1 | -1, ancho: 7, fuerza: 0.7 }`. Pone al personaje en el tono de la escena (de noche, más oscuro y frío; antes iba con colores de día sobre un fondo nocturno) y le añade un filo de luz del color de la fuente (puerta, fuego) en el lado que da a ella.
- **Precisión del vectorizado por capa:** `vtracer: { layer_difference, color_precision, speckle }` en `capas.json`. Más fina en la capa con degradados de luz, para que no salga a manchas.
- **Láminas dibujadas con formas básicas** (14 nov 2026, el camino elegido por el usuario: «Es mejor así»):
  - `comun/formas.py` tiene las primitivas (círculo, cápsula, polígono, curva suave, degradados) y piezas compuestas (cielo, astro, nube, montes, olivo, ciprés, pita, mata, flores, hierba, guijarros, roca facetada). La riqueza sale de combinar muchas formas simples siguiendo la composición, la paleta y la luz de la referencia de Flow.
  - Cada lámina es un script `ysi2-evidencia/laminas/<nombre>-formas.py` en coordenadas de la referencia (768 × 1376). `guardar()` la escala ×2 y regenera `todas.js`. `laminas/ver.py <lámina> <referencia.jpg>` pone las dos juntas para compararlas.
  - Hechas: tumba, mar (capas «cerrado» y «medio» que se cruzan en «abría»), dos desiertos (filas de dunas con cara en sombra), campamento del Sinaí (capa «rayo» que destella), dos jardines (el 2 con la piedra en dos capas, «piedra» y «rodada») e interior (con el «arco» delante).
  - Las capas pueden llevar `claves: [{ t, op }]` para fundirse o destellar.
  - Para colocarlas, en `dirigir.js` se usa `LAM(lámina, escala, xr, yr, capas, xw, yw)`: pone el punto (xr, yr) de la referencia en el punto (xw, yw) del mundo, con sc = 1080/1536 × escala. Con p = 0, los pies están en y = 0, y con p > 0 suben −450·(1 − s).
  - Deja margen: el borde de abajo debe quedar por debajo de cam.y + 960/zoom en los planos generales.
- **Perspectiva de las láminas** (14 nov 2026; antes el horizonte del motor y el pintado no coincidían, con desfases de 150 a 370 px):
  - `fondo.horizonte` = altura del horizonte pintado (px de la referencia de 1376). El motor calcula la altura de la cámara para que el horizonte del espacio 2,5D caiga ahí, y así los personajes encogen y suben con la profundidad igual que el dibujo.
  - La capa del suelo va con `par: 0`.
  - `LAM(lámina, escala, xr, yr, capas, hz, pa, xw)` ancla el suelo (xr, yr) a la profundidad `pa` y deja la altura de cámara de la escena en `A_`, que usan `MED` y `CARA` para encuadrar.
  - Picados y contrapicados (clave `alto`): con lámina, suben o bajan la cámara un poco (±200 aprox.) y cada capa se desplaza según su profundidad (`capa.p`; por defecto, las lejanas al horizonte, el suelo a 0,3 y lo de delante a −0,3).
  - El ángulo de los títeres sale de la altura de la cámara.
  - **Rejilla de profundidad:** botón **#** en la caja de la planta, o `esc.rejilla: true`. Pinta las líneas del suelo en p = −0,5 … 4 y el horizonte (línea amarilla discontinua). En ysi2, `REJILLA=1 node ysi2-evidencia/dirigir.js` la pone en todas las escenas para revisar el render.
- **Láminas con vida** (14 nov 2026; el usuario: «los fondos son muy estáticos… hay efectos paralizados»):
  - Cualquier grupo del SVG de una lámina puede llevar `data-anim` (lista JSON) y el motor lo anima en cada fotograma:
    - `deriva {vx, vy}`;
    - `vaiven {dx, dy, rot, skew, px, py, periodo, fase}`;
    - `latido {min, max, periodo}` (opacidad);
    - `sube {vx, vy, crece, px, py, vida}`: sube, crece y se desvanece en bucle (humo, brasas, burbujas).
  - En `comun/formas.py`, `anim(svg, …)` lo envuelve. Las piezas ya traen su movimiento: nubes que derivan, olivos, cipreses, pitas, matas, hojas y hierba que se mecen, y estrellas y destellos que titilan. La fase sale de la posición, así que no altera el dibujo aleatorio.
  - Cada lámina añade lo suyo:
    - mar: olas, crestas, peces, burbujas y pájaros;
    - desiertos: arena al viento;
    - campamento: humo, brasas, bruma y nube;
    - interior: llama, haz de la ventana y polvo;
    - jardines y tumba: la luz de la puerta respira, estrellas y nubes.
- **Escala y reparto en profundidad:**
  - `PT(xr, yr)` da un punto del dibujo en el mundo; `PD(xr, yr)` da `{ x, p }` de un punto del suelo pintado, para poner a alguien justo ahí; `VE(xr, yr, zoom)` encuadra un punto del dibujo.
  - Comprobación: un personaje en la puerta de una tumba debe medir como mucho unos 0,85 de la puerta. Por eso la tumba va a escala 2,6, el jardín 1 a 1,9 y el jardín 2 a 2,3.
- **Paleta maestra 60-30-10 por short** (14 nov 2026, decidida con el usuario: una paleta para toda la animación, no por escena):
  - `ysi2-evidencia/paleta.json` define tres papeles de 5 tonos cada uno: dominante índigo violeta, secundario tierra rosada y arena, acento naranja y oro. También fija la ropa de cada personaje: María, el acento; los demás, en tonos del secundario o del dominante.
  - `python comun/aplicar-paleta.py <paleta.json> <lámina…>` lleva cada color de las láminas a su papel (frío → dominante; cálido apagado → secundario; cálido saturado y claro → acento) y al tono de luminosidad más cercana. Al regenerar una lámina desde su script hay que volver a aplicarla.
  - `dirigir.js` pone la ropa de la paleta a cada actor y quita la `armonia`.
  - `regla-603010.py <short> --paleta <paleta.json>` mide por papeles.
  - Para que el dominante mande hacen falta luz y composición, no solo colores. Ejemplos: el desierto al atardecer con las filas lejanas en sombra violeta y la arena solo delante; el campamento de noche con el suelo iluminado solo junto al fuego; la sala con una puerta con luz cálida como acento.
  - No usar `ambiente.tono` cálido alto: empuja todo al secundario.
- **Regla 60-30-10 de color** (14 nov 2026):
  - `python comun/regla-603010.py <short>` mide cada escena del último render en 3 fotogramas. Agrupa los colores en familias (ΔE < 22, sin encadenar) y da el veredicto: dominante 50-70 %, secundario 20-40 % y acento de 4-16 % saturado y que contraste con el dominante. Es orientativo: en los primeros planos manda el personaje.
  - Herramientas para cumplirla:
    - `ambiente.armonia: { color, fuerza }` tiñe solo el fondo de lámina hacia el dominante (mezcla «color»; más de 0,2 apaga los verdes);
    - `actor.colores: { ropa, ropaS }` cambia la ropa de un personaje solo en esa escena (el acento rojo anaranjado, o tonos del secundario);
    - las paletas de las láminas: ladera azul en la tumba, suelo de madera en la sala, cara violeta de las dunas y suelo de un solo tono en el campamento.
- **Ritmo** (14 nov 2026; con 46 planos en 63 s el usuario dijo que «no da tiempo a procesar las animaciones»):
  - `planos()` quita los planos de menos de 1,5 s, y el último debe durar al menos 1,2 s.
  - `PAUSAS` en `dirigir.js` mete silencios en la voz tras las líneas clave: corta el WAV con ffmpeg, desplaza las palabras y la envolvente, y parte de `sh.vozBase`.
  - Resultado: 34 planos de 2,1 s de media y 71 s de short.

## Giros y caminatas editables sin código (14 nov 2026)
- **Hacia dónde mira:** en el panel del personaje, botones ◀ Perfil · ↙ 3/4 · De frente · 3/4 ↘ · Perfil ▶ · De espaldas, además del ángulo exacto. Elegir una dirección marca la clave como «fija».
- **Mira hacia donde anda** (casilla, activada en los personajes nuevos): en cada tramo en que se desplaza gira al empezar hacia su rumbo y se queda así al pararse. Una clave con dirección fija manda.
- **Panel «Tramo»:** con el cabezal sobre una clave del recorrido (botones «Clave anterior / siguiente») se decide cómo va hasta la siguiente:
  - tiempo exacto de la clave;
  - cuándo gira: durante todo el tramo, al empezar o al llegar, con su duración;
  - sentido: por el lado corto, hacia su izquierda o hacia su derecha;
  - ritmo del giro: curvas o una curva propia;
  - cuánto se adelanta la cabeza y cuánto van detrás los pies;
  - si da pasitos al girar parado;
  - con qué forma de andar sigue desde ahí;
  - velocidad del tramo (despacio, normal, deprisa, corriendo), que mueve el tiempo de la clave siguiente y desplaza las demás.
- **Formas de andar** («Crear o retocar formas de andar…»): lista con vista previa en vivo de un personaje que va y viene. Deslizadores:
  - largo y velocidad del paso;
  - braceo;
  - bote;
  - inclinación;
  - mirada y hombros;
  - cuánto tarda en arrancar y en frenar;
  - velocidad a la que pasa a correr;
  - cara al andar.
  
  «Nueva (copia de esta)» y «Guardar» la dejan en `shorts-flow/andares/<id>.json` para todas las escenas y los vídeos; las de serie están en `comun/andares.js`.
- **Datos:**
  - en el actor: `orientar`, `andar: { estilo, zancada… }`;
  - en cada clave de `recorrido`: `giroModo`, `giroDur`, `giroSentido`, `giroCurva`, `giroCabeza`, `giroPies`, `giroPasitos`, `giroFijo` y `andar`.
  
  El motor (`comun/escena.js`) las lee con `comun/andares.js`. Ejemplo: la escena «Ejemplo: giros y andares».

## Taller de dibujo completo (14 nov 2026)
- **Barra de arriba:**
  - nombre de la pieza (se guarda con ese nombre);
  - **Deshacer / Rehacer**;
  - **⌨ Atajos**: la lista de teclas (V, B, L, P, E, R, C, I, T, X; Ctrl + Z / Y / D; flechas para mover; Espacio + arrastrar para mover la vista).
- **Goma (X):** con una forma elegida, el trazo la borra. Se guarda como una forma «Goma» encima, que se puede ocultar o borrar para recuperar lo borrado. El grosor se elige en el panel.
- **Relleno:**
  - liso, degradado o degradado redondo, con color final y dirección;
  - colores escritos en hexadecimal (casilla `#rrggbb` + Intro) en el relleno, el contorno y el degradado.
- **Girar la selección** con un deslizador (cualquier ángulo; al soltar vuelve a 0 y el giro se queda).
- **Lista de formas:**
  - doble clic en el nombre para cambiarlo;
  - 🔒 para bloquearla y que no se toque en el lienzo;
  - los textos, agujeros y gomas se nombran solos.
- **Suavizado del pincel y del lazo** (más alto = trazo más limpio y con menos puntos).
- **Combinar** (Mayús + clic para elegir dos o más formas cerradas):
  - **Unir**;
  - **Restar** (a la de más abajo le quita las demás);
  - **Intersección**.
  
  El resultado son curvas nuevas editables, y los huecos salen como agujeros.

## Rótulos, claves y bloques (14 nov 2026)
- **Rótulo elegido** (clic en la lista de Rótulos):
  - estilo: rótulo, título grande o cita bíblica;
  - empieza en y dura, en segundos;
  - tamaño de la letra;
  - dónde va: arriba, en el centro, abajo o a una altura exacta;
  - color de la letra y caja oscura detrás (en el rótulo normal);
  - referencia (en la cita).
  
  En el motor: `tam`, `y`, `x`, `color`, `caja: false` y `colorCaja`.
- **Copiar y pegar claves** del recorrido: botones del panel Tramo, o Ctrl + C / Ctrl + V. Pega posición, dirección y cómo gira y anda en el cabezal del personaje elegido.
- **Bloques de acción:** «Empieza en (s)» para escribir el tiempo exacto.

## Fondos dibujados (láminas) editables en la app (14 nov 2026)
- En Escena → Fondo, **«Lámina dibujada»** abre su panel:
  - elegir la lámina, o **Nueva…** (crea una vacía con capas lejos, medio y delante);
  - **tamaño**, **mover a los lados / arriba o abajo**;
  - **altura del horizonte pintado** (la línea amarilla de la rejilla #).
- **Capas:** por cada una,
  - si se usa;
  - **cuánto se mueve con la cámara** (1 = muy lejos, 0 = como el suelo, negativo = más cerca que los personajes);
  - si va **delante** de los personajes;
  - **✎ Editar**: la abre en el taller de dibujo, con el resto de capas como calco y el marco de la lámina.
  
  **+ Capa nueva** añade una.
- **Al guardar:**
  - se escribe `ilustraciones/<lámina>/<capa>.svg` y su dibujo editable `<capa>.dibujo.json`, y se regenera `ilustraciones/todas.js`;
  - se conservan los degradados de la capa original;
  - los movimientos automáticos (`data-anim`) de una capa hecha por script se pierden si se redibuja (lo avisa el título del taller).
- En el taller de láminas no salen los colores del personaje: se dibuja con colores de verdad.
- **API:** `GET /api/laminas`, `GET /api/laminas/<n>`, `POST /api/laminas/<n>` (nueva), `PUT /api/laminas/<n>/<capa>` (`{ svg, dibujo }`).

## Redibujar cualquier parte de la marioneta (14 nov 2026)
- En Personajes → Piezas propias, **«Redibujar una parte del muñeco»**: eliges la parte y pulsas **✎ Redibujar**. Se crea una pieza en el hueso de esa parte que oculta la original, y se abre el taller con la parte de calco.
  - Brazos y piernas enteros se doblan en el codo y la rodilla.
  - Partes: cabeza entera, pelo, melena, barba, ojos, cejas, nariz, boca, orejas, torso y túnica, cinturón, brazo izquierdo y derecho, mano izquierda y derecha, pierna izquierda y derecha.
- Cualquier pieza puede ocultar esas partes desde «Mientras está puesta, oculta».
- En el muñeco (`comun/titere25d.js`): `oculta` admite además `cabeza`, `torso`, `brazoIzq`/`brazoDer`, `manoIzq`/`manoDer` y `piernaIzq`/`piernaDer`.

## Marioneta vectorial, fase 1: el cuerpo (14 nov 2026)
- En Personajes → Diseño → **Marioneta vectorial**, **«Convertir el cuerpo en vectores»** dibuja el muñeco en reposo y copia como dibujos vectoriales:
  - el torso y la túnica, en ocho vistas (cada 45°: de frente, 3/4, perfil, 3/4 de espaldas, espaldas…);
  - los dos brazos (con la mano) y las dos piernas (con el pie).
  
  Cada parte se edita con **✎** en el taller (con el resto de calco y las juntas en naranja).
- **«Usar el muñeco automático» / «Usar los vectores»** cambia entre los dos sin perder nada. **«Volver a copiar del muñeco»** rehace la copia: se pierden los retoques, y sirve si cambias la ropa o las proporciones.
- **Cómo se mueve** (`comun/titere25d.js`, `op.vector`):
  - cada punto de brazos y piernas va atado a los huesos más cercanos en reposo (`brazo`, `antebrazo`, `mano`; `muslo`, `pierna`, `pie`; el pie no gira), y sigue a las juntas del fotograma estirándose con el escorzo;
  - el torso usa la vista más cercana al giro y la gira ±22,5° sobre un cilindro alrededor de la columna, que sigue a la cintura y al cuello;
  - la cabeza y las piezas propias no cambian.
- **Datos** en el personaje: `vector: { activo, juntas, capas: [{ id, nombre, grupo, huesos, vista?, juntas?, dibujo, svg }] }`.
- El plan completo (cabeza, Smart Bones, expresiones) está en el ROADMAP.

## Marioneta vectorial, fase 2: la cabeza (14 nov 2026)
- En la misma sección, **«Convertir la cabeza en vectores»** copia la cabeza de frente en capas: **pelo de detrás** (bajo la cara), **cara y piel**, **orejas**, **pelo**, **barba** y **nariz**. Cada una se edita con **✎**. En el taller se ven debajo las capas que quedan detrás y, encima y muy tenues, las que quedan delante, con ojos, cejas y boca.
- **Se dibuja solo de frente.** Al girar, cada punto se desliza sobre la cabeza con la profundidad de la forma de la que viene: la forma guarda `data-ref` (su número en el muñeco). Una forma nueva toma la profundidad de la primera de su capa; una forma borrada desaparece.
- **Ojos, cejas y boca siguen automáticos:** son los que parpadean, hablan y hacen las expresiones.
- **«Usar la cabeza automática» / «Usar la cabeza vectorial»** cambia entre las dos sin perder nada. **«Volver a copiar la cabeza»** rehace la copia y pierde los retoques.
- **Datos:** `vector.cabeza: { activo, capas: [{ id, nombre, refs, dibujo, svg }], vivas }`. La cabeza puede ser vectorial con el cuerpo automático, y al revés.
- **Motor** (`comun/titere25d.js`): `cabezaBase()` devuelve las formas de frente con su categoría. Al crear el muñeco, las formas de `vector.cabeza` sustituyen a las de código antes del primer giro.

## Marioneta vectorial, fase 3: correcciones por ángulo (14 nov 2026)
Son como los **Smart Bones de Moho**: la forma de una parte se corrige a mano en una pose y el muñeco la va tomando al acercarse a ella.
- En **«Correcciones por ángulo»** (bajo las capas vectoriales) eliges tres cosas:
  - **la parte:** un brazo, una pierna, una vista del torso o una capa de la cabeza;
  - **qué la mueve:** doblar el codo, doblar la rodilla, girar el cuerpo o girar la cabeza;
  - **el ángulo**, en grados.
- **«＋ Corregir»** abre el taller con la parte en esa pose y el resto del muñeco de calco. **Mueve puntos**: no añadas ni borres, porque una forma con otro número de puntos no cuenta. Al guardar aparece en la lista; ✎ la vuelve a abrir con la corrección puesta y ✕ la borra.
- **Cómo se mezcla:**
  - al doblar, la corrección entra poco a poco desde el reposo hasta ese ángulo, y más allá se queda entera;
  - en los giros, cada corrección pesa de lleno en su ángulo y nada a 45° de él, así que dos correcciones vecinas se reparten;
  - el ángulo que se guarda es el que mide el muñeco (la rodilla se dobla levantando el pie, y se busca la altura que más se acerca).
- **Datos:** `vector.correcciones: [{ id, capa, control, desde, angulo, d }]`. En el cuerpo, `d` guarda por trazo y por punto `[a lo largo, a lo ancho]` del hueso que más pesa en ese punto, o de la columna en el torso; así la corrección acompaña al brazo aunque el hombro apunte a otro lado. En la cabeza, `d` es `{ forma: [[dx, dy], …] }` y se suma después de girarla.
- **Motor:**
  - `controles()` da los valores de este fotograma: `codoIzq/Der`, `rodillaIzq/Der`, `giro` y `cabeza`;
  - `medirCorreccion(capa, trazos)` y `medirCorreccionCabeza({ forma: d })` convierten lo dibujado en `d`;
  - `formasCabeza(capa)` da las formas de la cabeza tal como están dibujadas ahora.
- **Ojo:** si cambias el número de formas de una capa (o la vuelves a copiar), rehaz sus correcciones.

## Marioneta vectorial, fase 4: expresiones dibujadas (14 nov 2026)
- En **Animar → Cara → «Crear o editar una emoción propia»**, escribe o elige la emoción y pulsa **«✎ Dibujar la cara a mano»**:
  - se abre la cara de frente con esa emoción puesta;
  - mueve puntos de ojos, cejas, boca, nariz, pelo… sin añadir ni borrar;
  - **«Quitar el dibujo»** la deja solo con los deslizadores.
- **Cómo se mezcla:**
  - lo dibujado entra con el peso de la emoción: el deslizador **Intensidad** o las claves `cara: { alegre: 0.6 }` de las acciones;
  - dos emociones a la vez suman sus dibujos;
  - al girar la cabeza, lo que se movió a los lados se estrecha con ella (por el coseno del giro).
- Si es una emoción de serie (alegre, triste…), al dibujarla se copia al personaje con sus mismos deslizadores. Mover luego un deslizador no borra lo dibujado.
- **Datos:** `emociones[nombre].dibujo: { forma: [[dx, dy], …] }`, donde `forma` es el número de la forma en la cabeza del muñeco.
- **Motor:**
  - `ponerCara` guarda los pesos y salta lo que no es número;
  - `dibujarCabeza` suma los dibujos después de girar, como las correcciones de la cabeza;
  - `formasCabeza("*")` da todas las formas visibles en el orden en que se ven: deja fuera las que van recortadas, como la nuca, pero no las recortadas a la cara, como ojos y rubor.
- En el taller, una forma cerrada de dos puntos (lente, como la boca) ya conserva su segunda curva.

## Interfaz más cómoda (14 nov 2026)
- **Secciones plegables en el panel de la derecha** de Personajes, Escenas y Montaje:
  - se pliegan o despliegan pulsando su título (o con Intro sobre él);
  - el editor recuerda cómo las dejaste, por página;
  - la primera vez quedan abiertas las tres primeras de cada modo;
  - «Plegar todo» / «Desplegar todo» actúa sobre todas.
- **Al elegir algo** (un personaje, un objeto, un rótulo, un tramo), su sección se despliega sola si estaba plegada.
- **Buscador de ajustes** arriba del panel: escribe, por ejemplo, «barba», «zoom» o «música» y quedan solo las secciones que lo contienen, desplegadas. Tecla **/** para ir al buscador; Esc lo vacía.
- **Diálogos propios** en lugar de los del navegador (`prompt`/`confirm`), que algunos navegadores bloquean: `Dialogo.pedir(título, { valor, ayuda })` y `Dialogo.confirmar(texto, { peligro })` en `herramientas.js`.
  - Intro acepta y Esc cancela.
  - Si lo que se confirma borra o pisa algo, el foco empieza en «Cancelar».

## Interpretar en vivo (14 nov 2026)
Como el Face Puppet de Cartoon Animator: en vez de poner claves a mano, se actúa con el ratón mientras suena la acción.
- En **Animación**, pulsa **«● En vivo»** (o la tecla **R**). Tras una cuenta atrás de 3, la acción suena desde el principio (sin bucle) y se graba:
  - **ratón** a izquierda o derecha del lienzo: gira la cabeza (hasta ±55°);
  - **ratón** arriba o abajo: mira arriba o abajo;
  - **Mayúsculas + ratón:** ladea la cabeza;
  - **teclas:** 1 alegre, 2 risa, 3 triste, 4 enfado, 5 sorpresa, 6 miedo, 7 pensativo, 8 vergüenza, y **0** neutra. La emoción entra y sale suave.
- Termina sola al acabar la acción, o con **Esc**, **R** o **Espacio**. Esc en la cuenta atrás cancela sin grabar.
- **Qué se guarda:**
  - las claves que ya tenía la acción se quedan (con la cabeza, la mirada y la cara interpretadas encima);
  - se añaden solo las claves necesarias (las que no se adivinan en línea recta desde sus vecinas), con curva lineal;
  - Ctrl+Z deshace la toma entera.
- Sin acción elegida, crea una llamada **«Toma en vivo»** de 4 s.
- **Qué se interpreta** (el desplegable junto a «● En vivo»):
  - **Cabeza y mirada:** lo de arriba;
  - **Brazo derecho / Brazo izquierdo:** la mano va adonde apuntas con el ratón (la misma cinemática inversa que las asas);
  - **Cuerpo:** a izquierda o derecha gira; arriba o abajo se inclina, y abajo además se agacha.
- **Por capas:** cada toma graba solo sus canales y deja el resto como estaba. Primero el cuerpo, luego un brazo, luego la cabeza, cada vez sobre la acción que ya tienes. Las emociones (1–8) se graban en cualquier toma si pulsas alguna.

## Elástico y seguimiento (14 nov 2026)
- **Elástico (squash & stretch):** en Animación → Posar → Cuerpo, el deslizador **«Elástico»**:
  - en negativo aplasta y ensancha; en positivo estira y estrecha;
  - parte de los pies y conserva el volumen (ancho = 1 / √alto);
  - se guarda en la pose como `estira` y se anima con claves: aplastado al caer, estirado al saltar.
- **Seguimiento (follow-through):** en la acción, el deslizador **«Seguimiento (cabeza y brazos van detrás)»**:
  - con `retraso` de 0 a 1, la cabeza (giro, ladeo, mirada) repite lo de la acción hasta 0,15 s después, y brazos y manos hasta 0,25 s;
  - así un giro o un frenazo se ven encadenados en vez de moverse de una pieza;
  - funciona igual en Escenas, porque está en `Personajes.accionPose`.

## Marioneta libre: huesos sobre cualquier dibujo o PNG (14 nov 2026)
Como los huesos de Moho, para todo lo que no es el muñeco humano: animales, objetos, criaturas, un barco que se dobla o una bandera.
- **Crear:** «+ Nuevo», elige **«Marioneta libre: dibujo o PNG con huesos»** y ponle nombre. Empieza con un gusano de ejemplo de tres huesos, para ver cómo funciona; bórralo o rehazlo a tu gusto.
- **Huesos** (Diseño → «Marioneta libre»):
  - **«＋ Dibujar un hueso»** y arrastra en el lienzo, de la articulación a la punta;
  - si empiezas cerca de la punta de otro hueso, el nuevo queda como su **hijo**: arranca pegado a ella y gira con él;
  - las **puntas** se arrastran para recolocar los huesos (los hijos pegados a una punta la siguen);
  - en la lista: renombrar, cambiar el padre y ✕ borrar (sus hijos pasan a su padre). Esc deja de dibujar huesos.
- **Capas** (la primera queda detrás):
  - **«＋ Capa dibujada»** abre el taller con el resto de capas y los huesos de calco; ✎ la vuelve a editar;
  - **«＋ Imagen PNG»** trae un dibujo hecho fuera;
  - en cada capa eliges **«Se dobla con todos los huesos»** (cada punto se reparte entre los huesos cercanos y se curva en las articulaciones) o **«Pegada a …»** (rígida, como un ojo o un sombrero). Las imágenes van rígidas, a su hueso o al más cercano;
  - ↑ ↓ cambian el orden; ✕ borra.
- **Animar** (Animación → Posar → Huesos):
  - un deslizador por hueso, o **arrastrar la punta de un hueso** en el lienzo para girarlo;
  - además sirven Elástico, Girar (al pasar de 90° se refleja como una tarjeta) y Despegar del suelo;
  - claves, curvas, seguimiento y acciones funcionan igual que con el muñeco.
- **IK y pies clavados:**
  - con **«Arrastrar con IK»** (en Posar, marcado de serie), al arrastrar la punta de un hueso que tiene padre se doblan los dos para llegar al ratón, como un brazo o una pata. El codo se dobla hacia el lado que menos cambia la pose;
  - en Diseño, **📌** junto a un hueso con padre lo **clava**: su punta se queda donde está en reposo (un pie en el suelo) y él y su padre se doblan solos;
  - **«Mover el cuerpo ↔ / ↕»** (en Posar) desplaza la marioneta entera. Con las patas clavadas, al bajar el cuerpo se agacha y al moverlo de lado se inclina sin despegar los pies.
- **En Escenas y Montaje** se usa como cualquier personaje del reparto, y se renderiza igual.
- **Datos:** `tipo: "libre"`, `libre: { huesos: [{ nombre, padre, o, e }], capas: [{ id, nombre, svg | imagen, hueso? }] }`; en la pose, `huesos: { nombre: grados }`.
- **Motor:** `comun/libre.js` (`Libre.crear`, misma interfaz que `Titere25D.crear`) sobre `comun/rig2d.js` (copia del de lab-huesos). `Personajes.crear` elige el motor según el tipo.

## Animación a mano, cuadro a cuadro (14 nov 2026)
Como las capas fotograma a fotograma de Moho, para lo que se dibuja mejor a mano: humo, chispas, salpicaduras, un rayo, fuego o un efecto de cómic.
- En **Escenas → Atrezo y decorados**, añade **«Animación a mano (cuadro a cuadro)»**. Se coloca, se aleja, se escala, se refleja y se anima con claves como cualquier objeto (la base del dibujo es el suelo, y = 0).
- En su panel sale la **tira de cuadros**:
  - **«＋ Cuadro»** añade uno detrás del elegido, copia de él, para retocarlo (así se anima: copiar y cambiar un poco);
  - **doble clic** en un cuadro, o **«✎ Dibujar»**, lo abre en el taller con **papel cebolla**: el cuadro anterior en rojizo y el siguiente en verdoso, y una línea en el suelo;
  - **← →** mueven el cuadro elegido y **✕** lo borra.
- **Ritmo:**
  - **Cuadros por segundo** (12 es lo clásico; 6–8 da un aire más dibujado);
  - **Empieza en** (segundos de la escena);
  - **Veces** (0 = se repite sin parar; 1 = una vez y desaparece).
- **Datos:** un objeto `tipo: "cuadros"` con `params: { fps, desde, veces, cuadros: [svg], dibujos: [dibujo del taller] }` (`comun/atrezo.js`).

## Editor de gráficas (14 nov 2026)
Como el editor de gráficas de Moho: para ver y afinar cómo cambia un ajuste con el tiempo.
- En **Animación**, con una acción elegida, pulsa **«📈 Gráficas»** (bajo la línea de tiempo):
  - **Canal:** cualquier número de la pose, como `torso`, `cabeza`, `agacha`, `estira` o `bDerCodo`, y también los de dentro, como `cara.alegre` o `huesos.cola`. Los que cambian entre claves salen primero, marcados con ●;
  - la línea naranja es el movimiento de verdad, con sus curvas (suave, lineal, rebote, propia…) y el seguimiento; la roja es el cabezal;
  - **arrastra un punto** (una clave) arriba o abajo para cambiar su valor en esa clave;
  - un **clic** en la gráfica lleva el cabezal a ese instante;
  - la forma entre dos claves se cambia con **«Curva»** en la barra, o con «Propia…» para una curva a medida;
  - **tangentes:** con el cabezal sobre una clave aparecen **dos asas moradas**. Arrástralas para dar forma al tramo hasta la clave siguiente: arrancar despacio, pasarse y volver, llegar de golpe… Se guardan como la curva propia de esa clave, así que el tramo cambia igual en todos los canales (como la curva de una clave en Moho). «Mantener» no tiene asas.
- Todo entra en el deshacer (Ctrl+Z).

## Deformador: doblar, ondear y respirar (14 nov 2026)
Como el deformador de malla de Moho y Cartoon Animator, en todos los objetos del atrezo de **Escenas** (también la animación a mano):
- **Doblar** (de −1 a 1): curva el objeto desde la base hacia un lado, más cuanto más arriba, como un árbol con viento, una caña que pesa o una llama inclinada.
- **Ondear** (de 0 a 1): una onda que sube por el objeto, como una bandera, humo o agua.
- **Respirar** (de 0 a 1): late suave desde la base, como algo vivo o una brasa.
- Están en el panel del objeto junto a sus otros ajustes. Con **«Animar con claves en el cabezal»** cambian con el tiempo: un árbol que se dobla con una ráfaga y vuelve.
- **Cómo funciona** (`comun/atrezo.js`, `deformar`):
  - la primera vez, cada figura (círculo, rectángulo, trazo con arcos…) se convierte en puntos, con sus giros ya aplicados, y se guarda;
  - en cada fotograma solo se mueven los puntos, unos 0,3 ms por objeto;
  - los objetos sin deformar salen exactamente igual que antes.
- **En las láminas** (Escenas → Fondo → Lámina dibujada → Capas), cada capa usada tiene su **«Deformar»** con los mismos tres ajustes:
  - doblar parte del **borde de abajo del dibujo de esa capa**: los árboles de una capa «delante» se mecen con el viento;
  - ondear le pasa una onda, para agua, humo o un toldo;
  - respirar la hace latir suave.
  - Mientras una capa se deforma se redibuja cada fotograma (4–5 ms) y sus movimientos propios (nubes que derivan, ramas…) se pausan.
  - Datos: `fondo.capas[i].doblar / ondear / respirar`. También pueden ir en `capas[i].claves` (`[{ t, doblar }]`), como la opacidad.

## Efectos de capa (14 nov 2026)
Como los efectos de capa de Moho, en **Escenas**:
- **Objetos del atrezo:** «Efecto: sombra», «Efecto: desenfoque», «Efecto: resplandor» y «Efecto: opacidad», junto a sus otros ajustes. Se animan con claves, por ejemplo una brasa que se enciende o un objeto que se desvanece.
- **Personajes:** en su panel, **«Efectos de capa»**: los mismos cuatro, para uno que brilla en una aparición, otro desenfocado en primer término o un fantasma medio transparente.
- **Cómo son:**
  - **sombra:** proyectada abajo a la derecha, en violeta oscuro;
  - **desenfoque:** útil para lo que queda muy cerca o muy lejos de la cámara;
  - **resplandor:** un halo del **color de la luz de la escena** (cálido de día, azulado de noche);
  - **opacidad:** de transparente a opaco.
- **Datos:** en los objetos, `params.sombra / desenfoque / resplandor / opacidad`; en los personajes, `efectos: { … }`. Los aplica `efectosCapa` en `comun/escena.js` con un filtro SVG por elemento, que solo se rehace si cambian los valores.
- **Máscaras** (como las de Moho): en el panel de un objeto o de un personaje, **«Máscara»** elige otro objeto de la escena. El enmascarado solo se ve **dentro de la forma** de ese objeto:
  - un personaje que asoma por una ventana o una puerta;
  - una animación a mano dentro de un marco;
  - agua dentro de una vasija.
  - Con **«ocultarla»** el objeto que hace de máscara no se ve, solo cuenta su forma (por ejemplo, una animación a mano con un círculo blanco).
  - La máscara sigue al objeto aunque se mueva o se anime. Datos: `mascara: "id del objeto"`, `mascaraOculta: true`.

## Modo VTuber: tu personaje como webcam (14 nov 2026)
Enlace **«VTuber →»** arriba en Personajes (`vtuber.html`). El personaje se mueve contigo en directo, como en Cartoon Animator con su seguimiento facial.
- **Cámara** («📷 Encender la cámara»): el detector de caras de MediaPipe, en el navegador y sin instalar nada (la primera vez descarga unos 4 MB). Copia:
  - el giro de la cabeza, mirar arriba o abajo y ladear;
  - el parpadeo, la mandíbula y hacia dónde miran los ojos;
  - con «Copiar mis gestos»: sonrisa → alegre, cejas arriba → sorpresa, ceño → enfado, comisuras abajo → triste.
  - **◎ Centrar** (tecla C): mira de frente y púlsalo; esa postura pasa a ser «recto».
  - «Como un espejo» (por defecto): giras a tu izquierda y él gira hacia ese lado de la pantalla.
  - «Cuánto gira» exagera o suaviza el giro; «Suavidad» quita temblores a costa de un poco de retraso.
  - «El cuerpo acompaña a la cabeza»: el torso gira e inclina un poco detrás de la cabeza.
- **Micrófono:** la boca se abre con el volumen de tu voz («Sensibilidad»); con la cámara, se suma a la mandíbula.
- **Emociones** con las teclas 1–8 (0 neutra) y **gestos** con Q W E R T Y: saludar, explicar, manos arriba, mano al pecho, ofrecer, tender la mano. Un gesto solo mueve los brazos y vuelve solo; se corta pulsándolo otra vez.
- Sin cámara, la cabeza sigue al ratón sobre el escenario; si no hay ratón, deriva tranquila. Siempre respira y parpadea.
- Encuadre: busto o cuerpo entero. Fondo: verde o azul para recortar, oscuro o claro. Tecla **H**: esconde el panel.
- **Marioneta libre:** la voz la estira (habla «con el cuerpo») y la cabeza mueve su hueso «cabeza» si lo tiene.

**Usarlo como webcam con OBS**
1. Deja `vtuber.html` abierta con la cámara y el micro encendidos.
2. En OBS: Fuentes → + → **Navegador**, URL `http://localhost:3170/vtuber.html?salida`, 1280 × 720. Sale solo el personaje, con el **fondo transparente**.
3. **Iniciar cámara virtual** en OBS y, en Zoom, Meet o Discord, elegir la cámara «OBS Virtual Camera».

La página de control manda cada fotograma (unas 30 veces por segundo) a `POST /api/vtuber` y el servidor lo reparte por `GET /api/vtuber/eventos` (SSE) a la salida. Así la salida no necesita la cámara: la fuente de navegador de OBS no suele tener permiso para usarla. Alternativa: captura de ventana de `vtuber.html` con «Clave cromática» sobre el fondo verde.

- Arreglado de paso: si a un personaje con cabeza vectorial se le cambia después el pelo, la barba o las proporciones, la cara salía sin piel. La cabeza guardada señala las formas por número y ese orden cambia. Ahora el motor lo detecta comparando colores y usa la cabeza automática (`m.cabezaDesfasada`). Hay que volver a exportar la cabeza en el taller para recuperarla. Le pasaba a «Pedro (vectorial)» tras pasarlo a chibi con pelo corto.

## Interfaz nueva: limpia y para cualquier pantalla (14 nov 2026)
Una capa común para Personajes, Escenas, Montaje y VTuber: `tema.css` (aspecto) e `interfaz.js` (colocación). No cambia ningún id, así que los scripts de cada página siguen igual.
- **Barra de arriba:** la marca, las cuatro secciones con icono (Personajes · Escenas · Montaje · VTuber) y, a la derecha:
  - el estado (punto verde = guardado);
  - deshacer, rehacer y ayuda como iconos;
  - un menú **⋯** con «Historial y papelera» y «Subir a GitHub».
- **Lista de la izquierda:**
  - un buscador y el botón **＋** para crear;
  - duplicar, papelera, exportar e importar pasan al menú **⋯**.
- **Personajes:** encima del lienzo, el nombre del personaje y **Diseño / Animación**.
- **Panel de la derecha en pestañas:**
  - Personajes, en Diseño: Ficha · Cuerpo · Color · Piezas;
  - Personajes, en Animación: Acción · Pose · Controles;
  - Escenas: Escena · Reparto · Atrezo · Rótulos · Audio · Vídeo;
  - Montaje: Voz · Escena · Subtítulos · Sonido · Vídeo.
- **Cómo se comporta el panel:**
  - Se recuerda la pestaña de cada página.
  - Al buscar un ajuste (tecla /) se ignoran las pestañas.
  - Si al elegir algo en el lienzo aparece su panel en otra pestaña, se cambia sola: por ejemplo, un actor lleva a Reparto.
  - Las secciones empiezan abiertas.
- **Aspecto:** colores más tranquilos con un solo acento, deslizadores finos, desplegables iguales y textos sin mayúsculas forzadas.
- **Tamaños de pantalla:**
  - **ordenador:** tres columnas;
  - **tableta:** columnas más estrechas, y las secciones solo con icono;
  - **teléfono (hasta 860 px):** el lienzo ocupa la pantalla y abajo hay una barra **Lista · Lienzo · Ajustes**. La lista y los ajustes suben como hojas: al elegir un elemento de la lista, o al tocar el lienzo, se vuelve al lienzo.
- Para dar una sección nueva a una pestaña, se añade su título a `PESTANAS` en `interfaz.js` (expresión sobre el título sin tildes). Una sección sin título va con la anterior.

## Pinceles y tableta gráfica en el taller de dibujo (15 nov 2026)
Con la herramienta **Pincel** (B), arriba del panel del taller aparecen los pinceles. Cada trazo se guarda como una **forma rellena**, no como una línea de grosor fijo: se ensancha y se estrecha con la presión, y como sigue siendo vectorial, se dobla con los huesos, se deforma y se edita con Seleccionar.

| Pincel | Cómo es |
|---|---|
| Tinta | Muy sensible a la presión, con puntas afiladas: contornos y líneas de expresión |
| Rotulador | Grosor casi constante y puntas redondas: líneas limpias y letras |
| Lápiz | Fino, con grano de papel y algo transparente; inclinado, engorda |
| Pincel seco | Bordes rotos y vetas de cerdas: pelo, barba, tela, hierba |
| Pluma caligráfica | Punta plana, gruesa en una dirección y fina en la otra; con inclinación, la punta gira |
| Relleno a mano | Ancho, para manchas de color, sombras y brillos |

- **Ajustes de cada pincel:**
  - tamaño (teclas **[ y ]**);
  - sensibilidad a la presión;
  - curva de presión: suave (poco esfuerzo) o dura;
  - estabilizador en vivo: el trazo va un poco por detrás del lápiz y no tiembla;
  - afinar las puntas y opacidad;
  - «sin lápiz, la velocidad hace de presión»: con ratón o dedo, rápido = fino;
  - «usar la inclinación del lápiz».
- **Pinceles propios:** «Guardar como pincel propio» guarda los ajustes con un nombre (⭐), en este navegador. «Ajustes de serie» deshace los cambios. Se recuerda el último pincel usado.
- **El color** del pincel es el de **Contorno**.
- **Tableta gráfica:**
  - se leen todos los puntos del lápiz (`getCoalescedEvents`), no solo los que llegan a la pantalla, así que los trazos rápidos salen sin picos;
  - se usan la presión, la inclinación (`altitudeAngle`/`azimuthAngle`, o `tiltX`/`tiltY`) y el **otro extremo del lápiz, que borra** sobre la forma de debajo;
  - el panel indica «lápiz detectado · presión · inclinado»;
  - un círculo en el lienzo muestra el tamaño del pincel.
- **Dedos:** con **dos dedos** se mueve y se acerca la vista; si había un trazo a medias, se descarta. Después de usar el lápiz, un dedo solo mueve la vista: la palma apoyada no pinta.
- **La Goma** (X) ya no necesita elegir antes la forma: borra la que tenga debajo al empezar.
- **Texturas:** el grano del lápiz y el pincel seco son filtros SVG (`tx-grano`, `tx-seco`) que van en los `<defs>` de la pieza. Se ven igual en Escenas y en el vídeo.
- **Datos:** la forma lleva `pincel: "tinta" | "lapiz" | …` y, si lo tiene, `textura`. Los trazos antiguos, que son líneas con `grosor`, no cambian. El cálculo está en `pinceles.js` (`Pinceles.contorno`), que se carga antes de `dibujo.js` en Personajes y Escenas.

## Arreglos del 15 nov 2026
- **VTuber:** la tecla **H** escondía también el personaje. Al esconder el panel, la rejilla dejaba la primera columna a 0 y el escenario caía en ella. Ahora queda una sola columna.
- **Panel de ajustes:** si cambia solo de pestaña (al elegir algo en el lienzo), ya no sube arriba, sino que muestra lo que se acaba de elegir. Además, si el panel salta al principio justo después de un clic sin que lo haya movido el usuario, por ejemplo al repintar la lista de piezas, vuelve a donde estaba (`interfaz.js`).
- **App de escritorio:** menú ⋯ → «Buscar actualizaciones» (ver `app-escritorio/LEEME.md`).

## Formas líquidas en el taller (15 nov 2026)
Como las *liquid shapes* de Moho: se combinan formas **sin perderlas**. Cada una sigue siendo una forma suelta, con sus puntos: se edita con Seleccionar, se anima y se dobla con los huesos. La combinación se recalcula al dibujar, también en Escenas y en el vídeo.

- **Cómo:** elige dos o más formas (Mayús + clic) y pulsa en el panel **Unir 💧**, **Restar 💧** o **Intersecar 💧**. La de más abajo en la lista es la **base**.
  - **Unir:** un solo contorno exterior, sin líneas por dentro. Por ejemplo, el brazo y el cuerpo, o una nube hecha de círculos. Cada forma conserva su relleno.
  - **Restar:** la forma quita su silueta a la base, y el borde del corte se dibuja con el contorno de la base. Por ejemplo, una boca que muerde la cara o un mordisco en una fruta.
  - **Intersecar:** solo queda la parte común, también con su borde. Por ejemplo, una pupila dentro del ojo o un sombrero cortado por un marco.
- **En el lienzo**, las que restan se ven con un contorno discontinuo rojizo y las que intersecan, azulado. Se pueden elegir y mover.
- **En la lista de formas** llevan 💧 y su modo.
- Con una forma del grupo elegida, el panel muestra **cómo se combina** (Unir / Restar / Intersecar), **Sacar del grupo** y **Separar el grupo**.
- **Datos:** `liquido: { g: "id del grupo", modo: "union" | "resta" | "inter" }`. En el SVG se guarda un `<g data-liquido>` con:
  - para unir, una capa de contornos y otra de rellenos encima;
  - para restar, una `<mask>`;
  - para intersecar, `<clipPath>` anidados;
  - el recorte de la unión, para el borde de las restas.
- **Identificadores únicos por copia** (`Titere25D.idsUnicos`): un dibujo con máscaras, recortes o degradados puede estar varias veces en la página, como el personaje grande, las vistas del giro o varios actores. Antes, todas las copias usaban la máscara de la primera, y si los huesos deformaban cada copia a su manera, el recorte no seguía a la suya. Ahora se renombran los `id` de cada copia al insertarla: piezas, capas de la marioneta vectorial y capas de la marioneta libre. Esto arregla también los agujeros y los degradados.
- **Arreglado de paso:** los botones «Guardar como pincel propio» y «Ajustes de serie» salían desactivados si no había ninguna forma elegida.

## Formas clave: animar los puntos de un dibujo (15 nov 2026)
Como animar los puntos en Moho: una pieza del muñeco o una capa de la marioneta libre puede tener **otras versiones de su dibujo** con **los mismos puntos en otro sitio**. Por ejemplo: boca cerrada → abierta, ojo abierto → cerrado, pelo quieto → al viento, gusano delgado → inflado. En Animación se pasa de una a otra punto por punto, con claves y curvas.

- **Crear una forma clave (taller):**
  1. Al editar una pieza o una capa, arriba aparece **Base · ＋ Forma clave**.
  2. «＋ Forma clave» copia la base y pide un nombre.
  3. Mueve sus puntos y tiradores; la base se ve en fantasma debajo.
  - Con ✎ se cambia el nombre y con ✕ se borra.
  - **No añadas ni quites puntos ni formas** en una forma clave. Si la estructura no coincide con la base, sale con ⚠ y no se mezcla. Al guardar se avisa.
- **Animarla:** en Animación → Pose, el bloque **Formas clave** tiene un deslizador por cada una («Cara con boca · Boca abierta»), de 0 % (la base) a 100 % (la forma dibujada).
  - Se guarda en la pose como `formas: { "pieza/forma": peso }` y se anima con claves, curvas y el editor de gráficas, como todo lo demás.
  - Varias formas clave se suman entre sí.
- **Con las formas líquidas:** también se mezclan los trazados de las máscaras y recortes, así que una boca que **resta** se abre de verdad sobre la cara, con su borde.
- **Con huesos:** en la marioneta libre, la malla de la capa se rehace sobre la forma mezclada, así que se dobla con los huesos y cambia de forma a la vez.
- **Datos:** la pieza o capa guarda `formasClave: [{ id, nombre, dibujo, svg }]`.
- **Motor:** `Titere25D.morfo(raiz, claves)` compara cada `<path>` de la base con el de la clave (mismos comandos y número de coordenadas) y mezcla base + Σ (clave − base) × peso.
  - Las piezas que se doblan (`doblar`) aún no admiten formas clave.
  - Funciona en Personajes, Escenas, Montaje y en el vídeo.

## Cada forma, su hueso (marioneta libre, 15 nov 2026)
Dentro de una capa de la marioneta libre, cada forma puede **seguir a su propio hueso** sin doblarse. La capa normal se dobla con todos los huesos por cercanía.

- **Cómo:** en el taller de una capa de la marioneta libre, elige una forma. En el panel, **Hueso de esta forma** tiene «— como la capa —» o 🦴 cada hueso. Vale para varias formas a la vez (Mayús + clic). En la lista de formas llevan 🦴 y el nombre del hueso.
- **Para qué:** una mandíbula, un ojo, un ala o una cola dentro del mismo dibujo, cada uno con su hueso.
- **Con las formas líquidas:** la boca que resta, atada al hueso de la mandíbula, gira con ella y abre la cabeza (atada al hueso de la cabeza), con el borde del corte y el fondo visible por el hueco.
- **Con las formas clave:** también se mezclan, y la malla de cada trazado se rehace con su propio hueso.
- **Datos:** la forma guarda `hueso: "nombre"`. En el SVG, cada trazado suyo (rellenos, contornos, máscaras y recortes) lleva `data-hueso`, y `comun/libre.js` ata ese trazado rígido al hueso.

## Smart Bones en la marioneta libre: un hueso mueve formas clave (15 nov 2026)
Como los Smart Bones de Moho: al girar un hueso, una forma clave entra sola. Por ejemplo: el hueso de la mandíbula abre la boca, el del brazo hincha el músculo, o el gusano se infla al doblarse.

- **Cómo:** en Diseño → Marioneta libre → Capas, cada capa con formas clave muestra **«Formas clave: ¿qué hueso las mueve?»**. En cada una se elige:
  - el hueso, o «a mano (deslizador)»;
  - el ángulo en que empieza («de», 0 %) y en el que está entera («a», 100 %).
  - Vale al revés, de 0° a −30°.
- **Entre medias entra con una curva suave.** Cuenta el giro final del hueso, después del IK y de los pies clavados, así que también funciona al arrastrar con IK.
- **En Animación → Pose → Formas clave**, la etiqueta dice «la mueve 🦴hueso: de°→a°; esto se suma». El deslizador sigue sumando encima, para exagerar o para animar a mano a la vez (hasta 150 % en total).
- **Datos:** `formasClave[i].conductor = { hueso, desde, hasta }` (grados). El cálculo está en `comun/libre.js`.
- **Panel de la marioneta libre arreglado:**
  - los nombres de los huesos ya no se cortan;
  - cada capa va en dos líneas: nombre y botones arriba, y debajo cómo se dobla;
  - antes, las filas de las capas medían el doble que el panel y los botones quedaban fuera.

## Smart Bones como en Moho (marioneta libre, 15 nov 2026)
Un hueso con Smart Bone lleva una **acción entera atada a su ángulo**: una línea de tiempo en **grados**, no en segundos. En cada ángulo puedes cambiar lo que quieras del personaje, y al girar el hueso todo pasa por esas claves.

- **Entrar:** en Diseño → Marioneta libre → Huesos, pulsa **⚡** en un hueso (🎛 si es un dial). Arriba aparece el recuadro **«⚡ Smart Bone «hueso»»**. El ⚡ se ve naranja en los huesos que ya tienen claves.
- **Elegir el ángulo:**
  - con el deslizador o la casilla de grados;
  - con un clic o arrastre en la línea de tiempo (de −180° a 180°);
  - arrastrando la punta del propio hueso en el lienzo.
  - 0° es el reposo, la forma de partida. ◀ ▶ saltan entre claves.
- **Grabar, sobre el lienzo y sin abrir el taller:**
  - **Puntos del dibujo:** los blancos son anclas y los azules tiradores, unidos a su ancla con una línea. Un ancla arrastra sus dos tiradores. Vale para todas las capas, también las formas líquidas, porque sus máscaras y recortes son trazados más.
  - **Puntas de otros huesos:** se graba su giro en ese ángulo, para movimientos secundarios o para que un hueso mande en otros.
  - Si en ese ángulo no había clave, se crea con lo que se ve en ese momento, interpolado entre las vecinas, y sigues desde ahí.
- **Claves:** rombos en la línea de tiempo.
  - Se arrastran para cambiar su ángulo.
  - «◆ Clave aquí» crea una con lo que se ve.
  - «Borrar clave».
  - **Curva** de cada clave (suave, lineal, acelerar, frenar, mantener): cómo se llega a ella desde la vecina más cercana al reposo.
- **Los dos sentidos** en la misma línea: claves negativas y positivas, con el reposo en medio. Fuera de la última clave se mantiene esa clave.
- **Varias acciones se suman:** si giras dos huesos con Smart Bone, se suman sus desplazamientos y sus giros.
- **Diales** (como en Moho): marca **«Dial (mando que no se dibuja)»**. Ese hueso no deforma el dibujo por sí mismo, solo conduce su acción. En el lienzo se ve en azul. Se anima como cualquier hueso, con su deslizador en Animación o arrastrando su punta, y sirve de mando: girar la cara, abrir la boca, fonemas.
- **Cómo funciona por dentro** (`comun/libre.js`):
  - `hueso.smart = { claves: [{ ang, curva, puntos: { capa: { trazado: [dx, dy, …] } }, huesos: { otro: grados } }] }`.
  - El giro del hueso (de la pose, antes del IK) es el cabezal.
  - Los giros de otros huesos se suman antes del IK y los pies clavados.
  - Los desplazamientos se suman en el **reposo** de cada punto (`malla.fijar`, sin recalcular pesos), así que siguen a los huesos como en Moho.
  - Funciona en Personajes, Escenas, Montaje y en el vídeo.
- **Lo de antes:** el «conductor» simple de las formas clave (un hueso entre dos ángulos) sigue funcionando y se suma.

## Hoja de revisión y Pedro (vectorial) sin roturas (15 nov 2026)
**`hoja.html?p=<id>`** dibuja un personaje en todas las vistas para cazar roturas de un vistazo:
- 16 giros, de 22,5° en 22,5°;
- 9 poses a 0°, 45° y 90°: saludo, explicar, manos arriba, mano al pecho, sentarse, arrodillarse, agacharse, codos a 120° e inclinado;
- 7 emociones y la boca abierta, de frente y a 45°.

Parámetros:
- `enc=cabeza` encuadra solo la cabeza.
- `cols=N` cambia el número de columnas.
- `vb=x,y,an,al` pone un encuadre propio, para ampliar una zona.

Arreglos en la cabeza (`comun/titere25d.js`). Valen para todos los personajes con la cabeza automática y para las cabezas vectoriales.

**Pelo**
- **Pelo del lado de atrás al girar.** En perfil, la mitad de atrás del cráneo se quedaba de piel («calvo por detrás») y el flequillo parecía un casco. Ahora una masa de pelo crece con el giro, de la coronilla a la nuca.
- **Contorno del pelo.** Su borde de atrás sigue a la silueta del pelo, sin escalón donde esta acababa.
- **Nuca.** Más pelo en las vistas de espaldas con pelo corto.

**Orejas y patillas**
- Al girar se desplazan enteras con la cabeza, en vez de estrecharse.
- Antes, en perfil, la oreja quedaba como una astilla y la patilla como una raya en mitad de la cara. Ahora la patilla queda delante de la oreja.
- La oreja va por encima de la barba y del pelo del lado.

**Barba**
- El rincón del lado que se aleja ya no sube hasta el ojo como una astilla en perfil: baja hacia la mandíbula según se esconde.

**«Pedro (vectorial)»**
- Se ha vuelto a copiar el cuerpo en vectores. La copia era anterior a los últimos cambios del motor y el cinturón colgaba como un aro.
- Se ha vuelto a copiar la cabeza. Estaba desfasada tras cambiar el pelo a corto.
- Revisado con la hoja en todas las vistas, poses y emociones.

