# Editor de personajes y escenas · Fe en Beta

Herramienta local para diseñar personajes 2,5D, animarlos y montar escenas que se renderizan a vídeo con HyperFrames, sin escribir código.

## Arrancar
```bash
node editor-personajes/servidor.js
```
- Personajes: http://localhost:3170
- Escenas: http://localhost:3170/escenas.html

Necesita Node (sin dependencias). Para renderizar usa `npx hyperframes@0.9.8` y ffmpeg; en este equipo, ffmpeg está en `../historia-en-cuatro-actos-tools`.

## Carpetas
| Carpeta | Qué hay |
|---|---|
| `editor-personajes/` | la interfaz y el servidor; manual completo en `editor-personajes/LEEME.md` |
| `comun/` | el motor: `titere25d.js` (títere), `personajes.js` (personajes, poses, acciones), `escena.js` (escenas) y `vendor/` (GSAP y fuente) |
| `personajes/` | un JSON por personaje |
| `acciones/` | biblioteca común de acciones |
| `escenas/` | un JSON por escena |

Los renders (`escena-<id>/`) y el resto de proyectos de `shorts-flow` no se suben.

## Qué falta
Lo que queda por añadir, por prioridad, está en [ROADMAP.md](ROADMAP.md).

## Sincronizar
```powershell
./sincronizar.ps1 "qué cambió"
```
Guarda los cambios en un commit y los sube a GitHub.
