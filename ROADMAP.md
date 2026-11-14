# Roadmap del editor de personajes y escenas

Qué falta para que la herramienta cubra un short de Fe en Beta de principio a fin sin pasar por código ni por otros programas.

> **Estado (13 nov 2026):** P1, P2, P3 y los errores conocidos están hechos. Lo siguiente es la **Fase 2 · Máximo potencial** (al final): primero producir un short real con el editor y, mientras, el «director» automático.

**Prioridad**
- **P1:** hace falta para producir los shorts del canal con la herramienta.
- **P2:** mejora mucho la calidad o la rapidez.
- **P3:** más adelante.

Cuando una línea se haga, se marca `[x]` con la fecha y se explica en `editor-personajes/LEEME.md`.

---

## Ya hecho (13 nov 2026)
- [x] Diseño de personajes: cuerpo, pelo, ropa (túnica, vestido, actual), colores con sombras automáticas y hoja de giro.
- [x] Piezas propias atadas a cabeza, pecho, cintura, brazos, antebrazos, manos y pies; con dibujo por giro (frente, perfil, espaldas), variantes, colores del personaje y «oculta».
- [x] Taller de dibujo con vectores editables: pincel, lazo, pluma, formas, puntos y tiradores; también convierte los SVG importados.
- [x] Física por pieza (péndulo amortiguado, estable en el render).
- [x] Animación: posar, acciones por claves con curvas, papel cebolla, controles tipo smart bones, asas del rig con IK de manos, cabeza y pecho.
- [x] Biblioteca común de acciones y capas (cuerpo y brazos).
- [x] Escenas: varios personajes, fondos, recorridos que andan solos, cámara con planos, rótulos, audio, boca con la voz (envolvente) y render a MP4 desde un botón.
- [x] PNG del escenario, de la hoja de giro y de un fotograma de escena; repo privado en GitHub con `sincronizar.ps1`.

---

## P1 · Imprescindible para producir shorts

> Todo el P1 está hecho (13 nov 2026), incluidos los detalles del Montaje: corregir subtítulos a mano (texto y cortes con «|», «Unir con la siguiente»), mover escenas arrastrando el bloque entero y los ajustes de la música en la interfaz.

### Del guion al short
- [x] *(13 nov 2026, página Montaje)* **Short de varias escenas.** Encadenar escenas en un short completo, con cortes y transiciones (corte, barrido, fundido) y una sola voz y música de principio a fin.
- [x] *(13 nov 2026)* **Importar el guion.** A partir del texto y de la voz grabada, crear el esqueleto de escenas con sus tiempos (frases ancladas a palabras, como `at()` en los shorts hechos a código).
- [x] *(13 nov 2026)* **Subtítulos automáticos con el estilo de la marca.** Sacados de la voz (transcripción con tiempos por palabra) y con la palabra clave resaltada, como en los shorts actuales.
- [x] *(13 nov 2026)* **Música y efectos de sonido.** Biblioteca de efectos (whoosh, golpe, campana…) que se colocan en la línea de tiempo, y la música montada con `montar-musica.py` (reglas del canal: una sola campana al final).

### Boca y voz
- [x] *(13 nov 2026)* **Labios por fonemas (visemas).** Usar los tiempos de palabras de la transcripción para formar vocales y consonantes (A, E, O, M/B/P…), no solo abrir y cerrar.
- [x] *(13 nov 2026)* **Boca legible dentro de barbas oscuras:** interior de la boca más claro y labio inferior visible.

### Escenario
- [x] *(13 nov 2026, 12 objetos en `comun/atrezo.js`)* **Atrezo y decorados en escena.** Objetos no atados a un personaje (árboles, tumba, barca, mesa, casas), colocados en profundidad y con parallax. Reutilizar los decorados que ya existen en el short «¿Y si…?» (olivo, tumba, mar, Roma, ciudad).
- [x] *(13 nov 2026: luna, atardecer, tormenta, mar, desierto; colores, lejos, nubes, lluvia, imagen y capas del taller)* **Más fondos y un editor de fondos.** Dibujarlos en el taller, por capas de parallax, o importar una imagen. Nocturno con luna, interior con lámpara, mar.
- [x] *(13 nov 2026)* **Ambiente:** tono frío o cálido, viñeta, partículas, destello y sacudida de cámara (los efectos del short v2).

