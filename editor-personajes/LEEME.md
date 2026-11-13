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
