# Roadmap del editor de personajes y escenas

Qué falta para que la herramienta cubra un short de Fe en Beta de principio a fin sin pasar por código ni por otros programas.

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

> El bloque «Del guion al short» está hecho (página **Montaje**). Detalles que quedan de él:
> - [ ] Subtítulos: editar a mano una palabra o un corte de línea (ahora salen de la transcripción y del guion).
> - [ ] Mover o reordenar escenas en la pista arrastrando el bloque entero (ahora se mueven los cortes entre escenas).
> - [ ] Opciones de la música (`outro`, `fin`…) desde la interfaz (ahora en el JSON: `musica.opciones`).

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
- [ ] **Más fondos y un editor de fondos.** Dibujarlos en el taller, por capas de parallax, o importar una imagen. Nocturno con luna, interior con lámpara, mar.
- [ ] **Ambiente:** tono frío o cálido, viñeta, partículas, destello y sacudida de cámara (los efectos del short v2).

### Rig
- [ ] **Piernas en el rig:** asas en los pies con IK de pierna; sentarse, arrodillarse, agacharse con apoyo; tumbarse.
- [ ] **Mirar a un punto o a otro personaje:** ojos y cabeza siguen a quien habla o a un objeto, sin claves a mano.
- [ ] **Agarrar en escena:** la mano sigue un objeto o la mano de otro personaje (objetivo de IK en la escena).

---

## P2 · Mejora mucho la calidad o la rapidez

### Animación
- [ ] **Transición entre acciones:** mezcla de unas décimas al pasar de un bloque al siguiente, en vez del cambio seco.
- [ ] **Editor gráfico de curvas:** curva Bézier propia por clave, además de las predefinidas.
- [ ] **Ciclos de andar y correr ajustables:** cadencia, zancada, estilo (cansado, alegre, con prisa).
- [ ] **Emociones propias:** crear expresiones moviendo cejas, ojos y boca, y guardarlas como las ocho que trae.
- [ ] **Biblioteca de poses** (instantáneas reutilizables) y copiar y pegar claves entre acciones.

### Diseño
- [ ] **Sustituir partes base del muñeco:** cabeza, ojos, bocas, peinados o manos dibujados en el taller, con sus variantes. Ahora solo se puede añadir encima o quitar el pelo.
- [ ] **Piezas que se doblan con los huesos** (mallas): mangas, faldas, capas y cinturones que se deforman con el cuerpo en vez de ser rígidos.
- [ ] **Física en cadena:** pelo largo, cuerdas o colas de varios segmentos que se mueven en ola; choque simple con el cuerpo.
- [ ] **Piezas en muslos y piernas.**
- [ ] **Biblioteca común de piezas** (como la de acciones): un sombrero hecho una vez, disponible para todos.
- [ ] **Comprobar el contraste piel/fondo** (regla de la marca: al menos 2:1) desde el editor, con aviso.

### Taller de dibujo
- [ ] **Simetría en vivo:** dibujar media cara o medio sombrero y que se refleje solo.
- [ ] **Cuentagotas, alinear y distribuir, ajuste a la cuadrícula y a la simetría.**
- [ ] **Unir y restar formas** (operaciones booleanas) y agrupar formas.
- [ ] **Calco:** importar un PNG o un boceto de Flow como plantilla semitransparente para dibujar encima.
- [ ] **Texto** convertido en formas (carteles, inscripciones).

### Render
- [ ] **Vista previa rápida** a baja resolución y render solo de un fragmento.
- [ ] **Progreso real del render,** cola de varios y aviso al terminar.
- [ ] **Formato horizontal (16:9)** para los vídeos largos, además del vertical.
- [ ] **Rendimiento en escenas largas:** cachear el recorrido y la simulación.

---

## P3 · Más adelante
- [ ] Historial de versiones por personaje y escena (volver a cómo estaba ayer) y recuperar la papelera desde la interfaz.
- [ ] Botón «Sincronizar con GitHub» en la propia interfaz.
- [ ] Plantillas de escena con la receta de los shorts (gancho, desarrollo, cierre, despedida).
- [ ] Generar el SEO y el prompt de miniatura al terminar un short, como pide el flujo del canal.
- [ ] Uso con lápiz en tableta y pantallas pequeñas.
- [ ] Pruebas automáticas: render de referencia de los personajes para detectar si un cambio en el motor los rompe.
- [ ] Ayuda integrada: recorrido guiado la primera vez y lista de atajos.
- [ ] Exportar un personaje como paquete (JSON con sus piezas) para compartirlo entre proyectos.

---

## Errores y detalles conocidos
- [ ] Los montes del fondo «Día» se ven algo repetitivos.
- [ ] En contrapicado y corriendo, la mano que sube parece tapar la boca.
- [ ] Las etiquetas de la hoja de giro se ven pequeñas.
- [ ] El taller convierte los arcos de los SVG (comando `A`) como rectas.
- [ ] Las asas de IK solo mueven brazos, cabeza y pecho (faltan las piernas: ver P1).