### Rig
- [x] *(13 nov 2026)* **Piernas en el rig:** asas en los pies con IK de pierna; sentarse, arrodillarse, agacharse con apoyo; tumbarse.
- [x] *(13 nov 2026)* **Mirar a un punto o a otro personaje:** ojos y cabeza siguen a quien habla o a un objeto, sin claves a mano.
- [x] *(13 nov 2026)* **Agarrar en escena:** la mano sigue un objeto o la mano de otro personaje (objetivo de IK en la escena).

---

## P2 · Mejora mucho la calidad o la rapidez

### Animación
- [x] *(13 nov 2026)* **Transición entre acciones:** mezcla de unas décimas al pasar de un bloque al siguiente, en vez del cambio seco.
- [x] *(13 nov 2026)* **Editor gráfico de curvas:** curva Bézier propia por clave, además de las predefinidas.
- [x] *(13 nov 2026)* **Ciclos de andar y correr ajustables:** cadencia, zancada, estilo (cansado, alegre, con prisa).
- [x] *(13 nov 2026)* **Emociones propias:** crear expresiones moviendo cejas, ojos y boca, y guardarlas como las ocho que trae.
- [x] *(13 nov 2026)* **Biblioteca de poses** (instantáneas reutilizables) y copiar y pegar claves entre acciones.

### Diseño
- [x] *(13 nov 2026: una pieza en la cabeza puede ocultar pelo, barba, ojos, cejas, boca, nariz u orejas y ocupar su lugar)* **Sustituir partes base del muñeco:** cabeza, ojos, bocas, peinados o manos dibujados en el taller, con sus variantes. Ahora solo se puede añadir encima o quitar el pelo.
- [x] *(13 nov 2026: mangas y perneras, brazo→antebrazo y muslo→pierna, con pesos suaves; las capas y faldas del torso siguen rígidas, con física)* **Piezas que se doblan con los huesos** (mallas): mangas, faldas, capas y cinturones que se deforman con el cuerpo en vez de ser rígidos.
- [x] *(13 nov 2026)* **Física en cadena:** pelo largo, cuerdas o colas de varios segmentos que se mueven en ola; choque simple con el cuerpo.
- [x] *(13 nov 2026)* **Piezas en muslos y piernas.**
- [x] *(13 nov 2026)* **Biblioteca común de piezas** (como la de acciones): un sombrero hecho una vez, disponible para todos.
- [x] *(13 nov 2026)* **Comprobar el contraste piel/fondo** (regla de la marca: al menos 2:1) desde el editor, con aviso.

### Taller de dibujo
- [x] *(13 nov 2026)* **Simetría en vivo:** dibujar media cara o medio sombrero y que se refleje solo.
- [x] *(13 nov 2026)* **Cuentagotas, alinear y distribuir, ajuste a la cuadrícula y a la simetría.**
- [x] *(13 nov 2026: restar con «Agujero», que hace de máscara; unir = agrupar formas del mismo color)* **Unir y restar formas** (operaciones booleanas) y agrupar formas.
- [x] *(13 nov 2026)* **Calco:** importar un PNG o un boceto de Flow como plantilla semitransparente para dibujar encima.
- [x] *(13 nov 2026: herramienta Texto con tamaño y color; va como texto, no convertido en curvas)* **Texto** convertido en formas (carteles, inscripciones).

### Render
- [x] *(13 nov 2026)* **Vista previa rápida** a baja resolución y render solo de un fragmento.
- [x] *(13 nov 2026)* **Progreso real del render,** cola de varios y aviso al terminar.
- [x] *(13 nov 2026)* **Formato horizontal (16:9)** para los vídeos largos, además del vertical.
- [x] *(13 nov 2026)* **Rendimiento en escenas largas:** cachear el recorrido y la simulación. *(Hecho el recorrido, con una tabla acumulada; la física ya estaba acotada a 1 s de pre-simulación.)*

