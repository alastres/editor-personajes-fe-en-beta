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
