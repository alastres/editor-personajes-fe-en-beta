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