---

## P3 · Más adelante
- [x] *(13 nov 2026: 🕘 Historial en las tres páginas)* Historial de versiones por personaje y escena (volver a cómo estaba ayer) y recuperar la papelera desde la interfaz.
- [x] *(13 nov 2026: ⇅ GitHub)* Botón «Sincronizar con GitHub» en la propia interfaz.
- [x] *(13 nov 2026: en Escenas al crear y en Montaje al generar)* Plantillas de escena con la receta de los shorts (gancho, desarrollo, cierre, despedida).
- [x] *(13 nov 2026: borrador en Textos/seo-borrador-<short>.md + fotograma sin subtítulos; Claude lo completa al aprobar)* Generar el SEO y el prompt de miniatura al terminar un short, como pide el flujo del canal.
- [x] *(13 nov 2026)* Uso con lápiz en tableta y pantallas pequeñas.
- [x] *(13 nov 2026: pruebas.html, 144 dibujos)* Pruebas automáticas: render de referencia de los personajes para detectar si un cambio en el motor los rompe.
- [x] *(13 nov 2026: ? y F1)* Ayuda integrada: recorrido guiado la primera vez y lista de atajos.
- [x] *(13 nov 2026: Exportar / Importar en el reparto)* Exportar un personaje como paquete (JSON con sus piezas) para compartirlo entre proyectos.

---

## Errores y detalles conocidos
- [x] *(13 nov 2026: varias frecuencias que no se repiten)* Los montes del fondo «Día» se ven algo repetitivos.
- [x] *(13 nov 2026: desde abajo, al correr, el codo se dobla menos y bracea algo menos)* En contrapicado y corriendo, la mano que sube parece tapar la boca.
- [x] *(13 nov 2026)* Las etiquetas de la hoja de giro se ven pequeñas.
- [x] *(13 nov 2026: arcos → curvas Bézier exactas)* El taller convierte los arcos de los SVG (comando `A`) como rectas.
- [x] *(13 nov 2026)* Las asas de IK solo movían brazos, cabeza y pecho: ya hay asas en los pies y en la cadera.

---

## Fase 2 · Máximo potencial (apuntado el 13 nov 2026)

Lo que falta para que el editor no solo sirva, sino que dé todo lo que puede. Orden por impacto.

### 1 · Validar con un short real (primero)
- [ ] Producir un short del canal («¿Y si…?» o «Preguntas sobre Dios») de principio a fin **solo con el editor**, sin código ni otros programas.
- [ ] Apuntar aquí cada fricción que salga y reordenar el resto de la fase según lo que haga falta de verdad.

**Prueba 1 (13 nov 2026): «¿Y si tuvieras toda la evidencia de que Dios es real?»** (`shorts/ysi2-evidencia`, guion en `ysi2-evidencia/`, sin voz todavía). Fricciones encontradas:
- [ ] **Empezar sin voz:** Montaje exige un audio; hubo que fabricar un WAV en silencio para estimar los tiempos. Falta «Estimar desde el guion» sin archivo.
- [ ] **Escenas por frase mal cortadas:** la pregunta del gancho se partió en dos («…real…» | «le creerías?»), y otras se juntaron (tres frases en una escena de 7 s). Cortar por líneas del guion y no partir nunca una pregunta.
- [ ] **El generador pone al narrador en todas las escenas,** hablando a cámara: en «¿Y si…?» el narrador va en off. Falta elegir «voz en off» y que la boca solo se mueva si el personaje habla de verdad.
- [ ] **Montaje solo ofrece 4 fondos** (Noche, Amanecer, Día, Interior), no los nuevos (luna, mar, desierto, atardecer, tormenta).
- [ ] **Emociones en escena:** para que alguien se asombre o se enfade hubo que crear acciones (`acciones/asombro.json`, `enfado`, `triste`, `pensativo`, `mirar-cielo`, `alegre`, `tender-mano`, `manos-arriba`, `mano-pecho`). Falta una pista «Emoción» por actor, con claves, como «Mirar a».
- [x] *(13 nov 2026)* **Los rótulos quedaban tapados por los subtítulos** (misma altura): ahora un rótulo puede ir arriba (`arriba: true`, botón ↓/↑ en Escenas).
- [ ] **Faltan efectos y atrezo bíblicos:** el mar no se abre, no hay becerro de oro (se usó una hoguera), ni maná propiamente dicho (partículas de nieve).
- [ ] **Falta reparto:** sacerdotes con su ropa, Moisés, Jesús. Se usaron Pablo y los discípulos.
- [ ] **Veredicto del usuario sobre el borrador 1:** «se torna aburrido porque le faltan cambios de cámara», y el narrador en pantalla «distrae y consume tiempo vital del espectador». Borrador 2: voz en off y varios planos con corte dentro de cada escena (general → medio → primer plano → detalle, cada 1,5–2,5 s, en las palabras clave). El editor no tiene **cortes de cámara dentro de una escena**: se simulan con dos claves separadas 1 ms. Falta una pista «Planos» con encuadres con nombre (general, medio, primer plano de X, detalle de Y) que siga al personaje.
- [ ] **El director lo hizo Claude a mano** con un script (`ysi2-evidencia/dirigir.js`): reparto, miradas, emociones, atrezo y cámara por escena, anclados a palabras. Es justo lo que debería proponer el «director automático» del punto 2.

### 2 · Director automático (lo que más tiempo quita por vídeo)
- [ ] **Actuación propuesta desde el guion:** cada frase elige acción por el verbo («se arrodilló» → arrodillarse), emoción y a quién mira; luego se retoca.
- [ ] **Planos automáticos** cada 2–3,5 s, con variedad de cámara: cenital, por detrás, sobre el hombro, contrapicado (cambio por corte, nunca morfando).
- [ ] **Revisor de puesta en escena** que avise de:
  - brazos que se cruzan con otro personaje;
  - algo importante bajo la zona del subtítulo (y ≈ 1300);
  - un personaje que tapa a otro;
  - un plano estático: falta el movimiento principal o los dos secundarios.

### 3 · Calidad visual al nivel aprobado
- [ ] Comparar el títere con `lab-barca` (estilo Kurzgesagt aprobado) y cerrar la diferencia: textura de cápsulas, filo de luz en el contorno, sombra violeta / luz cálida, sombra de contacto.
- [ ] **Transformar sin cortar:** un parámetro de estado 0..1 por escena (tormenta → calma, noche → día) que mueve a la vez cielo, mar, color y cara de los personajes.

### 4 · Interacción entre personajes
- [ ] Contacto entre dos personajes: abrazar, cargar a alguien, mano en el hombro (IK hacia el cuerpo del otro, no solo a su mano).
- [ ] Orden delante/detrás automático cuando dos personajes se cruzan.
- [ ] Figurantes y multitudes rápidas, con variaciones automáticas de ropa, pelo y complexión.

### 5 · Material de partida
- [ ] Reparto bíblico listo: Pedro, Jesús, María, fariseos, soldados romanos (sin mantos; mujeres con vestido hasta los tobillos).
- [ ] Más fondos: templo, interiores con lámpara, ciudad y Roma (pasar los de «¿Y si…?» al editor).
- [ ] Atrezo: de 12 a unos 40 objetos.

### 6 · Sonido que sigue a la acción
- [ ] Pasos con cada pie que toca el suelo, roce de ropa y golpes al agarrar, colocados solos.
- [ ] Masterizado del audio dentro del botón de render.

### 7 · Lo que quedó a medias
- [ ] Capas y faldas del torso que se doblan con el cuerpo (hoy rígidas, con física).
- [ ] Unión booleana real de formas en el taller (hoy se agrupan).
- [ ] Texto convertido en curvas.
- [x] *(14 nov 2026)* Fondos de láminas dibujadas con formas básicas (`comun/formas.py`) para todas las escenas de la prueba ysi2-evidencia; capas con claves de opacidad (fundidos, relámpagos).
- [x] *(14 nov 2026)* Perspectiva de láminas: horizonte pintado = horizonte de la cámara, capas que se mueven con los picados y contrapicados, rejilla de profundidad en el editor; regla de duración mínima de plano y pausas en la voz.
- [x] *(14 nov 2026)* Láminas con vida (`data-anim`: deriva, vaivén, latido, sube) y reparto en profundidad por puntos del dibujo (`PT`/`PD`); tumbas a escala de persona.
- [x] *(14 nov 2026)* Medidor de la regla 60-30-10 (`comun/regla-603010.py`), armonía de color por escena y colores de ropa por escena.
- [x] *(14 nov 2026)* Paleta maestra 60-30-10 por short (`paleta.json` + `comun/aplicar-paleta.py`) aplicada a todas las láminas y a la ropa.
- [ ] Acento en cada plano: en los primeros planos y en la sala el acento (luz cálida) ocupa menos del 4 %.

## Auditoría de uso sin IA (14 nov 2026)
- [x] Giros y caminatas editables:
  - direcciones con botones y «mira hacia donde anda»;
  - panel Tramo (cuándo y cómo gira, cabeza y pies, pasitos, andar por tramo, velocidad, tiempo exacto);
  - editor de formas de andar con vista previa.
- [x] Arreglado:
  - el panel derecho se ensanchaba con las rutas largas;
  - el lazo creaba formas invisibles;
  - la confirmación de la papelera duraba poco;
  - el rótulo vacío no avisaba;
  - la curva desactivada no decía por qué.
- [x] Personajes → Animación: arrastrar cerca de la mano movía el accesorio (lámpara); ahora en esa pestaña solo se posa al personaje.
- [ ] Pruebas: 16 casos de Demo piezas marcan «CAMBIÓ» (revisar si la referencia está vieja).
- [x] «Posición X», profundidad y ángulo se actualizan al reproducir.
- [x] Tras mandar una escena a la papelera ya no se abre otra real: queda el escenario vacío.
- [x] Taller de dibujo:
  - deshacer y rehacer con botones, y atajos de teclado a la vista (⌨ Atajos);
  - nombre de la pieza al guardar;
  - goma;
  - degradados lineal y redondo;
  - campo de color hexadecimal;
  - giro libre;
  - nombrar y bloquear formas;
  - suavizado del pincel;
  - unir, restar e intersección de verdad;
  - duplicar con Ctrl + D y mover con las flechas.
- [x] Rótulos: estilo (rótulo, título, cita), empieza y dura con números, tamaño, arriba/centro/abajo o altura exacta, color, caja y referencia de la cita.
- [x] Copiar y pegar claves del recorrido (botones y Ctrl + C / Ctrl + V); tiempo exacto de los bloques de acción.
- [x] Láminas desde la interfaz:
  - fondo «Lámina dibujada»;
  - elegir lámina o crear una nueva;
  - tamaño, posición y altura del horizonte;
  - usar o no cada capa, cuánto se mueve con la cámara y si va delante;
  - ✎ Editar cada capa en el taller (con las demás de calco) y añadir capas.
- [x] Ayuda sin jerga ni archivos: controles explicados con palabras de animador, la música sin `montar-musica.py`, la ayuda remite a la visita guiada (? / F1) y el código «para programadores» va plegado.
- [x] Piezas repetidas (copias en el mismo hueso): se numeran («Rodillera 2») y avisan al pasar el ratón.
- [x] Cada parte de la marioneta redibujable: «Redibujar una parte del muñeco» (cabeza entera, pelo, melena, barba, ojos, cejas, nariz, boca, orejas, torso y túnica, cinturón, brazos y piernas enteros que se doblan, manos). Crea la pieza en su hueso, oculta la original y abre el taller.
- [x] Segunda auditoría (pulido):
  - la cita y el título bajan de verdad con «Abajo»;
  - la fuente de las citas (`/comun/vendor/`) daba 404;
  - ya no se pierde el primer clic tras escribir la referencia;
  - el «¿Seguro?» de la papelera de Personajes dura 6 s y lo dice;
  - las pruebas del muñeco vuelven a coincidir (ocultar partes no cambia el dibujo si no se oculta nada);
  - el panel Tramo y los botones de dirección no saltan;
  - en la última clave el Tramo lo avisa;
  - se marca la velocidad del tramo;
  - las barras de capa de la lámina dicen qué hacen;
  - la planta empieza plegada y los avisos van arriba;
  - el panel ya no se desplaza de lado;
  - formas de andar: botones siempre a la vista, velocidad en px/s, las de serie no se borran;
  - taller: renombrar con el nombre actual, sin dirección en el degradado redondo y sin «Ver el personaje» en láminas;
  - quitada la jerga que quedaba (parallax, HyperFrames, VoiceStudio, nombres de archivo).
- [ ] Pendiente de la segunda auditoría:
  - «Unir» falló una vez a la primera (no reproducido);
  - lo que sale de unir toma el estilo de la forma de abajo;
  - los bloques de acción comparten pista con los rombos del recorrido;
  - (hechos después: asas de pose más grandes, lámina nueva centrada, audios por nombre y proyecto)
- [ ] Demo piezas: 16 casos de «Pruebas» cambian por los cambios hechos a ese personaje (chibi, calvo, ropa moderna). Si son a propósito, «Guardar como referencia».

## Marioneta vectorial (como los Smart Bones de Moho), por fases (14 nov 2026)
- [x] **Fase 1: el cuerpo en vectores.** En Personajes, «Convertir el cuerpo en vectores» copia del muñeco:
  - el torso, en ocho vistas (cada 45°);
  - los brazos y las piernas.
  
  Quedan como dibujos editables (✎ en el taller) atados a las juntas del esqueleto: brazos y piernas se doblan con pesos por cercanía y se estiran con el escorzo; el torso gira ±45° sobre un cilindro y cambia de vista. La cabeza y las piezas propias siguen como siempre. Prueba: «Pedro (vectorial)».
- [x] Fase 1, retoques: el torso se copia en ocho vistas (cada 45°; cada una gira como mucho ±22,5°) y ya no asoma el cinturón en 3/4. Las correcciones de manga van en la fase 3.
- [x] **Fase 2: la cabeza en capas vectoriales.** «Convertir la cabeza en vectores» copia la cabeza de frente en seis capas: pelo de detrás, cara y piel, orejas, pelo, barba y nariz. Cada forma recuerda de qué forma del muñeco viene (`data-ref`) y gira con su profundidad sobre un solo dibujo. Las formas nuevas toman la profundidad de su capa. Ojos, cejas y boca siguen automáticos (son los de las expresiones). Probado con la hoja de giros de «Pedro (vectorial)»: sin retocar, coincide con el automático (0,1 px).
- [x] **Fase 3: correcciones por ángulo (Smart Bones).** En «Correcciones por ángulo» se elige una parte vectorial, qué la mueve (doblar un codo o una rodilla, girar el cuerpo o la cabeza) y el ángulo. El taller la abre en esa pose y se corrige moviendo puntos. Al doblar, la corrección entra poco a poco desde el reposo hasta ese ángulo. En los giros se mezclan las correcciones vecinas (±45°). Se guarda por punto en el marco del hueso que más pesa (en el torso, de la columna; en la cabeza, tras girarla). Probado con «Pedro (vectorial)»: exacta en su ángulo y nula en reposo.
  - [ ] Pendiente: ver la corrección en vivo con un deslizador del ángulo dentro del taller; correcciones que dependan de dos controles a la vez.
- [x] **Fase 4: expresiones dibujadas.** En Animar → Cara → «Crear o editar una emoción propia», **«✎ Dibujar la cara a mano»** abre la cara con esa emoción en el taller. Se mueven puntos de ojos, cejas, boca, nariz… sobre el mismo dibujo. La forma retocada entra con la intensidad de la emoción (su deslizador y las claves de `cara` en las acciones) y se mezcla con las demás. Sirve con la cabeza automática y con la vectorial. Al girar, lo de los lados se estrecha con la cabeza. Probado con «Pedro (vectorial)»: a intensidad 0 no cambia nada.
  - Arreglado de paso en el taller: una forma cerrada de dos puntos (la boca en forma de lente) perdía su segunda curva al guardarse. Además, al medir una corrección, las rectas que el taller convierte en curvas vuelven a los comandos originales.

## Visión: lo mejor de Moho y de Cartoon Animator (14 nov 2026)
El usuario quiere una herramienta en la que la creatividad no tenga límites: los huesos inteligentes, el dibujo vectorial y el control fino de **Moho**, con la rapidez de **Cartoon Animator** (interpretar en vivo, bibliotecas de movimientos, marionetas listas). Se trabaja en bucle, de lo de más impacto a lo de menos.

Ya lo tenemos:
- huesos con IK y asas;
- correcciones por ángulo tipo Smart Bones;
- capas de cambio (variantes);
- física por pieza y en cadena;
- labios por fonemas;
- giro de cabeza 360 sobre un solo dibujo;
- taller vectorial;
- curvas propias;
- recorridos con formas de andar;
- acciones compartidas por capas;
- cámara 2,5D;
- partículas y ambiente.

Por hacer:
- [x] **Interpretar en vivo** (como el Face Puppet de Cartoon Animator). En Animación, «● En vivo» (o la tecla R) hace una cuenta atrás y reproduce la acción desde el principio. Mientras suena:
  - el ratón gira la cabeza y mira arriba o abajo; con Mayúsculas, ladea;
  - las teclas 1–8 ponen emociones y el 0 la quita.

  Al acabar se convierte en claves: se quedan las de la acción y se añaden solo las necesarias. Sin acción, crea «Toma en vivo» de 4 s.
  - [ ] Pendiente: interpretar también brazos y cuerpo (Motion Pilot), y grabar solo algunos canales.
  - Arreglado de paso: un error al dibujar un fotograma paraba todo el bucle del editor; ahora se avisa en la consola y sigue (Personajes, Escenas y Montaje).
- [x] **Elástico (squash & stretch):** deslizador «Elástico» en Posar → Cuerpo (`estira`, de −0,5 a +0,6), desde los pies y conservando el volumen. Se anima con claves como cualquier otro.
- [x] **Seguimiento (follow-through):** deslizador «Seguimiento» en la acción (`retraso`, de 0 a 1). La cabeza llega hasta 0,15 s tarde y los brazos y las manos hasta 0,25 s, también en Escenas.
  - [ ] Pendiente: el mismo retraso para las piezas con física y el pelo.
- [x] **Marioneta libre** (como los huesos de Moho): «+ Nuevo» → «Marioneta libre». Sirve para cualquier dibujo o PNG con su propio esqueleto: animales, objetos, criaturas.
  - Los huesos se dibujan arrastrando en el lienzo; si empiezas en la punta de otro, queda como su hijo. Se colocan arrastrando sus puntas.
  - Las capas se dibujan en el taller o se traen en PNG; cada una se dobla con todos los huesos o va pegada a uno.
  - Se anima con un deslizador por hueso o arrastrando la punta, con claves, elástico y reflejo al girarse.
  - Funciona en Escenas, Montaje y el render (`comun/libre.js` + `comun/rig2d.js`). Ejemplo: «Gusano (ejemplo de marioneta libre)».
  - [ ] Pendiente: IK de dos huesos al arrastrar (pies que se quedan en el suelo), pesos pintados a mano y correcciones por ángulo como en el muñeco.
- [ ] **Capas fotograma a fotograma** (como Moho): dibujar a mano efectos, humo o chispas, cuadro a cuadro, sobre la escena.
- [ ] **Editor de gráficas** de movimiento por canal (giro, altura, cabeza…), con tangentes.
- [ ] **Deformador libre (malla)** sobre piezas y láminas: doblar, ondear y respirar.
- [ ] **Efectos de capa** en Escenas: sombra, desenfoque, resplandor y máscara por objeto o capa.

